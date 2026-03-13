/**
 * ============================================================================
 * CORE INDEX - PUBLIC API FOR AUDITKIT CORE
 * ============================================================================
 *
 * This file is the main export point for the core layer of AuditKit.
 * Everything exported here is framework-free and can be used in any
 * JavaScript/TypeScript environment.
 *
 * Purpose:
 * - Centralized export for all core functionality
 * - Clear public API boundary
 * - Framework-agnostic domain logic
 *
 * Architecture Rules:
 * - MUST be framework-free (no NestJS, no external SDKs)
 * - All exports should be types, interfaces, or pure functions
 * - No infrastructure concerns (databases, HTTP, etc.)
 *
 * Usage:
 * ```typescript
 * import {
 *   AuditLog,
 *   AuditActionType,
 *   CreateAuditLogDto,
 *   IAuditLogRepository,
 *   AuditNotFoundError
 * } from '@core';
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// DOMAIN TYPES - Entities, Enums, Value Objects
// ============================================================================

export {
  // Enums - Constrained values
  ActorType,
  AuditActionType,

  // Value Objects - Complex data structures
  type Actor,
  type AuditResource,
  type FieldChange,
  type ChangeSet,

  // Main Entity - Audit Log
  type AuditLog,

  // Query & Pagination Types
  type PageOptions,
  type PageResult,
  type AuditLogFilters,

  // Type Guards - Runtime type checking
  isAuditActionType,
  isActorType,
} from "./types";

// ============================================================================
// DTOs - Data Transfer Objects (Input/Output Validation)
// ============================================================================

export {
  // Create Audit Log DTO
  CreateAuditLogDtoSchema,
  type CreateAuditLogDto,
  CreateAuditLogWithChangesSchema,
  type CreateAuditLogWithChanges,
  ActorSchema,
  AuditResourceSchema,
  FieldChangeSchema,
  ChangeSetSchema,
  BeforeStateSchema,
  AfterStateSchema,

  // Query Audit Logs DTO
  QueryAuditLogsDtoSchema,
  type QueryAuditLogsDto,
  QueryAuditLogsDtoWithDateValidationSchema,
  type QueryAuditLogsDtoWithDateValidation,
  QUERY_CONSTANTS,

  // Response DTOs
  AuditLogResponseDtoSchema,
  type AuditLogResponseDto,
  PaginatedAuditLogsResponseSchema,
  type PaginatedAuditLogsResponse,
  CreateAuditLogResultSchema,
  type CreateAuditLogResult,
  ErrorResponseSchema,
  type ErrorResponse,
  AuditLogStatsSchema,
  type AuditLogStats,
  ActorResponseSchema,
  ResourceResponseSchema,
  FieldChangeResponseSchema,
} from "./dtos";

// ============================================================================
// PORTS - Interfaces for Infrastructure Adapters
// ============================================================================

export {
  // Repository Port - Data persistence abstraction
  type IAuditLogRepository,

  // Change Detector Port - Change tracking abstraction
  type IChangeDetector,
  type ChangeDetectionOptions,
  type ComparatorFunction,
  type MaskingFunction,

  // ID Generator Port - Unique ID generation abstraction
  type IIdGenerator,
  type IdGenerationOptions,
  type IdGeneratorInfo,

  // Timestamp Provider Port - Date/time abstraction
  type ITimestampProvider,
  type TimestampOptions,
  type TimestampFormat,
  type TimezoneOption,
  type TimestampProviderInfo,
} from "./ports";

// ============================================================================
// ERRORS - Domain-Specific Errors
// ============================================================================

export {
  // Audit not found error (404)
  AuditNotFoundError,

  // Invalid actor error (400)
  InvalidActorError,

  // Invalid changeset error (400)
  InvalidChangeSetError,
} from "./errors";
