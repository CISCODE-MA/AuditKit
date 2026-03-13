/**
 * ============================================================================
 * INVALID CHANGESET ERROR - DOMAIN ERROR
 * ============================================================================
 *
 * This file defines a custom error for invalid change tracking data.
 *
 * Purpose:
 * - Typed error for changeset validation failures
 * - Clear error messages for malformed change tracking
 * - Distinguishable from other validation errors
 * - Can carry details about what was invalid
 *
 * Usage in services:
 * ```typescript
 * if (!changes || Object.keys(changes).length === 0) {
 *   throw new InvalidChangeSetError('No changes detected');
 * }
 * ```
 *
 * Usage in error handlers:
 * ```typescript
 * if (error instanceof InvalidChangeSetError) {
 *   return res.status(400).json({ error: error.message });
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { ChangeSet } from "../types";

/**
 * Error thrown when changeset data is invalid or malformed.
 *
 * This is a domain-specific error that indicates:
 * - ChangeSet structure is invalid (missing 'from' or 'to' properties)
 * - Before/after states are identical (no actual changes)
 * - ChangeSet contains invalid field names or data types
 * - Change detection failed for some reason
 *
 * HTTP Status: 400 Bad Request
 */
export class InvalidChangeSetError extends Error {
  /**
   * Error name for type identification.
   * Always 'InvalidChangeSetError'.
   */
  public readonly name = "InvalidChangeSetError";

  /**
   * The invalid changeset that caused the error.
   * Useful for debugging validation issues.
   */
  public readonly changeSet?: ChangeSet | unknown;

  /**
   * The field name that has an invalid change (if specific field error).
   */
  public readonly fieldName?: string;

  /**
   * Additional context about the error.
   * Could include before/after values, expected format, etc.
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new InvalidChangeSetError.
   *
   * @param message - Error message describing the validation failure
   * @param changeSet - The invalid changeset (optional, for debugging)
   * @param fieldName - Specific field with invalid change (optional)
   * @param context - Additional context (optional)
   *
   * @example Basic usage
   * ```typescript
   * throw new InvalidChangeSetError('ChangeSet is required for UPDATE actions');
   * // Error: ChangeSet is required for UPDATE actions
   * ```
   *
   * @example With changeset data
   * ```typescript
   * const invalid = { email: { from: 'test@example.com' } }; // Missing 'to'
   * throw new InvalidChangeSetError('Invalid change structure', invalid);
   * // Error: Invalid change structure
   * // (changeset available in error.changeSet)
   * ```
   *
   * @example With field-specific error
   * ```typescript
   * throw new InvalidChangeSetError(
   *   'Password field cannot be tracked',
   *   changes,
   *   'password'
   * );
   * // Error: Password field cannot be tracked
   * // (field name available in error.fieldName)
   * ```
   *
   * @example With context
   * ```typescript
   * throw new InvalidChangeSetError(
   *   'Before and after states are identical',
   *   changes,
   *   undefined,
   *   { before: { name: 'John' }, after: { name: 'John' } }
   * );
   * ```
   */
  constructor(
    message: string,
    changeSet?: ChangeSet | unknown,
    fieldName?: string,
    context?: Record<string, unknown>,
  ) {
    // Call parent Error constructor
    super(message);

    // Store additional properties
    this.changeSet = changeSet;
    this.fieldName = fieldName;
    this.context = context;

    // Maintain proper stack trace in V8 engines (Chrome, Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidChangeSetError);
    }

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidChangeSetError.prototype);
  }

  /**
   * Converts the error to a JSON object.
   *
   * Useful for serialization in API responses or logging.
   *
   * @returns JSON representation of the error
   *
   * @example
   * ```typescript
   * const error = new InvalidChangeSetError(
   *   'Empty changeset',
   *   {},
   *   undefined,
   *   { reason: 'No changes detected' }
   * );
   *
   * console.log(error.toJSON());
   * // {
   * //   name: 'InvalidChangeSetError',
   * //   message: 'Empty changeset',
   * //   changeSet: {},
   * //   context: { reason: 'No changes detected' }
   * // }
   * ```
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      changeSet: this.changeSet,
      fieldName: this.fieldName,
      context: this.context,
    };
  }

  /**
   * Creates an error for empty changeset.
   *
   * Convenience factory method for when no changes are detected.
   *
   * @returns InvalidChangeSetError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidChangeSetError.empty();
   * // Error: ChangeSet is empty. No changes detected between before and after states.
   * ```
   */
  public static empty(): InvalidChangeSetError {
    return new InvalidChangeSetError(
      "ChangeSet is empty. No changes detected between before and after states.",
    );
  }

  /**
   * Creates an error for missing changeset on UPDATE.
   *
   * Convenience factory method for UPDATE actions without changes.
   *
   * @returns InvalidChangeSetError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidChangeSetError.missingForUpdate();
   * // Error: ChangeSet is required for UPDATE actions. Provide either 'changes' or 'before/after' states.
   * ```
   */
  public static missingForUpdate(): InvalidChangeSetError {
    return new InvalidChangeSetError(
      "ChangeSet is required for UPDATE actions. Provide either 'changes' or 'before/after' states.",
    );
  }

  /**
   * Creates an error for malformed field change.
   *
   * Convenience factory method for invalid field change structure.
   *
   * @param fieldName - The field with invalid structure
   * @param reason - Why it's invalid
   * @returns InvalidChangeSetError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidChangeSetError.malformedField(
   *   'email',
   *   'Missing "to" property'
   * );
   * // Error: Field "email" has invalid change structure: Missing "to" property
   * ```
   */
  public static malformedField(fieldName: string, reason: string): InvalidChangeSetError {
    return new InvalidChangeSetError(
      `Field "${fieldName}" has invalid change structure: ${reason}`,
      undefined,
      fieldName,
    );
  }

  /**
   * Creates an error for identical before/after states.
   *
   * Convenience factory method for when nothing actually changed.
   *
   * @param before - The before state
   * @param after - The after state
   * @returns InvalidChangeSetError with appropriate message
   *
   * @example
   * ```typescript
   * const state = { name: 'John' };
   * throw InvalidChangeSetError.noChanges(state, state);
   * // Error: Before and after states are identical. No changes to track.
   * ```
   */
  public static noChanges(before: unknown, after: unknown): InvalidChangeSetError {
    return new InvalidChangeSetError(
      "Before and after states are identical. No changes to track.",
      undefined,
      undefined,
      { before, after },
    );
  }

  /**
   * Creates an error for forbidden field tracking.
   *
   * Convenience factory method for fields that should never be audited.
   *
   * @param fieldName - The forbidden field name
   * @returns InvalidChangeSetError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidChangeSetError.forbiddenField('password');
   * // Error: Field "password" cannot be tracked in audit logs for security reasons
   * ```
   */
  public static forbiddenField(fieldName: string): InvalidChangeSetError {
    return new InvalidChangeSetError(
      `Field "${fieldName}" cannot be tracked in audit logs for security reasons`,
      undefined,
      fieldName,
    );
  }
}
