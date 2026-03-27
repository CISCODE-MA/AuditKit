# @ciscode/audit-kit

AuditKit is a reusable NestJS module for immutable audit logging with clean architecture (`core` / `infra` / `nest`).

It provides:

- Framework-free core service (`AuditService`)
- Pluggable repositories (MongoDB, in-memory)
- Automatic change detection
- Configurable redaction, idempotency, and retention policies
- Cursor-based pagination for stable listing
- Observability hooks (OpenTelemetry-friendly observer port)
- Event streaming hooks (publisher port + default EventEmitter adapter)

## Install

```bash
npm install @ciscode/audit-kit
```

Peer dependencies are managed by consuming applications.

## Quick Start

```typescript
import { Module } from "@nestjs/common";
import { AuditKitModule } from "@ciscode/audit-kit";

@Module({
  imports: [
    AuditKitModule.register({
      repository: {
        type: "in-memory",
      },
      redaction: {
        enabled: true,
        fields: ["actor.email", "metadata.password"],
        mask: "[REDACTED]",
      },
      idempotency: {
        enabled: true,
        keyStrategy: "idempotencyKey",
      },
    }),
  ],
})
export class AppModule {}
```

## Usage

```typescript
import { Injectable } from "@nestjs/common";
import { ActorType, AuditActionType, AuditService } from "@ciscode/audit-kit";

@Injectable()
export class UserService {
  constructor(private readonly auditService: AuditService) {}

  async updateUser(): Promise<void> {
    await this.auditService.log({
      actor: { id: "user-1", type: ActorType.USER, email: "user@example.com" },
      action: AuditActionType.UPDATE,
      resource: { type: "user", id: "user-1" },
      metadata: { reason: "profile update" },
      idempotencyKey: "req-123",
    });
  }
}
```

## Advanced Features

### Cursor Pagination

```typescript
const page1 = await auditService.queryWithCursor({ actorId: "user-1" }, { limit: 20 });

if (page1.hasMore) {
  const page2 = await auditService.queryWithCursor(
    { actorId: "user-1" },
    { limit: 20, cursor: page1.nextCursor },
  );
}
```

### Observability Hooks

Provide an observer to emit metrics/spans/log events (for OpenTelemetry, Prometheus, etc.):

```typescript
AuditKitModule.register({
  repository: { type: "in-memory" },
  observer: {
    onEvent(event) {
      // event.operation, event.durationMs, event.success
      console.log(event);
    },
  },
});
```

### Event Streaming

Emit domain events after successful audit creation:

```typescript
AuditKitModule.register({
  repository: { type: "in-memory" },
  eventStreaming: {
    enabled: true,
    // optional custom publisher; default is EventEmitter adapter
    publisher: {
      publish(event) {
        console.log(event.type, event.payload.id);
      },
    },
  },
});
```

## Tooling

- Tests: `npm test`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Mutation testing: `npm run mutation`
- Benchmarks: `npm run bench`

## CI Compatibility Matrix

PR validation runs on a matrix to catch environment regressions early:

- Node.js: 20, 22
- OS: ubuntu-latest, windows-latest

See [.github/workflows/pr-validation.yml](.github/workflows/pr-validation.yml).

## Release Flow (Summary)

1. Work on a feature branch from `develop`
2. Add a changeset for user-facing changes: `npx changeset`
3. Merge into `develop`
4. Automation opens "Version Packages" PR into `master`
5. Merge and publish

See [docs/RELEASE.md](docs/RELEASE.md) for details.
