/**
 * ============================================================================
 * AUDIT OBSERVER PORT - OBSERVABILITY HOOKS
 * ============================================================================
 *
 * Port interface for plugging in observability integrations
 * (OpenTelemetry, Prometheus, Datadog, custom logging, etc.).
 *
 * This port intentionally keeps consumer-facing: AuditKit calls `onEvent()`
 * after each significant operation so that consumers can emit spans, metrics,
 * or structured log events without AuditKit depending on any specific SDK.
 *
 * SECURITY: Event objects deliberately exclude audit log content, actor PII,
 * and resource metadata — they carry only timing and operational metadata.
 *
 * Architecture:
 * - This is a PORT (interface) defined in core/ — framework-free
 * - Concrete implementations live in infra/ or in consuming applications
 * - Wire the observer via AuditKitModuleOptions.observer
 *
 * @packageDocumentation
 */

// ESLint disable for interface method parameters (they're part of the contract)
/* eslint-disable no-unused-vars */

// ============================================================================
// OPERATION TYPES
// ============================================================================

/**
 * Names of operations emitted as events by AuditService.
 */
export type AuditOperationType =
  | "create"
  | "createWithChanges"
  | "query"
  | "queryWithCursor"
  | "getById"
  | "getByActor"
  | "getByResource"
  | "detectChanges";

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Observability event emitted after each AuditService operation.
 *
 * Designed to be forwarded to OpenTelemetry tracer spans, Prometheus
 * counters/histograms, structured loggers, or any custom sink.
 *
 * @example OpenTelemetry integration
 * ```typescript
 * class OtelAuditObserver implements IAuditObserver {
 *   async onEvent(event: AuditObserverEvent): Promise<void> {
 *     const span = tracer.startSpan(`audit.${event.operation}`, {
 *       attributes: {
 *         'audit.success':     event.success,
 *         'audit.duration_ms': event.durationMs,
 *         ...event.meta,
 *       },
 *     });
 *     if (!event.success && event.error) {
 *       span.recordException(event.error);
 *     }
 *     span.end();
 *   }
 * }
 * ```
 */
export interface AuditObserverEvent {
  /**
   * The AuditService operation that produced this event.
   */
  operation: AuditOperationType;

  /**
   * Wall-clock duration of the operation in milliseconds.
   */
  durationMs: number;

  /**
   * Whether the operation completed successfully.
   */
  success: boolean;

  /**
   * The caught error if `success` is false.
   */
  error?: Error;

  /**
   * Safe key/value metadata (no PII, no raw entity content).
   *
   * Examples: `{ 'result.count': 25, 'idempotent_hit': true }`.
   */
  meta?: Record<string, string | number | boolean>;
}

// ============================================================================
// OBSERVER PORT
// ============================================================================

/**
 * Port for observability integrations with AuditService.
 *
 * Implement this interface to subscribe to operation events without
 * coupling AuditKit to a specific observability library.
 *
 * Key guarantees:
 * - Called after every `AuditService` operation (success and failure)
 * - Observer errors are swallowed — they never affect core operations
 * - Events contain no PII or sensitive audit log content
 *
 * @example Custom metrics observer
 * ```typescript
 * class MetricsAuditObserver implements IAuditObserver {
 *   onEvent(event: AuditObserverEvent): void {
 *     metricsClient.histogram('audit.operation.duration', event.durationMs, {
 *       operation: event.operation,
 *       success: String(event.success),
 *     });
 *   }
 * }
 * ```
 */
export interface IAuditObserver {
  /**
   * Called after each AuditService operation.
   *
   * @param event - Observability event with timing and outcome metadata
   */
  onEvent(_event: AuditObserverEvent): void | Promise<void>;
}
