/**
 * ============================================================================
 * NANOID ID GENERATOR - IMPLEMENTATION
 * ============================================================================
 *
 * Concrete implementation of IIdGenerator using the nanoid library.
 *
 * Features:
 * - Short, URL-safe IDs (21 characters by default)
 * - High entropy (160-bit security)
 * - Fast generation (~1.5M IDs/second)
 * - Customizable alphabet and length
 * - No dependencies on centralized systems
 *
 * Use Cases:
 * - Production audit log IDs
 * - Distributed systems (no coordination needed)
 * - URL-safe identifiers
 * - Database primary keys
 *
 * Characteristics:
 * - Collision probability: 1% in ~450 years generating 1000 IDs/hour
 * - Not sortable by time (random)
 * - No metadata encoding
 * - URL-safe alphabet: A-Za-z0-9_-
 *
 * @packageDocumentation
 */

import { nanoid, customAlphabet } from "nanoid";

import type {
  IIdGenerator,
  IdGenerationOptions,
  IdGeneratorInfo,
} from "../../../core/ports/id-generator.port";

// ============================================================================
// NANOID ID GENERATOR IMPLEMENTATION
// ============================================================================

/**
 * ID generator using the nanoid library.
 *
 * Generates short, random, URL-safe IDs with high entropy.
 *
 * @example Basic usage
 * ```typescript
 * const generator = new NanoidIdGenerator();
 * const id = generator.generate();
 * // 'V1StGXR8_Z5jdHi6B-myT' (21 characters)
 * ```
 *
 * @example With prefix
 * ```typescript
 * const generator = new NanoidIdGenerator();
 * const id = generator.generate({ prefix: 'audit_' });
 * // 'audit_V1StGXR8_Z5jdHi6B-myT'
 * ```
 *
 * @example Custom length
 * ```typescript
 * const generator = new NanoidIdGenerator({ defaultLength: 10 });
 * const id = generator.generate();
 * // 'V1StGXR8_Z' (10 characters)
 * ```
 *
 * @example Custom alphabet
 * ```typescript
 * const generator = new NanoidIdGenerator({
 *   defaultAlphabet: '0123456789ABCDEF'
 * });
 * const id = generator.generate();
 * // '1A2B3C4D5E6F7890A1B2C' (hex-only IDs)
 * ```
 */
export class NanoidIdGenerator implements IIdGenerator {
  /**
   * Default length for generated IDs (21 characters).
   */
  private readonly defaultLength: number;

  /**
   * Default alphabet for ID generation.
   * Uses nanoid's default: A-Za-z0-9_-
   */
  private readonly defaultAlphabet: string | undefined;

  /**
   * Regular expression for validating nanoid format.
   * Matches: A-Za-z0-9_- characters
   */
  private readonly validationPattern: RegExp;

  /**
   * Creates a new NanoidIdGenerator.
   *
   * @param options - Optional configuration
   * @param options.defaultLength - Default ID length (default: 21)
   * @param options.defaultAlphabet - Custom alphabet (default: nanoid's A-Za-z0-9_-)
   */
  constructor(options?: { defaultLength?: number; defaultAlphabet?: string }) {
    this.defaultLength = options?.defaultLength ?? 21;
    this.defaultAlphabet = options?.defaultAlphabet;

    // Build validation pattern based on alphabet
    const alphabetPattern = this.defaultAlphabet
      ? this.escapeRegex(this.defaultAlphabet)
      : "A-Za-z0-9_\\-";
    this.validationPattern = new RegExp(`^[${alphabetPattern}]+$`);
  }

  /**
   * Generates a new unique identifier.
   *
   * @param options - Optional configuration for this generation
   * @returns A unique identifier string
   */
  generate(options?: IdGenerationOptions): string {
    const length = options?.length ?? this.defaultLength;
    const alphabet = options?.alphabet ?? this.defaultAlphabet;

    // Generate base ID
    let baseId: string;
    if (alphabet) {
      // Use custom alphabet
      const customNanoid = customAlphabet(alphabet, length);
      baseId = customNanoid();
    } else {
      // Use default nanoid
      baseId = nanoid(length);
    }

    // Apply prefix and suffix
    const prefix = options?.prefix ?? "";
    const suffix = options?.suffix ?? "";

    return `${prefix}${baseId}${suffix}`;
  }

  /**
   * Generates multiple unique identifiers.
   *
   * More efficient than calling generate() in a loop.
   *
   * @param count - Number of IDs to generate
   * @param options - Optional configuration for generation
   * @returns Array of unique identifiers
   */
  generateBatch(count: number, options?: IdGenerationOptions): string[] {
    if (count <= 0) {
      return [];
    }

    const ids: string[] = [];
    const alphabet = options?.alphabet ?? this.defaultAlphabet;
    const length = options?.length ?? this.defaultLength;
    const prefix = options?.prefix ?? "";
    const suffix = options?.suffix ?? "";

    // Create custom generator once for efficiency
    const generator = alphabet ? customAlphabet(alphabet, length) : null;

    for (let i = 0; i < count; i++) {
      const baseId = generator ? generator() : nanoid(length);
      ids.push(`${prefix}${baseId}${suffix}`);
    }

    return ids;
  }

  /**
   * Validates if a string is a valid nanoid format.
   *
   * Checks:
   * - Not empty
   * - Contains only valid alphabet characters
   * - Reasonable length (between 1 and 100 characters)
   *
   * Note: This validates format, not uniqueness or existence.
   *
   * @param id - The string to validate
   * @returns True if valid format, false otherwise
   */
  isValid(id: string): boolean {
    if (!id || typeof id !== "string") {
      return false;
    }

    // Check length (reasonable bounds)
    if (id.length < 1 || id.length > 100) {
      return false;
    }

    // Check alphabet
    return this.validationPattern.test(id);
  }

  /**
   * Extracts metadata from an ID.
   *
   * Nanoid IDs are random and don't encode metadata, so this always returns null.
   *
   * @param _id - The ID to extract metadata from
   * @returns null (nanoid doesn't encode metadata)
   */
  // eslint-disable-next-line no-unused-vars
  extractMetadata(_id: string): Record<string, unknown> | null {
    // Nanoid IDs are random and don't encode metadata
    return null;
  }

  /**
   * Returns information about this generator.
   *
   * @returns Generator metadata
   */
  getInfo(): IdGeneratorInfo {
    return {
      name: "NanoidIdGenerator",
      version: "5.0.9", // nanoid version
      defaultLength: this.defaultLength,
      alphabet: this.defaultAlphabet ?? "A-Za-z0-9_-",
      collisionProbability: "~1% in ~450 years at 1000 IDs/hour (for 21-char IDs)",
      sortable: false,
      encoding: null, // Random IDs don't encode metadata
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Escapes special regex characters in a string.
   *
   * Used to build validation pattern from custom alphabets.
   *
   * @param str - String to escape
   * @returns Escaped string safe for use in regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
