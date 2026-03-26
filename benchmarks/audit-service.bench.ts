/**
 * ============================================================================
 * AUDIT SERVICE PERFORMANCE BENCHMARKS
 * ============================================================================
 *
 * Measures throughput and latency of core AuditService operations using
 * Vitest's built-in bench runner (backed by tinybench).
 *
 * Run with:  npm run bench
 *
 * Benchmarks cover:
 * - log()             — single audit log creation
 * - logWithChanges()  — creation with automatic change detection
 * - query()           — offset-paginated query
 * - queryWithCursor() — cursor-paginated query
 * - getByActor()      — actor-based lookup
 * - getByResource()   — resource history lookup
 *
 * All benchmarks use InMemoryAuditRepository to isolate service logic
 * from I/O, giving a reliable baseline for the core layer's overhead.
 *
 * @packageDocumentation
 */

import { bench, describe, beforeAll } from "vitest";

import { AuditService } from "../src/core/audit.service";
import type { IChangeDetector } from "../src/core/ports/change-detector.port";
import type { IIdGenerator } from "../src/core/ports/id-generator.port";
import type { ITimestampProvider } from "../src/core/ports/timestamp-provider.port";
import { ActorType, AuditActionType } from "../src/core/types";
import { InMemoryAuditRepository } from "../src/infra/repositories/in-memory/in-memory-audit.repository";

// ============================================================================
// BENCHMARK INFRASTRUCTURE
// ============================================================================

let counter = 0;

/** Minimal ID generator — avoids nanoid ESM overhead in benchmarks. */
const idGenerator: IIdGenerator = {
  generate: (opts) => `${opts?.prefix ?? ""}bench_${++counter}`,
  generateBatch: (count, opts) =>
    Array.from({ length: count }, () => `${opts?.prefix ?? ""}bench_${++counter}`),
  isValid: () => true,
  extractMetadata: () => null,
  getInfo: () => ({
    name: "bench",
    version: "1.0.0",
    defaultLength: 21,
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    sortable: false,
    encoding: null,
  }),
};

/** Minimal timestamp provider. */
const timestampProvider: ITimestampProvider = {
  now: () => new Date(),
  format: () => "",
  parse: () => new Date(),
  isValid: () => true,
  startOfDay: () => new Date(),
  endOfDay: () => new Date(),
  diff: () => 0,
  freeze: () => {},
  advance: () => {},
  unfreeze: () => {},
  getInfo: () => ({
    name: "bench",
    version: "1.0.0",
    source: "system-clock",
    timezone: "utc" as const,
    precision: "millisecond" as const,
    frozen: false,
  }),
};

/** Minimal change detector. */
const changeDetector: IChangeDetector = {
  detectChanges: async (before, after) => {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes[key] = { from: before[key], to: after[key] };
      }
    }
    return changes;
  },
  hasChanged: (before, after) => before !== after,
  maskValue: () => "***",
  formatChanges: (changes) => Object.keys(changes).join(", "),
};

/** Sample actor used across benchmarks. */
const benchActor = {
  id: "bench-user-1",
  type: ActorType.USER as const,
  name: "Bench User",
};

/** Sample resource used across benchmarks. */
const benchResource = {
  type: "order",
  id: "order-bench-1",
};

// ============================================================================
// log() — SINGLE LOG CREATION
// ============================================================================

describe("AuditService.log()", () => {
  const repository = new InMemoryAuditRepository();
  const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);

  bench("log() — create audit log (no options)", async () => {
    await service.log({
      actor: benchActor,
      action: AuditActionType.UPDATE,
      resource: benchResource,
    });
  });

  bench("log() — with metadata and reason", async () => {
    await service.log({
      actor: benchActor,
      action: AuditActionType.ACCESS,
      resource: benchResource,
      metadata: { reason: "GDPR request", requestId: "req-123" },
      reason: "User data export",
      ipAddress: "127.0.0.1",
    });
  });
});

