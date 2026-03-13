/**
 * ============================================================================
 * ID GENERATOR PORT - UNIQUE IDENTIFIER ABSTRACTION
 * ============================================================================
 *
 * This file defines the port (interface) for generating unique identifiers
 * for audit log entries.
 *
 * Purpose:
 * - Abstract away ID generation strategy
 * - Allow different ID formats (UUID, nanoid, snowflake, etc.)
 * - Enable predictable IDs for testing (sequential, fixed)
 * - Support database-specific ID requirements
 *
 * Pattern: Ports & Adapters (Hexagonal Architecture)
 * - This is a PORT (interface)
 * - Concrete implementations are ADAPTERS (e.g., NanoidGenerator, UUIDGenerator)
 *
 * Architecture Rules:
 * - This interface is in core/ - framework-free
 * - Implementations go in infra/ - can use external libraries
 *
 * @packageDocumentation
 */

// ESLint disable for interface method parameters (they're part of the contract, not actual code)
/* eslint-disable no-unused-vars */

// ===========================================================================
// ID GENERATION OPTIONS
// ============================================================================

/**
 * Configuration options for ID generation.
 *
 * Allows customizing the generated ID format and characteristics.
 */
export interface IdGenerationOptions {
  /**
   * Optional prefix to add to generated IDs.
   * Useful for namespacing or identifying entity types.
   *
   * @example 'audit_', 'log_', 'evt_'
   */
  prefix?: string;

  /**
   * Optional suffix to add to generated IDs.
   * Less common but can be useful for sharding or routing.
   */
  suffix?: string;

  /**
   * Desired length of the ID (excluding prefix/suffix).
   * Not all generators support custom lengths.
   *
   * @example 21 (nanoid default), 36 (UUID with hyphens)
   */
  length?: number;

  /**
   * Character set for ID generation.
   * Not all generators support custom alphabets.
   *
   * @example 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
   */
  alphabet?: string;

  /**
   * Additional metadata to include in ID generation.
   * Some generators (e.g., snowflake) can encode metadata.
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MAIN ID GENERATOR PORT
// ============================================================================

/**
 * Port (interface) for generating unique identifiers.
 *
 * Implementations must provide algorithms to:
 * - Generate unique IDs (string format)
 * - Ensure uniqueness (probability or guarantee)
 * - Support configuration (prefix, length, etc.)
 * - Be performant (can generate many IDs quickly)
 *
 * Characteristics of a good ID:
 * - **Unique**: No collisions (or extremely low probability)
 * - **Sortable**: Lexicographically sortable by creation time (optional)
 * - **Compact**: Short enough to use as DB primary key
 * - **URL-safe**: No special characters that need escaping
 * - **Human-friendly**: Readable and easy to copy/paste (optional)
 *
 * Implementation Examples:
 * - NanoidGenerator (uses nanoid library - short, URL-safe, random)
 * - UUIDv4Generator (uses crypto.randomUUID() - standard, 36 chars)
 * - UUIDv7Generator (time-ordered UUIDs - sortable)
 * - SequentialGenerator (testing only - predictable sequence)
 * - SnowflakeGenerator (Twitter snowflake - 64-bit, time-ordered)
 */
export interface IIdGenerator {
  /**
   * Generates a new unique identifier.
   *
   * Algorithm should:
   * 1. Generate a base ID (random, time-based, sequential, etc.)
   * 2. Apply prefix if specified
   * 3. Apply suffix if specified
   * 4. Ensure result is unique (probabilistically or guaranteed)
   * 5. Return as string
   *
   * @param options - Optional configuration for ID generation
   * @returns A unique identifier as a string
   *
   * @example Basic usage
   * ```typescript
   * const id = generator.generate();
   * // 'V1StGXR8_Z5jdHi6B-myT' (nanoid)
   * // or
   * // '550e8400-e29b-41d4-a716-446655440000' (UUID)
   * ```
   *
   * @example With prefix
   * ```typescript
   * const id = generator.generate({ prefix: 'audit_' });
   * // 'audit_V1StGXR8_Z5jdHi6B-myT'
   * ```
   *
   * @example With custom length (if supported)
   * ```typescript
   * const id = generator.generate({ length: 10 });
   * // 'V1StGXR8_Z' (shorter)
   * ```
   */
  generate(_options?: IdGenerationOptions): string;

