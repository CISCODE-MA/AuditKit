/**
 * ============================================================================
 * AUDIT REPOSITORY PORT - PERSISTENCE ABSTRACTION
 * ============================================================================
 *
 * This file defines the port (interface) for audit log persistence.
 * It's a contract that any storage implementation must fulfill.
 *
 * Purpose:
 * - Abstract away persistence details (database, file system, etc.)
 * - Allow the core service to depend on an interface, not implementation
 * - Enable swapping storage backends without changing business logic
 * - Support testing with mock implementations
 *
 * Pattern: Ports & Adapters (Hexagonal Architecture)
 * - This is a PORT (interface)
 * - Concrete implementations are ADAPTERS (e.g., DatabaseKitAdapter)
 *
 * Architecture Rules:
 * - This interface is in core/ - framework-free
 * - Implementations go in infra/ - can use external dependencies
 * - Core services depend ONLY on this port, never on concrete adapters
 *
 * @packageDocumentation
 */

import type { AuditLog, AuditLogFilters, PageOptions, PageResult } from "../types";

// ESLint disable for interface method parameters (they're part of the contract, not actual code)
/* eslint-disable no-unused-vars */

// ===========================================================================
// MAIN REPOSITORY PORT
// ============================================================================

/**
 * Port (interface) for audit log persistence operations.
 *
 * Defines all data access methods needed by the audit service.
 * Any storage backend (MongoDB, PostgreSQL, file system, etc.) must
 * implement this interface.
 *
 * Key Characteristics:
 * - **Immutable**: No update() or delete() methods (audit logs never change)
 * - **Append-only**: Only create() for writing
 * - **Query-heavy**: Multiple read methods for different access patterns
 *
 * Implementation Examples:
 * - MongoAuditLogRepository (uses DatabaseKit MongoDB adapter)
 * - PostgresAuditLogRepository (uses DatabaseKit PostgreSQL adapter)
 * - InMemoryAuditLogRepository (for testing)
 * - FileAuditLogRepository (append-only JSON files)
 */
export interface IAuditLogRepository {
  // ─────────────────────────────────────────────────────────────────────────
  // WRITE OPERATIONS (Create Only - Immutable Audit Logs)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates (persists) a new audit log entry.
   *
   * This is the ONLY write operation - audit logs are immutable once created.
   * The implementation should:
   * - Persist the audit log to storage
   * - Return the complete audit log (with any DB-generated fields)
   * - Ensure atomicity (all-or-nothing)
   *
   * @param log - The audit log to persist
   * @returns The persisted audit log (may include DB-generated fields)
   * @throws Error if persistence fails
   *
   * @example
   * ```typescript
   * const auditLog: AuditLog = {
   *   id: 'audit-123',
   *   actor: { id: 'user-1', type: ActorType.USER },
   *   action: AuditActionType.UPDATE,
   *   resource: { type: 'user', id: 'user-456' },
   *   timestamp: new Date(),
   * };
   * const saved = await repository.create(auditLog);
   * ```
   */
  create(_log: AuditLog): Promise<AuditLog>;

  // ─────────────────────────────────────────────────────────────────────────
  // READ OPERATIONS - Single Entity Retrieval
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Finds a single audit log by its unique identifier.
   *
   * @param id - The audit log ID
   * @returns The audit log if found, null otherwise
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * const log = await repository.findById('audit-123');
   * if (log) {
   *   console.log('Found:', log.action);
   * } else {
   *   console.log('Not found');
   * }
   * ```
   */
  findById(_id: string): Promise<AuditLog | null>;

  // ─────────────────────────────────────────────────────────────────────────
  // READ OPERATIONS - List/Collection Retrieval
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Finds all audit logs for a specific actor.
   *
   * Returns all actions performed by the given actor (user, system, service).
   * Useful for:
   * - User activity reports
   * - Security investigations
   * - Compliance audits
   *
   * @param actorId - The actor's unique identifier
   * @param filters - Optional additional filters (date range, action type, etc.)
   * @returns Array of audit logs (may be empty)
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * // Get all actions by user-123 in the last 30 days
   * const logs = await repository.findByActor('user-123', {
   *   startDate: new Date('2026-02-01'),
   *   endDate: new Date('2026-03-01'),
   * });
   * ```
   */
  findByActor(_actorId: string, _filters?: Partial<AuditLogFilters>): Promise<AuditLog[]>;

