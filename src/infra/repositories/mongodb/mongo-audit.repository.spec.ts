/**
 * ============================================================================
 * MONGODB AUDIT REPOSITORY - UNIT TESTS
 * ============================================================================
 *
 * Tests for MongoAuditRepository implementation using proper Mongoose mocking.
 *
 * Coverage:
 * - CRUD operations (create, findById)
 * - Query operations (findByActor, findByResource, query)
 * - Count and exists operations
 * - Filtering (by action, actor, resource, date range)
 * - Pagination and sorting
 * - Document transformation (_id to id mapping)
 * - Error handling
 *
 * @packageDocumentation
 */

import type { AuditLog } from "../../../core/types";
import { ActorType, AuditActionType } from "../../../core/types";

import { MongoAuditRepository } from "./mongo-audit.repository";

describe("MongoAuditRepository", () => {
  let repository: MongoAuditRepository;
  let mockModel: any;

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
    // Create a mock Mongoose model with constructor behavior
    mockModel = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ _id: data.id, ...data }),
    }));

    // Add static methods to the mock model
    mockModel.findOne = jest.fn();
    mockModel.find = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.deleteMany = jest.fn();

    repository = new MongoAuditRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create and return audit log", async () => {
      const log = createMockLog();
      const saveMock = jest.fn().mockResolvedValue({ _id: log.id, ...log });
      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: saveMock,
      }));

      const created = await repository.create(log);

      expect(mockModel).toHaveBeenCalledWith(log);
      expect(saveMock).toHaveBeenCalled();
      expect(created.id).toBe(log.id);
      expect(created.action).toBe(log.action);
    });

    it("should create log with changes", async () => {
      const log = createMockLog({
        changes: {
          name: { from: "Old", to: "New" },
        },
      });
      const saveMock = jest.fn().mockResolvedValue({ _id: log.id, ...log });
      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: saveMock,
      }));

      await repository.create(log);

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: log.changes,
        }),
      );
    });

    it("should create log with metadata", async () => {
      const log = createMockLog({
        metadata: { correlationId: "corr-1" },
      });
      const saveMock = jest.fn().mockResolvedValue({ _id: log.id, ...log });
      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: saveMock,
      }));

      await repository.create(log);

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: log.metadata,
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return log when it exists", async () => {
      const log = createMockLog();
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: log.id, ...log }),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const found = await repository.findById(log.id);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: log.id });
      expect(chainMock.lean).toHaveBeenCalled();
      expect(chainMock.exec).toHaveBeenCalled();
      expect(found).toMatchObject({
        id: log.id,
        action: log.action,
      });
    });

    it("should return null when log does not exist", async () => {
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const found = await repository.findById("non-existent");

      expect(found).toBeNull();
    });

    it("should transform _id to id", async () => {
      const log = createMockLog();
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: log.id, ...log }),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const found = await repository.findById(log.id);

      expect(found).toHaveProperty("id");
      expect(found).not.toHaveProperty("_id");
    });
  });

  describe("findByActor", () => {
    it("should query by actor ID", async () => {
      const log = createMockLog();
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: log.id, ...log }]),
      };
      mockModel.find.mockReturnValue(chainMock);

      await repository.findByActor("user-1");

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "actor.id": "user-1",
        }),
      );
      expect(chainMock.sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it("should apply action filter", async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chainMock);

      await repository.findByActor("user-1", { action: AuditActionType.CREATE });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "actor.id": "user-1",
          action: AuditActionType.CREATE,
        }),
      );
    });
  });

  describe("findByResource", () => {
    it("should query by resource type and ID", async () => {
      const log = createMockLog();
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: log.id, ...log }]),
      };
      mockModel.find.mockReturnValue(chainMock);

      await repository.findByResource("user", "res-1");

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "resource.type": "user",
          "resource.id": "res-1",
        }),
      );
      expect(chainMock.sort).toHaveBeenCalledWith({ timestamp: 1 });
    });
  });

  describe("query", () => {
    it("should build query without filters", async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chainMock);

      const countChainMock = {
        exec: jest.fn().mockResolvedValue(0),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      await repository.query({});

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(chainMock.sort).toHaveBeenCalled();
      expect(chainMock.limit).toHaveBeenCalledWith(20); // default limit is 20
    });

    it("should filter by action", async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chainMock);

      const countChainMock = {
        exec: jest.fn().mockResolvedValue(0),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      await repository.query({ action: AuditActionType.CREATE });

      expect(mockModel.find).toHaveBeenCalledWith({ action: AuditActionType.CREATE });
    });

    it("should apply pagination", async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chainMock);

      const countChainMock = {
        exec: jest.fn().mockResolvedValue(150),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      await repository.query({ limit: 50, page: 2 });

      expect(chainMock.skip).toHaveBeenCalledWith(50);
      expect(chainMock.limit).toHaveBeenCalledWith(50);
    });

    it("should return pagination metadata", async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chainMock);

      const countChainMock = {
        exec: jest.fn().mockResolvedValue(150),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      const result = await repository.query({ limit: 50, page: 1 });

      expect(result.total).toBe(150);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.pages).toBe(3);
    });
  });

  describe("count", () => {
    it("should count all documents without filters", async () => {
      const countChainMock = {
        exec: jest.fn().mockResolvedValue(42),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      const count = await repository.count();

      expect(mockModel.countDocuments).toHaveBeenCalledWith({});
      expect(count).toBe(42);
    });

    it("should count with filters", async () => {
      const countChainMock = {
        exec: jest.fn().mockResolvedValue(10),
      };
      mockModel.countDocuments.mockReturnValue(countChainMock);

      const count = await repository.count({ action: AuditActionType.CREATE });

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ action: AuditActionType.CREATE });
      expect(count).toBe(10);
    });
  });

  describe("exists", () => {
    it("should return true when document exists", async () => {
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ id: "log-1" }),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const exists = await repository.exists({ action: AuditActionType.CREATE });

      expect(exists).toBe(true);
    });

    it("should return false when document does not exist", async () => {
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const exists = await repository.exists({ action: AuditActionType.DELETE });

      expect(exists).toBe(false);
    });
  });

  describe("deleteOlderThan", () => {
    it("should delete documents older than date", async () => {
      const cutoffDate = new Date("2023-01-01");
      const deleteChainMock = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      };
      mockModel.deleteMany.mockReturnValue(deleteChainMock);

      const deleted = await repository.deleteOlderThan(cutoffDate);

      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        timestamp: { $lt: cutoffDate },
      });
      expect(deleted).toBe(5);
    });

    it("should handle no deletions", async () => {
      const deleteChainMock = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };
      mockModel.deleteMany.mockReturnValue(deleteChainMock);

      const deleted = await repository.deleteOlderThan(new Date("2020-01-01"));

      expect(deleted).toBe(0);
    });
  });

  describe("document transformation", () => {
    it("should transform _id to id in returned documents", async () => {
      const log = createMockLog();
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: log.id,
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          actor: log.actor,
          resource: log.resource,
        }),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const found = await repository.findById(log.id);

      expect(found).toHaveProperty("id", log.id);
      expect(found).not.toHaveProperty("_id");
    });

    it("should handle null document", async () => {
      const chainMock = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(chainMock);

      const found = await repository.findById("non-existent");

      expect(found).toBeNull();
    });

    it("should transform array of documents", async () => {
      const log1 = createMockLog({ id: "log-1" });
      const log2 = createMockLog({ id: "log-2" });
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            _id: "mongodb-id-1",
            id: log1.id,
            timestamp: log1.timestamp,
            action: log1.action,
            actor: log1.actor,
            resource: log1.resource,
          },
          {
            _id: "mongodb-id-2",
            id: log2.id,
            timestamp: log2.timestamp,
            action: log2.action,
            actor: log2.actor,
            resource: log2.resource,
          },
        ]),
      };
      mockModel.find.mockReturnValue(chainMock);

      const logs = await repository.findByActor("user-1");

      expect(logs).toHaveLength(2);
      expect(logs[0]).toHaveProperty("id");
      expect(logs[0]).not.toHaveProperty("_id");
      expect(logs[1]).toHaveProperty("id");
      expect(logs[1]).not.toHaveProperty("_id");
    });
  });
});
