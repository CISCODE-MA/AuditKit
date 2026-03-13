/**
 * ============================================================================
 * INVALID ACTOR ERROR - DOMAIN ERROR
 * ============================================================================
 *
 * This file defines a custom error for invalid or missing actor information.
 *
 * Purpose:
 * - Typed error for actor validation failures
 * - Clear error messages for missing/invalid actor data
 * - Distinguishable from other validation errors
 * - Can carry details about what was invalid
 *
 * Usage in services:
 * ```typescript
 * if (!actor.id) {
 *   throw new InvalidActorError('Actor ID is required');
 * }
 * ```
 *
 * Usage in error handlers:
 * ```typescript
 * if (error instanceof InvalidActorError) {
 *   return res.status(400).json({ error: error.message });
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Error thrown when actor information is invalid or incomplete.
 *
 * This is a domain-specific error that indicates:
 * - Actor ID is missing or empty
 * - Actor type is invalid (not USER, SYSTEM, or SERVICE)
 * - Required actor fields are missing (e.g., email for user actors)
 * - Actor format doesn't match expected structure
 *
 * HTTP Status: 400 Bad Request
 */
export class InvalidActorError extends Error {
  /**
   * Error name for type identification.
   * Always 'InvalidActorError'.
   */
  public readonly name = "InvalidActorError";

  /**
   * The invalid actor data that caused the error.
   * Useful for debugging validation issues.
   */
  public readonly actor?: unknown;

  /**
   * Specific validation errors (field-level details).
   * Maps field names to error messages.
   *
   * @example
   * ```typescript
   * {
   *   'id': 'Actor ID is required',
   *   'type': 'Must be one of: user, system, service'
   * }
   * ```
   */
  public readonly validationErrors?: Record<string, string>;

  /**
   * Creates a new InvalidActorError.
   *
   * @param message - Error message describing the validation failure
   * @param actor - The invalid actor data (optional, for debugging)
   * @param validationErrors - Field-level validation errors (optional)
   *
   * @example Basic usage
   * ```typescript
   * throw new InvalidActorError('Actor ID is required');
   * // Error: Actor ID is required
   * ```
   *
   * @example With actor data
   * ```typescript
   * const invalidActor = { type: 'invalid', name: 'Test' };
   * throw new InvalidActorError('Invalid actor type', invalidActor);
   * // Error: Invalid actor type
   * // (actor data available in error.actor)
   * ```
   *
   * @example With field-level errors
   * ```typescript
   * throw new InvalidActorError('Actor validation failed', actor, {
   *   'id': 'ID cannot be empty',
   *   'type': 'Must be one of: user, system, service',
   *   'email': 'Invalid email format'
   * });
   * // Error: Actor validation failed
   * // (validation details available in error.validationErrors)
   * ```
   */
  constructor(message: string, actor?: unknown, validationErrors?: Record<string, string>) {
    // Call parent Error constructor
    super(message);

    // Store additional properties
    this.actor = actor;
    if (validationErrors !== undefined) this.validationErrors = validationErrors;

    // Maintain proper stack trace in V8 engines (Chrome, Node.js)
    if ("captureStackTrace" in Error) {
      (Error as any).captureStackTrace(this, InvalidActorError);
    }

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidActorError.prototype);
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
   * const error = new InvalidActorError(
   *   'Actor validation failed',
   *   { id: '', type: 'user' },
   *   { id: 'ID cannot be empty' }
   * );
   *
   * console.log(error.toJSON());
   * // {
   * //   name: 'InvalidActorError',
   * //   message: 'Actor validation failed',
   * //   actor: { id: '', type: 'user' },
   * //   validationErrors: { id: 'ID cannot be empty' }
   * // }
   * ```
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      actor: this.actor,
      validationErrors: this.validationErrors,
    };
  }

  /**
   * Creates an error for missing actor ID.
   *
   * Convenience factory method for the most common actor error.
   *
   * @returns InvalidActorError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidActorError.missingId();
   * // Error: Actor ID is required and cannot be empty
   * ```
   */
  public static missingId(): InvalidActorError {
    return new InvalidActorError("Actor ID is required and cannot be empty");
  }

  /**
   * Creates an error for invalid actor type.
   *
   * Convenience factory method for actor type validation.
   *
   * @param invalidType - The invalid type value
   * @returns InvalidActorError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidActorError.invalidType('admin');
   * // Error: Invalid actor type "admin". Must be one of: user, system, service
   * ```
   */
  public static invalidType(invalidType: unknown): InvalidActorError {
    return new InvalidActorError(
      `Invalid actor type "${invalidType}". Must be one of: user, system, service`,
      { type: invalidType },
    );
  }

  /**
   * Creates an error for missing required fields.
   *
   * Convenience factory method for incomplete actor data.
   *
   * @param missingFields - Array of missing field names
   * @returns InvalidActorError with appropriate message
   *
   * @example
   * ```typescript
   * throw InvalidActorError.missingFields(['email', 'name']);
   * // Error: Actor is missing required fields: email, name
   * ```
   */
  public static missingFields(missingFields: string[]): InvalidActorError {
    const fieldList = missingFields.join(", ");
    return new InvalidActorError(`Actor is missing required fields: ${fieldList}`);
  }
}
