/**
 * ============================================================================
 * AUDIT KIT MODULE - CONFIGURATION INTERFACES
 * ============================================================================
 *
 * Type definitions for configuring AuditKitModule.
 *
 * Module Registration Patterns:
 * 1. register() - Synchronous configuration with static values
 * 2. registerAsync() - Async configuration with useFactory/useClass/useExisting
 *
 * @packageDocumentation
 */

import type { ModuleMetadata, Type } from "@nestjs/common";
import type { Model } from "mongoose";

import type { IAuditObserver } from "../core/ports/audit-observer.port";
import type { AuditLog } from "../core/types";
import type { AuditLogDocument } from "../infra/repositories/mongodb/audit-log.schema";

// eslint-disable-next-line no-unused-vars
export type ArchiveHandler = (logs: AuditLog[]) => Promise<void> | void;

// ============================================================================
// REPOSITORY CONFIGURATION
// ============================================================================

/**
 * MongoDB repository configuration.
 */
export interface MongoDbRepositoryConfig {
  /**
   * Repository type identifier.
   */
  type: "mongodb";

  /**
   * MongoDB connection URI.
   * Required if not providing a model instance.
   *
   * @example 'mongodb://localhost:27017/auditdb'
   */
  uri?: string;

  /**
   * MongoDB database name.
   */
  database?: string;

  /**
   * Pre-configured Mongoose model for audit logs.
   * If provided, uri and database are ignored.
   */
  model?: Model<AuditLogDocument>;
}

/**
 * In-memory repository configuration.
 * Useful for testing and simple deployments.
 */
export interface InMemoryRepositoryConfig {
  /**
   * Repository type identifier.
   */
  type: "in-memory";

  /**
   * Optional initial data to seed the repository.
   */
  initialData?: never; // Placeholder for future implementation
}

/**
 * Repository configuration union type.
 */
export type RepositoryConfig = MongoDbRepositoryConfig | InMemoryRepositoryConfig;

// ============================================================================
// UTILITY PROVIDER CONFIGURATION
// ============================================================================

/**
 * ID generator configuration.
 */
export interface IdGeneratorConfig {
  /**
   * Generator type.
   * Currently only 'nanoid' is supported.
   */
  type?: "nanoid";

  /**
   * Default length for generated IDs.
   * @default 21
   */
  defaultLength?: number;

  /**
   * Custom alphabet for ID generation.
   * @default 'A-Za-z0-9_-'
   */
  defaultAlphabet?: string;
}

/**
 * Timestamp provider configuration.
 */
export interface TimestampProviderConfig {
  /**
   * Provider type.
   * Currently only 'system' is supported.
   */
  type?: "system";

  /**
   * Default timezone for timestamp operations.
   * @default 'utc'
   */
  defaultTimezone?: "utc" | "local";

  /**
   * Default precision for timestamps.
   * @default 'millisecond'
   */
  defaultPrecision?: "second" | "millisecond" | "microsecond";
}

/**
 * Change detector configuration.
 */
export interface ChangeDetectorConfig {
  /**
   * Detector type.
   * Currently only 'deep-diff' is supported.
   */
  type?: "deep-diff";
}

/**
 * PII redaction configuration.
 */
export interface RedactionConfig {
  /** Enable/disable redaction before persistence. */
  enabled?: boolean;

  /** Dot-path fields to redact (e.g. actor.email, metadata.token). */
  fields?: string[];

  /** Replacement mask value. */
  mask?: string;
}

/**
 * Idempotency configuration.
 */
export interface IdempotencyConfig {
  /** Enable/disable write deduplication. */
  enabled?: boolean;

  /** Which field is used as dedupe key. */
  keyStrategy?: "idempotencyKey" | "requestId";
}

/**
 * Retention and archival configuration.
 */
export interface RetentionConfig {
  /** Enable retention processing. */
  enabled?: boolean;

  /** Number of days to retain hot data. */
  retentionDays?: number;

  /** Whether to run retention cleanup after each write. */
  autoCleanupOnWrite?: boolean;

  /** Archive logs before delete operations. */
  archiveBeforeDelete?: boolean;

  /** Optional callback receiving logs selected for archival. */
  archiveHandler?: ArchiveHandler;
}

// ============================================================================
// MAIN MODULE OPTIONS
// ============================================================================

