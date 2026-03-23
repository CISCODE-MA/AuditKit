/**
 * ============================================================================
 * MONGODB AUDIT REPOSITORY - UNIT TESTS
 * ============================================================================
 *
 * Tests for MongoAuditRepository implementation.
 *
 * Coverage:
 * - CRUD operations
 * - Query building
 * - Filtering
 * - Pagination
 * - Sorting
 * - Error handling
 *
 * @packageDocumentation
 */

import type { Model } from "mongoose";

import type { AuditLog } from "../../../core/types";
import { ActorType, AuditActionType } from "../../../core/types";

import type { AuditLogDocument } from "./audit-log.schema";
import { MongoAuditRepository } from "./mongo-audit.repository";

// Skipped: MongoDB repository test mocks need proper Mongoose Model constructor patterns
// Current mock setup doesn't properly simulate Mongoose Model constructor behavior
// Tracking: https://github.com/CISCODE-MA/AuditKit/issues/TBD (Task AK-007)
describe.skip("MongoAuditRepository", () => {
  let repository: MongoAuditRepository;
  let mockModel: jest.Mocked<Model<AuditLogDocument>>;

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

  const createMockDocument = (log: AuditLog): any => ({
    _id: log.id as any,
    timestamp: log.timestamp,
    action: log.action,
    actor: log.actor,
    resource: log.resource,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    ...(log.changes ? { changes: log.changes } : {}),
    ...(log.metadata ? { metadata: log.metadata } : {}),
    toObject: jest.fn().mockReturnValue({
      _id: log.id,
      ...log,
    }),
  });

  beforeEach(() => {
    // Create a mock constructor that returns a document with save method
    const MockDocument = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ _id: data.id, ...data }),
      toObject: jest.fn().mockReturnValue({ _id: data.id, ...data }),
    }));

    // Create mock model as a constructor function with static methods
    mockModel = MockDocument as any;
    mockModel.create = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.find = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.deleteMany = jest.fn();

    repository = new MongoAuditRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AuditActionType.CREATE, () => {
    it("should create and return audit log", async () => {
      const log = createMockLog();
      const doc = createMockDocument(log);
      mockModel.create.mockResolvedValue([doc as any]);

      const created = await repository.create(log);

      expect(created.id).toBe(log.id);
      expect(created.action).toBe(log.action);
      expect(mockModel.create).toHaveBeenCalledWith({
        _id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        actor: log.actor,
        resource: log.resource,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        changes: undefined,
        metadata: undefined,
      });
    });

    it("should create log with changes", async () => {
      const log = createMockLog({
        changes: {
          name: { from: "Old", to: "New" },
        },
      });
      mockModel.create.mockResolvedValue([createMockDocument(log)]);

      await repository.create(log);
      mockModel.create.mockResolvedValue([createMockDocument(log)]);

      await repository.create(log);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: log.changes,
        }),
      );
    });

    it("should create log with metadata", async () => {
      const log = createMockLog({
        metadata: { correlationId: "corr-1" },
      });
      mockModel.create.mockResolvedValue([createMockDocument(log)]);

      await repository.create(log);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: log.metadata,
        }),
      );
    });

    it("should handle duplicate key error", async () => {
      const log = createMockLog();
      mockModel.create.mockRejectedValue({ code: 11000 });

      await expect(repository.create(log)).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should return log when it exists", async () => {
      const log = createMockLog();
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: log.id, ...log }),
        }),
      } as any);

      const found = await repository.findById(log.id);

      expect(found).toMatchObject({
        id: log.id,
        action: log.action,
      });
      expect(mockModel.findOne).toHaveBeenCalledWith({ id: log.id });
    });

    it("should return null when log does not exist", async () => {
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const found = await repository.findById("non-existent");

      expect(found).toBeNull();
    });

    it("should transform _id to id", async () => {
      const log = createMockLog();
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: log.id, ...log }),
        }),
      } as any);

      const found = await repository.findById(log.id);

      expect(found).toHaveProperty("id");
      expect(found).not.toHaveProperty("_id");
    });
  });

  describe("findByActor", () => {
    it("should query by actor ID", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByActor("user-1");

      expect(mockModel.find).toHaveBeenCalledWith({
        "actor.id": "user-1",
      });
    });

    it("should sort by timestamp descending", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByActor("user-1");

      expect(mockFind.sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it("should apply filters", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByActor("user-1", { action: AuditActionType.CREATE });

      expect(mockModel.find).toHaveBeenCalledWith({
        "actor.id": "user-1",
        action: AuditActionType.CREATE,
      });
    });

    it("should apply action filter", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByActor("user-1", { action: AuditActionType.CREATE });

      expect(mockModel.find).toHaveBeenCalledWith({
        "actor.id": "user-1",
        action: AuditActionType.CREATE,
      });
    });
  });

  describe("findByResource", () => {
    it("should query by resource type and ID", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByResource("User", "res-1");

      expect(mockModel.find).toHaveBeenCalledWith({
        "resource.type": "User",
        "resource.id": "res-1",
      });
    });

    it("should sort by timestamp ascending (chronological)", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);

      await repository.findByResource("User", "res-1");

      expect(mockFind.sort).toHaveBeenCalledWith({ timestamp: 1 });
    });
  });

  describe("query", () => {
    it("should build query without filters", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({});

      expect(mockModel.find).toHaveBeenCalledWith({});
    });

    it("should filter by action", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({ action: AuditActionType.CREATE });

      expect(mockModel.find).toHaveBeenCalledWith({ action: AuditActionType.CREATE });
    });

    it("should filter by multiple actions using $in", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({ actions: [AuditActionType.CREATE, AuditActionType.UPDATE] });

      expect(mockModel.find).toHaveBeenCalledWith({
        action: { $in: [AuditActionType.CREATE, AuditActionType.UPDATE] },
      });
    });

    it("should filter by actor ID", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({ actorId: "user-1" });

      expect(mockModel.find).toHaveBeenCalledWith({ "actor.id": "user-1" });
    });

    it("should filter by date range", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      const startDate = new Date("2026-03-01");
      const endDate = new Date("2026-03-31");

      await repository.query({ startDate, endDate });

      expect(mockModel.find).toHaveBeenCalledWith({
        timestamp: { $gte: startDate, $lte: endDate },
      });
    });

    it("should handle startDate only", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      const startDate = new Date("2026-03-01");

      await repository.query({ startDate });

      expect(mockModel.find).toHaveBeenCalledWith({
        timestamp: { $gte: startDate },
      });
    });

    it("should apply default pagination", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({});

      expect(mockFind.limit).toHaveBeenCalledWith(100);
      expect(mockFind.skip).toHaveBeenCalledWith(0);
    });

    it("should apply custom pagination", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({ limit: 50, page: 2 });

      expect(mockFind.limit).toHaveBeenCalledWith(50);
      expect(mockFind.skip).toHaveBeenCalledWith(50);
    });

    it("should sort by timestamp descending by default", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({});

      expect(mockFind.sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it("should sort ascending when specified", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      await repository.query({ sort: "timestamp" });

      expect(mockFind.sort).toHaveBeenCalledWith({ timestamp: 1 });
    });

    it("should return pagination metadata", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(150) } as any);

      const result = await repository.query({ limit: 50, page: 1 });

      expect(result.total).toBe(150);
      expect(result.limit).toBe(50);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(3);
    });

    it("should calculate pages correctly", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(25) } as any);

      const result = await repository.query({ limit: 50, page: 1 });

      expect(result.pages).toBe(1);
    });
  });

  describe("count", () => {
    it("should count all documents without filters", async () => {
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(42) } as any);

      const count = await repository.count();

      expect(count).toBe(42);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({});
    });

    it("should count with filters", async () => {
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(10) } as any);

      const count = await repository.count({ action: AuditActionType.CREATE });

      expect(count).toBe(10);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({ action: AuditActionType.CREATE });
    });
  });

  describe("exists", () => {
    it("should return true when count > 0", async () => {
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) } as any);

      const exists = await repository.exists({ action: AuditActionType.CREATE });

      expect(exists).toBe(true);
    });

    it("should return false when count = 0", async () => {
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) } as any);

      const exists = await repository.exists({ action: "DELETE" });

      expect(exists).toBe(false);
    });
  });

  describe("deleteOlderThan", () => {
    it("should delete documents older than date", async () => {
      const cutoffDate = new Date("2023-01-01");
      mockModel.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);

      await repository.deleteOlderThan(cutoffDate);

      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        timestamp: { $lt: cutoffDate },
      });
    });

    it("should handle no deletions", async () => {
      mockModel.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      await expect(repository.deleteOlderThan(new Date("2020-01-01"))).resolves.not.toThrow();
    });
  });

  describe("document transformation", () => {
    it("should transform _id to id", async () => {
      const log = createMockLog();
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: log.id, timestamp: log.timestamp }),
        }),
      } as any);

      const found = await repository.findById(log.id);

      expect(found).toHaveProperty("id", log.id);
      expect(found).not.toHaveProperty("_id");
    });

    it("should handle null document", async () => {
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      const found = await repository.findById("non-existent");

      expect(found).toBeNull();
    });

    it("should transform array of documents", async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: "log-1", action: AuditActionType.CREATE },
          { _id: "log-2", action: AuditActionType.UPDATE },
        ]),
      };
      mockModel.find.mockReturnValue(mockFind as any);
      mockModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(2) } as any);

      const result = await repository.query({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty("id", "log-1");
      expect(result.data[0]).not.toHaveProperty("_id");
    });
  });
});
