/**
 * ============================================================================
 * AUDIT NOT FOUND ERROR - DOMAIN ERROR
 * ============================================================================
 *
 * This file defines a custom error for when an audit log cannot be found.
 *
 * Purpose:
 * - Typed error for missing audit logs
 * - Better error messages than generic "not found"
 * - Distinguishable from other errors in error handling
 * - Can carry additional context (audit log ID, query filters)
 *
 * Usage in services:
 * ```typescript
 * const log = await repository.findById(id);
 * if (!log) {
 *   throw new AuditNotFoundError(id);
 * }
 * ```
 *
 * Usage in error handlers:
 * ```typescript
 * if (error instanceof AuditNotFoundError) {
 *   return res.status(404).json({ error: error.message });
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Error thrown when an audit log cannot be found.
 *
 * This is a domain-specific error that indicates:
 * - The requested audit log ID doesn't exist
 * - A query returned no results when at least one was expected
 * - The audit log was deleted (if deletion is supported)
 *
 * HTTP Status: 404 Not Found
 */
export class AuditNotFoundError extends Error {
  /**
   * Error name for type identification.
   * Always 'AuditNotFoundError'.
   */
  public readonly name = "AuditNotFoundError";

  /**
   * The audit log ID that was not found.
   * Useful for logging and debugging.
   */
  public readonly auditLogId?: string;

  /**
   * Additional context about what was being searched for.
   * Could include query filters, resource IDs, etc.
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new AuditNotFoundError.
   *
   * @param auditLogId - The ID that was not found (optional)
   * @param message - Custom error message (optional, has a default)
   * @param context - Additional context (optional)
   *
   * @example Basic usage
   * ```typescript
   * throw new AuditNotFoundError('audit-123');
   * // Error: Audit log with ID "audit-123" was not found
   * ```
   *
   * @example With custom message
   * ```typescript
   * throw new AuditNotFoundError('audit-456', 'No such audit log exists');
   * // Error: No such audit log exists
   * ```
   *
   * @example With context
   * ```typescript
   * throw new AuditNotFoundError('audit-789', undefined, {
   *   resourceType: 'user',
   *   resourceId: 'user-123'
   * });
   * // Error: Audit log with ID "audit-789" was not found
   * // (context available in error.context)
   * ```
   */
  constructor(auditLogId?: string, message?: string, context?: Record<string, unknown>) {
    // Generate default message if not provided
    const defaultMessage = auditLogId
      ? `Audit log with ID "${auditLogId}" was not found`
      : "Audit log was not found";

    // Call parent Error constructor
    super(message || defaultMessage);

    // Store additional properties (only if defined)
    if (auditLogId !== undefined) this.auditLogId = auditLogId;
    if (context !== undefined) this.context = context;

    // Maintain proper stack trace in V8 engines (Chrome, Node.js)
    if ("captureStackTrace" in Error) {
      (Error as any).captureStackTrace(this, AuditNotFoundError);
    }

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AuditNotFoundError.prototype);
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
   * const error = new AuditNotFoundError('audit-123', undefined, {
   *   query: { actorId: 'user-1' }
   * });
   *
   * console.log(error.toJSON());
   * // {
   * //   name: 'AuditNotFoundError',
   * //   message: 'Audit log with ID "audit-123" was not found',
   * //   auditLogId: 'audit-123',
   * //   context: { query: { actorId: 'user-1' } }
   * // }
   * ```
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      auditLogId: this.auditLogId,
      context: this.context,
    };
  }
}
