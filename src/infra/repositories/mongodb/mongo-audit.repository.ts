/**
 * ============================================================================
 * MONGODB AUDIT REPOSITORY ADAPTER
 * ============================================================================
 *
 * MongoDB implementation of the IAuditLogRepository port.
 *
 * Purpose:
 * - Persist audit logs to MongoDB
 * - Implement all query methods defined in the port
 * - Leverage Mongoose for type safety and validation
 * - Optimize queries with proper indexing
 *
 * Architecture:
 * - Implements IAuditLogRepository (core port)
 * - Uses Mongoose models and schemas
 * - Can be swapped with other implementations (PostgreSQL, etc.)
 *
 * @packageDocumentation
 */

import type { Model } from "mongoose";

import type { IAuditLogRepository } from "../../../core/ports/audit-repository.port";
import type { AuditLog, AuditLogFilters, PageOptions, PageResult } from "../../../core/types";

import type { AuditLogDocument } from "./audit-log.schema";

/**
 * MongoDB implementation of audit log repository.
 *
 * Uses Mongoose for:
 * - Type-safe queries
 * - Schema validation
 * - Automatic connection management
 * - Query optimization
 *
 * Key Features:
 * - Immutable audit logs (no updates/deletes)
 * - Optimized indexes for common query patterns
 * - Supports complex filtering and pagination
 * - Full-text search ready (if text index configured)
 *
 * @example
 * ```typescript
 * import mongoose from 'mongoose';
 * import { AuditLogSchema } from './audit-log.schema';
 * import { MongoAuditRepository } from './mongo-audit.repository';
 *
 * const AuditLogModel = mongoose.model('AuditLog', AuditLogSchema);
 * const repository = new MongoAuditRepository(AuditLogModel);
 * ```
 */
export class MongoAuditRepository implements IAuditLogRepository {
  /**
   * Creates a new MongoDB audit repository.
   *
   * @param model - Mongoose model for AuditLog
   */
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly model: Model<AuditLogDocument>) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE OPERATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Creates (persists) a new audit log entry.
   *
   * @param log - The audit log to persist
   * @returns The persisted audit log
   * @throws Error if persistence fails
   */
  async create(log: AuditLog): Promise<AuditLog> {
    const document = new this.model(log);
    const saved = await document.save();
    return this.toPlainObject(saved);
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
    const document = await this.model.findOne({ id }).lean().exec();
    return document ? this.toPlainObject(document) : null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READ OPERATIONS - Collections
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Finds all audit logs for a specific actor.
   *
   * @param actorId - The actor's unique identifier
   * @param filters - Optional additional filters
   * @returns Array of audit logs
   */
  async findByActor(actorId: string, filters?: Partial<AuditLogFilters>): Promise<AuditLog[]> {
    const query = this.buildQuery({ ...filters, actorId });
    const documents = await this.model.find(query).sort({ timestamp: -1 }).lean().exec();
    return documents.map((doc) => this.toPlainObject(doc));
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
    const query = this.buildQuery({ ...filters, resourceType, resourceId });
    // Resource history should be chronological (oldest first)
    const documents = await this.model.find(query).sort({ timestamp: 1 }).lean().exec();
    return documents.map((doc) => this.toPlainObject(doc));
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

    // Build query
    const query = this.buildQuery(queryFilters);

    // Parse sort (e.g., "-timestamp" or "+action")
    const sortObject = this.parseSort(sort);

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [documents, total] = await Promise.all([
      this.model.find(query).sort(sortObject).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const data = documents.map((doc) => this.toPlainObject(doc));
    const pages = Math.ceil(total / limit);

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
    const query = this.buildQuery(filters || {});
    return this.model.countDocuments(query).exec();
  }

  /**
   * Checks if any audit log exists matching the filters.
   *
   * @param filters - Filter criteria
   * @returns True if at least one audit log matches
   */
  async exists(filters: Partial<AuditLogFilters>): Promise<boolean> {
    const query = this.buildQuery(filters);
    const document = await this.model.findOne(query).lean().exec();
    return document !== null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OPTIONAL OPERATIONS - Advanced Features
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Deletes audit logs older than the specified date.
   *
   * ⚠️ CAUTION: This violates audit log immutability!
   * Only use for compliance-mandated retention policies.
   *
   * @param beforeDate - Delete logs older than this date
   * @returns Number of audit logs deleted
   */
  async deleteOlderThan(beforeDate: Date): Promise<number> {
    const result = await this.model.deleteMany({ timestamp: { $lt: beforeDate } }).exec();
    return result.deletedCount || 0;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPER METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Builds MongoDB query from filters.
   *
   * Converts IAuditLogFilters to MongoDB query object.
   * Handles nested fields (actor.id, resource.type, etc.).
   *
   * @param filters - Filter criteria
   * @returns MongoDB query object
   */
  private buildQuery(filters: Partial<AuditLogFilters>): Record<string, any> {
    const query: Record<string, any> = {};

    // Actor filters
    if (filters.actorId) query["actor.id"] = filters.actorId;
    if (filters.actorType) query["actor.type"] = filters.actorType;

    // Resource filters
    if (filters.resourceType) query["resource.type"] = filters.resourceType;
    if (filters.resourceId) query["resource.id"] = filters.resourceId;

    // Action filter (can be single action or array)
    if (filters.action) {
      query.action = filters.action;
    } else if (filters.actions && filters.actions.length > 0) {
      query.action = { $in: filters.actions };
    }

    // Date range filters
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    // Other filters
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.requestId) query.requestId = filters.requestId;
    if (filters.sessionId) query.sessionId = filters.sessionId;

    // Full-text search (if text index is configured)
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  /**
   * Parses sort string into MongoDB sort object.
   *
   * Supports:
   * - "-timestamp" → { timestamp: -1 } (descending)
   * - "+action" → { action: 1 } (ascending)
   * - "timestamp" → { timestamp: 1 } (ascending, default)
   *
   * @param sort - Sort string
   * @returns MongoDB sort object
   */
  private parseSort(sort: string): Record<string, 1 | -1> {
    if (sort.startsWith("-")) {
      return { [sort.substring(1)]: -1 };
    }
    if (sort.startsWith("+")) {
      return { [sort.substring(1)]: 1 };
    }
    return { [sort]: 1 };
  }

  /**
   * Converts Mongoose document to plain AuditLog object.
   *
   * Removes Mongoose-specific properties (_id, __v, etc.).
   * Ensures type safety and clean API responses.
   *
   * @param document - Mongoose document or lean object
   * @returns Plain AuditLog object
   */
  private toPlainObject(document: any): AuditLog {
    // If it's a Mongoose document, convert to plain object
    const plain = document.toObject ? document.toObject() : document;

    // Remove Mongoose-specific fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const { _id, __v, ...rest } = plain;

    return rest as AuditLog;
  }
}