  /**
   * Generates multiple unique identifiers in one call.
   *
   * More efficient than calling generate() in a loop.
   * Useful for bulk operations.
   *
   * @param count - Number of IDs to generate
   * @param options - Optional configuration for ID generation
   * @returns Array of unique identifiers
   *
   * @example
   * ```typescript
   * const ids = generator.generateBatch(100, { prefix: 'audit_' });
   * // ['audit_V1St...', 'audit_X2Ry...', ... (100 IDs)]
   * ```
   */
  generateBatch(_count: number, _options?: IdGenerationOptions): string[];

  /**
   * Validates if a string is a valid ID format.
   *
   * Checks if the given string matches the expected ID format.
   * Useful for:
   * - Input validation
   * - Security checks
   * - Data integrity verification
   *
   * @param id - The string to validate
   * @returns True if valid, false otherwise
   *
   * @example
   * ```typescript
   * generator.isValid('V1StGXR8_Z5jdHi6B-myT');
   * // true (valid nanoid)
   *
   * generator.isValid('invalid!@#');
   * // false (contains invalid characters)
   *
   * generator.isValid('');
   * // false (empty string)
   * ```
   */
  isValid(_id: string): boolean;

  /**
   * Extracts metadata from an ID if the generator encodes it.
   *
   * Some ID generators (e.g., snowflake, ULID) encode timestamp
   * or other metadata in the ID. This method extracts that data.
   *
   * Returns null if the generator doesn't support metadata extraction
   * or if the ID doesn't contain metadata.
   *
   * @param id - The ID to extract metadata from
   * @returns Metadata object or null
   *
   * @example With snowflake IDs
   * ```typescript
   * const metadata = generator.extractMetadata('1234567890123456789');
   * // { timestamp: Date('2026-03-12T...'), workerId: 1, sequence: 0 }
   * ```
   *
   * @example With ULIDs (time-ordered IDs)
   * ```typescript
   * const metadata = generator.extractMetadata('01ARZ3NDEKTSV4RRFFQ69G5FAV');
   * // { timestamp: Date('2026-03-12T...') }
   * ```
   *
   * @example With random IDs (no metadata)
   * ```typescript
   * const metadata = generator.extractMetadata('V1StGXR8_Z5jdHi6B-myT');
   * // null (random IDs don't encode metadata)
   * ```
   */
  extractMetadata?(_id: string): Record<string, unknown> | null;

  /**
   * Returns information about the generator implementation.
   *
   * Useful for debugging, monitoring, and documentation.
   *
   * @returns Generator information
   *
   * @example
   * ```typescript
   * const info = generator.getInfo();
   * // {
   * //   name: 'NanoidGenerator',
   * //   version: '5.0.0',
   * //   defaultLength: 21,
   * //   alphabet: 'A-Za-z0-9_-',
   * //   collisionProbability: '1% in ~10^15 IDs',
   * //   sortable: false,
   * //   encoding: null
   * // }
   * ```
   */
  getInfo(): IdGeneratorInfo;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Information about an ID generator implementation.
 *
 * Provides metadata about the generator's characteristics and capabilities.
 */
export interface IdGeneratorInfo {
  /** Name of the generator */
  name: string;

  /** Version of the underlying library (if applicable) */
  version?: string;

  /** Default length of generated IDs */
  defaultLength: number;

  /** Character set used for IDs */
  alphabet: string;

  /** Description of collision probability */
  collisionProbability?: string;

  /** Whether IDs are sortable by creation time */
  sortable: boolean;

  /** Type of metadata encoded in IDs (if any) */
  encoding: "timestamp" | "sequence" | "custom" | null;
}
