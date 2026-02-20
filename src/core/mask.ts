/**
 * PII masking utility - recursively masks sensitive data.
 */

import { DEFAULT_SENSITIVE_KEYS, type SensitiveKey } from "./types";

const DEFAULT_MASK = "[REDACTED]";
const MAX_DEPTH = 20;

/**
 * Check if a key should be masked (case-insensitive).
 */
function isSensitiveKey(key: string, sensitiveKeys: SensitiveKey[]): boolean {
  const lowerKey = key.toLowerCase();
  return sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()));
}

/**
 * Recursively mask sensitive fields in an object.
 *
 * @param data - The data to mask
 * @param sensitiveKeys - Keys to mask (merged with defaults)
 * @param maskValue - Value to replace sensitive data with
 * @returns A new object with sensitive fields masked
 *
 * @example
 * ```typescript
 * const data = { user: 'john', password: 'secret123' };
 * maskSensitiveData(data);
 * // { user: 'john', password: '[REDACTED]' }
 * ```
 */
export function maskSensitiveData<T>(
  data: T,
  sensitiveKeys: SensitiveKey[] = [],
  maskValue: string = DEFAULT_MASK,
): T {
  const allSensitiveKeys = [...DEFAULT_SENSITIVE_KEYS, ...sensitiveKeys];
  const seen = new WeakSet();

  function maskRecursive(value: unknown, depth: number): unknown {
    // Prevent infinite recursion
    if (depth > MAX_DEPTH) {
      return "[MAX_DEPTH_EXCEEDED]";
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value !== "object") {
      return value;
    }

    // Handle circular references
    if (seen.has(value as object)) {
      return "[CIRCULAR]";
    }
    seen.add(value as object);

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => maskRecursive(item, depth + 1));
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value;
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key, allSensitiveKeys)) {
        result[key] = maskValue;
      } else {
        result[key] = maskRecursive(val, depth + 1);
      }
    }

    return result;
  }

  return maskRecursive(data, 0) as T;
}
