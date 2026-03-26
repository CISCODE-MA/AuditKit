/**
 * ============================================================================
 * AUDIT SERVICE UNIT TESTS
 * ============================================================================
 *
 * Comprehensive test suite for the AuditService class.
 *
 * Test Coverage:
 * - ✓ log() - Creating audit log entries
 * - ✓ logWithChanges() - Auto change detection
 * - ✓ getById() - Single entity retrieval
 * - ✓ getByActor() - Actor-based queries
 * - ✓ getByResource() - Resource history retrieval
 * - ✓ query() - Complex filtering and pagination
 * - ✓ detectChanges() - Standalone change detection
 * - ✓ Validation - Actor validation
 * - ✓ Error handling - All error cases
 *
 * Testing Strategy:
 * - Use mocks for all port interfaces (repository, generators, detectors)
 * - Test success paths AND failure paths
 * - Verify correct data transformations
 * - Ensure proper error propagation
 * - Check operation metadata (duration, field counts)
 */

/* eslint-disable no-unused-vars */

import { AuditService } from "./audit.service";
import type { CreateAuditLogDto } from "./dtos";
import type { IAuditLogRepository } from "./ports/audit-repository.port";
import type { IChangeDetector } from "./ports/change-detector.port";
import type { IIdGenerator } from "./ports/id-generator.port";
import type { ITimestampProvider } from "./ports/timestamp-provider.port";
import type { AuditLog, ChangeSet } from "./types";
import { ActorType, AuditActionType } from "./types";
// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

/**
 * Creates a mock repository for testing.
 * Simulates persistence layer without actual database.
 */
const createMockRepository = (): jest.Mocked<IAuditLogRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByActor: jest.fn(),
  findByResource: jest.fn(),
  query: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  deleteOlderThan: jest.fn(),
  archiveOlderThan: jest.fn(),
  queryWithCursor: jest.fn(),
});

/**
 * Creates a mock ID generator for testing.
 * Returns predictable IDs for assertion purposes.
 */
const createMockIdGenerator = (): jest.Mocked<IIdGenerator> => ({
  generate: jest.fn(() => "audit_test123"),
  generateBatch: jest.fn(),
  isValid: jest.fn((_id: string) => true),
  extractMetadata: jest.fn(),
  getInfo: jest.fn(() => ({
    name: "test-generator",
    version: "1.0.0",
    defaultLength: 21,
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    sortable: false,
    encoding: null,
  })),
});

/**
 * Creates a mock timestamp provider for testing.
 * Returns predictable timestamps for deterministic tests.
 */
const createMockTimestampProvider = (): jest.Mocked<ITimestampProvider> => ({
  now: jest.fn(() => new Date("2026-03-13T10:00:00.000Z")),
  format: jest.fn(),
  parse: jest.fn(),
  isValid: jest.fn((_timestamp: string | number | Date, _allowFuture?: boolean) => true),
  startOfDay: jest.fn(),
  endOfDay: jest.fn(),
  diff: jest.fn(),
  freeze: jest.fn(),
  advance: jest.fn(),
  unfreeze: jest.fn(),
  getInfo: jest.fn(),
});

/**
 * Creates a mock change detector for testing.
 * Simulates change detection logic.
 */
const createMockChangeDetector = (): jest.Mocked<IChangeDetector> => ({
  detectChanges: jest.fn(
    <T extends Record<string, unknown>>(_before: T, _after: T, _options?: any) => ({
      name: { from: "old", to: "new" },
    }),
  ),
  hasChanged: jest.fn((_before: unknown, _after: unknown, _fieldName?: string) => true),
  maskValue: jest.fn((_value) => "***"),
  formatChanges: jest.fn((_changes: any) => "name: old → new"),
});

// ============================================================================
// TEST FIXTURES - Reusable Test Data
// ============================================================================

/**
 * Valid actor for testing
 */
const validActor: AuditLog["actor"] = {
  id: "user-123",
  type: ActorType.USER,
  name: "John Doe",
  email: "john@example.com",
};

/**
 * Test IP addresses (RFC 5737 TEST-NET-1 range - reserved for documentation)
 * These are not real production IPs
 */
