/**
 * ============================================================================
 * AUDIT SERVICE - CORE BUSINESS LOGIC
 * ============================================================================
 *
 * This file contains the core audit logging service that orchestrates
 * all audit log operations.
 *
 * Purpose:
 * - Create and persist audit log entries
 * - Query and retrieve audit logs with various filters
 * - Detect changes between object states automatically
 * - Validate inputs and enforce business rules
 * - Coordinate between repositories and utility providers
 *
 * Architecture:
 * - This is FRAMEWORK-FREE core business logic (no NestJS, no decorators)
 * - Depends ONLY on port interfaces (abstractions), never on concrete implementations
 * - Can be used in any JavaScript/TypeScript environment
 * - Pure dependency injection via constructor
 *
 * Why framework-free?
 * - Core business logic should not depend on frameworks
 * - Makes testing easier (no framework mocking needed)
 * - Can be reused outside NestJS if needed
 * - Enforces clean architecture boundaries
 *
 * @packageDocumentation
 */

import type { CreateAuditLogDto, CreateAuditLogWithChanges, QueryAuditLogsDto } from "./dtos";
import { InvalidActorError, InvalidChangeSetError } from "./errors";
import type { IAuditLogRepository } from "./ports/audit-repository.port";
import type { IChangeDetector } from "./ports/change-detector.port";
import type { IIdGenerator } from "./ports/id-generator.port";
import type { ITimestampProvider } from "./ports/timestamp-provider.port";
import type { AuditLog, AuditLogFilters, PageResult, ChangeSet, PageOptions } from "./types";

// ============================================================================
// AUDIT SERVICE RESULT TYPES
// ============================================================================

/**
 * Result of creating an audit log.
 * Contains the created log and operation metadata.
 */
export interface CreateAuditLogResult {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * The created audit log (if successful)
   */
  data?: AuditLog;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Additional context about the operation
   */
  metadata?: {
    /**
     * Time taken to create the log (in milliseconds)
     */
    duration?: number;

    /**
     * Whether changes were auto-detected
     */
    changesDetected?: boolean;

    /**
     * Number of fields changed (if applicable)
     */
    fieldCount?: number;
  };
}

// ============================================================================
// MAIN AUDIT SERVICE
// ============================================================================

/**
 * Core audit logging service.
 *
 * Orchestrates all audit log operations using dependency injection.
 * This class is framework-free and depends only on port interfaces.
 *
 * @example Basic usage
 * ```typescript
 * const service = new AuditService(repository, idGenerator, timestampProvider, changeDetector);
 *
 * const result = await service.log({
 *   actor: { id: 'user-123', type: 'user', name: 'John Doe' },
 *   action: 'UPDATE',
 *   resource: { type: 'order', id: 'order-456' },
 *   changes: { status: { from: 'pending', to: 'shipped' } }
 * });
 * ```
 */
