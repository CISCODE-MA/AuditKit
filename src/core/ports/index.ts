/**
 * ============================================================================
 * PORTS INDEX - PUBLIC API FOR PORT INTERFACES
 * ============================================================================
 *
 * This file exports all port interfaces (abstractions) used by AuditKit core.
 * Ports are contracts that infrastructure adapters must implement.
 *
 * Purpose:
 * - Centralized export point for all ports
 * - Simplifies imports in core services
 * - Clear separation between interface (port) and implementation (adapter)
 *
 * Architecture Pattern: Ports & Adapters (Hexagonal Architecture)
 * - **Ports**: Interfaces defined here (in core/)
 * - **Adapters**: Implementations (in infra/)
 * - **Core depends on ports**, not adapters
 * - **Adapters depend on ports** and implement them
 *
 * Usage:
 * ```typescript
 * import { IAuditLogRepository, IChangeDetector } from '@core/ports';
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// REPOSITORY PORT - Data Persistence
// ============================================================================

export { type IAuditLogRepository } from "./audit-repository.port";

// ============================================================================
// CHANGE DETECTOR PORT - Change Tracking
// ============================================================================

export {
  type IChangeDetector,
  type ChangeDetectionOptions,
  type ComparatorFunction,
  type MaskingFunction,
} from "./change-detector.port";

// ============================================================================
// ID GENERATOR PORT - Unique Identifier Generation
// ============================================================================

export {
  type IIdGenerator,
  type IdGenerationOptions,
  type IdGeneratorInfo,
} from "./id-generator.port";

// ============================================================================
// TIMESTAMP PROVIDER PORT - Date/Time Operations
// ============================================================================

export {
  type ITimestampProvider,
  type TimestampOptions,
  type TimestampFormat,
  type TimezoneOption,
  type TimestampProviderInfo,
} from "./timestamp-provider.port";

// ============================================================================
// AUDIT OBSERVER PORT - Observability Hooks
// ============================================================================

export {
  type IAuditObserver,
  type AuditObserverEvent,
  type AuditOperationType,
} from "./audit-observer.port";

// ============================================================================
// AUDIT EVENT PUBLISHER PORT - Event Streaming Hooks
// ============================================================================

export {
  AUDIT_EVENT_TYPES,
  type IAuditEventPublisher,
  type AuditEvent,
  type AuditEventType,
} from "./audit-event-publisher.port";