/**
 * Configuration options for AuditKitModule.
 *
 * @example Basic configuration with MongoDB
 * ```typescript
 * AuditKitModule.register({
 *   repository: {
 *     type: 'mongodb',
 *     uri: 'mongodb://localhost:27017/auditdb',
 *     database: 'auditdb'
 *   }
 * })
 * ```
 *
 * @example Configuration with in-memory repository
 * ```typescript
 * AuditKitModule.register({
 *   repository: {
 *     type: 'in-memory'
 *   }
 * })
 * ```
 *
 * @example Full configuration with custom providers
 * ```typescript
 * AuditKitModule.register({
 *   repository: {
 *     type: 'mongodb',
 *     uri: process.env.MONGO_URI
 *   },
 *   idGenerator: {
 *     type: 'nanoid',
 *     defaultLength: 16
 *   },
 *   timestampProvider: {
 *     type: 'system',
 *     defaultTimezone: 'utc'
 *   },
 *   changeDetector: {
 *     type: 'deep-diff'
 *   }
 * })
 * ```
 */
export interface AuditKitModuleOptions {
  /**
   * Repository configuration.
   * Determines where audit logs are persisted.
   */
  repository: RepositoryConfig;

  /**
   * ID generator configuration.
   * Optional - defaults to nanoid with standard settings.
   */
  idGenerator?: IdGeneratorConfig;

  /**
   * Timestamp provider configuration.
   * Optional - defaults to system clock with UTC.
   */
  timestampProvider?: TimestampProviderConfig;

  /**
   * Change detector configuration.
   * Optional - defaults to deep-diff detector.
   */
  changeDetector?: ChangeDetectorConfig;

  /**
   * PII redaction policy applied before persistence.
   */
  redaction?: RedactionConfig;

  /**
   * Idempotency policy to deduplicate repeated writes.
   */
  idempotency?: IdempotencyConfig;

  /**
   * Retention and archival policy.
   */
  retention?: RetentionConfig;

  /**
   * Observability observer (OpenTelemetry, metrics, custom logging, etc.).
   * When provided, AuditService calls `observer.onEvent()` after each operation.
   * Observer errors are swallowed and never affect core operations.
   *
   * @example
   * ```typescript
   * AuditKitModule.register({
   *   repository: { type: 'in-memory' },
   *   observer: {
   *     onEvent(event) {
   *       console.log(`[audit] ${event.operation} in ${event.durationMs}ms`);
   *     },
   *   },
   * });
   * ```
   */
  observer?: IAuditObserver;
}

// ============================================================================
// ASYNC MODULE OPTIONS
// ============================================================================

/**
 * Factory function for creating AuditKit options asynchronously.
 */
export interface AuditKitModuleOptionsFactory {
  /**
   * Creates module options.
   * Can be async (returns Promise) or sync.
   */
  createAuditKitOptions(): Promise<AuditKitModuleOptions> | AuditKitModuleOptions;
}

/**
 * Async configuration options for AuditKitModule.
 *
 * Supports three patterns:
 * 1. useFactory - Provide a factory function
 * 2. useClass - Provide a class that implements AuditKitModuleOptionsFactory
 * 3. useExisting - Reuse an existing provider
 *
 * @example With useFactory
 * ```typescript
 * AuditKitModule.registerAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     repository: {
 *       type: 'mongodb',
 *       uri: config.get('MONGO_URI')
 *     }
 *   })
 * })
 * ```
 *
 * @example With useClass
 * ```typescript
 * AuditKitModule.registerAsync({
 *   useClass: AuditKitConfigService
 * })
 * ```
 *
 * @example With useExisting
 * ```typescript
 * AuditKitModule.registerAsync({
 *   useExisting: AuditKitConfigService
 * })
 * ```
 */
export interface AuditKitModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  /**
   * Factory function to create module options.
   * Can inject dependencies via the inject array.
   */
  useFactory?: (
    // eslint-disable-next-line no-unused-vars
    ...args: any[]
  ) => Promise<AuditKitModuleOptions> | AuditKitModuleOptions;

  /**
   * Dependencies to inject into the factory function.
   */

  inject?: any[];

  /**
   * Class that implements AuditKitModuleOptionsFactory.
   * Will be instantiated by NestJS.
   */
  useClass?: Type<AuditKitModuleOptionsFactory>;

  /**
   * Existing provider token that implements AuditKitModuleOptionsFactory.
   * Reuses an already registered provider.
   */

  useExisting?: Type<AuditKitModuleOptionsFactory>;
}
