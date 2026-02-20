/**
 * AuditService - core service for creating and persisting audit events.
 */

import { Injectable, Inject, Optional } from "@nestjs/common";
import { v4 as uuid } from "uuid";

import type { AuditConfig } from "../core/config";
import { DEFAULT_CONFIG } from "../core/config";
import { deepDiff } from "../core/diff";
import { maskSensitiveData } from "../core/mask";
import type { AuditEvent, AuditStorage, AuditChanges, AuditLevel } from "../core/types";

import { AUDIT_STORAGE, AUDIT_CONFIG } from "./constants";

export interface CreateAuditEventParams {
  actor: string;
  method: string;
  path: string;
  action: string;
  statusCode: number;
  duration: number;
  resource?: string | undefined;
  resourceId?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  correlationId?: string | undefined;
  before?: Record<string, unknown> | undefined;
  after?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  error?: string | undefined;
}

@Injectable()
export class AuditService {
  private readonly config: Required<
    Pick<
      AuditConfig,
      "enabled" | "level" | "methods" | "captureChanges" | "maxDiffDepth" | "maskValue"
    >
  > &
    AuditConfig;

  constructor(
    // eslint-disable-next-line no-unused-vars
    @Inject(AUDIT_STORAGE) private readonly _auditStorage: AuditStorage,
    @Optional() @Inject(AUDIT_CONFIG) config?: AuditConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create and persist an audit event.
   * Wrapped in try-catch to ensure failures don't affect the main request.
   */
  async audit(params: CreateAuditEventParams): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const event = this.buildEvent(params);
      await this._auditStorage.save(event);
    } catch (error) {
      // Fail-safe: log error but don't throw
      console.error("[AuditKit] Failed to persist audit event:", error);
    }
  }

  /**
   * Build an audit event from parameters.
   */
  private buildEvent(params: CreateAuditEventParams): AuditEvent {
    const {
      actor,
      method,
      path,
      action,
      statusCode,
      duration,
      resource,
      resourceId,
      ip,
      userAgent,
      correlationId,
      before,
      after,
      metadata,
      error,
    } = params;

    // Determine log level based on status code
    const level: AuditLevel =
      error || statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    // Compute changes with PII masking
    let changes: AuditChanges | undefined;
    if (this.config.captureChanges && (before || after)) {
      // Compute diff on ORIGINAL data to detect actual changes
      const diff = deepDiff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
        this.config.maxDiffDepth,
      );

      // Mask the before/after data for storage
      const maskedBefore = before
        ? maskSensitiveData(before, this.config.sensitiveKeys, this.config.maskValue)
        : undefined;
      const maskedAfter = after
        ? maskSensitiveData(after, this.config.sensitiveKeys, this.config.maskValue)
        : undefined;

      if (diff.hasChanges) {
        changes = {
          before: maskedBefore as Record<string, unknown>,
          after: maskedAfter as Record<string, unknown>,
          modifiedFields: [...diff.modifiedFields, ...diff.addedFields, ...diff.removedFields],
        };
      }
    }

    // Mask metadata as well
    const maskedMetadata = metadata
      ? maskSensitiveData(metadata, this.config.sensitiveKeys, this.config.maskValue)
      : undefined;

    const event: AuditEvent = {
      id: uuid(),
      timestamp: new Date(),
      actor,
      method,
      path,
      action,
      statusCode,
      duration,
      level,
    };

    // Conditionally add optional properties (exactOptionalPropertyTypes)
    if (resource !== undefined) event.resource = resource;
    if (resourceId !== undefined) event.resourceId = resourceId;
    if (ip !== undefined) event.ip = ip;
    if (userAgent !== undefined) event.userAgent = userAgent;
    if (correlationId !== undefined) event.correlationId = correlationId;
    if (changes !== undefined) event.changes = changes;
    if (maskedMetadata !== undefined) event.metadata = maskedMetadata as Record<string, unknown>;
    if (error !== undefined) event.error = error;

    return event;
  }

  /**
   * Check if a method should be audited.
   */
  shouldAudit(method: string, path: string): boolean {
    if (!this.config.enabled) return false;

    // Check method filter
    if (this.config.methods && !this.config.methods.includes(method.toUpperCase())) {
      return false;
    }

    // Check excluded paths
    if (this.config.excludePaths) {
      for (const pattern of this.config.excludePaths) {
        if (this.matchPath(path, pattern)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Simple glob matching for path exclusion.
   */
  private matchPath(path: string, pattern: string): boolean {
    // Convert glob to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
      .replace(/\*/g, ".*") // * matches anything
      .replace(/\?/g, "."); // ? matches single char

    return new RegExp(`^${regexPattern}$`).test(path);
  }
}
