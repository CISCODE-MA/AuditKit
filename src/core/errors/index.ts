/**
 * ============================================================================
 * ERRORS INDEX - PUBLIC API FOR DOMAIN ERRORS
 * ============================================================================
 *
 * This file exports all custom domain errors used by AuditKit.
 * These errors provide typed, semantic error handling for audit operations.
 *
 * Purpose:
 * - Centralized export point for all domain errors
 * - Simplifies imports in services and error handlers
 * - Clear distinction between different error types
 * - Better error messages and debugging
 *
 * Usage:
 * ```typescript
 * import {
 *   AuditNotFoundError,
 *   InvalidActorError,
 *   InvalidChangeSetError
 * } from '@core/errors';
 *
 * // Throw errors
 * throw new AuditNotFoundError('audit-123');
 *
 * // Catch errors
 * try {
 *   await auditService.findById(id);
 * } catch (error) {
 *   if (error instanceof AuditNotFoundError) {
 *     // Handle not found specifically
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// AUDIT NOT FOUND ERROR - 404 scenarios
// ============================================================================

export { AuditNotFoundError } from "./audit-not-found.error";

// ============================================================================
// INVALID ACTOR ERROR - Actor validation failures
// ============================================================================

export { InvalidActorError } from "./invalid-actor.error";

// ============================================================================
// INVALID CHANGESET ERROR - Change tracking validation failures
// ============================================================================

export { InvalidChangeSetError } from "./invalid-changeset.error";