// ============================================================================
// logWithChanges() — CHANGE DETECTION + CREATION
// ============================================================================

describe("AuditService.logWithChanges()", () => {
  const repository = new InMemoryAuditRepository();
  const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);

  const before = { name: "Widget", price: 100, status: "draft", stock: 50 };
  const after = { name: "Widget Pro", price: 120, status: "published", stock: 45 };

  bench("logWithChanges() — 4 field changes", async () => {
    await service.logWithChanges({
      actor: benchActor,
      action: AuditActionType.UPDATE,
      resource: benchResource,
      before,
      after,
    });
  });
});

// ============================================================================
// query() — OFFSET PAGINATION
// ============================================================================

describe("AuditService.query() — offset pagination", () => {
  const repository = new InMemoryAuditRepository();
  const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);

  // Seed 500 logs before the benchmarks run
  beforeAll(async () => {
    const seeds = Array.from({ length: 500 }, (_, i) => ({
      id: `seed-${i}`,
      timestamp: new Date(Date.now() - i * 1000),
      actor: { id: `user-${i % 10}`, type: ActorType.USER as const, name: `User ${i % 10}` },
      action: i % 2 === 0 ? AuditActionType.UPDATE : AuditActionType.CREATE,
      resource: { type: "order", id: `order-${i}` },
    }));
    await Promise.all(seeds.map((log) => repository.create(log)));
  });

  bench("query() — first page, no filters", async () => {
    await service.query({ limit: 20, page: 1 });
  });

  bench("query() — filtered by actorId", async () => {
    await service.query({ actorId: "user-3", limit: 20, page: 1 });
  });

  bench("query() — filtered by action", async () => {
    await service.query({ action: AuditActionType.UPDATE, limit: 20, page: 1 });
  });
});

// ============================================================================
// queryWithCursor() — CURSOR PAGINATION
// ============================================================================

describe("AuditService.queryWithCursor() — cursor pagination", () => {
  const repository = new InMemoryAuditRepository();
  const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);

  let nextCursor: string | undefined;

  beforeAll(async () => {
    const seeds = Array.from({ length: 500 }, (_, i) => ({
      id: `cursor-seed-${i}`,
      timestamp: new Date(Date.now() - i * 1000),
      actor: { id: `user-${i % 5}`, type: ActorType.USER as const, name: `User ${i % 5}` },
      action: AuditActionType.UPDATE,
      resource: { type: "document", id: `doc-${i}` },
    }));
    await Promise.all(seeds.map((log) => repository.create(log)));

    // Grab a cursor for the "next page" benchmark
    const page1 = await service.queryWithCursor({}, { limit: 20 });
    nextCursor = page1.nextCursor;
  });

  bench("queryWithCursor() — first page", async () => {
    await service.queryWithCursor({}, { limit: 20 });
  });

  bench("queryWithCursor() — second page (using cursor)", async () => {
    await service.queryWithCursor(
      {},
      { limit: 20, ...(nextCursor === undefined ? {} : { cursor: nextCursor }) },
    );
  });
});

// ============================================================================
// getByActor() / getByResource() — LOOKUP METHODS
// ============================================================================

describe("AuditService — lookup methods", () => {
  const repository = new InMemoryAuditRepository();
  const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);

  beforeAll(async () => {
    const seeds = Array.from({ length: 200 }, (_, i) => ({
      id: `lookup-seed-${i}`,
      timestamp: new Date(Date.now() - i * 500),
      actor: { id: `actor-${i % 5}`, type: ActorType.USER as const, name: `Actor ${i % 5}` },
      action: AuditActionType.UPDATE,
      resource: { type: "product", id: `product-${i % 20}` },
    }));
    await Promise.all(seeds.map((log) => repository.create(log)));
  });

  bench("getByActor() — actor with ~40 logs", async () => {
    await service.getByActor("actor-2");
  });

  bench("getByResource() — resource with ~10 logs", async () => {
    await service.getByResource("product", "product-5");
  });
});