  /**
   * Finds all audit logs for a specific resource.
   *
   * Returns the complete history of a resource (all actions performed on it).
   * Useful for:
   * - Entity audit trails
   * - Change history tracking
   * - Debugging data issues
   *
   * @param resourceType - The type of resource (e.g., "user", "order")
   * @param resourceId - The resource's unique identifier
   * @param filters - Optional additional filters
   * @returns Array of audit logs (may be empty)
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * // Get complete history of order-789
   * const history = await repository.findByResource('order', 'order-789');
   * console.log('Order was:', history.map(log => log.action));
   * // Output: ['CREATE', 'UPDATE', 'UPDATE', 'DELETE']
   * ```
   */
  findByResource(
    _resourceType: string,
    _resourceId: string,
    _filters?: Partial<AuditLogFilters>,
  ): Promise<AuditLog[]>;

  /**
   * Queries audit logs with complex filters and pagination.
   *
   * This is the most flexible query method - supports:
   * - Multiple filter combinations
   * - Pagination (page/limit)
   * - Sorting
   * - Date ranges
   * - Full-text search (if supported by backend)
   *
   * @param filters - Filter criteria and pagination options
   * @returns Paginated result with data and metadata
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * // Get page 2 of UPDATE actions, 20 per page, sorted by newest first
   * const result = await repository.query({
   *   action: AuditActionType.UPDATE,
   *   page: 2,
   *   limit: 20,
   *   sort: '-timestamp',
   * });
   * console.log(`Found ${result.total} total, showing ${result.data.length}`);
   * ```
   */
  query(_filters: Partial<AuditLogFilters> & Partial<PageOptions>): Promise<PageResult<AuditLog>>;

  // ─────────────────────────────────────────────────────────────────────────
  // READ OPERATIONS - Aggregation/Statistics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Counts audit logs matching the given filters.
   *
   * Useful for:
   * - Dashboard statistics
   * - Quota tracking
   * - Performance monitoring (before running expensive queries)
   *
   * @param filters - Optional filter criteria
   * @returns Number of matching audit logs
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * // Count failed login attempts today
   * const failedLogins = await repository.count({
   *   action: 'LOGIN_FAILED',
   *   startDate: new Date(new Date().setHours(0, 0, 0, 0)),
   * });
   * if (failedLogins > 100) {
   *   console.warn('Possible brute force attack!');
   * }
   * ```
   */
  count(_filters?: Partial<AuditLogFilters>): Promise<number>;

  /**
   * Checks if any audit log exists matching the filters.
   *
   * More efficient than count() or query() when you only need to know
   * "does at least one exist?"
   *
   * @param filters - Filter criteria
   * @returns True if at least one audit log matches, false otherwise
   * @throws Error if query execution fails
   *
   * @example
   * ```typescript
   * // Check if user ever accessed sensitive data
   * const hasAccessed = await repository.exists({
   *   actorId: 'user-123',
   *   action: AuditActionType.ACCESS,
   *   resourceType: 'sensitive_document',
   * });
   * ```
   */
  exists(_filters: Partial<AuditLogFilters>): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL OPERATIONS - Advanced Features
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deletes audit logs older than the specified date.
   *
   * ⚠️ IMPORTANT: This violates audit log immutability!
   * Only use for:
   * - Compliance-mandated data retention policies
   * - Archival before deletion (move to cold storage)
   *
   * Many implementations should NOT implement this method.
   * If implemented, should require special permissions.
   *
   * @param beforeDate - Delete logs older than this date
   * @returns Number of audit logs deleted
   * @throws Error if deletion fails or not supported
   *
   * @example
   * ```typescript
   * // Delete audit logs older than 7 years (GDPR retention)
   * const sevenYearsAgo = new Date();
   * sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
   * const deleted = await repository.deleteOlderThan?.(sevenYearsAgo);
   * ```
   */
  deleteOlderThan?(_beforeDate: Date): Promise<number>;

  /**
   * Archives audit logs to long-term storage.
   *
   * Moves audit logs to cheaper/slower storage (e.g., AWS Glacier, tape).
   * The logs remain queryable but with higher latency.
   *
   * @param beforeDate - Archive logs older than this date
   * @returns Number of audit logs archived
   * @throws Error if archival fails or not supported
   */
  archiveOlderThan?(_beforeDate: Date): Promise<number>;
}