const MOCK_IP_ADDRESS_1 = "192.0.2.100"; // NOSONAR - RFC 5737 documentation IP
const MOCK_IP_ADDRESS_2 = "192.0.2.1"; // NOSONAR - RFC 5737 documentation IP

/**
 * Valid audit log DTO for testing
 */
const validDto: CreateAuditLogDto = {
  actor: validActor,
  action: AuditActionType.UPDATE,
  resource: {
    type: "order",
    id: "order-456",
    label: "Order #456",
  },
  changes: {
    status: { from: "pending", to: "shipped" },
  },
};

/**
 * Expected audit log result (what repository should return)
 */
const expectedAuditLog: AuditLog = {
  id: "audit_test123",
  timestamp: new Date("2026-03-13T10:00:00.000Z"),
  actor: validActor,
  action: AuditActionType.UPDATE,
  resource: {
    type: "order",
    id: "order-456",
    label: "Order #456",
  },
  changes: {
    status: { from: "pending", to: "shipped" },
  },
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe("AuditService", () => {
  let service: AuditService;
  let mockRepository: jest.Mocked<IAuditLogRepository>;
  let mockIdGenerator: jest.Mocked<IIdGenerator>;
  let mockTimestampProvider: jest.Mocked<ITimestampProvider>;
  let mockChangeDetector: jest.Mocked<IChangeDetector>;

  /**
   * Setup before each test:
   * - Create fresh mocks
   * - Instantiate service with mocks
   * - Reset all mock call histories
   */
  beforeEach(() => {
    mockRepository = createMockRepository();
    mockIdGenerator = createMockIdGenerator();
    mockTimestampProvider = createMockTimestampProvider();
    mockChangeDetector = createMockChangeDetector();

    service = new AuditService(
      mockRepository,
      mockIdGenerator,
      mockTimestampProvider,
      mockChangeDetector,
    );

    jest.clearAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // log() - Creating Audit Log Entries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("log()", () => {
    it("should create an audit log successfully", async () => {
      // Arrange: Mock repository to return the expected audit log
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act: Call the service method
      const result = await service.log(validDto);

      // Assert: Verify the result
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedAuditLog);
      expect(result.error).toBeUndefined();

      // Assert: Verify ID generation was called with correct prefix
      expect(mockIdGenerator.generate).toHaveBeenCalledWith({
        prefix: "audit_",
      });

      // Assert: Verify timestamp generation was called
      expect(mockTimestampProvider.now).toHaveBeenCalledWith({
        format: "date",
      });

      // Assert: Verify repository.create was called with correct data
      expect(mockRepository.create).toHaveBeenCalledWith({
        id: "audit_test123",
        timestamp: new Date("2026-03-13T10:00:00.000Z"),
        ...validDto,
      });
    });

    it("should include metadata about the operation", async () => {
      // Arrange
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act
      const result = await service.log(validDto);

      // Assert: Check metadata exists
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.fieldCount).toBe(1); // One field changed (status)
    });

    it("should handle logs without changes", async () => {
      // Arrange: DTO with no changes field
      const dtoWithoutChanges: CreateAuditLogDto = {
        actor: validActor,
        action: AuditActionType.ACCESS,
        resource: { type: "document", id: "doc-789" },
      };

      const expectedLog: AuditLog = {
        id: "audit_test123",
        timestamp: new Date("2026-03-13T10:00:00.000Z"),
        actor: validActor,
        action: AuditActionType.ACCESS,
        resource: { type: "document", id: "doc-789" },
      };

      mockRepository.create.mockResolvedValue(expectedLog);

      // Act
      const result = await service.log(dtoWithoutChanges);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should include optional fields when provided", async () => {
      // Arrange: DTO with all optional fields
      const fullDto: CreateAuditLogDto = {
        ...validDto,
        metadata: { customField: "value" },
        ipAddress: MOCK_IP_ADDRESS_1,
        userAgent: "Mozilla/5.0",
        requestId: "req-abc",
        sessionId: "sess-xyz",
        reason: "User requested change",
      };

      const fullAuditLog: AuditLog = {
        id: "audit_test123",
        timestamp: new Date("2026-03-13T10:00:00.000Z"),
        actor: validActor,
        action: AuditActionType.UPDATE,
        resource: {
          type: "order",
          id: "order-456",
          label: "Order #456",
        },
        changes: {
          status: { from: "pending", to: "shipped" },
        },
        metadata: { customField: "value" },
        ipAddress: MOCK_IP_ADDRESS_1,
        userAgent: "Mozilla/5.0",
        requestId: "req-abc",
        sessionId: "sess-xyz",
        reason: "User requested change",
      };

      mockRepository.create.mockResolvedValue(fullAuditLog);

      // Act
      await service.log(fullDto);

      // Assert: Verify all fields were passed to repository
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { customField: "value" },
          ipAddress: MOCK_IP_ADDRESS_1,
          userAgent: "Mozilla/5.0",
          requestId: "req-abc",
          sessionId: "sess-xyz",
          reason: "User requested change",
        }),
      );
    });

    it("should handle repository errors gracefully", async () => {
      // Arrange: Mock repository to throw an error
      const repositoryError = new Error("Database connection failed");
      mockRepository.create.mockRejectedValue(repositoryError);

      // Act
      const result = await service.log(validDto);

      // Assert: Should return failure result, not throw
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(result.data).toBeUndefined();
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    it("should reject invalid actor (missing id)", async () => {
      // Arrange: DTO with invalid actor
      const invalidDto: CreateAuditLogDto = {
        ...validDto,
        actor: { type: "user", name: "John" } as any, // Missing id
      };

      // Act
      const result = await service.log(invalidDto);

      // Assert: Should return failure result
      expect(result.success).toBe(false);
      expect(result.error).toContain("Actor ID");

      // Assert: Repository should NOT be called
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should reject invalid actor (invalid type)", async () => {
      // Arrange: DTO with invalid actor type
      const invalidDto: CreateAuditLogDto = {
        ...validDto,
        actor: { id: "test", type: "invalid" as any, name: "Test" },
      };

      // Act
      const result = await service.log(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("type");
    });

    it("should accept different actor types (user, system, service)", async () => {
      // Arrange
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      const actorTypes = [ActorType.USER, ActorType.SYSTEM, ActorType.SERVICE];

      // Act & Assert: All three types should be valid
      for (const type of actorTypes) {
        const dto: CreateAuditLogDto = {
          ...validDto,
          actor: { id: "test", type, name: "Test" },
        };

        const result = await service.log(dto);
        expect(result.success).toBe(true);
      }
    });

    it("should redact configured PII fields before persistence", async () => {
      const redactingService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        {
          piiRedaction: {
            enabled: true,
            fields: ["actor.email", "metadata.secret", "ipAddress"],
            mask: "***",
          },
        },
      );

      mockRepository.create.mockResolvedValue(expectedAuditLog);

      await redactingService.log({
        ...validDto,
        actor: {
          ...validActor,
          email: "john@example.com",
        },
        metadata: { secret: "top-secret" },
        ipAddress: MOCK_IP_ADDRESS_2,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: expect.objectContaining({ email: "***" }),
          metadata: expect.objectContaining({ secret: "***" }),
          ipAddress: "***",
        }),
      );
    });

    it("should deduplicate writes when idempotency key already exists", async () => {
      const idempotentService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        {
          idempotency: {
            enabled: true,
            keyStrategy: "idempotencyKey",
          },
        },
      );

      mockRepository.query.mockResolvedValue({
        data: [expectedAuditLog],
        page: 1,
        limit: 1,
        total: 1,
        pages: 1,
      });

      const result = await idempotentService.log({
        ...validDto,
        idempotencyKey: "idem-1",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedAuditLog);
      expect(result.metadata?.idempotentHit).toBe(true);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should run retention after write when enabled", async () => {
      const retentionService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        {
          retention: {
            enabled: true,
            retentionDays: 30,
            autoCleanupOnWrite: true,
            archiveBeforeDelete: true,
          },
        },
      );

      mockRepository.create.mockResolvedValue(expectedAuditLog);
      (mockRepository.archiveOlderThan as jest.Mock).mockResolvedValue(2);
      (mockRepository.deleteOlderThan as jest.Mock).mockResolvedValue(3);

      const result = await retentionService.log(validDto);

      expect(mockRepository.archiveOlderThan).toHaveBeenCalled();
      expect(mockRepository.deleteOlderThan).toHaveBeenCalled();
      expect(result.metadata?.retention).toBeDefined();
      expect(result.metadata?.retention?.archived).toBe(2);
      expect(result.metadata?.retention?.deleted).toBe(3);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // logWithChanges() - Auto Change Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("logWithChanges()", () => {
    it("should detect changes and create audit log", async () => {
      // Arrange
      const before = { name: "old", price: 100 };
      const after = { name: "new", price: 150 };

      const detectedChanges: ChangeSet = {
        name: { from: "old", to: "new" },
        price: { from: 100, to: 150 },
      };

      mockChangeDetector.detectChanges.mockReturnValue(detectedChanges);
      mockRepository.create.mockResolvedValue({
        ...expectedAuditLog,
        changes: detectedChanges,
      });

      // Act
      const result = await service.logWithChanges({
        actor: validActor,
        action: AuditActionType.UPDATE,
        resource: { type: "product", id: "prod-123" },
        before,
        after,
      });

      // Assert: Should succeed
      expect(result.success).toBe(true);

      // Assert: Change detector was called correctly
      expect(mockChangeDetector.detectChanges).toHaveBeenCalledWith(before, after);

      // Assert: Metadata reflects auto-detection
      expect(result.metadata?.changesDetected).toBe(true);
      expect(result.metadata?.fieldCount).toBe(2);

      // Assert: Created log includes auto-detection flag
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: detectedChanges,
          metadata: { autoDetected: true },
        }),
      );
    });

    it("should pass change detection options", async () => {
      // Arrange
      const before = { name: "old", ssn: "old-value" };
      const after = { name: "new", ssn: "new-value" };

      const options = {
        excludeFields: ["updatedAt"],
        maskFields: ["ssn"],
      };

      mockChangeDetector.detectChanges.mockReturnValue({
        name: { from: "old", to: "new" },
        ssn: { from: "***", to: "***" },
      });

      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act
      await service.logWithChanges({
        actor: validActor,
        action: AuditActionType.UPDATE,
        resource: { type: "user", id: "user-123" },
        before,
        after,
        options,
      });

      // Assert: Options were passed to change detector
      expect(mockChangeDetector.detectChanges).toHaveBeenCalledWith(before, after, options);
    });

    it("should fail if no change detector is configured", async () => {
      // Arrange: Create service WITHOUT change detector
      const serviceWithoutDetector = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        // No change detector
      );

      // Act
      const result = await serviceWithoutDetector.logWithChanges({
        actor: validActor,
        action: AuditActionType.UPDATE,
        resource: { type: "product", id: "prod-123" },
        before: { name: "old" },
        after: { name: "new" },
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should fail if no changes detected", async () => {
      // Arrange: Change detector returns empty changeset
      mockChangeDetector.detectChanges.mockReturnValue({});

      // Act
      const result = await service.logWithChanges({
        actor: validActor,
        action: AuditActionType.UPDATE,
        resource: { type: "product", id: "prod-123" },
        before: { name: "same" },
        after: { name: "same" },
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("identical");
      expect(result.metadata?.changesDetected).toBe(false);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // getById() - Single Entity Retrieval
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("getById()", () => {
    it("should retrieve an audit log by ID", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(expectedAuditLog);

      // Act
      const result = await service.getById("audit_test123");

      // Assert
      expect(result).toEqual(expectedAuditLog);
      expect(mockRepository.findById).toHaveBeenCalledWith("audit_test123");
    });

    it("should return null if audit log not found", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getById("nonexistent");

      // Assert
      expect(result).toBeNull();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // getByActor() - Actor-Based Queries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("getByActor()", () => {
    it("should retrieve all logs for an actor", async () => {
      // Arrange
      const actorLogs = [expectedAuditLog, { ...expectedAuditLog, id: "audit_test456" }];
      mockRepository.findByActor.mockResolvedValue(actorLogs);

      // Act
      const result = await service.getByActor("user-123");

      // Assert
      expect(result).toEqual(actorLogs);
      expect(mockRepository.findByActor).toHaveBeenCalledWith("user-123", undefined);
    });

    it("should pass filters to repository", async () => {
      // Arrange
      mockRepository.findByActor.mockResolvedValue([]);

      const filters = {
        action: AuditActionType.LOGIN,
        startDate: new Date("2026-03-01"),
      };

      // Act
      await service.getByActor("user-123", filters);

      // Assert
      expect(mockRepository.findByActor).toHaveBeenCalledWith("user-123", filters);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // getByResource() - Resource History Retrieval
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("getByResource()", () => {
    it("should retrieve complete resource history", async () => {
      // Arrange
      const resourceHistory = [
        { ...expectedAuditLog, action: AuditActionType.CREATE },
        { ...expectedAuditLog, action: AuditActionType.UPDATE },
        { ...expectedAuditLog, action: AuditActionType.DELETE },
      ];
      mockRepository.findByResource.mockResolvedValue(resourceHistory);

      // Act
      const result = await service.getByResource("order", "order-456");

      // Assert
      expect(result).toEqual(resourceHistory);
      expect(mockRepository.findByResource).toHaveBeenCalledWith("order", "order-456", undefined);
    });

    it("should pass filters to repository", async () => {
      // Arrange
      mockRepository.findByResource.mockResolvedValue([]);

      const filters = {
        actorId: "user-123",
        startDate: new Date("2026-03-01"),
      };

      // Act
      await service.getByResource("order", "order-456", filters);

      // Assert
      expect(mockRepository.findByResource).toHaveBeenCalledWith("order", "order-456", filters);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // query() - Complex Filtering and Pagination
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("query()", () => {
    it("should query with filters and pagination", async () => {
      // Arrange
      const paginatedResult = {
        data: [expectedAuditLog],
        page: 2,
        limit: 20,
        total: 100,
        pages: 5,
      };

      mockRepository.query.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.query({
        action: AuditActionType.UPDATE,
        page: 2,
        limit: 20,
        sort: "-timestamp",
      });

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(mockRepository.query).toHaveBeenCalledWith({
        action: "UPDATE",
        page: 2,
        limit: 20,
        sort: "-timestamp",
        actorId: undefined,
        actorType: undefined,
        resourceType: undefined,
        resourceId: undefined,
        startDate: undefined,
        endDate: undefined,
        ipAddress: undefined,
        search: undefined,
      });
    });

    it("should handle all query parameters", async () => {
      // Arrange
      mockRepository.query.mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      });

      // Act
      await service.query({
        actorId: "user-123",
        actorType: ActorType.USER,
        action: AuditActionType.ACCESS,
        resourceType: "document",
        resourceId: "doc-789",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31"),
        ipAddress: MOCK_IP_ADDRESS_2,
        search: "sensitive",
        page: 1,
        limit: 50,
        sort: "-timestamp",
      });

      // Assert: All parameters passed through
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-123",
          actorType: ActorType.USER,
          action: AuditActionType.ACCESS,
          resourceType: "document",
          resourceId: "doc-789",
          ipAddress: MOCK_IP_ADDRESS_2,
          search: "sensitive",
        }),
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // detectChanges() - Standalone Change Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("detectChanges()", () => {
    it("should detect changes without creating audit log", async () => {
      // Arrange
      const before = { name: "old", price: 100 };
      const after = { name: "new", price: 150 };

      const expectedChanges: ChangeSet = {
        name: { from: "old", to: "new" },
        price: { from: 100, to: 150 },
      };

      mockChangeDetector.detectChanges.mockReturnValue(expectedChanges);

      // Act
      const result = await service.detectChanges(before, after);

      // Assert
      expect(result).toEqual(expectedChanges);

      // Assert: Repository was NOT called (standalone operation)
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should pass options to change detector", async () => {
      // Arrange
      const options = {
        excludeFields: ["updatedAt"],
        maskFields: ["ssn"],
        maskStrategy: "full" as const,
      };

      mockChangeDetector.detectChanges.mockReturnValue({});

      // Act
      await service.detectChanges({ a: 1 }, { a: 2 }, options);

      // Assert
      expect(mockChangeDetector.detectChanges).toHaveBeenCalledWith({ a: 1 }, { a: 2 }, options);
    });

    it("should fail if no change detector configured", async () => {
      // Arrange: Service without change detector
      const serviceWithoutDetector = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
      );

      // Act & Assert
      await expect(serviceWithoutDetector.detectChanges({ a: 1 }, { a: 2 })).rejects.toThrow(
        "not configured",
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // queryWithCursor() - Cursor-Based Pagination
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("queryWithCursor()", () => {
    it("should return cursor-paginated results when repository supports it", async () => {
      // Arrange
      const cursorResult = {
        data: [expectedAuditLog],
        hasMore: true,
        limit: 10,
        nextCursor: "eyJ0IjoxNzQ2OTk0MDAwMDAwLCJpZCI6ImF1ZGl0XzEyMyJ9",
      };
      (mockRepository as any).queryWithCursor = jest.fn().mockResolvedValue(cursorResult);

      // Act
      const result = await service.queryWithCursor({}, { limit: 10 });

      // Assert
      expect(result).toEqual(cursorResult);
      expect((mockRepository as any).queryWithCursor).toHaveBeenCalledWith(expect.any(Object), {
        limit: 10,
      });
    });

    it("should pass filter fields from DTO to repository", async () => {
      // Arrange
      (mockRepository as any).queryWithCursor = jest.fn().mockResolvedValue({
        data: [],
        hasMore: false,
        limit: 20,
      });

      // Act
      await service.queryWithCursor(
        {
          actorId: "user-1",
          action: AuditActionType.UPDATE,
          resourceType: "order",
        },
        { limit: 20 },
      );

      // Assert: filter fields were passed
      expect((mockRepository as any).queryWithCursor).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-1",
          action: AuditActionType.UPDATE,
          resourceType: "order",
        }),
        { limit: 20 },
      );
    });

    it("should throw when repository does not support queryWithCursor", async () => {
      // Arrange: create a repo mock that explicitly lacks queryWithCursor
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { queryWithCursor: _omit, ...repoWithoutCursor } = createMockRepository();
      const svc = new AuditService(
        repoWithoutCursor as any,
        mockIdGenerator,
        mockTimestampProvider,
      );

      // Act & Assert
      await expect(svc.queryWithCursor({})).rejects.toThrow("Cursor pagination is not supported");
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Observer - Observability Hooks
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("observer hooks", () => {
    it("should call observer.onEvent after a successful log()", async () => {
      // Arrange
      const onEvent = jest.fn();
      const observerService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        { observer: { onEvent } },
      );
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act
      await observerService.log(validDto);

      // Assert: observer was called with a success event
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "create", success: true }),
      );
    });

    it("should call observer.onEvent with an error event when log() fails", async () => {
      // Arrange
      const onEvent = jest.fn();
      const observerService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        { observer: { onEvent } },
      );
      mockRepository.create.mockRejectedValue(new Error("DB error"));

      // Act — log() swallows errors and returns success:false
      const result = await observerService.log(validDto);

      // Assert: result is failure
      expect(result.success).toBe(false);

      // Assert: observer was called with a fail event
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "create",
          success: false,
          error: expect.any(Error),
        }),
      );
    });

    it("should not throw if observer.onEvent throws", async () => {
      // Arrange: observer that always throws
      const breakingObserver = {
        onEvent: jest.fn().mockImplementation(() => {
          throw new Error("observer error");
        }),
      };
      const observerService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        { observer: breakingObserver },
      );
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act & Assert: should not throw despite the observer error
      await expect(observerService.log(validDto)).resolves.not.toThrow();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Event Publisher - Event Streaming Hooks
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("event publisher hooks", () => {
    it("should publish audit.log.created after successful create", async () => {
      // Arrange
      const publish = jest.fn();
      const eventService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        { eventPublisher: { publish } },
      );
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act
      await eventService.log(validDto);

      // Assert
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "audit.log.created", payload: expectedAuditLog }),
      );
    });

    it("should not throw if event publisher throws", async () => {
      // Arrange
      const eventPublisher = {
        publish: jest.fn().mockImplementation(() => {
          throw new Error("publisher error");
        }),
      };
      const eventService = new AuditService(
        mockRepository,
        mockIdGenerator,
        mockTimestampProvider,
        mockChangeDetector,
        { eventPublisher },
      );
      mockRepository.create.mockResolvedValue(expectedAuditLog);

      // Act & Assert
      await expect(eventService.log(validDto)).resolves.not.toThrow();
    });
  });
});
