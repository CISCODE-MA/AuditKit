/**
 * ============================================================================
 * CORE DOMAIN TYPES - AUDITKIT
 * ============================================================================
 *
 * This file contains all core domain entities, enums, and value objects
 * for the AuditKit package. These types are framework-free and represent
 * the business domain of audit logging.
 *
 * Purpose:
 * - Define the structure of an audit log entry
 * - Define actor types (who performed the action)
 * - Define action types (what was done)
 * - Define resource representation (what was affected)
 * - Define change tracking structure (before/after values)
 *
 * Architecture Rules:
 * - NO framework imports (no NestJS, no external SDKs)
 * - Pure TypeScript types and interfaces
 * - Should be usable in any JavaScript/TypeScript environment
 *
 * @packageDocumentation
 */

// ESLint disable for enum values (they're declarations, not usage)
/* eslint-disable no-unused-vars */

// ============================================================================
// ENUMS - Constrained String Values
// ============================================================================

/**
 * Types of actors that can perform auditable actions.
 *
 * - `user`: A human user (authenticated via JWT, session, etc.)
 * - `system`: An automated system process (cron jobs, scheduled tasks)
 * - `service`: Another microservice or external API
 */
export enum ActorType {
  USER = "user",
  SYSTEM = "system",
  SERVICE = "service",
}

/**
 * Types of auditable actions in the system.
 *
 * Standard CRUD operations plus additional security/compliance actions:
 * - `CREATE`: Entity creation
 * - `UPDATE`: Entity modification
 * - `DELETE`: Entity removal (hard or soft delete)
 * - `ACCESS`: Reading/viewing sensitive data
 * - `EXPORT`: Data export (CSV, PDF, etc.)
 * - `IMPORT`: Bulk data import
 * - `LOGIN`: User authentication event
 * - `LOGOUT`: User session termination
 * - `PERMISSION_CHANGE`: Authorization/role modification
 * - `SETTINGS_CHANGE`: Configuration or settings update
 * - `CUSTOM`: For application-specific actions
 */
export enum AuditActionType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  ACCESS = "ACCESS",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PERMISSION_CHANGE = "PERMISSION_CHANGE",
  SETTINGS_CHANGE = "SETTINGS_CHANGE",
  CUSTOM = "CUSTOM",
}

/**
 * Branded string type for custom (non-enum) audit actions.
 *
 * This preserves `AuditActionType` autocomplete/type-safety while still
 * allowing consumers to opt in to custom action identifiers.
 */
export type CustomAuditAction = string & {
  readonly __customAuditActionBrand: unique symbol;
};

// ============================================================================
// VALUE OBJECTS - Embedded Domain Concepts
// ============================================================================

/**
 * Represents the actor (who) that performed an auditable action.
 *
 * Contains identity and metadata about the entity that initiated the action.
 * For users, this typically comes from JWT payload. For system/service actors,
 * this is provided explicitly.
 */
export interface Actor {
  /** Unique identifier for the actor (user ID, service name, etc.) */
  id: string;

  /** Type of actor (user, system, or service) */
  type: ActorType;

  /** Human-readable name or label */
  name?: string;

  /** Email address (for user actors) */
  email?: string;

  /** Additional metadata (roles, permissions, service version, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Represents the resource (what) that was affected by an action.
 *
 * This is a generic representation - the type identifies the kind of entity
 * (e.g., "user", "order", "payment") and the id identifies the specific instance.
 */
export interface AuditResource {
  /** Type/kind of resource (e.g., "user", "order", "invoice") */
  type: string;

  /** Unique identifier for the specific resource instance */
  id: string;

  /** Optional human-readable label (e.g., username, order number) */
  label?: string;

  /** Additional context about the resource */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a single field change (before → after).
 *
 * Used to track what changed during UPDATE operations.
 * Both `from` and `to` are typed as `unknown` to support any data type.
 */
export interface FieldChange {
  /** Previous value before the change */
  from: unknown;

  /** New value after the change */
  to: unknown;
}

/**
 * Collection of field changes for an entity.
 *
 * Key = field name, Value = before/after values
 *
 * Example:
 * ```typescript
 * {
 *   email: { from: "old@example.com", to: "new@example.com" },
 *   status: { from: "pending", to: "active" }
 * }
 * ```
 */
export type ChangeSet = Record<string, FieldChange>;

// ============================================================================
// MAIN DOMAIN ENTITY - AuditLog
// ============================================================================

/**
 * Core audit log entity representing a single auditable event.
 *
 * This is the main domain model. Every auditable action in the system
 * results in one AuditLog entry. Audit logs are immutable once created.
 *
 * Properties are organized by concern:
 * 1. Identity (id, timestamp)
 * 2. Who did it (actor)
 * 3. What was done (action)
 * 4. What was affected (resource)
 * 5. Details (changes, metadata)
 * 6. Context (IP, user agent, reason)
 */
export interface AuditLog {
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────────────────

