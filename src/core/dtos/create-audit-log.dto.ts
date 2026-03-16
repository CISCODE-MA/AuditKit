/**
 * ============================================================================
 * CREATE AUDIT LOG DTO - INPUT VALIDATION
 * ============================================================================
 *
 * This file defines the Data Transfer Object (DTO) for creating audit log entries.
 * It uses Zod for runtime validation and type inference.
 *
 * Purpose:
 * - Validate input data when creating audit logs
 * - Provide type-safe API for audit log creation
 * - Auto-generate TypeScript types from Zod schemas
 *
 * Usage:
 * ```typescript
 * const result = CreateAuditLogDtoSchema.safeParse(inputData);
 * if (result.success) {
 *   const validatedDto: CreateAuditLogDto = result.data;
 * }
 * ```
 *
 * @packageDocumentation
 */

import { z } from "zod";

import { ActorType, AuditActionType } from "../types";

// ============================================================================
// NESTED SCHEMAS - Building Blocks
// ============================================================================

/**
 * Schema for Actor data.
 *
 * Validates the entity that performed the action.
 * - `id` and `type` are required
 * - `name`, `email`, and `metadata` are optional
 */
export const ActorSchema = z.object({
  /** Unique identifier for the actor */
  id: z.string().min(1, "Actor ID is required"),

  /** Type of actor (user, system, or service) */
  type: z.nativeEnum(ActorType, {
    errorMap: () => ({ message: "Invalid actor type" }),
  }),

  /** Optional human-readable name */
  name: z.string().optional(),

  /** Optional email address */
  email: z.string().email("Invalid email format").optional(),

  /** Optional additional metadata */
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for Resource data.
 *
 * Validates the entity that was affected by the action.
 * - `type` and `id` are required
 * - `label` and `metadata` are optional
 */
export const AuditResourceSchema = z.object({
  /** Type of resource (e.g., "user", "order", "invoice") */
  type: z.string().min(1, "Resource type is required"),

  /** Unique identifier for the resource */
  id: z.string().min(1, "Resource ID is required"),

  /** Optional human-readable label */
  label: z.string().optional(),

  /** Optional additional metadata */
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for a single field change.
 *
 * Represents before/after values for a modified field.
 */
export const FieldChangeSchema = z.object({
  /** Previous value */
  from: z.unknown(),

  /** New value */
  to: z.unknown(),
});

/**
 * Schema for ChangeSet (collection of field changes).
 *
 * Key = field name, Value = before/after values
 */
export const ChangeSetSchema = z.record(FieldChangeSchema);

// ============================================================================
// MAIN DTO SCHEMA
// ============================================================================

/**
 * Zod schema for creating an audit log.
 *
 * This schema validates all input data for audit log creation.
 * The `id` and `timestamp` fields are NOT included here - they are
 * generated automatically by the service layer.
 *
 * Validation rules:
 * - `actor`: Must be a valid Actor object
 * - `action`: Must be a valid AuditActionType or non-empty string
 * - `resource`: Must be a valid Resource object
 * - `changes`, `metadata`, `ipAddress`, etc.: All optional
 */
export const CreateAuditLogDtoSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────
  // REQUIRED FIELDS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * The entity that performed the action.
   * Required - every audit log must have an actor.
   */
  actor: ActorSchema,

  /**
   * The type of action performed.
   * Can be a standard AuditActionType enum value or a custom string.
   */
  action: z.union([
    z.nativeEnum(AuditActionType, {
      errorMap: () => ({ message: "Invalid action type" }),
    }),
    z.string().min(1, "Action cannot be empty"),
  ]),

  /**
   * The resource that was affected.
   * Required - every audit log must reference a resource.
   */
  resource: AuditResourceSchema,

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL FIELDS
  // ─────────────────────────────────────────────────────────────────────────

  /** Optional human-readable description of the action */
  actionDescription: z.string().optional(),

  /**
   * Field-level changes (for UPDATE actions).
   * Records before/after values for modified fields.
   */
  changes: ChangeSetSchema.optional(),

  /**
   * Additional context or metadata.
   * Can contain any JSON-serializable data.
   */
  metadata: z.record(z.unknown()).optional(),

  /**
   * IP address from which the action was performed.
   * Validated as IPv4 or IPv6.
   */
  ipAddress: z
    .string()
    .ip({ version: "v4" })
    .or(z.string().ip({ version: "v6" }))
    .optional(),

  /** User agent string (browser, API client, etc.) */
  userAgent: z.string().optional(),

  /** Request ID for distributed tracing */
  requestId: z.string().optional(),

  /** Session ID (if applicable) */
  sessionId: z.string().optional(),

  /**
   * Human-readable reason or justification.
   * May be required by compliance policies for sensitive operations.
   */
  reason: z.string().optional(),
});

// ============================================================================
// TYPESCRIPT TYPE INFERENCE
// ============================================================================

/**
 * TypeScript type inferred from the Zod schema.
 *
 * This gives us compile-time type checking AND runtime validation.
 * Use this type in service signatures, function parameters, etc.
 */
export type CreateAuditLogDto = z.infer<typeof CreateAuditLogDtoSchema>;

// ============================================================================
// CONVENIENCE SCHEMAS - Partial Validation
// ============================================================================

/**
 * Schema for "before" object in change tracking.
 *
 * Accepts any plain object - used when auto-detecting changes.
 */
export const BeforeStateSchema = z.record(z.unknown());

/**
 * Schema for "after" object in change tracking.
 *
 * Accepts any plain object - used when auto-detecting changes.
 */
export const AfterStateSchema = z.record(z.unknown());

/**
 * Schema for creating an audit log WITH automatic change detection.
 *
 * Instead of providing `changes` explicitly, you provide `before` and `after`
 * objects and the service will calculate the diff.
 */
export const CreateAuditLogWithChangesSchema = CreateAuditLogDtoSchema.omit({
  changes: true,
}).extend({
  /** The entity state before the change */
  before: BeforeStateSchema.optional(),

  /** The entity state after the change */
  after: AfterStateSchema.optional(),

  /** Options for change detection (e.g., fields to exclude or mask) */
  options: z
    .object({
      excludeFields: z.array(z.string()).optional(),
      maskFields: z.array(z.string()).optional(),
      maskStrategy: z.enum(["full", "partial", "custom"]).optional(),
      deepCompare: z.boolean().optional(),
    })
    .optional(),
});

/**
 * TypeScript type for audit log creation with auto change detection.
 */
export type CreateAuditLogWithChanges = z.infer<typeof CreateAuditLogWithChangesSchema>;
