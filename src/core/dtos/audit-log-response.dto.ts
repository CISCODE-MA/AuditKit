/**
 * ============================================================================
 * AUDIT LOG RESPONSE DTO - OUTPUT FORMATTING
 * ============================================================================
 *
 * This file defines the Data Transfer Object (DTO) for audit log responses.
 * It ensures consistent output format across all API endpoints.
 *
 * Purpose:
 * - Define the structure of audit log responses sent to clients
 * - Provide type-safe API response objects
 * - Support pagination metadata in list responses
 *
 * Note: This DTO is primarily for documentation and type safety.
 * The actual AuditLog entity from types.ts is already well-structured
 * for output, so this DTO closely mirrors it.
 *
 * @packageDocumentation
 */

import { z } from "zod";

import { ActorType, AuditActionType } from "../types";

// ============================================================================
// RESPONSE SCHEMAS - Mirror the Core Types
// ============================================================================

/**
 * Schema for Actor in response data.
 */
export const ActorResponseSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ActorType),
  name: z.string().optional(),
  email: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for Resource in response data.
 */
export const ResourceResponseSchema = z.object({
  type: z.string(),
  id: z.string(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for a single field change in response data.
 */
export const FieldChangeResponseSchema = z.object({
  from: z.unknown(),
  to: z.unknown(),
});

// ============================================================================
// MAIN RESPONSE DTO SCHEMA
// ============================================================================

/**
 * Zod schema for a single audit log in API responses.
 *
 * This matches the AuditLog entity structure but is explicitly
 * defined here for API contract documentation and validation.
 */
export const AuditLogResponseDtoSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────────────────

  /** Unique identifier for the audit log */
  id: z.string(),

  /** When the action occurred (ISO 8601 string in responses) */
  timestamp: z
    .date()
    .or(z.string().datetime())
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),

  // ─────────────────────────────────────────────────────────────────────────
  // WHO - Actor Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The entity that performed the action */
  actor: ActorResponseSchema,

  // ─────────────────────────────────────────────────────────────────────────
  // WHAT - Action Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The type of action performed */
  action: z.union([z.nativeEnum(AuditActionType), z.string()]),

  /** Optional description of the action */
  actionDescription: z.string().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // WHAT WAS AFFECTED - Resource Information
  // ─────────────────────────────────────────────────────────────────────────

  /** The resource that was affected */
  resource: ResourceResponseSchema,

  // ─────────────────────────────────────────────────────────────────────────
  // DETAILS - Changes and Metadata
  // ─────────────────────────────────────────────────────────────────────────

  /** Field-level changes (for UPDATE actions) */
  changes: z.record(FieldChangeResponseSchema).optional(),

  /** Additional context or metadata */
  metadata: z.record(z.unknown()).optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT - Request Information
  // ─────────────────────────────────────────────────────────────────────────

  /** IP address */
  ipAddress: z.string().optional(),

  /** User agent */
  userAgent: z.string().optional(),

  /** Request ID */
  requestId: z.string().optional(),

  /** Session ID */
  sessionId: z.string().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLIANCE
  // ─────────────────────────────────────────────────────────────────────────

  /** Reason or justification */
  reason: z.string().optional(),
});

/**
 * TypeScript type for a single audit log response.
 */
export type AuditLogResponseDto = z.infer<typeof AuditLogResponseDtoSchema>;

// ============================================================================
// PAGINATED RESPONSE SCHEMA
// ============================================================================

/**
 * Schema for paginated audit log responses.
 *
 * Contains the data array plus pagination metadata.
 * This is the standard format for list endpoints.
 */
export const PaginatedAuditLogsResponseSchema = z.object({
  /** Array of audit logs for the current page */
  data: z.array(AuditLogResponseDtoSchema),

  /** Pagination metadata */
  pagination: z.object({
    /** Current page number (1-indexed) */
    page: z.number().int().min(1),

    /** Number of items per page */
    limit: z.number().int().min(1),

    /** Total number of items across all pages */
    total: z.number().int().min(0),

    /** Total number of pages */
    pages: z.number().int().min(0),
  }),
});

/**
 * TypeScript type for paginated audit log responses.
 */
export type PaginatedAuditLogsResponse = z.infer<
  typeof PaginatedAuditLogsResponseSchema
>;

// ============================================================================
// OPERATION RESULT SCHEMAS
// ============================================================================

/**
 * Schema for the result of creating an audit log.
 *
 * Returns the created audit log plus a success indicator.
 */
export const CreateAuditLogResultSchema = z.object({
  /** Whether the operation succeeded */
  success: z.boolean(),

  /** The created audit log */
  data: AuditLogResponseDtoSchema,

  /** Optional message */
  message: z.string().optional(),
});

/**
 * TypeScript type for create audit log result.
 */
export type CreateAuditLogResult = z.infer<typeof CreateAuditLogResultSchema>;

/**
 * Schema for error responses.
 *
 * Standard error format for all audit kit operations.
 */
export const ErrorResponseSchema = z.object({
  /** Always false for errors */
  success: z.literal(false),

  /** Error message */
  error: z.string(),

  /** Error code (optional) */
  code: z.string().optional(),

  /** Additional error details */
  details: z.record(z.unknown()).optional(),

  /** Timestamp of the error */
  timestamp: z.string().datetime().optional(),
});

/**
 * TypeScript type for error responses.
 */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// SUMMARY/STATISTICS SCHEMAS
// ============================================================================

/**
 * Schema for audit log statistics/summary.
 *
 * Useful for dashboards and reporting.
 */
export const AuditLogStatsSchema = z.object({
  /** Total number of audit logs */
  total: z.number().int().min(0),

  /** Breakdown by action type */
  byAction: z.record(z.number().int().min(0)),

  /** Breakdown by actor type */
  byActorType: z.record(z.number().int().min(0)),

  /** Breakdown by resource type */
  byResourceType: z.record(z.number().int().min(0)),

  /** Date range covered */
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
});

/**
 * TypeScript type for audit log statistics.
 */
export type AuditLogStats = z.infer<typeof AuditLogStatsSchema>;
