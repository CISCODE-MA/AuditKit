/**
 * ============================================================================
 * EVENT EMITTER AUDIT EVENT PUBLISHER
 * ============================================================================
 *
 * Default in-process event streaming adapter using Node.js EventEmitter.
 *
 * Useful for:
 * - Local integrations without external broker
 * - Testing event-stream behavior
 * - Bridging to app-level subscribers that forward to Kafka/RabbitMQ
 *
 * @packageDocumentation
 */

import { EventEmitter } from "node:events";

import type {
  AuditEvent,
  IAuditEventPublisher,
} from "../../../core/ports/audit-event-publisher.port";

/**
 * EventEmitter-based implementation of IAuditEventPublisher.
 */
export class EventEmitterAuditEventPublisher implements IAuditEventPublisher {
  private readonly emitter: EventEmitter;

  /**
   * Creates a new publisher.
   *
   * @param emitter - EventEmitter instance (shared app bus or dedicated one)
   */
  constructor(emitter: EventEmitter = new EventEmitter()) {
    this.emitter = emitter;
  }

  /**
   * Publishes an audit event on the emitter channel named by event.type.
   */
  publish(event: AuditEvent): void {
    this.emitter.emit(event.type, event);
  }

  /**
   * Exposes the emitter for consumers that want to subscribe in-process.
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }
}
