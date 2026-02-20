# AuditKit Copilot Instructions

## Architecture Overview

AuditKit is a standalone NestJS package (separate repository) following the shared DeveloperKit template pattern used across Ciscode kits (LoggingKit, StorageKit, AuthKit, etc.). Each kit is independently versioned and published.

The layered architecture enforces separation of concerns:

```
src/
├── core/     # Framework-free logic (NO NestJS imports) - types, config, pure functions
├── infra/    # Adapters/implementations (internal, not exported unless explicit)
├── nest/     # NestJS wiring: DynamicModule, providers, services, interceptors
└── index.ts  # Public API - ALL exports must go through here
```

**Dependency flow:** `nest/ → infra/ → core/` (never reverse)

## Commands

```bash
npm run build      # tsup → dist/ (ESM + CJS + types)
npm test           # Jest tests in test/**/*.test.ts and src/**/*.spec.ts
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run format     # Prettier check
npx changeset      # Create a changeset for releases
```

## AuditKit-Specific Requirements

### Zero-Impact Policy

- **Passive observation:** Interceptor must only READ data, never modify `req` or `res`
- **Fail-safe:** Wrap all audit logic in try-catch. AuditKit failures must not break host app requests
- **Performance:** Use RxJS `tap` operator to audit after response is sent

### Flex & Optionality

- Use `@Optional()` for external service dependencies
- Fallback defaults: No AuthKit → actor = `'GUEST'`, No StorageKit → ConsoleLogger
- Define interfaces (e.g., `AuditStorage`) for host app implementations via `Module.forRoot()`

### Data Handling

- Deep diff before/after handler execution - handle `null`, `undefined`, circular refs
- PII masking: recursively mask keys like `password`, `token`, `secret`, `creditCard`
- API immutability: Controller only allows `GET` - no edit/delete of audit logs

## Module Pattern

Use NestJS Dynamic Modules with `register`/`registerAsync` pattern:

```typescript
@Module({})
export class AuditModule {
  static register(options: ModuleOptions = {}): DynamicModule {
    return {
      module: AuditModule,
      global: options.isGlobal ?? true,
      providers: [...],
      exports: [...],
    };
  }

  static registerAsync(asyncOptions: AsyncModuleOptions): DynamicModule { ... }
}
```

## Cross-Kit Integration

- **Never import sibling kits directly** - accept services via DI or config callbacks
- Use peerDependencies for `@nestjs/*` packages
- Host app provides Mongoose connection (no DB lock-in)

## Release Flow

1. Work on `feature` branch from `develop`
2. Merge to `develop`, run `npx changeset` for user-facing changes
3. Automation opens "Version Packages" PR into `master`
4. Merge to `master`, tag `vX.Y.Z` to publish