export class AuditService {
  /**
   * Creates a new AuditService instance.
   *
   * All dependencies are injected via constructor (dependency injection pattern).
   * This makes the service testable and framework-agnostic.
   *
   * @param repository - Persistence layer for audit logs
   * @param idGenerator - Generates unique IDs for audit logs
   * @param timestampProvider - Provides consistent timestamps
   * @param changeDetector - Detects changes between object states (optional)
   */
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly _repository: IAuditLogRepository,
    // eslint-disable-next-line no-unused-vars
    private readonly _idGenerator: IIdGenerator,
    // eslint-disable-next-line no-unused-vars
    private readonly _timestampProvider: ITimestampProvider,
    // eslint-disable-next-line no-unused-vars
    private readonly _changeDetector?: IChangeDetector,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE OPERATIONS - Logging New Audit Entries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Creates a new audit log entry.
   *
   * This is the primary method for logging auditable actions.
   * It validates the input, generates an ID and timestamp, and persists the log.
   *
   * @param dto - The audit log data to create
   * @returns Result containing the created audit log
   * @throws {InvalidActorError} If actor validation fails
   * @throws {InvalidChangeSetError} If changeset validation fails
   *
   * @example Log a user action
   * ```typescript
   * const result = await service.log({
   *   actor: { id: 'user-123', type: 'user', name: 'John Doe', email: 'john@example.com' },
   *   action: 'UPDATE',
   *   resource: { type: 'order', id: 'order-456', label: 'Order #456' },
   *   changes: { status: { from: 'pending', to: 'shipped' } },
   *   metadata: { reason: 'Customer requested expedited shipping' }
   * });
   * ```
   *
   * @example Log a system action
   * ```typescript
   * const result = await service.log({
   *   actor: { id: 'cron-job', type: 'system', name: 'Daily Cleanup Job' },
   *   action: 'DELETE',
   *   resource: { type: 'temporary_file', id: 'file-789' },
   *   metadata: { retention: '7 days', autoCleanup: true }
   * });
   * ```
   */
  async log(dto: CreateAuditLogDto): Promise<CreateAuditLogResult> {
    const startTime = Date.now();

    try {
      // Validate the actor (who is performing the action)
      // Cast to Actor because CreateAuditLogDto's actor has optional fields but satisfies the interface
      this.validateActor(dto.actor as AuditLog["actor"]);

      // Generate a unique ID for this audit log entry
      const id = this._idGenerator.generate({ prefix: "audit_" });

      // Get the current timestamp (ensures consistency across the system)
      const timestamp = this._timestampProvider.now({ format: "date" }) as Date;

      // Build the complete audit log object
      const auditLog: AuditLog = {
        id,
        timestamp,
        actor: dto.actor as AuditLog["actor"],
        action: dto.action as AuditLog["action"],
        resource: dto.resource as AuditLog["resource"],
      };

      // Add optional fields only if they're defined
      if (dto.changes !== undefined) {
        (auditLog as any).changes = dto.changes;
      }
      if (dto.metadata !== undefined) {
        (auditLog as any).metadata = dto.metadata;
      }
      if (dto.ipAddress !== undefined) {
        (auditLog as any).ipAddress = dto.ipAddress;
      }
      if (dto.userAgent !== undefined) {
        (auditLog as any).userAgent = dto.userAgent;
      }
      if (dto.requestId !== undefined) {
        (auditLog as any).requestId = dto.requestId;
      }
      if (dto.sessionId !== undefined) {
        (auditLog as any).sessionId = dto.sessionId;
      }
      if (dto.reason !== undefined) {
        (auditLog as any).reason = dto.reason;
      }

      // Persist the audit log to the repository
      const created = await this._repository.create(auditLog);

      // Calculate operation duration
      const duration = Date.now() - startTime;

      // Return success result with metadata
      return {
        success: true,
        data: created,
        metadata: {
          duration,
          fieldCount: dto.changes ? Object.keys(dto.changes).length : 0,
        },
      };
    } catch (error) {
      // Return failure result with error details
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Creates an audit log with automatic change detection.
   *
   * This is a convenience method that automatically detects what changed
   * between the 'before' and 'after' states of an entity.
   *
   * Requires a change detector to be configured in the service.
   *
   * @param dto - Audit log data with before/after states
   * @returns Result containing the created audit log with detected changes
   * @throws {Error} If no change detector is configured
   * @throws {InvalidActorError} If actor validation fails
   * @throws {InvalidChangeSetError} If change detection fails or produces invalid changeset
   *
   * @example Automatic change detection
   * ```typescript
   * const before = { name: 'Old Product', price: 100, status: 'draft' };
   * const after = { name: 'New Product', price: 150, status: 'published' };
   *
   * const result = await service.logWithChanges({
   *   actor: { id: 'user-123', type: 'user', name: 'Admin' },
   *   action: 'UPDATE',
   *   resource: { type: 'product', id: 'prod-789' },
   *   before,
   *   after,
   *   options: {
   *     excludeFields: ['updatedAt'], // Don't track timestamp changes
   *     maskFields: ['secretKey']     // Mask sensitive fields
   *   }
   * });
   *
   * // Result will include:
   * // changes: {
   * //   name: { from: 'Old Product', to: 'New Product' },
   * //   price: { from: 100, to: 150 },
   * //   status: { from: 'draft', to: 'published' }
   * // }
   * ```
   */
  async logWithChanges(dto: CreateAuditLogWithChanges): Promise<CreateAuditLogResult> {
    const startTime = Date.now();

    try {
      // Ensure a change detector is available
      if (!this._changeDetector) {
        throw new Error("Change detector not configured. Cannot auto-detect changes.");
      }

      // Detect changes between before and after states
      const beforeState = dto.before || {};
      const afterState = dto.after || {};

      const changes = dto.options
        ? await this._changeDetector.detectChanges(beforeState, afterState, dto.options as any)
        : await this._changeDetector.detectChanges(beforeState, afterState);

      // Validate that changes were actually detected
      if (!changes || Object.keys(changes).length === 0) {
        throw InvalidChangeSetError.noChanges(dto.before, dto.after);
      }

      // Create the audit log with the detected changes
      const result = await this.log({
        actor: dto.actor,
        action: dto.action,
        resource: dto.resource,
        changes,
        metadata: {
          ...dto.metadata,
          autoDetected: true, // Flag that changes were auto-detected
        },
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        requestId: dto.requestId,
        sessionId: dto.sessionId,
        reason: dto.reason,
      });

      // Add change detection metadata to the result
      if (result.metadata) {
        result.metadata.changesDetected = true;
        result.metadata.fieldCount = Object.keys(changes).length;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          changesDetected: false,
        },
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READ OPERATIONS - Querying and Retrieving Audit Logs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Retrieves a single audit log by its ID.
   *
   * @param id - The audit log ID to retrieve
   * @returns The audit log if found, null otherwise
   *
   * @example
   * ```typescript
   * const log = await service.getById('audit_abc123');
   * if (log) {
   *   console.log('Found:', log.action, 'by', log.actor.name);
   * } else {
   *   console.log('Audit log not found');
   * }
   * ```
   */
  async getById(id: string): Promise<AuditLog | null> {
    return this._repository.findById(id);
  }

  /**
   * Retrieves all audit logs for a specific actor (user, system, or service).
   *
   * Useful for:
   * - User activity dashboards
   * - Compliance audits (what did this user do?)
   * - Security investigations
   *
   * @param actorId - The actor's unique identifier
   * @param filters - Optional filters (date range, action type, etc.)
   * @returns Array of audit logs performed by this actor
   *
   * @example Get all actions by a user
   * ```typescript
   * const logs = await service.getByActor('user-123');
   * console.log(`User performed ${logs.length} actions`);
   * ```
   *
   * @example Get user's login attempts in the last 24 hours
   * ```typescript
   * const yesterday = new Date();
   * yesterday.setDate(yesterday.getDate() - 1);
   *
   * const loginAttempts = await service.getByActor('user-123', {
   *   action: 'LOGIN',
   *   startDate: yesterday
   * });
   * ```
   */
  async getByActor(actorId: string, filters?: Partial<AuditLogFilters>): Promise<AuditLog[]> {
    return this._repository.findByActor(actorId, filters);
  }

  /**
   * Retrieves the complete audit trail for a specific resource.
   *
   * Returns all actions performed on a resource in chronological order.
   * Essential for:
   * - Compliance reporting (GDPR data access requests)
   * - Debugging (how did this entity get into this state?)
   * - Change history views in UI
   *
   * @param resourceType - The type of resource (e.g., 'user', 'order', 'document')
   * @param resourceId - The resource's unique identifier
   * @param filters - Optional filters (date range, actor, etc.)
   * @returns Complete history of the resource (chronological)
   *
   * @example Get complete history of an order
   * ```typescript
   * const history = await service.getByResource('order', 'order-456');
   * console.log('Order timeline:');
   * history.forEach(log => {
   *   console.log(`- ${log.timestamp}: ${log.action} by ${log.actor.name}`);
   * });
   * // Output:
   * // - 2026-03-01T10:00:00Z: CREATE by John Doe
   * // - 2026-03-01T14:30:00Z: UPDATE by Admin (status: pending → processing)
   * // - 2026-03-02T09:15:00Z: UPDATE by Admin (status: processing → shipped)
   * ```
   *
   * @example Get recent changes to a document
   * ```typescript
   * const lastWeek = new Date();
   * lastWeek.setDate(lastWeek.getDate() - 7);
   *
   * const recentChanges = await service.getByResource('document', 'doc-789', {
   *   startDate: lastWeek,
   *   action: 'UPDATE'
   * });
   * ```
   */
  async getByResource(
    resourceType: string,
    resourceId: string,
    filters?: Partial<AuditLogFilters>,
  ): Promise<AuditLog[]> {
    return this._repository.findByResource(resourceType, resourceId, filters);
  }

  /**
   * Queries audit logs with complex filters and pagination.
   *
   * This is the most flexible query method. Supports:
   * - Multiple filter combinations
   * - Pagination (page/limit)
   * - Sorting
   * - Date ranges
   * - Full-text search (if supported by backend)
   *
   * @param dto - Query filters and pagination options
   * @returns Paginated result with data and metadata
   *
   * @example Get page 2 of UPDATE actions
   * ```typescript
   * const result = await service.query({
   *   action: 'UPDATE',
   *   page: 2,
   *   limit: 20,
   *   sort: '-timestamp' // Newest first
   * });
   *
   * console.log(`Found ${result.total} total, showing page ${result.page}/${result.totalPages}`);
   * result.data.forEach(log => console.log(log));
   * ```
   *
   * @example Search for sensitive data access
   * ```typescript
   * const result = await service.query({
   *   action: 'ACCESS',
   *   resourceType: 'customer_pii',
   *   startDate: new Date('2026-01-01'),
   *   endDate: new Date('2026-03-31'),
   *   sort: '-timestamp'
   * });
   *
   * console.log(`${result.total} PII access events in Q1 2026`);
   * ```
   */
  async query(dto: QueryAuditLogsDto): Promise<PageResult<AuditLog>> {
    // Convert DTO to filters format expected by repository
    const filters: Partial<AuditLogFilters> & Partial<PageOptions> = {};

    // Only add properties that are defined
    if (dto.actorId !== undefined) filters.actorId = dto.actorId;
    if (dto.actorType !== undefined) filters.actorType = dto.actorType;
    if (dto.action !== undefined) filters.action = dto.action;
    if (dto.resourceType !== undefined) filters.resourceType = dto.resourceType;
    if (dto.resourceId !== undefined) filters.resourceId = dto.resourceId;
    if (dto.startDate !== undefined) filters.startDate = dto.startDate;
    if (dto.endDate !== undefined) filters.endDate = dto.endDate;
    if (dto.ipAddress !== undefined) filters.ipAddress = dto.ipAddress;
    if (dto.search !== undefined) filters.search = dto.search;
    if (dto.page !== undefined) filters.page = dto.page;
    if (dto.limit !== undefined) filters.limit = dto.limit;
    if (dto.sort !== undefined) filters.sort = dto.sort;

    return this._repository.query(filters);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHANGE DETECTION - Comparing Object States
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Detects changes between two object states.
   *
   * This is a standalone utility method that doesn't create an audit log.
   * Useful when you want to:
   * - Preview changes before logging
   * - Validate changes before saving
   * - Use change detection separate from audit logging
   *
   * @param before - Object state before the change
   * @param after - Object state after the change
   * @param options - Optional change detection configuration
   * @returns ChangeSet containing all detected field changes
   * @throws {Error} If no change detector is configured
   *
   * @example Detect changes between product versions
   * ```typescript
   * const oldProduct = { name: 'Widget', price: 100, stock: 50 };
   * const newProduct = { name: 'Widget Pro', price: 100, stock: 45 };
   *
   * const changes = await service.detectChanges(oldProduct, newProduct);
   * // { name: { from: 'Widget', to: 'Widget Pro' }, stock: { from: 50, to: 45 } }
   * ```
   *
   * @example With field masking
   * ```typescript
   * const oldUser = { username: 'john', apiKey: 'key_old123', role: 'user' };
   * const newUser = { username: 'john', apiKey: 'key_new456', role: 'admin' };
   *
   * const changes = await service.detectChanges(oldUser, newUser, {
   *   maskFields: ['apiKey']
   * });
   * // { apiKey: { from: '***', to: '***' }, role: { from: 'user', to: 'admin' } }
   * ```
   */
  async detectChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    options?: {
      excludeFields?: string[];
      maskFields?: string[];
      maskStrategy?: "full" | "partial" | "hash";
    },
  ): Promise<ChangeSet> {
    if (!this._changeDetector) {
      throw new Error("Change detector not configured. Cannot detect changes.");
    }

    return this._changeDetector.detectChanges(before, after, options);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDATION - Business Rule Enforcement
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Validates an actor (ensures all required fields are present and valid).
   *
   * This is called automatically by log() but can also be used standalone.
   *
   * @param actor - The actor to validate
   * @throws {InvalidActorError} If validation fails
   *
   * @example
   * ```typescript
   * service.validateActor({ id: 'user-123', type: 'user', name: 'John' }); // ✓ Valid
   * service.validateActor({ type: 'user', name: 'John' }); // ✗ Throws (missing id)
   * service.validateActor({ id: 'user-123', type: 'invalid' }); // ✗ Throws (invalid type)
   * ```
   */
  private validateActor(actor: AuditLog["actor"]): void {
    // Check for required ID field
    if (!actor.id || typeof actor.id !== "string" || actor.id.trim() === "") {
      throw InvalidActorError.missingId();
    }

    // Validate actor type (must be 'user', 'system', or 'service')
    if (!["user", "system", "service"].includes(actor.type)) {
      throw InvalidActorError.invalidType(actor.type);
    }
  }
}
