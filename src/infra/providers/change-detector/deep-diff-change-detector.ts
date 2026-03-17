/**
 * ============================================================================
 * DEEP DIFF CHANGE DETECTOR - IMPLEMENTATION
 * ============================================================================
 *
 * Concrete implementation of IChangeDetector with deep object comparison.
 *
 * Features:
 * - Deep recursive comparison of objects
 * - Field exclusion (ignore technical fields)
 * - Field masking (hide sensitive values)
 * - Custom comparators for special types
 * - Nested object support
 * - Array comparison
 *
 * Use Cases:
 * - Automatically detect changes in UPDATE operations
 * - Track what changed for audit trails
 * - Generate change summaries for notifications
 * - Mask sensitive data in audit logs
 *
 * Algorithm:
 * 1. Recursively compare all properties (up to maxDepth)
 * 2. Exclude specified fields
 * 3. Apply custom comparators for special types
 * 4. Mask sensitive fields in the result
 * 5. Return only changed fields (or all if includeUnchanged)
 *
 * @packageDocumentation
 */

import type {
  IChangeDetector,
  ChangeDetectionOptions,
} from "../../../core/ports/change-detector.port";
import type { ChangeSet } from "../../../core/types";

// ============================================================================
// DEEP DIFF CHANGE DETECTOR IMPLEMENTATION
// ============================================================================

/**
 * Change detector with deep object comparison.
 *
 * Compares two objects and identifies which fields changed.
 *
 * @example Basic usage
 * ```typescript
 * const detector = new DeepDiffChangeDetector();
 *
 * const before = { name: 'John', email: 'john@old.com', age: 30 };
 * const after = { name: 'John', email: 'john@new.com', age: 31 };
 *
 * const changes = detector.detectChanges(before, after);
 * // {
 * //   email: { from: 'john@old.com', to: 'john@new.com' },
 * //   age: { from: 30, to: 31 }
 * // }
 * ```
 *
 * @example With field masking
 * ```typescript
 * const detector = new DeepDiffChangeDetector();
 *
 * const before = { username: 'user1', password: 'oldpass123' };
 * const after = { username: 'user1', password: 'newpass456' };
 *
 * const changes = detector.detectChanges(before, after, {
 *   maskFields: ['password'],
 *   maskStrategy: 'full'
 * });
 * // { password: { from: '***', to: '***' } }
 * ```
 *
 * @example With field exclusion
 * ```typescript
 * const detector = new DeepDiffChangeDetector();
 *
 * const before = { name: 'John', updatedAt: new Date('2026-01-01') };
 * const after = { name: 'Johnny', updatedAt: new Date('2026-03-16') };
 *
 * const changes = detector.detectChanges(before, after, {
 *   excludeFields: ['updatedAt']
 * });
 * // { name: { from: 'John', to: 'Johnny' } }
 * ```
 */
export class DeepDiffChangeDetector implements IChangeDetector {
  /**
   * Default maximum depth for nested object comparison.
   */
  private static readonly DEFAULT_MAX_DEPTH = 10;

  /**
   * Default masking strategy.
   */
  private static readonly DEFAULT_MASK_STRATEGY = "full";

  /**
   * Detects changes between two object states.
   *
   * @param before - The object state before the change
   * @param after - The object state after the change
   * @param options - Optional configuration for detection behavior
   * @returns ChangeSet mapping field names to before/after values
   */
  detectChanges<T extends Record<string, unknown>>(
    before: T,
    after: T,
    options?: ChangeDetectionOptions,
  ): ChangeSet {
    const maxDepth = options?.maxDepth ?? DeepDiffChangeDetector.DEFAULT_MAX_DEPTH;
    const excludeFields = new Set(options?.excludeFields ?? []);
    const maskFields = new Set(options?.maskFields ?? []);
    const maskStrategy = options?.maskStrategy ?? DeepDiffChangeDetector.DEFAULT_MASK_STRATEGY;
    const includeUnchanged = options?.includeUnchanged ?? false;
    const customComparators = options?.customComparators ?? {};

    const changes: ChangeSet = {};

    // Get all unique field names from both objects
    const allFields = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const field of allFields) {
      // Skip excluded fields
      if (excludeFields.has(field)) {
        continue;
      }

      const beforeValue = before[field];
      const afterValue = after[field];

      // Check if values are different
      const isDifferent = this.hasChanged(
        beforeValue,
        afterValue,
        field,
        customComparators,
        maxDepth,
      );

      // Only include if changed OR includeUnchanged is true
      if (isDifferent || includeUnchanged) {
        // Apply masking if needed
        const shouldMask = maskFields.has(field);

        changes[field] = {
          from: shouldMask ? this.maskValue(beforeValue, maskStrategy) : beforeValue,
          to: shouldMask ? this.maskValue(afterValue, maskStrategy) : afterValue,
        };
      }
    }

