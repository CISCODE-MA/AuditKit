/**
 * ============================================================================
 * MONGOOSE SCHEMA FOR AUDIT LOGS
 * ============================================================================
 *
 * MongoDB schema definition for audit log persistence.
 *
 * Purpose:
 * - Define MongoDB collection structure
 * - Ensure data validation at database level
 * - Configure indexes for optimal query performance
 * - Enable TypeScript type safety with Mongoose
 *
 * Schema Design Principles:
 * - **Immutable**: No update operations, audit logs never change
 * - **Append-only**: Optimized for inserts and reads
 * - **Query-optimized**: Indexes on common access patterns
 * - **Time-series friendly**: Can use MongoDB time-series collections
 *
 * @packageDocumentation
 */

import { Schema, type Document } from "mongoose";

import type { AuditLog } from "../../../core/types";

/**
 * MongoDB document type for AuditLog.
 * Extends Mongoose Document for database operations.
 */
export type AuditLogDocument = AuditLog & Document;

/**
 * Actor sub-schema (actor information).
 * Embedded document for who performed the action.
 */
const ActorSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["user", "system", "service"],
      index: true,
    },
    name: { type: String },
    email: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

/**
 * Resource sub-schema (what was acted upon).
 * Embedded document for the target of the action.
 */
const ResourceSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    label: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

/**
 * Main AuditLog schema.
 *
 * Indexes:
 * - id: Primary key, unique identifier
 * - timestamp: Time-series queries, retention policies
 * - actor.id: "What did this user do?"
 * - actor.type: "All system actions"
 * - resource.type + resource.id: "Complete resource history"
 * - action: "All DELETE actions"
 * - ipAddress: Security investigations
 * - requestId: Distributed tracing
 *
 * Compound indexes for common query patterns:
 * - {timestamp: -1}: Newest-first sorting (most common)
 * - {actor.id: 1, timestamp: -1}: User activity timeline
 * - {resource.type: 1, resource.id: 1, timestamp: 1}: Resource history chronologically
 */
export const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    actor: {
      type: ActorSchema,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actionDescription: {
      type: String,
    },
    resource: {
      type: ResourceSchema,
      required: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    requestId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    reason: {
      type: String,
    },
  },
  {
    collection: "audit_logs",
    timestamps: false, // We manage timestamp ourselves
    versionKey: false, // Audit logs are immutable, no versioning needed
  },
);

/**
 * Compound indexes for optimized query patterns.
 * These support the most common access patterns from IAuditLogRepository.
 */

// Timeline queries: newest first (default sorting in most UIs)
AuditLogSchema.index({ timestamp: -1 });

// User activity timeline
AuditLogSchema.index({ "actor.id": 1, timestamp: -1 });

// Resource history (chronological order for complete story)
AuditLogSchema.index({ "resource.type": 1, "resource.id": 1, timestamp: 1 });

// Action-based queries with time filtering
AuditLogSchema.index({ action: 1, timestamp: -1 });

// Security investigations by IP
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Distributed tracing
AuditLogSchema.index({ requestId: 1 });

/**
 * Schema options for production use.
 *
 * Consider enabling:
 * - Time-series collection (MongoDB 5.0+) for better performance
 * - Capped collection for automatic old data removal
 * - Expiration via TTL index for retention policies
 */

// Example: TTL index for automatic deletion after 7 years
// Uncomment if you want automatic expiration:
// AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 }); // 7 years

/**
 * Prevents modification of audit logs after creation.
 * MongoDB middleware to enforce immutability.
 */
AuditLogSchema.pre("save", function (next) {
  // Allow only new documents (inserts)
  if (!this.isNew) {
    return next(new Error("Audit logs are immutable and cannot be modified"));
  }
  next();
});

// Prevent updates and deletes
AuditLogSchema.pre("updateOne", function (next) {
  next(new Error("Audit logs cannot be updated"));
});

AuditLogSchema.pre("findOneAndUpdate", function (next) {
  next(new Error("Audit logs cannot be updated"));
});

AuditLogSchema.pre("deleteOne", function (next) {
  next(new Error("Audit logs cannot be deleted (append-only)"));
});

AuditLogSchema.pre("findOneAndDelete", function (next) {
  next(new Error("Audit logs cannot be deleted (append-only)"));
});