  /** Unique identifier for this audit log entry */
  id: string;

  /** When the action occurred (ISO 8601 timestamp) */
  timestamp: Date;

  // ─────────────────────────────────────────────────────────────────────────
  // WHO - Actor Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The entity that performed the action */
  actor: Actor;

  // ─────────────────────────────────────────────────────────────────────────
  // WHAT - Action Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The type of action performed */
  action: AuditActionType | CustomAuditAction; // Allow custom actions while preserving enum type-safety

  /** Optional human-readable description of the action */
  actionDescription?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // WHAT WAS AFFECTED - Resource Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The resource that was affected by the action */
  resource: AuditResource;

  // ─────────────────────────────────────────────────────────────────────────
  // DETAILS - Changes and Metadata
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Field-level changes (for UPDATE actions).
   * Tracks before/after values for each modified field.
   */
  changes?: ChangeSet;

  /**
   * Additional context or metadata about the action.
   * Can include things like:
   * - Reason for change
   * - Related entity IDs
   * - Business context
   * - Compliance tags
   */
  metadata?: Record<string, unknown>;

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT - Request Information
  // ─────────────────────────────────────────────────────────────────────────

  /** IP address from which the action was performed */
  ipAddress?: string;

  /** User agent string (browser, API client, etc.) */
  userAgent?: string;

  /** Request ID for tracing (if available) */
  requestId?: string;

  /** Session ID (if applicable) */
  sessionId?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLIANCE - Justification
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Human-readable reason or justification for the action.
   * Required for sensitive operations in some compliance scenarios.
   */
  reason?: string;
}

// ============================================================================
// QUERY & PAGINATION TYPES
// ============================================================================

/**
 * Options for paginated queries.
 *
 * Generic pagination structure that works with any database backend.
 */
export interface PageOptions {
  /** Page number (1-indexed) */
  page?: number;

  /** Number of items per page */
  limit?: number;

  /** Sort order (e.g., "-timestamp" for descending by timestamp) */
  sort?: string;
}

/**
 * Result of a paginated query.
 *
 * Contains the data plus pagination metadata.
 */
export interface PageResult<T> {
  /** Array of items for the current page */
  data: T[];

  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total number of items across all pages */
  total: number;

  /** Total number of pages */
  pages: number;
}

/**
 * Filter options for querying audit logs.
 *
 * All filters are optional - can be combined for complex queries.
 */
export interface AuditLogFilters {
  /** Filter by actor ID */
  actorId?: string;

  /** Filter by actor type */
  actorType?: ActorType;

  /** Filter by action type */
  action?: AuditActionType | string;

  /** Filter by multiple actions (OR condition) */
  actions?: (AuditActionType | string)[];

  /** Filter by resource type */
  resourceType?: string;

  /** Filter by resource ID */
  resourceId?: string;

  /** Filter by date range - start */
  startDate?: Date;

  /** Filter by date range - end */
  endDate?: Date;

  /** Filter by IP address */
  ipAddress?: string;

  /** Filter by request ID */
  requestId?: string;

  /** Filter by session ID */
  sessionId?: string;

  /** Free-text search across multiple fields */
  search?: string;

  /** Additional custom filters (database-specific) */
  customFilters?: Record<string, unknown>;
}

// ============================================================================
// TYPE GUARDS - Runtime Type Checking
// ============================================================================

/**
 * Type guard to check if a string is a valid AuditActionType enum value.
 *
 * @param value - The value to check
 * @returns True if value is a valid AuditActionType
 */
export function isAuditActionType(value: unknown): value is AuditActionType {
  return (
    typeof value === "string" && Object.values(AuditActionType).includes(value as AuditActionType)
  );
}

/**
 * Type guard to check if a string is a valid ActorType enum value.
 *
 * @param value - The value to check
 * @returns True if value is a valid ActorType
 */
export function isActorType(value: unknown): value is ActorType {
  return typeof value === "string" && Object.values(ActorType).includes(value as ActorType);
}
