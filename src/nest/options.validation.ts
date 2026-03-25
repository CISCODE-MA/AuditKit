/**
 * ============================================================================
 * AUDIT KIT MODULE OPTIONS VALIDATION
 * ============================================================================
 *
 * Centralized runtime validation for module options.
 *
 * @packageDocumentation
 */

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
}

/**
 * Validates module options and throws a descriptive Error on invalid configuration.
 */
export function validateAuditKitModuleOptions(options: AuditKitModuleOptions): void {
  if (!options || !options.repository) {
    throw new Error("AuditKitModule options must include a repository configuration");
  }

  if (options.repository.type === "mongodb") {
    if (!options.repository.uri && !options.repository.model) {
      throw new Error("MongoDB repository requires either 'uri' or 'model' to be configured");
    }
  }

  if (
    options.redaction?.fields &&
    options.redaction.fields.some((field) => typeof field !== "string" || field.trim().length === 0)
  ) {
    throw new Error("Redaction fields must be non-empty strings");
  }

  if (options.retention?.enabled) {
    const retentionDays = options.retention.retentionDays;
    if (!Number.isInteger(retentionDays) || (retentionDays as number) <= 0) {
      throw new Error("Retention requires a positive integer 'retentionDays'");
    }

    if (options.retention.archiveBeforeDelete && options.retention.archiveHandler === undefined) {
      throw new Error("Retention with archiveBeforeDelete=true requires an archiveHandler");
    }
  }

  if (options.idempotency?.keyStrategy === "requestId" && options.idempotency.enabled === false) {
    throw new Error("Idempotency key strategy is configured but idempotency is disabled");
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
