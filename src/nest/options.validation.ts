/**
 * ============================================================================
 * AUDIT KIT MODULE OPTIONS VALIDATION
 * ============================================================================
 *
 * Centralized runtime validation for module options.
 *
 * @packageDocumentation
 */

import type { IAuditEventPublisher } from "../core/ports/audit-event-publisher.port";
import type { IAuditObserver } from "../core/ports/audit-observer.port";

import type { AuditKitModuleOptions } from "./interfaces";

/**
 * Runtime options passed to AuditService from module configuration.
 */
export interface AuditServiceRuntimeOptions {
  piiRedaction?: {
    enabled?: boolean;
    fields?: string[];
    mask?: string;
  };
  idempotency?: {
    enabled?: boolean;
    keyStrategy?: "idempotencyKey" | "requestId";
  };
  retention?: {
    enabled?: boolean;
    retentionDays?: number;
    autoCleanupOnWrite?: boolean;
    archiveBeforeDelete?: boolean;
  };
  /** Observability observer wired from module options. */
  observer?: IAuditObserver;

  /** Event publisher wired from module options. */
  eventPublisher?: IAuditEventPublisher;
}

/**
 * Validates module options and throws a descriptive Error on invalid configuration.
 */
export function validateAuditKitModuleOptions(options: AuditKitModuleOptions): void {
  validateRepository(options);
  validateRedaction(options);
  validateRetention(options);
  validateIdempotency(options);
  validateEventStreaming(options);
}

function validateRepository(options: AuditKitModuleOptions): void {
  if (!options?.repository) {
    throw new Error("AuditKitModule options must include a repository configuration");
  }

  if (options.repository.type === "custom" && !options.repository.instance) {
    throw new Error("Custom repository requires an 'instance' implementing IAuditLogRepository");
  }
}

function validateRedaction(options: AuditKitModuleOptions): void {
  const fields = options.redaction?.fields;
  if (fields && fields.some((field) => typeof field !== "string" || field.trim().length === 0)) {
    throw new Error("Redaction fields must be non-empty strings");
  }
}

function validateRetention(options: AuditKitModuleOptions): void {
  if (!options.retention?.enabled) return;

  const { retentionDays, archiveBeforeDelete, archiveHandler } = options.retention;
  if (!Number.isInteger(retentionDays) || (retentionDays as number) <= 0) {
    throw new Error("Retention requires a positive integer 'retentionDays'");
  }

  if (archiveBeforeDelete && archiveHandler === undefined) {
    throw new Error("Retention with archiveBeforeDelete=true requires an archiveHandler");
  }
}

function validateIdempotency(options: AuditKitModuleOptions): void {
  if (options.idempotency?.keyStrategy === "requestId" && options.idempotency?.enabled === false) {
    throw new Error("Idempotency key strategy is configured but idempotency is disabled");
  }
}

function validateEventStreaming(options: AuditKitModuleOptions): void {
  if (options.eventStreaming?.enabled === false && options.eventStreaming?.publisher) {
    throw new Error("Event streaming publisher is configured but event streaming is disabled");
  }
}

/**
 * Maps module options to runtime options consumed by AuditService.
 */
export function toAuditServiceRuntimeOptions(
  options: AuditKitModuleOptions,
): AuditServiceRuntimeOptions {
  const runtimeOptions: AuditServiceRuntimeOptions = {};

  if (options.redaction) {
    runtimeOptions.piiRedaction = options.redaction;
  }

  if (options.idempotency) {
    runtimeOptions.idempotency = options.idempotency;
  }

  if (options.retention) {
    const retention: NonNullable<AuditServiceRuntimeOptions["retention"]> = {};
    if (options.retention.enabled !== undefined) retention.enabled = options.retention.enabled;
    if (options.retention.retentionDays !== undefined) {
      retention.retentionDays = options.retention.retentionDays;
    }
    if (options.retention.autoCleanupOnWrite !== undefined) {
      retention.autoCleanupOnWrite = options.retention.autoCleanupOnWrite;
    }
    if (options.retention.archiveBeforeDelete !== undefined) {
      retention.archiveBeforeDelete = options.retention.archiveBeforeDelete;
    }
    runtimeOptions.retention = retention;
  }

  if (options.observer) {
    runtimeOptions.observer = options.observer;
  }

  if (options.eventStreaming?.enabled && options.eventStreaming?.publisher) {
    runtimeOptions.eventPublisher = options.eventStreaming.publisher;
  }

  return runtimeOptions;
}

/**
 * Extracts archive handler function from module options.
 */
export function getArchiveHandler(
  options: AuditKitModuleOptions,
): AuditKitModuleOptions["retention"] extends undefined
  ? undefined
  : NonNullable<AuditKitModuleOptions["retention"]>["archiveHandler"] {
  return options.retention?.archiveHandler;
}
