/**
 * ============================================================================
 * IN-MEMORY AUDIT REPOSITORY
 * ============================================================================
 *
 * In-memory implementation of the IAuditLogRepository port.
 *
 * Purpose:
 * - Testing without database dependencies
 * - Prototyping and development
 * - Simple deployments without database
 * - Demo and educational purposes
 *
 * Characteristics:
 * - Fast (no I/O)
 * - Volatile (data lost on restart)
 * - Single-process only (no distributed support)
 * - Full query support (filtering, pagination, sorting)
 *
 * Use Cases:
 * - Unit/integration testing
 * - Local development
 * - Serverless functions (short-lived)
 * - POCs and demos
 *
 * DO NOT USE FOR:
 * - Production with data persistence requirements
 * - Multi-instance deployments
 * - Long-running processes
 *
 * @packageDocumentation
 */

import type { IAuditLogRepository } from "../../../core/ports/audit-repository.port";
import type { AuditLog, AuditLogFilters, PageOptions, PageResult } from "../../../core/types";

// eslint-disable-next-line no-unused-vars
type ArchiveHandler = (logs: AuditLog[]) => Promise<void> | void;

/**
 * In-memory implementation of audit log repository.
 *
 * Stores audit logs in a Map for O(1) lookups by ID.
 * Supports all query operations through in-memory filtering.
 *
 * @example Basic usage
 * ```typescript
 * const repository = new InMemoryAuditRepository();
 *
 * // Create audit log
 * await repository.create(auditLog);
 *
 * // Query
 * const logs = await repository.findByActor('user-123');
 * ```
 *
 * @example Testing
 * ```typescript
 * describe('AuditService', () => {
 *   let repository: InMemoryAuditRepository;
 *
 *   beforeEach(() => {
 *     repository = new InMemoryAuditRepository();
 *   });
 *
 *   it('should create audit log', async () => {
 *     const log = await repository.create(testAuditLog);
 *     expect(log.id).toBe(testAuditLog.id);
 *   });
 * });
 * ```
 */
export class InMemoryAuditRepository implements IAuditLogRepository {
  /**
   * Internal storage: Map<id, AuditLog>
   * Using Map for O(1) lookups by ID.
   */
  private readonly logs = new Map<string, AuditLog>();

  private readonly archiveHandler: ArchiveHandler | undefined;

