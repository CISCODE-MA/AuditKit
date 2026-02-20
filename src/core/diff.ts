/**
 * Deep diff utility - compares before/after states.
 */

const MAX_DEPTH = 10;

export interface DiffResult {
  /** Fields that were modified */
  modifiedFields: string[];
  /** Fields that were added */
  addedFields: string[];
  /** Fields that were removed */
  removedFields: string[];
  /** Whether any changes were detected */
  hasChanges: boolean;
}

/**
 * Deep compare two values for equality.
 */
function deepEqual(a: unknown, b: unknown, depth: number, seen: WeakMap<object, unknown>): boolean {
  if (depth > MAX_DEPTH) return true; // Assume equal at max depth

  // Strict equality
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Different types
  if (typeof a !== typeof b) return false;

  // Non-objects are not equal at this point
  if (typeof a !== "object") return false;

  // Handle circular references
  if (seen.has(a as object)) {
    return seen.get(a as object) === b;
  }
  seen.set(a as object, b);

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i], depth + 1, seen));
  }

  // Handle Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle objects
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
      depth + 1,
      seen,
    ),
  );
}

/**
 * Compute the diff between two objects.
 *
 * @param before - State before the operation
 * @param after - State after the operation
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @returns DiffResult with modified, added, and removed fields
 *
 * @example
 * ```typescript
 * const before = { name: 'John', age: 30 };
 * const after = { name: 'Jane', age: 30, email: 'jane@example.com' };
 * deepDiff(before, after);
 * // { modifiedFields: ['name'], addedFields: ['email'], removedFields: [], hasChanges: true }
 * ```
 */
export function deepDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  maxDepth: number = MAX_DEPTH,
): DiffResult {
  const modifiedFields: string[] = [];
  const addedFields: string[] = [];
  const removedFields: string[] = [];

  // Handle null/undefined cases
  if (!before && !after) {
    return { modifiedFields, addedFields, removedFields, hasChanges: false };
  }

  if (!before) {
    return {
      modifiedFields: [],
      addedFields: Object.keys(after || {}),
      removedFields: [],
      hasChanges: Object.keys(after || {}).length > 0,
    };
  }

  if (!after) {
    return {
      modifiedFields: [],
      addedFields: [],
      removedFields: Object.keys(before),
      hasChanges: Object.keys(before).length > 0,
    };
  }

  const seen = new WeakMap<object, unknown>();

  function compare(
    objBefore: Record<string, unknown>,
    objAfter: Record<string, unknown>,
    path: string,
    depth: number,
  ): void {
    if (depth > maxDepth) return;

    const beforeKeys = new Set(Object.keys(objBefore));
    const afterKeys = new Set(Object.keys(objAfter));

    // Check for removed fields
    for (const key of beforeKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      if (!afterKeys.has(key)) {
        removedFields.push(fullPath);
      }
    }

    // Check for added and modified fields
    for (const key of afterKeys) {
      const fullPath = path ? `${path}.${key}` : key;

      if (!beforeKeys.has(key)) {
        addedFields.push(fullPath);
        continue;
      }

      const beforeVal = objBefore[key];
      const afterVal = objAfter[key];

      // If both are plain objects, recurse to find nested changes
      if (
        typeof beforeVal === "object" &&
        typeof afterVal === "object" &&
        beforeVal !== null &&
        afterVal !== null &&
        !Array.isArray(beforeVal) &&
        !Array.isArray(afterVal) &&
        !(beforeVal instanceof Date) &&
        !(afterVal instanceof Date)
      ) {
        compare(
          beforeVal as Record<string, unknown>,
          afterVal as Record<string, unknown>,
          fullPath,
          depth + 1,
        );
      } else if (!deepEqual(beforeVal, afterVal, 0, seen)) {
        modifiedFields.push(fullPath);
      }
    }
  }

  compare(before, after, "", 0);

  return {
    modifiedFields,
    addedFields,
    removedFields,
    hasChanges: modifiedFields.length > 0 || addedFields.length > 0 || removedFields.length > 0,
  };
}
