/**
 * ============================================================================
 * AUDIT KIT MODULE - DEPENDENCY INJECTION TOKENS
 * ============================================================================
 *
 * Constants used for dependency injection in AuditKit module.
 *
 * Token Naming Convention:
 * - UPPER_SNAKE_CASE for all tokens
 * - Descriptive names indicating what the token represents
 *
 * @packageDocumentation
 */

/**
 * Injection token for AuditKit module configuration options.
 *
 * @example Injecting options in a service
 * ```typescript
 * constructor(
 *   @Inject(AUDIT_KIT_OPTIONS)
 *   private readonly options: AuditKitModuleOptions
 * ) {}
 * ```
 */
export const AUDIT_KIT_OPTIONS = Symbol("AUDIT_KIT_OPTIONS");

/**
 * Injection token for the audit log repository.
 *
 * @example Injecting repository
 * ```typescript
 * constructor(
 *   @Inject(AUDIT_REPOSITORY)
 *   private readonly repository: IAuditLogRepository
 * ) {}
 * ```
 */
export const AUDIT_REPOSITORY = Symbol("AUDIT_REPOSITORY");

/**
 * Injection token for the ID generator.
 *
 * @example Injecting ID generator
 * ```typescript
 * constructor(
 *   @Inject(ID_GENERATOR)
 *   private readonly idGenerator: IIdGenerator
 * ) {}
 * ```
 */
export const ID_GENERATOR = Symbol("ID_GENERATOR");

/**
 * Injection token for the timestamp provider.
 *
 * @example Injecting timestamp provider
 * ```typescript
 * constructor(
 *   @Inject(TIMESTAMP_PROVIDER)
 *   private readonly timestampProvider: ITimestampProvider
 * ) {}
 * ```
 */
export const TIMESTAMP_PROVIDER = Symbol("TIMESTAMP_PROVIDER");

/**
 * Injection token for the change detector.
 *
 * @example Injecting change detector
 * ```typescript
 * constructor(
 *   @Inject(CHANGE_DETECTOR)
 *   private readonly changeDetector: IChangeDetector
 * ) {}
 * ```
 */
export const CHANGE_DETECTOR = Symbol("CHANGE_DETECTOR");
