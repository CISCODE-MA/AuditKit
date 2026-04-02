# @ciscode/audit-kit

## 0.1.0

### Minor Changes

- Initial feature release of @ciscode/audit-kit.
  - Cursor-based (keyset) pagination via `queryWithCursor()`
  - OpenTelemetry-compatible observer hooks (`IAuditObserver`)
  - Audit event streaming adapter (`IAuditEventPublisher`, `EventEmitterAuditEventPublisher`)
  - PII redaction, idempotency, and retention policies
  - Custom repository config (`type: "custom"`) — bring your own repository from a database package
  - In-memory repository for testing
  - Stryker mutation testing configuration
  - Vitest performance benchmarks
  - CI compatibility matrix (Ubuntu + Windows × Node 20 + 22)
