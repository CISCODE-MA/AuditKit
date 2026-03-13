/**
 * ============================================================================
 * CHANGE DETECTOR PORT - CHANGE TRACKING ABSTRACTION
 * ============================================================================
 *
 * This file defines the port (interface) for detecting changes between
 * before/after states of entities.
 *
 * Purpose:
 * - Automatically calculate what fields changed during an UPDATE operation
 * - Abstract away the change detection algorithm
 * - Support different strategies (deep diff, shallow diff, custom comparators)
 * - Enable masking sensitive fields in change detection
 *
 * Pattern: Ports & Adapters (Hexagonal Architecture)
 * - This is a PORT (interface)
 * - Concrete implementations are ADAPTERS (e.g., DeepDiffChangeDetector)
 *
 * Architecture Rules:
 * - This interface is in core/ - framework-free
 * - Implementations go in infra/ - can use external libraries
 *
 * @packageDocumentation
 */

import type { ChangeSet } from "../types";

// ============================================================================
// CHANGE DETECTION OPTIONS
// ============================================================================

/**
 * Configuration options for change detection.
 *
 * Allows customizing how changes are detected and reported.
 */
export interface ChangeDetectionOptions {
  /**
   * Fields to exclude from change detection.
   * Useful for technical fields that change automatically.
   *
   * @example ['updatedAt', 'version', '__v']
   */
  excludeFields?: string[];

  /**
   * Fields to mask (hide the actual values).
   * For sensitive fields like passwords, credit cards, etc.
   *
   * @example ['password', 'ssn', 'creditCard']
   */
  maskFields?: string[];

  /**
   * Strategy for masking field values.
   * - 'full': Replace with '***' (default)
   * - 'partial': Show first/last characters (e.g., '****1234')
   * - 'hash': Show hash of value
   */
  maskStrategy?: "full" | "partial" | "hash";

  /**
   * Maximum depth for nested object comparison.
   * Prevents infinite recursion and limits complexity.
   *
   * @default 10
   */
  maxDepth?: number;

  /**
   * Whether to include unchanged fields in the result.
   * If true, all fields are included with from === to.
   * If false (default), only changed fields are returned.
   *
   * @default false
   */
  includeUnchanged?: boolean;

  /**
   * Custom comparator functions for specific field types.
   * Allows defining how to compare non-primitive values.
   *
   * @example
   * ```typescript
   * {
   *   'dates': (a, b) => a.getTime() === b.getTime(),
   *   'arrays': (a, b) => JSON.stringify(a) === JSON.stringify(b)
   * }
   * ```
   */
  customComparators?: Record<
    string,
    (a: unknown, b: unknown) => boolean
  >;
}

// ============================================================================
// MAIN CHANGE DETECTOR PORT
// ============================================================================

/**
 * Port (interface) for detecting changes between object states.
 *
 * Implementations must provide algorithms to:
 * - Compare two objects (before/after)
 * - Identify which fields changed
 * - Capture the old and new values
 * - Handle nested objects and arrays
 * - Apply masking for sensitive fields
 *
 * Implementation Examples:
 * - DeepDiffChangeDetector (uses deep-diff library)
 * - ShallowChangeDetector (only top-level properties)
 * - CustomChangeDetector (application-specific rules)
 */
