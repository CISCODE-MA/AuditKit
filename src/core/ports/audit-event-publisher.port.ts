/**
 * ============================================================================
 * AUDIT EVENT PUBLISHER PORT - EVENT STREAMING ABSTRACTION
 * ============================================================================
 *
 * Port interface for emitting audit lifecycle events to external event
 * streaming systems (Kafka, RabbitMQ, NATS, SNS/SQS, etc.).
 *
 * This keeps core logic independent from any specific event bus SDK.
 *
 * @packageDocumentation
 */

import type { AuditLog } from "../types";

// ESLint disable for interface method parameters (they're part of the contract)
/* eslint-disable no-unused-vars */

/**
 * Event name constants emitted by AuditService.
 */
export const AUDIT_EVENT_TYPES = {
  CREATED: "audit.log.created",
} as const;

/**
 * Supported event types.
 */
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];

/**
 * Payload for audit streaming events.
 *
 * Includes the full persisted audit log entry and metadata useful for
 * downstream subscribers.
 */
export interface AuditEvent {
  /** Event type name */
  type: AuditEventType;

  /** Event creation timestamp */
  emittedAt: Date;

  /** Persisted audit log entity */
  payload: AuditLog;
}

/**
 * Port for publishing audit events to an event stream.
 */
export interface IAuditEventPublisher {
  /**
   * Publishes an audit event to the configured stream/broker.
   *
   * @param event - The event to publish
   */
  publish(_event: AuditEvent): Promise<void> | void;
}