    return changes;
  }

  /**
   * Detects if two values are different.
   *
   * @param before - The value before the change
   * @param after - The value after the change
   * @param fieldName - Optional field name (for custom comparators)
   * @returns True if values are different, false if the same
   */
  hasChanged(
    before: unknown,
    after: unknown,
    fieldName?: string,
    // eslint-disable-next-line no-unused-vars
    customComparators?: Record<string, (_a: unknown, _b: unknown) => boolean>,
    maxDepth: number = DeepDiffChangeDetector.DEFAULT_MAX_DEPTH,
  ): boolean {
    // Check custom comparator first
    if (fieldName && customComparators?.[fieldName]) {
      return !customComparators[fieldName](before, after);
    }

    // Use deep comparison
    return !this.deepEqual(before, after, maxDepth, 0);
  }

  /**
   * Applies masking to a field value.
   *
   * @param value - The value to mask
   * @param strategy - Masking strategy
   * @returns The masked value
   */
  maskValue(value: unknown, strategy: "full" | "partial" | "hash" = "full"): string {
    if (value === null || value === undefined) {
      return String(value);
    }

    const stringValue = String(value);

    switch (strategy) {
      case "full":
        return "***";

      case "partial": {
        // Show first and last 4 characters (or fewer if string is short)
        if (stringValue.length <= 8) {
          return "***";
        }
        const first = stringValue.slice(0, 4);
        const last = stringValue.slice(-4);
        return `${first}****${last}`;
      }

      case "hash": {
        // Simple hash implementation (non-crypto, for masking only)
        // NOTE: This is NOT cryptographically secure, just for audit log display
        return this.simpleHash(stringValue);
      }

      default: {
        const _exhaustive: never = strategy;
        return _exhaustive;
      }
    }
  }

  /**
   * Formats a ChangeSet for human-readable output.
   *
   * @param changes - The ChangeSet to format
   * @returns Human-readable summary of changes
   */
  formatChanges(changes: ChangeSet): string {
    const fieldSummaries = Object.entries(changes).map(([field, change]) => {
      const from = this.formatValue(change?.from);
      const to = this.formatValue(change?.to);
      return `${field} (${from} → ${to})`;
    });

    if (fieldSummaries.length === 0) {
      return "No changes detected";
    }

    return `Changed: ${fieldSummaries.join(", ")}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deep equality comparison for any values.
   *
   * Handles:
   * - Primitives (string, number, boolean, null, undefined)
   * - Dates
   * - Arrays
   * - Objects (nested)
   *
   * @param a - First value
   * @param b - Second value
   * @param maxDepth - Maximum recursion depth
   * @param currentDepth - Current recursion depth
   * @returns True if equal, false otherwise
   */
  private deepEqual(a: unknown, b: unknown, maxDepth: number, currentDepth: number): boolean {
    // Strict equality check (handles primitives, null, same reference)
    if (a === b) {
      return true;
    }

    // Check if both are null/undefined
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }

    // Check if types are different
    if (typeof a !== typeof b) {
      return false;
    }

    // Handle Dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }

      // Stop recursion at max depth
      if (currentDepth >= maxDepth) {
        // Fallback to JSON comparison at max depth
        return JSON.stringify(a) === JSON.stringify(b);
      }

      return a.every((item, index) => this.deepEqual(item, b[index], maxDepth, currentDepth + 1));
    }

    // Handle Objects
    if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
      // Stop recursion at max depth
      if (currentDepth >= maxDepth) {
        // Fallback to JSON comparison at max depth
        return JSON.stringify(a) === JSON.stringify(b);
      }

      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      // Check if same number of keys
      if (aKeys.length !== bKeys.length) {
        return false;
      }

      // Check if all keys match
      for (const key of aKeys) {
        if (!bKeys.includes(key)) {
          return false;
        }

        if (!this.deepEqual(aObj[key], bObj[key], maxDepth, currentDepth + 1)) {
          return false;
        }
      }

      return true;
    }

    // Primitives that aren't strictly equal are different
    return false;
  }

  /**
   * Formats a value for display in change summaries.
   *
   * @param value - Value to format
   * @returns Human-readable string representation
   */
  private formatValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === "object") return "{object}";
    return String(value);
  }

  /**
   * Simple non-cryptographic hash function for masking values.
   *
   * NOTE: This is NOT cryptographically secure. It's only used for
   * display/masking purposes in audit logs, not for security.
   *
   * Uses a simple string hash algorithm (similar to Java's String.hashCode()).
   *
   * @param str - String to hash
   * @returns Hexadecimal hash string (16 characters)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad to 16 characters
    const hexHash = Math.abs(hash).toString(16).padStart(16, "0");
    return hexHash.slice(0, 16);
  }
}
