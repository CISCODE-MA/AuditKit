# Architecture

This repository is a template for NestJS _packages_ (not apps).

AuditKit is implemented as a CSR-style modular package with ports/adapters.

## Layers (inside `src/`)

- `core/`: pure logic (no Nest imports)
  - Ports: repository, change detector, observer, event publisher
  - Service: `AuditService`
- `infra/`: adapters/implementations (may depend on `core/`)
  - Repositories: MongoDB, in-memory
  - Providers: id generator, timestamp, change detector, event publisher (EventEmitter)
  - Internal by default (not exported publicly)
- `nest/`: Nest module wiring (DI, providers, DynamicModule)
  - Validation and runtime option mapping

## Dependency Rules

- `core/` must not import NestJS or external frameworks
- `infra/` may depend on `core/`
- `nest/` may depend on both `core/` and `infra/`

## Public API

Consumers import only from the package root entrypoint.

All public exports must go through `src/index.ts`.
Folders like `infra/` are internal unless explicitly re-exported.

## Data Flow

1. App calls `AuditService.log()` or `AuditService.logWithChanges()`.
2. Core validates actor, applies idempotency and redaction policies.
3. Repository persists immutable audit entries.
4. Optional retention/archival cleanup runs after write.
5. Optional observer hook emits operation telemetry metadata.
6. Optional event publisher emits `audit.log.created` to a stream.

## Querying Models

- Offset pagination: `query()` for page/limit/sort use-cases.
- Cursor pagination: `queryWithCursor()` for stable keyset iteration.

Cursor pagination uses an opaque cursor encoding `{ timestamp, id }` and sorts by:

- `timestamp DESC`
- `id ASC`