  /**
   * Creates a new in-memory repository.
   *
   * @param initialData - Optional initial audit logs (for testing)
   */
  constructor(initialData?: AuditLog[], archiveHandler?: ArchiveHandler) {
    this.archiveHandler = archiveHandler;
    if (initialData) {
      initialData.forEach((log) => this.logs.set(log.id, log));
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE OPERATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Creates (stores) a new audit log entry.
   *
   * @param log - The audit log to persist
   * @returns The persisted audit log (deep copy to ensure immutability)
   * @throws Error if log with same ID already exists
   */
  async create(log: AuditLog): Promise<AuditLog> {
    if (this.logs.has(log.id)) {
      throw new Error(`Audit log with ID "${log.id}" already exists`);
    }

    // Deep copy to prevent external mutations
    const copy = this.deepCopy(log);
    this.logs.set(log.id, copy);

    // Return another copy to prevent mutations
    return this.deepCopy(copy);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READ OPERATIONS - Single Entity
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Finds a single audit log by ID.
   *
   * @param id - The audit log ID
   * @returns The audit log if found, null otherwise
   */
  async findById(id: string): Promise<AuditLog | null> {
    const log = this.logs.get(id);
    return log ? this.deepCopy(log) : null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READ OPERATIONS - Collections
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Finds all audit logs for a specific actor.
   *
   * @param actorId - The actor's unique identifier
   * @param filters - Optional additional filters
   * @returns Array of audit logs (newest first)
   */
  async findByActor(actorId: string, filters?: Partial<AuditLogFilters>): Promise<AuditLog[]> {
    const allLogs = Array.from(this.logs.values());
    const filtered = allLogs.filter((log) => {
      if (log.actor.id !== actorId) return false;
      return this.matchesFilters(log, filters || {});
    });

    // Sort newest first
    return this.sortByTimestamp(filtered, "desc").map((log) => this.deepCopy(log));
  }

  /**
   * Finds all audit logs for a specific resource.
   *
   * @param resourceType - The type of resource
   * @param resourceId - The resource's unique identifier
   * @param filters - Optional additional filters
   * @returns Array of audit logs (chronological order)
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    filters?: Partial<AuditLogFilters>,
  ): Promise<AuditLog[]> {
    const allLogs = Array.from(this.logs.values());
    const filtered = allLogs.filter((log) => {
      if (log.resource.type !== resourceType || log.resource.id !== resourceId) {
        return false;
      }
      return this.matchesFilters(log, filters || {});
    });

    // Sort chronologically (oldest first) for resource history
    return this.sortByTimestamp(filtered, "asc").map((log) => this.deepCopy(log));
  }

  /**
   * Queries audit logs with complex filters and pagination.
   *
   * @param filters - Filter criteria and pagination options
   * @returns Paginated result with data and metadata
   */
  async query(
    filters: Partial<AuditLogFilters> & Partial<PageOptions>,
  ): Promise<PageResult<AuditLog>> {
    const { page = 1, limit = 20, sort = "-timestamp", ...queryFilters } = filters;

    // Filter all logs
    const allLogs = Array.from(this.logs.values());
    const filtered = allLogs.filter((log) => this.matchesFilters(log, queryFilters));

    // Sort
    const sorted = this.sortLogs(filtered, sort);

    // Paginate
    const total = sorted.length;
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = sorted.slice(skip, skip + limit).map((log) => this.deepCopy(log));

    return {
      data,
      page,
      limit,
      total,
      pages,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READ OPERATIONS - Aggregation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Counts audit logs matching the given filters.
   *
   * @param filters - Optional filter criteria
   * @returns Number of matching audit logs
   */
  async count(filters?: Partial<AuditLogFilters>): Promise<number> {
    if (!filters || Object.keys(filters).length === 0) {
      return this.logs.size;
    }

    const allLogs = Array.from(this.logs.values());
    return allLogs.filter((log) => this.matchesFilters(log, filters)).length;
  }

  /**
   * Checks if any audit log exists matching the filters.
   *
   * @param filters - Filter criteria
   * @returns True if at least one audit log matches
   */
  async exists(filters: Partial<AuditLogFilters>): Promise<boolean> {
    const allLogs = Array.from(this.logs.values());
    return allLogs.some((log) => this.matchesFilters(log, filters));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OPTIONAL OPERATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Deletes audit logs older than the specified date.
   *
   * @param beforeDate - Delete logs older than this date
   * @returns Number of audit logs deleted
   */
  async deleteOlderThan(beforeDate: Date): Promise<number> {
    const allLogs = Array.from(this.logs.entries());
    let deleted = 0;

    for (const [id, log] of allLogs) {
      if (log.timestamp < beforeDate) {
        this.logs.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Archives audit logs older than the specified date.
   *
   * If no archive handler is configured, this is a no-op.
   *
   * @param beforeDate - Archive logs older than this date
   * @returns Number of archived logs
   */
  async archiveOlderThan(beforeDate: Date): Promise<number> {
    if (!this.archiveHandler) {
      return 0;
    }

    const logsToArchive = Array.from(this.logs.values()).filter(
      (log) => log.timestamp < beforeDate,
    );
    if (logsToArchive.length === 0) {
      return 0;
    }

    await this.archiveHandler(logsToArchive.map((log) => this.deepCopy(log)));
    return logsToArchive.length;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILITY METHODS (Testing Support)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Clears all audit logs.
   * Useful for cleanup between tests.
   */
  clear(): void {
    this.logs.clear();
  }

  /**
   * Returns all audit logs.
   * Useful for testing and debugging.
   */
  getAll(): AuditLog[] {
    return Array.from(this.logs.values()).map((log) => this.deepCopy(log));
  }

  /**
   * Returns the number of stored audit logs.
   * Useful for testing.
   */
  size(): number {
    return this.logs.size;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPER METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Checks if an audit log matches the given filters.
   *
   * @param log - The audit log to check
   * @param filters - Filter criteria
   * @returns True if log matches all filters
   */
  private matchesFilters(log: AuditLog, filters: Partial<AuditLogFilters>): boolean {
    // Actor filters
    if (filters.actorId && log.actor.id !== filters.actorId) return false;
    if (filters.actorType && log.actor.type !== filters.actorType) return false;

    // Resource filters
    if (filters.resourceType && log.resource.type !== filters.resourceType) return false;
    if (filters.resourceId && log.resource.id !== filters.resourceId) return false;

    // Action filter
    if (filters.action && log.action !== filters.action) return false;
    if (filters.actions && !filters.actions.includes(log.action)) return false;

    // Date range
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;

    // Other filters
    if (filters.ipAddress && log.ipAddress !== filters.ipAddress) return false;
    if (filters.requestId && log.requestId !== filters.requestId) return false;
    if (filters.sessionId && log.sessionId !== filters.sessionId) return false;
    if (filters.idempotencyKey && log.idempotencyKey !== filters.idempotencyKey) return false;

    // Simple text search (searches in action, resource type, actor name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        log.action,
        log.resource.type,
        log.actor.name || "",
        log.actionDescription || "",
        log.reason || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  }

  /**
   * Sorts audit logs by timestamp.
   *
   * @param logs - Audit logs to sort
   * @param direction - "asc" for ascending, "desc" for descending
   * @returns Sorted audit logs
   */
  private sortByTimestamp(logs: AuditLog[], direction: "asc" | "desc"): AuditLog[] {
    return [...logs].sort((a, b) => {
      const diff = a.timestamp.getTime() - b.timestamp.getTime();
      return direction === "asc" ? diff : -diff;
    });
  }

  /**
   * Sorts audit logs based on sort string.
   *
   * @param logs - Audit logs to sort
   * @param sort - Sort string (e.g., "-timestamp", "+action")
   * @returns Sorted audit logs
   */
  private sortLogs(logs: AuditLog[], sort: string): AuditLog[] {
    const direction = sort.startsWith("-") ? "desc" : "asc";
    const field = sort.replace(/^[+-]/, "");

    return [...logs].sort((a, b) => {
      let aVal: any = a[field as keyof AuditLog];
      let bVal: any = b[field as keyof AuditLog];

      // Handle nested fields (e.g., "actor.id")
      if (field.includes(".")) {
        const parts = field.split(".");
        aVal = parts.reduce((obj: any, key) => obj?.[key], a);
        bVal = parts.reduce((obj: any, key) => obj?.[key], b);
      }

      // Compare
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  /**
   * Deep copy an audit log to ensure immutability.
   * Uses custom implementation to properly handle Date objects and other complex types.
   *
   * @param log - Audit log to copy
   * @returns Deep copy of the audit log
   */
  private deepCopy(log: AuditLog): AuditLog {
    // Custom deep copy that preserves Date objects
    const copy: any = { ...log };

    // Copy timestamp (Date object)
    copy.timestamp = new Date(log.timestamp.getTime());

    // Copy changes if present (ChangeSet is Record<string, FieldChange>)
    if (log.changes) {
      copy.changes = {};
      for (const key in log.changes) {
        if (Object.hasOwn(log.changes, key)) {
          const change = log.changes[key];
          if (change) {
            copy.changes[key] = {
              from: this.deepCopyValue(change.from),
              to: this.deepCopyValue(change.to),
            };
          }
        }
      }
    }

    // Copy metadata if present
    if (log.metadata) {
      copy.metadata = { ...log.metadata };
    }

    return copy;
  }

  /**
   * Deep copy a value, preserving Date objects
   */
  private deepCopyValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (value instanceof Date) {
      return new Date(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.deepCopyValue(item));
    }
    if (typeof value === "object") {
      const copy: any = {};
      for (const key in value) {
        if (Object.hasOwn(value, key)) {
          copy[key] = this.deepCopyValue(value[key]);
        }
      }
      return copy;
    }
    return value;
  }
}