export interface IChangeDetector {
  /**
   * Detects changes between two object states.
   *
   * Compares the `before` and `after` objects and returns a ChangeSet
   * containing only the fields that changed (unless includeUnchanged is true).
   *
   * Algorithm should:
   * 1. Recursively compare all properties (up to maxDepth)
   * 2. Exclude specified fields
   * 3. Mask sensitive fields
   * 4. Handle special types (Dates, Arrays, etc.) with custom comparators
   * 5. Return only changed fields (or all if includeUnchanged)
   *
   * @param before - The object state before the change
   * @param after - The object state after the change
   * @param options - Optional configuration for detection behavior
   * @returns ChangeSet mapping field names to before/after values
   *
   * @example Basic usage
   * ```typescript
   * const before = { name: 'John', email: 'john@old.com', age: 30 };
   * const after = { name: 'John', email: 'john@new.com', age: 31 };
   *
   * const changes = await detector.detectChanges(before, after);
   * // Result:
   * // {
   * //   email: { from: 'john@old.com', to: 'john@new.com' },
   * //   age: { from: 30, to: 31 }
   * // }
   * ```
   *
   * @example With field masking
   * ```typescript
   * const before = { username: 'user1', password: 'oldpass123' };
   * const after = { username: 'user1', password: 'newpass456' };
   *
   * const changes = await detector.detectChanges(before, after, {
   *   maskFields: ['password'],
   *   maskStrategy: 'full'
   * });
   * // Result:
   * // {
   * //   password: { from: '***', to: '***' }
   * // }
   * ```
   *
   * @example With field exclusion
   * ```typescript
   * const before = { name: 'John', updatedAt: new Date('2026-01-01') };
   * const after = { name: 'Johnny', updatedAt: new Date('2026-03-01') };
   *
   * const changes = await detector.detectChanges(before, after, {
   *   excludeFields: ['updatedAt']
   * });
   * // Result:
   * // {
   * //   name: { from: 'John', to: 'Johnny' }
   * // }
   * ```
   */
  detectChanges<T extends Record<string, unknown>>(
    before: T,
    after: T,
    options?: ChangeDetectionOptions,
  ): Promise<ChangeSet> | ChangeSet;

  /**
   * Detects if two values are different.
   *
   * Helper method for comparing individual values.
   * Uses the same comparison logic as detectChanges() but for single values.
   *
   * @param before - The value before the change
   * @param after - The value after the change
   * @param fieldName - Optional field name (for custom comparators)
   * @returns True if values are different, false if the same
   *
   * @example
   * ```typescript
   * const changed = detector.hasChanged('oldValue', 'newValue');
   * // true
   *
   * const notChanged = detector.hasChanged(123, 123);
   * // false
   *
   * const dateChanged = detector.hasChanged(
   *   new Date('2026-01-01'),
   *   new Date('2026-01-02')
   * );
   * // true
   * ```
   */
  hasChanged(before: unknown, after: unknown, fieldName?: string): boolean;

  /**
   * Applies masking to a field value.
   *
   * Masks sensitive data according to the configured strategy.
   * Useful when you need to mask values outside of change detection.
   *
   * @param value - The value to mask
   * @param strategy - Masking strategy (default: 'full')
   * @returns The masked value
   *
   * @example
   * ```typescript
   * detector.maskValue('password123', 'full');
   * // '***'
   *
   * detector.maskValue('4111111111111234', 'partial');
   * // '****-****-****-1234'
   *
   * detector.maskValue('sensitive', 'hash');
   * // 'a3f1d...8e2' (SHA-256 hash)
   * ```
   */
  maskValue(value: unknown, strategy?: "full" | "partial" | "hash"): string;

  /**
   * Formats a ChangeSet for human-readable output.
   *
   * Converts a ChangeSet into a formatted string suitable for logs,
   * notifications, or UI display.
   *
   * @param changes - The ChangeSet to format
   * @returns Human-readable summary of changes
   *
   * @example
   * ```typescript
   * const changes = {
   *   email: { from: 'old@example.com', to: 'new@example.com' },
   *   status: { from: 'pending', to: 'active' }
   * };
   *
   * const summary = detector.formatChanges(changes);
   * // "Changed: email (old@example.com → new@example.com), status (pending → active)"
   * ```
   */
  formatChanges(changes: ChangeSet): string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Type for a custom comparator function.
 *
 * Takes two values and returns true if they are considered equal.
 */
export type ComparatorFunction = (a: unknown, b: unknown) => boolean;

/**
 * Type for a masking function.
 *
 * Takes a value and returns the masked version.
 */
export type MaskingFunction = (value: unknown) => string;
