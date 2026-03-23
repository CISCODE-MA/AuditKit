/**
 * ============================================================================
 * IN-MEMORY AUDIT REPOSITORY - UNIT TESTS
 * ============================================================================
 *
 * Tests for InMemoryAuditRepository implementation.
 *
 * Coverage:
 * - CRUD operations
 * - Query filtering
 * - Sorting
 * - Pagination
 * - Immutability
 * - Testing utilities
 *
 * @packageDocumentation
 */

import type { AuditLog } from "../../../core/types";
import { ActorType, AuditActionType } from "../../../core/types";

import { InMemoryAuditRepository } from "./in-memory-audit.repository";

describe("InMemoryAuditRepository", () => {
  let repository: InMemoryAuditRepository;

  const createMockLog = (overrides?: Partial<AuditLog>): AuditLog => ({
    id: "log-1",
    timestamp: new Date("2026-03-19T10:00:00.000Z"),
    action: AuditActionType.CREATE,
    actor: {
      id: "user-1",
      type: ActorType.USER,
      name: "John Doe",
      email: "john@example.com",
    },
    resource: {
      type: ActorType.USER,
      id: "res-1",
      label: "Test User",
    },
    ipAddress: "192.0.2.1",
    userAgent: "Mozilla/5.0",
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryAuditRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AuditActionType.CREATE, () => {
    it("should create and return audit log", async () => {
      const log = createMockLog();

      const created = await repository.create(log);

      expect(created).toEqual(log);
    });

    it("should store the log", async () => {
      const log = createMockLog();

      await repository.create(log);
      const found = await repository.findById(log.id);

      expect(found).toEqual(log);
    });

    it("should throw error for duplicate ID", async () => {
      const log = createMockLog();
      await repository.create(log);

      await expect(repository.create(log)).rejects.toThrow("Audit log with ID");
    });

    it("should create deep copy (immutability)", async () => {
      const log = createMockLog();
      const created = await repository.create(log);

      // Modify original
      (log as any).action = AuditActionType.UPDATE;

      // Stored version should be unchanged
      const stored = await repository.findById(created.id);
      expect(stored?.action).toBe(AuditActionType.CREATE);
    });
  });

  describe("findById", () => {
    it("should return log when it exists", async () => {
      const log = createMockLog();
      await repository.create(log);

      const found = await repository.findById(log.id);

      expect(found).toEqual(log);
    });

    it("should return null when log does not exist", async () => {
      const found = await repository.findById("non-existent");

      expect(found).toBeNull();
    });

    it("should return deep copy (immutability)", async () => {
      const log = createMockLog();
      await repository.create(log);

      const found = await repository.findById(log.id);
      (found as any).action = AuditActionType.DELETE;

      const refound = await repository.findById(log.id);
      expect(refound?.action).toBe(AuditActionType.CREATE);
    });
  });

  describe("findByActor", () => {
    beforeEach(async () => {
      await repository.create(
        createMockLog({ id: "log-1", actor: { id: "user-1", type: ActorType.USER } }),
      );
      await repository.create(
        createMockLog({ id: "log-2", actor: { id: "user-1", type: ActorType.USER } }),
      );
      await repository.create(
        createMockLog({ id: "log-3", actor: { id: "user-2", type: ActorType.USER } }),
      );
    });

    it("should return logs for specific actor", async () => {
      const logs = await repository.findByActor("user-1");

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.actor.id === "user-1")).toBe(true);
    });

    it("should return empty array for unknown actor", async () => {
      const logs = await repository.findByActor("unknown");

      expect(logs).toEqual([]);
    });

    it("should sort by timestamp descending (newest first)", async () => {
      await repository.create(
        createMockLog({
          id: "log-latest",
          actor: { id: "user-1", type: ActorType.USER },
          timestamp: new Date("2026-03-19T12:00:00.000Z"),
        }),
      );

      const logs = await repository.findByActor("user-1");

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.id).toBe("log-latest");
    });

    it("should apply filters", async () => {
      await repository.create(
        createMockLog({
          id: "log-create",
          actor: { id: "user-1", type: ActorType.USER },
          action: AuditActionType.CREATE,
        }),
      );
      await repository.create(
        createMockLog({
          id: "log-update",
          actor: { id: "user-1", type: ActorType.USER },
          action: AuditActionType.UPDATE,
        }),
      );

      const logs = await repository.findByActor("user-1", { action: AuditActionType.CREATE });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.id).toBe("log-create");
    });
  });

  describe("findByResource", () => {
    beforeEach(async () => {
      await repository.create(
        createMockLog({
          id: "log-1",
          resource: { type: ActorType.USER, id: "res-1" },
        }),
      );
      await repository.create(
        createMockLog({
          id: "log-2",
          resource: { type: ActorType.USER, id: "res-1" },
        }),
      );
      await repository.create(
        createMockLog({
          id: "log-3",
          resource: { type: ActorType.USER, id: "res-2" },
        }),
      );
    });

    it("should return logs for specific resource", async () => {
      const logs = await repository.findByResource("User", "res-1");

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.resource.id === "res-1")).toBe(true);
    });

    it("should sort by timestamp ascending (chronological)", async () => {
      await repository.create(
        createMockLog({
          id: "log-earliest",
          resource: { type: ActorType.USER, id: "res-1" },
          timestamp: new Date("2026-03-19T09:00:00.000Z"),
        }),
      );

      const logs = await repository.findByResource("User", "res-1");

      expect(logs[0]?.id).toBe("log-earliest");
    });

    it("should apply filters", async () => {
      const logs = await repository.findByResource("User", "res-1", {
        action: AuditActionType.CREATE,
      });

      expect(logs.every((log) => log.action === AuditActionType.CREATE)).toBe(true);
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await repository.create(
          createMockLog({
            id: `log-${i}`,
            timestamp: new Date(`2026-03-19T${String(i).padStart(2, "0")}:00:00.000Z`),
            action: AuditActionType.CREATE, // Use a valid typed action
          }),
        );
      }
    });

    it("should return all logs without filters", async () => {
      const result = await repository.query({});

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(10);
    });

    it("should filter by action", async () => {
      const result = await repository.query({ action: AuditActionType.CREATE });

      expect(result.data.every((log) => log.action === AuditActionType.CREATE)).toBe(true);
      expect(result.data).toHaveLength(5);
    });

    it("should filter by multiple actions", async () => {
      await repository.create(createMockLog({ id: "log-delete", action: AuditActionType.DELETE }));

      const result = await repository.query({
        actions: [AuditActionType.CREATE, AuditActionType.DELETE],
      });

      expect(result.data.some((log) => log.action === AuditActionType.CREATE)).toBe(true);
      expect(result.data.some((log) => log.action === AuditActionType.DELETE)).toBe(true);
      expect(
        result.data.every(
          (log) => log.action === AuditActionType.CREATE || log.action === AuditActionType.DELETE,
        ),
      ).toBe(true);
    });

    it("should filter by actor ID", async () => {
      await repository.create(
        createMockLog({ id: "log-special", actor: { id: "user-2", type: ActorType.USER } }),
      );

      const result = await repository.query({ actorId: "user-2" });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("log-special");
    });

    it("should filter by actor type", async () => {
      await repository.create(
        createMockLog({ id: "log-system", actor: { id: "sys-1", type: ActorType.SYSTEM } }),
      );

      const result = await repository.query({ actorType: ActorType.SYSTEM });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.actor.type).toBe(ActorType.SYSTEM);
    });

    it("should filter by resource type", async () => {
      await repository.create(
        createMockLog({ id: "log-post", resource: { type: "Post", id: "post-1" } }),
      );

      const result = await repository.query({ resourceType: "Post" });

      expect(result.data.every((log) => log.resource.type === "Post")).toBe(true);
    });

    it("should filter by date range (startDate)", async () => {
      const result = await repository.query({
        startDate: new Date("2026-03-19T05:00:00.000Z"),
      });

      expect(
        result.data.every((log) => log.timestamp >= new Date("2026-03-19T05:00:00.000Z")),
      ).toBe(true);
    });

    it("should filter by date range (endDate)", async () => {
      const result = await repository.query({
        endDate: new Date("2026-03-19T05:00:00.000Z"),
      });

      expect(
        result.data.every((log) => log.timestamp <= new Date("2026-03-19T05:00:00.000Z")),
      ).toBe(true);
    });

    it("should filter by IP address", async () => {
      await repository.create(createMockLog({ id: "log-special-ip", ipAddress: "198.51.100.1" }));

      const result = await repository.query({ ipAddress: "198.51.100.1" });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.ipAddress).toBe("198.51.100.1");
    });

    it("should paginate results", async () => {
      const page1 = await repository.query({ limit: 3, page: 1 });
      const page2 = await repository.query({ limit: 3, page: 2 });

      expect(page1.data).toHaveLength(3);
      expect(page2.data).toHaveLength(3);
      expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
    });

    it("should sort by timestamp ascending", async () => {
      const result = await repository.query({ sort: "timestamp" });

      const timestamps = result.data.map((log) => log.timestamp.getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    });

    it("should sort by timestamp descending", async () => {
      const result = await repository.query({ sort: "-timestamp" });

      const timestamps = result.data.map((log) => log.timestamp.getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it("should return pagination metadata", async () => {
      const result = await repository.query({ limit: 3 });

      expect(result.total).toBe(10);
      expect(result.limit).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(4); // Math.ceil(10 / 3) = 4
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await repository.create(
          createMockLog({
            id: `log-${i}`,
            action: i % 2 === 0 ? AuditActionType.UPDATE : AuditActionType.CREATE,
          }),
        );
      }
    });

    it("should count all logs without filters", async () => {
      const count = await repository.count();

      expect(count).toBe(5);
    });

    it("should count with filters", async () => {
      const count = await repository.count({ action: AuditActionType.CREATE });

      expect(count).toBe(3);
    });
  });

  describe("exists", () => {
    beforeEach(async () => {
      await repository.create(createMockLog({ id: "exists-1", action: AuditActionType.CREATE }));
    });

    it("should return true when matching log exists", async () => {
      const exists = await repository.exists({ action: AuditActionType.CREATE });

      expect(exists).toBe(true);
    });

    it("should return false when no matching log exists", async () => {
      const exists = await repository.exists({ action: AuditActionType.DELETE });

      expect(exists).toBe(false);
    });

    it("should return false for empty repository", async () => {
      const emptyRepo = new InMemoryAuditRepository();
      const exists = await emptyRepo.exists({});

      expect(exists).toBe(false);
    });
  });

  describe("deleteOlderThan", () => {
    beforeEach(async () => {
      await repository.create(
        createMockLog({
          id: "log-old",
          timestamp: new Date("2020-01-01"),
        }),
      );
      await repository.create(
        createMockLog({
          id: "log-recent",
          timestamp: new Date("2026-03-19"),
        }),
      );
    });

    it("should delete logs older than date", async () => {
      await repository.deleteOlderThan(new Date("2023-01-01"));

      const remaining = await repository.query({});
      expect(remaining.data).toHaveLength(1);
      const recentLog = remaining.data.find((log) => log.id === "log-recent");
      expect(recentLog).toBeDefined();
    });

    it("should not delete logs newer than date", async () => {
      await repository.deleteOlderThan(new Date("2019-01-01"));

      const remaining = await repository.query({});
      expect(remaining.data).toHaveLength(2);
    });
  });

  describe("testing utilities", () => {
    beforeEach(async () => {
      await repository.create(createMockLog({ id: "log-1" }));
      await repository.create(createMockLog({ id: "log-2" }));
    });

    it("should return size", () => {
      expect(repository.size()).toBe(2);
    });

    it("should return all logs", () => {
      const all = repository.getAll();

      expect(all).toHaveLength(2);
    });

    it("should clear all logs", async () => {
      repository.clear();

      expect(repository.size()).toBe(0);
      const found = await repository.findById("log-1");
      expect(found).toBeNull();
    });

    it("should support initial data", () => {
      const initial = [createMockLog({ id: "initial-1" })];
      const repoWithData = new InMemoryAuditRepository(initial);

      expect(repoWithData.size()).toBe(1);
    });
  });

  describe("immutability", () => {
    it("should not allow modifying stored logs via returned reference", async () => {
      const log = createMockLog();
      const created = await repository.create(log);

      const found = await repository.findById(created.id);
      if (found) {
        (found as any).action = AuditActionType.DELETE;
      }

      const refound = await repository.findById(created.id);
      expect(refound?.action).toBe(AuditActionType.CREATE);
    });

    it("should not allow modifying query results", async () => {
      await repository.create(createMockLog({ id: "log-1" }));

      const result = await repository.query({});
      if (result.data[0]) {
        (result.data[0] as any).action = AuditActionType.DELETE;
      }

      const refetch = await repository.findById("log-1");
      expect(refetch?.action).toBe(AuditActionType.CREATE);
    });
  });
});
