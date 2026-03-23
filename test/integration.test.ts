/**
 * ============================================================================
 * AUDITKIT - INTEGRATION TESTS
 * ============================================================================
 *
 * End-to-end integration tests for AuditKit.
 *
 * Coverage:
 * - Full audit log lifecycle
 * - Query operations
 * - Actor tracking
 * - Resource history
 *
 * @packageDocumentation
 */

import { Test, type TestingModule } from "@nestjs/testing";

import { AuditService } from "../src/core/audit.service";
import { ActorType, AuditActionType } from "../src/core/types";
import { AuditKitModule } from "../src/nest/module";

describe("AuditKit Integration Tests", () => {
  let module: TestingModule;
  let auditService: AuditService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AuditKitModule.register({
          repository: { type: "in-memory" },
        }),
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("CRUD operations", () => {
    it("should log CREATE action", async () => {
      const result = await auditService.log({
        action: AuditActionType.CREATE,
        actor: {
          id: "user-1",
          type: ActorType.USER,
          name: "John Doe",
        },
        resource: {
          type: "User",
          id: "res-1",
          label: "New User",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.action).toBe(AuditActionType.CREATE);
    });

    it("should log UPDATE action with change tracking", async () => {
      const result = await auditService.log({
        action: AuditActionType.UPDATE,
        actor: {
          id: "user-1",
          type: ActorType.USER,
        },
        resource: {
          type: "User",
          id: "res-1",
        },
        changes: {
          name: { from: "Old Name", to: "New Name" },
          email: { from: "old@example.com", to: "new@example.com" },
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.changes).toBeDefined();
    });

    it("should log DELETE action", async () => {
      const result = await auditService.log({
        action: AuditActionType.DELETE,
        actor: {
          id: "admin-1",
          type: ActorType.USER,
        },
        resource: {
          type: "User",
          id: "res-to-delete",
        },
        metadata: {
          reason: "User request",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.action).toBe(AuditActionType.DELETE);
      expect(result.data?.metadata?.reason).toBe("User request");
    });

    it("should log system action", async () => {
      const result = await auditService.log({
        action: AuditActionType.LOGIN,
        actor: {
          id: "system",
          type: ActorType.SYSTEM,
          name: "Automated System",
        },
        resource: {
          type: "Session",
          id: "session-1",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.actor.type).toBe(ActorType.SYSTEM);
    });
  });

  describe("Query operations", () => {
    beforeEach(async () => {
      // Create test data
      await auditService.log({
        action: AuditActionType.CREATE,
        actor: { id: "user-1", type: ActorType.USER },
        resource: { type: "User", id: "res-1" },
      });

      await auditService.log({
        action: AuditActionType.UPDATE,
        actor: { id: "user-1", type: ActorType.USER },
        resource: { type: "User", id: "res-1" },
      });

      await auditService.log({
        action: AuditActionType.DELETE,
        actor: { id: "user-2", type: ActorType.USER },
        resource: { type: "Post", id: "post-1" },
      });
    });

    it("should query all logs", async () => {
      const result = await auditService.query({ page: 1, limit: 100 });

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it("should filter by action", async () => {
      const result = await auditService.query({
        action: AuditActionType.CREATE,
        page: 1,
        limit: 100,
      });

      expect(result.data.every((log) => log.action === AuditActionType.CREATE)).toBe(true);
    });

    it("should filter by actor ID", async () => {
      const result = await auditService.query({
        actorId: "user-1",
        page: 1,
        limit: 100,
      });

      expect(result.data.every((log) => log.actor.id === "user-1")).toBe(true);
      expect(result.data.length).toBe(2);
    });

    it("should paginate results", async () => {
      const page1 = await auditService.query({ limit: 2, page: 1 });
      const page2 = await auditService.query({ limit: 2, page: 2 });

      expect(page1.data.length).toBeLessThanOrEqual(2);
      expect(page2.data.length).toBeGreaterThanOrEqual(0);
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
    });
  });

  describe("Actor tracking", () => {
    beforeEach(async () => {
      await auditService.log({
        action: AuditActionType.CREATE,
        actor: { id: "alice", type: ActorType.USER, name: "Alice" },
        resource: { type: "Post", id: "post-1" },
      });

      await auditService.log({
        action: AuditActionType.UPDATE,
        actor: { id: "alice", type: ActorType.USER, name: "Alice" },
        resource: { type: "Post", id: "post-1" },
      });

      await auditService.log({
        action: AuditActionType.CREATE,
        actor: { id: "bob", type: ActorType.USER, name: "Bob" },
        resource: { type: "Comment", id: "comment-1" },
      });
    });

    it("should retrieve all logs by actor", async () => {
      const logs = await auditService.getByActor("alice");

      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.actor.id === "alice")).toBe(true);
    });

    it("should filter logs by actor and action", async () => {
      const logs = await auditService.getByActor("alice", {
        action: AuditActionType.UPDATE,
      });

      expect(logs.length).toBe(1);
      expect(logs[0]?.action).toBe(AuditActionType.UPDATE);
    });

    it("should count actions by actor", async () => {
      const result = await auditService.query({
        actorId: "alice",
        page: 1,
        limit: 1,
      });

      expect(result.total).toBe(2);
    });
  });

  describe("Resource history", () => {
    beforeEach(async () => {
      // Create resource lifecycle
      await auditService.log({
        action: AuditActionType.CREATE,
        actor: { id: "user-1", type: ActorType.USER },
        resource: { type: "Document", id: "doc-1", label: "Draft" },
      });

      await auditService.log({
        action: AuditActionType.UPDATE,
        actor: { id: "user-2", type: ActorType.USER },
        resource: { type: "Document", id: "doc-1", label: "Review" },
      });

      await auditService.log({
        action: AuditActionType.UPDATE,
        actor: { id: "user-3", type: ActorType.USER },
        resource: { type: "Document", id: "doc-1", label: "Published" },
      });
    });

    it("should retrieve full resource history", async () => {
      const history = await auditService.getByResource("Document", "doc-1");

      expect(history.length).toBe(3);
      expect(history[0]?.action).toBe(AuditActionType.CREATE);
      expect(history[1]?.action).toBe(AuditActionType.UPDATE);
      expect(history[2]?.action).toBe(AuditActionType.UPDATE);
    });

    it("should track multiple actors on same resource", async () => {
      const history = await auditService.getByResource("Document", "doc-1");

      const actors = new Set(history.map((log) => log.actor.id));
      expect(actors.size).toBe(3);
    });
  });

  describe("Error scenarios", () => {
    it.skip("should handle invalid input", async () => {
      // TODO: Implement runtime validation for enum types
      await expect(
        auditService.log({
          action: "INVALID" as any,
          actor: { id: "user-1", type: ActorType.USER },
          resource: { type: "User", id: "res-1" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Bulk operations", () => {
    it("should handle multiple log creations", async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          auditService.log({
            action: AuditActionType.CREATE,
            actor: { id: `user-${i}`, type: ActorType.USER },
            resource: { type: "Resource", id: `res-${i}` },
          }),
        );
      }

      const results = await Promise.all(promises);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should efficiently query large datasets", async () => {
      // Create logs
      for (let i = 0; i < 30; i++) {
        await auditService.log({
          action: AuditActionType.CREATE,
          actor: { id: `user-${i}`, type: ActorType.USER },
          resource: { type: "Resource", id: `res-${i}` },
        });
      }

      const startTime = Date.now();
      const result = await auditService.query({ limit: 20, page: 1 });
      const duration = Date.now() - startTime;

      expect(result.data.length).toBeLessThanOrEqual(20);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });
  });
});
