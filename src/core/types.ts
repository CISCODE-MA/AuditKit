/**
 * Core types for AuditKit - framework-free.
 */

/** Log levels for audit events */
export type AuditLevel = "info" | "warn" | "error";

/** HTTP methods tracked by audit */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Represents a single audit event */
export interface AuditEvent {
  /** Unique identifier for the audit event */
  id: string;
  /** Timestamp of the event */
  timestamp: Date;
  /** Actor who performed the action (user ID, 'GUEST', 'SYSTEM') */
  actor: string;
  /** HTTP method */
  method: HttpMethod | string;
  /** Request path */
  path: string;
  /** Controller and handler name */
  action: string;
  /** Resource type being accessed */
  resource?: string;
  /** Resource ID if applicable */
  resourceId?: string;
  /** HTTP status code of the response */
  statusCode: number;
  /** Request duration in milliseconds */
  duration: number;
  /** IP address of the requester */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Correlation/request ID for tracing */
  correlationId?: string;
  /** Changes detected (for mutations) */
  changes?: AuditChanges;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Severity level */
  level: AuditLevel;
  /** Error message if request failed */
  error?: string;
}

/** Represents changes in a mutation operation */
export interface AuditChanges {
  /** State before the operation */
  before?: Record<string, unknown>;
  /** State after the operation */
  after?: Record<string, unknown>;
  /** Fields that were modified */
  modifiedFields?: string[];
}

/** Storage interface - implement to persist audit events */
export interface AuditStorage {
  /** Persist an audit event */
  // eslint-disable-next-line no-unused-vars
  save(_event: AuditEvent): Promise<void>;
  /** Query audit events (optional) */
  // eslint-disable-next-line no-unused-vars
  find?(_params: AuditQuery): Promise<AuditEvent[]>;
}

/** Query parameters for audit retrieval */
export interface AuditQuery {
  actor?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/** Function to extract actor from request */
// eslint-disable-next-line no-unused-vars
export type ActorExtractor = (_req: unknown) => string | Promise<string>;

/** Function to extract resource info from request/response */
export type ResourceExtractor = (
  // eslint-disable-next-line no-unused-vars
  _req: unknown,
  // eslint-disable-next-line no-unused-vars
  _res: unknown,
) =>
  | { resource?: string; resourceId?: string }
  | Promise<{ resource?: string; resourceId?: string }>;

/** Keys that should be masked in audit logs */
export const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "creditCard",
  "credit_card",
  "cvv",
  "ssn",
  "pin",
] as const;

export type SensitiveKey = (typeof DEFAULT_SENSITIVE_KEYS)[number] | string;
