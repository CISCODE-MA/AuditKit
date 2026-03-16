/**
 * ============================================================================
 * AUDIT REPOSITORIES - PUBLIC EXPORTS
 * ============================================================================
 *
 * Exports for all audit repository implementations.
 *
 * Available implementations:
 * - MongoDB (via Mongoose)
 * - In-Memory (testing, simple deployments)
 *
 * @packageDocumentation
 */

// MongoDB implementation
export * from "./mongodb";

// In-Memory implementation
export * from "./in-memory";
