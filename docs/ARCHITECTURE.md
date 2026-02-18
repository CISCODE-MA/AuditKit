# Architecture

This repository is a template for NestJS _packages_ (not apps).

## Layers (inside `src/`)

- `core/`: pure logic (no Nest imports)
- `infra/`: adapters/implementations (may depend on `core/`)
  - Internal by default (not exported publicly)
- `nest/`: Nest module wiring (DI, providers, DynamicModule)

## Dependency Rules

- `core/` must not import NestJS or external frameworks
- `infra/` may depend on `core/`
- `nest/` may depend on both `core/` and `infra/`

## Public API

Consumers import only from the package root entrypoint.

All public exports must go through `src/index.ts`.
Folders like `infra/` are internal unless explicitly re-exported.
