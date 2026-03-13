/**
 * ============================================================================
 * QUERY AUDIT LOGS DTO - SEARCH AND FILTER VALIDATION
 * ============================================================================
 *
 * This file defines the Data Transfer Object (DTO) for querying audit logs.
 * It validates filter criteria, pagination parameters, and sorting options.
 *
 * Purpose:
 * - Validate query parameters for audit log searches
 * - Provide type-safe filtering and pagination
 * - Support complex queries (date ranges, multiple filters, etc.)
 *
 * Usage:
 * ```typescript
 * const result = QueryAuditLogsDtoSchema.safeParse(queryParams);
 * if (result.success) {
 *   const filters: QueryAuditLogsDto = result.data;
 * }
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";

import { ActorType, AuditActionType } from "../types";

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Maximum page size to prevent performance issues.
 * Querying thousands of audit logs at once can strain the database.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Default page size if not specified.
 */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Allowed sort fields for audit logs.
 * Prevents SQL injection and ensures we only sort on indexed fields.
 */
const ALLOWED_SORT_FIELDS = [
  "timestamp",
  "action",
  "actor.id",
  "resource.type",
  "resource.id",
] as const;

// ============================================================================
// MAIN QUERY DTO SCHEMA
// ============================================================================

/**
 * Zod schema for querying audit logs.
 *
 * All fields are optional - you can search by any combination of filters.
 * Pagination and sorting are also optional with sensible defaults.
 *
 * Validation rules:
 * - Page must be >= 1
 * - Limit must be between 1 and MAX_PAGE_SIZE
 * - Dates must be valid ISO strings or Date objects
 * - Sort field must be in ALLOWED_SORT_FIELDS
 */
export const QueryAuditLogsDtoSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Page number (1-indexed).
   * Default: 1
   */
  page: z
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),

  /**
   * Number of items per page.
   * Default: 10, Max: 100
   */
  limit: z
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(MAX_PAGE_SIZE, `Limit cannot exceed ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),

  /**
   * Sort order.
   * Format: "field" (ascending) or "-field" (descending)
   * Example: "-timestamp" sorts by timestamp descending (newest first)
   */
  sort: z
    .string()
    .refine(
      (val) => {
        // Strip leading "-" for descending sort
        const field = val.startsWith("-") ? val.slice(1) : val;
        return ALLOWED_SORT_FIELDS.includes(
          field as (typeof ALLOWED_SORT_FIELDS)[number],
        );
      },
      {
        message: `Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(", ")}`,
      },
    )
    .optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // ACTOR FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter by actor ID.
   * Example: Get all actions performed by user "user-123"
   */
  actorId: z.string().min(1, "Actor ID cannot be empty").optional(),

  /**
   * Filter by actor type.
   * Example: Get all system-generated actions
   */
  actorType: z
    .nativeEnum(ActorType, {
      errorMap: () => ({ message: "Invalid actor type" }),
    })
    .optional(),

  /**
   * Filter by actor email.
   * Example: Get all actions by "admin@example.com"
   */
  actorEmail: z.string().email("Invalid email format").optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter by action type.
   * Can be a standard enum value or a custom action string.
   * Example: Get all UPDATE actions
   */
  action: z
    .union([
      z.nativeEnum(AuditActionType, {
        errorMap: () => ({ message: "Invalid action type" }),
      }),
      z.string().min(1, "Action cannot be empty"),
    ])
    .optional(),

  /**
   * Filter by multiple actions (OR condition).
   * Example: Get all CREATE or UPDATE actions
   */
  actions: z
    .array(
      z.union([
        z.nativeEnum(AuditActionType),
        z.string().min(1, "Action cannot be empty"),
      ]),
    )
    .optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // RESOURCE FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter by resource type.
   * Example: Get all actions on "user" resources
   */
  resourceType: z.string().min(1, "Resource type cannot be empty").optional(),

  /**
   * Filter by specific resource ID.
   * Example: Get all actions on user "user-456"
   */
  resourceId: z.string().min(1, "Resource ID cannot be empty").optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // DATE RANGE FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter by start date (inclusive).
   * Returns audit logs from this date onwards.
   * Accepts ISO string or Date object.
   */
  startDate: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional(),

  /**
   * Filter by end date (inclusive).
   * Returns audit logs up to this date.
   * Accepts ISO string or Date object.
   */
  endDate: z
    .union([z.string().datetime(), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter by IP address.
   * Example: Get all actions from a specific IP
   */
  ipAddress: z
    .string()
    .ip({ version: "v4" })
    .or(z.string().ip({ version: "v6" }))
    .optional(),

  /**
   * Filter by request ID (for distributed tracing).
   * Example: Get all audit logs for a specific request
   */
  requestId: z.string().optional(),

  /**
   * Filter by session ID.
   * Example: Get all actions in a user session
   */
  sessionId: z.string().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // FULL-TEXT SEARCH
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Free-text search across multiple fields.
   * Searches in: action description, resource label, metadata, reason
   * Example: "password reset" might find all password-related actions
   */
  search: z
    .string()
    .min(1, "Search query cannot be empty")
    .max(200, "Search query too long")
    .optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOM FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Additional custom filters (database-specific).
   * Allows extending the query with application-specific criteria.
   */
  customFilters: z.record(z.unknown()).optional(),
});

// ============================================================================
// TYPESCRIPT TYPE INFERENCE
// ============================================================================

/**
 * TypeScript type inferred from the Zod schema.
 *
 * Use this type for function parameters, API endpoints, etc.
 */
export type QueryAuditLogsDto = z.infer<typeof QueryAuditLogsDtoSchema>;

// ============================================================================
// DATE RANGE VALIDATION
// ============================================================================

/**
 * Custom refinement: Ensure startDate is before endDate.
 *
 * This extended schema adds cross-field validation.
 */
export const QueryAuditLogsDtoWithDateValidationSchema =
  QueryAuditLogsDtoSchema.refine(
    (data) => {
      // If both dates are provided, startDate must be <= endDate
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true; // Valid if only one or neither date is provided
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"], // Error will be attached to startDate field
    },
  );

/**
 * TypeScript type for query DTO with date validation.
 */
export type QueryAuditLogsDtoWithDateValidation = z.infer<
  typeof QueryAuditLogsDtoWithDateValidationSchema
>;

// ============================================================================
// EXPORT CONSTANTS
// ============================================================================

/**
 * Export validation constants for use in other modules.
 */
export const QUERY_CONSTANTS = {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  ALLOWED_SORT_FIELDS,
} as const;
