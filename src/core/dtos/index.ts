/**
 * ============================================================================
 * DTOS INDEX - PUBLIC API FOR DATA TRANSFER OBJECTS
 * ============================================================================
 *
 * This file exports all DTOs (Data Transfer Objects) used for input/output
 * validation and type safety.
 *
 * Purpose:
 * - Centralized export point for all DTOs
 * - Simplifies imports in consuming code
 * - Clear public API boundary for the DTO layer
 *
 * Usage:
 * ```typescript
 * import { CreateAuditLogDto, QueryAuditLogsDto } from '@core/dtos';
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// CREATE AUDIT LOG DTO - Input for creating audit logs
// ============================================================================

export {
  // Main DTO schema and type
  CreateAuditLogDtoSchema,
  type CreateAuditLogDto,
  // Schema with automatic change detection
  CreateAuditLogWithChangesSchema,
  type CreateAuditLogWithChanges,
  // Nested schemas (for reuse)
  ActorSchema,
  AuditResourceSchema,
  FieldChangeSchema,
  ChangeSetSchema,
  BeforeStateSchema,
  AfterStateSchema,
} from "./create-audit-log.dto";

// ============================================================================
// QUERY AUDIT LOGS DTO - Input for searching/filtering audit logs
// ============================================================================

export {
  // Main query DTO schema and type
  QueryAuditLogsDtoSchema,
  type QueryAuditLogsDto,
  // Query DTO with date validation
  QueryAuditLogsDtoWithDateValidationSchema,
  type QueryAuditLogsDtoWithDateValidation,
  // Constants
  QUERY_CONSTANTS,
} from "./query-audit-logs.dto";

// ============================================================================
// AUDIT LOG RESPONSE DTO - Output format for API responses
// ============================================================================

export {
  // Single audit log response
  AuditLogResponseDtoSchema,
  type AuditLogResponseDto,
  // Paginated list response
  PaginatedAuditLogsResponseSchema,
  type PaginatedAuditLogsResponse,
  // Operation results
  CreateAuditLogResultSchema,
  type CreateAuditLogResult,
  // Error responses
  ErrorResponseSchema,
  type ErrorResponse,
  // Statistics/summary
  AuditLogStatsSchema,
  type AuditLogStats,
  // Nested response schemas
  ActorResponseSchema,
  ResourceResponseSchema,
  FieldChangeResponseSchema,
} from "./audit-log-response.dto";
