# Copilot Instructions - AuditKit Developer Guide

> **Purpose**: Project-specific instructions for contributing to AuditKit, a modular, test-driven, and reusable NestJS backend kit. Follow these guidelines for all code, tests, and documentation.

---

## 🎯 Template Overview

**Project**: @ciscode/audit-kit  
**Type**: Modular NestJS Backend Library  
**Purpose**: Provides reusable, testable, and composable building blocks for audit, logging, and compliance in NestJS applications.

### AuditKit Provides:

- Modular CSR (Controller-Service-Repository) architecture
- TypeScript strict mode, path aliases, and project references
- Jest and Vitest testing with 80%+ coverage required
- Changesets for versioning and changelog
- Linting (ESLint, Prettier) and pre-commit hooks (Husky, lint-staged)
- CI/CD workflows for test, lint, and release
- Copilot-optimized structure and documentation

---

## 🏗️ AuditKit Project Structure

AuditKit uses the CSR pattern for all modules. All code is in `src/` and organized for maximum reusability and testability.

```
src/
  index.ts                # Public API exports (only services, DTOs, guards, decorators, types)
  core/                   # Core logic, base types, and utilities
    index.ts
    infra/                # Infrastructure helpers (internal)
  nest/                   # NestJS-specific modules and adapters
    index.ts
    module.ts             # Main NestJS module
  # Add new modules as needed (e.g., audit/, logging/, etc.)
```

**Test code:**

```
test/
  smoke.test.ts           # Smoke/integration tests
  # Add more test files as needed
```

**Coverage, config, and docs:**

```
coverage/                 # Coverage reports
docs/                     # Architecture, release, and task docs
```

**Responsibility Layers:**

| Layer            | Responsibility                  | Examples         |
| ---------------- | ------------------------------- | ---------------- |
| **Controllers**  | HTTP handling, route definition | `controllers/`   |
| **Services**     | Business logic, orchestration   | `core/`, `nest/` |
| **Entities**     | Domain models (if any)          | `core/entities/` |
| **Repositories** | Data access, database queries   | `core/infra/`    |
| **Guards**       | Authentication/Authorization    | `guards/`        |
| **Decorators**   | Parameter extraction, metadata  | `decorators/`    |
| **DTOs**         | Input validation, API contracts | `dto/`           |

**Public API Exports:**

```typescript
// src/index.ts - Only export what consumers need
export * from "./core";
export * from "./nest";
// Do NOT export internal infra, entities, or test helpers
```

**Rationale:**

- **Entities/infra** = internal, not exported
- **DTOs, services, guards, decorators** = public API

---

## 📝 Naming Conventions

### Files

**Pattern**: `kebab-case` + suffix

| Type       | Example                     | Directory        |
| ---------- | --------------------------- | ---------------- |
| Service    | `audit.service.ts`          | `core/`          |
| Module     | `module.ts`                 | `nest/`          |
| Controller | `audit.controller.ts`       | `controllers/`   |
| Entity     | `audit.entity.ts`           | `core/entities/` |
| Repository | `audit.repository.ts`       | `core/infra/`    |
| DTO        | `create-audit.dto.ts`       | `dto/`           |
| Guard      | `audit.guard.ts`            | `guards/`        |
| Decorator  | `audit.decorator.ts`        | `decorators/`    |
| Filter     | `audit-exception.filter.ts` | `filters/`       |
| Middleware | `audit.middleware.ts`       | `middleware/`    |
| Utility    | `audit.utils.ts`            | `core/utils/`    |
| Config     | `audit.config.ts`           | `config/`        |

### Code Naming

- **Classes & Interfaces**: `PascalCase` → `ExampleController`, `CreateExampleDto`
- **Variables & Functions**: `camelCase` → `getUserById`, `exampleList`
- **Constants**: `UPPER_SNAKE_CASE` → `DEFAULT_TIMEOUT`, `MAX_RETRIES`
- **Enums**: Name `PascalCase`, values `UPPER_SNAKE_CASE`

```typescript
enum ExampleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}
```

### Path Aliases

Configured in `tsconfig.json`:

```json
"@core/*"      : ["src/core/*"],
"@nest/*"      : ["src/nest/*"],
"@dto/*"       : ["src/dto/*"],
"@guards/*"    : ["src/guards/*"],
"@decorators/*": ["src/decorators/*"],
"@config/*"    : ["src/config/*"],
"@utils/*"     : ["src/core/utils/*"]
```

Use aliases for imports:

```typescript
import { AuditService } from "@core/audit.service";
import { AuditModule } from "@nest/module";
import { CreateAuditDto } from "@dto/create-audit.dto";
```

---

## 🧪 Testing - RIGOROUS for Modules

### Coverage Target: 80%+

**Unit Tests - MANDATORY:**

- All core and nest services
- All utilities and helpers
- Guards and decorators
- Repository methods (if any)

**Integration Tests:**

- Module initialization
- End-to-end flows (smoke tests in `test/`)

**Test file location:**

```
test/
  smoke.test.ts
src/core/
  audit.service.spec.ts
```

**Jest/Vitest Configuration:**

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## 📚 Documentation - Complete

### JSDoc/TSDoc - ALWAYS for:

```typescript
/**
 * Creates a new audit record
 * @param data - The audit data to create
 * @returns The created audit entry
 * @throws {BadRequestException} If data is invalid
 * @example
 * const audit = await auditService.create({ ... });
 */
async create(data: CreateAuditDto): Promise<Audit>
```

**Required for:**

- All public functions/methods
- All exported classes
- All DTOs (with property descriptions)

### Swagger/OpenAPI - Always on controllers:

```typescript
@ApiOperation({ summary: 'Create new audit entry' })
@ApiResponse({ status: 201, description: 'Created', type: AuditDto })
@ApiResponse({ status: 400, description: 'Invalid input' })
@Post()
async create(@Body() dto: CreateAuditDto) { }
```

---

## 🚀 Module Development Principles

### 1. Exportability

**Export ONLY public API (core, nest, DTOs, guards, decorators):**

```typescript
// src/index.ts
export * from "./core";
export * from "./nest";
```

**❌ NEVER export:**

- Entities (internal domain models)
- Repositories (infrastructure details)

### 2. Configuration

**Flexible module registration:**

```typescript
@Module({})
export class AuditModule {
  static forRoot(options: AuditModuleOptions): DynamicModule {
    return {
      module: AuditModule,
      providers: [{ provide: "AUDIT_OPTIONS", useValue: options }, AuditService],
      exports: [AuditService],
    };
  }

  static forRootAsync(options: AuditModuleAsyncOptions): DynamicModule {
    // Async configuration
  }
}
```

### 3. Zero Business Logic Coupling

- No hardcoded business rules
- Configurable behavior via options
- Database-agnostic (if applicable)
- Apps provide their own connections

---

## 🔄 Workflow & Task Management

docs/tasks/active/MODULE-123-add-feature.md
docs/tasks/archive/by-release/v2.0.0/MODULE-123-add-feature.md

### Task-Driven Development

1. **Branch Naming:**

- `feature/AK-123-add-feature`
- `bugfix/AK-456-fix-issue`
- `refactor/AK-789-improve-code`

2. **Task Documentation:**

- Create a file: `docs/tasks/active/AK-123-add-feature.md`

3. **On Release:**

- Move to: `docs/tasks/archive/by-release/vX.Y.Z/AK-123-add-feature.md`

### Development Workflow

**Simple changes**:

- Read context → Implement → Update docs → **Create changeset**

**Complex changes**:

- Read context → Discuss approach → Implement → Update docs → **Create changeset**

**When blocked**:

- **DO**: Ask immediately
- **DON'T**: Generate incorrect output

---

## 📦 Versioning & Breaking Changes

### Semantic Versioning (Strict)

- **MAJOR** (x.0.0): Breaking changes to public API, DTOs, or configuration
- **MINOR** (0.x.0): New features, endpoints, or options
- **PATCH** (0.0.x): Bug fixes, internal improvements, docs

### Changesets Workflow

**ALWAYS create a changeset for user-facing changes:**

```bash
npx changeset
```

**When to create a changeset:**

- ✅ New features
- ✅ Bug fixes
- ✅ Breaking changes
- ✅ Performance improvements
- ❌ Internal refactoring (no user impact)
- ❌ Documentation updates only
- ❌ Test improvements only

**Before completing any task:**

- [ ] Code implemented
- [ ] Tests passing
- [ ] Documentation updated
- [ ] **Changeset created** ← CRITICAL
- [ ] PR ready

**Changeset format:**

```markdown
---
"@ciscode/example-kit": minor
---

Added support for custom validators in ExampleService
```

### CHANGELOG Required

Changesets auto-generates the changelog. For manual additions, use:

```markdown
# Changelog

## [X.Y.Z] - YYYY-MM-DD

### BREAKING CHANGES

- ...

### Added

- ...

### Fixed

- ...
```

---

## 🔐 Security Best Practices

**ALWAYS:**

- Input validation on all DTOs (class-validator)
- No secrets in code or logs
- Sanitize error messages (no stack traces in production)

---

## 🚫 Restrictions - Require Approval

**NEVER without approval:**

- Breaking changes to public API
- Changing exported DTOs/interfaces
- Removing exported functions
- Major dependency upgrades
- Security-related changes

**CAN do autonomously:**

- Bug fixes (no breaking changes)
- Internal refactoring
- Adding new features (non-breaking)
- Test improvements
- Documentation updates

---

## ✅ Release Checklist

Before publishing:

- [ ] All tests passing (100% of test suite)
- [ ] Coverage >= 80%
- [ ] No ESLint warnings (`--max-warnings=0`)
- [ ] TypeScript strict mode passing
- [ ] All public APIs documented (JSDoc)
- [ ] README updated with examples
- [ ] Changeset created
- [ ] Breaking changes highlighted
- [ ] Integration tested with sample app

---

## 🔄 Development Workflow

### Working on Module:

1. Clone module repo
2. Create branch: `feature/TASK-123-description` from `develop`
3. Implement with tests
4. **Create changeset**: `npx changeset`
5. Verify checklist
6. Create PR → `develop`

### Testing in App:

```bash
# In module
npm link

# In app
cd ~/comptaleyes/backend
npm link @ciscode/example-kit

# Develop and test
# Unlink when done
npm unlink @ciscode/example-kit
```

---

## 🎨 Code Style

- ESLint `--max-warnings=0`
- Prettier formatting
- TypeScript strict mode
- FP for logic, OOP for structure
- Dependency injection via constructor

**Example:**

```typescript
@Injectable()
export class ExampleService {
  constructor(
    private readonly repo: ExampleRepository,
    private readonly logger: LoggerService,
  ) {}
}
```

---

## 🐛 Error Handling

**Custom domain errors:**

```typescript
export class AuditNotFoundError extends Error {
  constructor(id: string) {
    super(`Audit ${id} not found`);
    this.name = "AuditNotFoundError";
  }
}
```

**Structured logging:**

```typescript
this.logger.error("Operation failed", {
  auditId: id,
  reason: "validation_error",
  timestamp: new Date().toISOString(),
});
```

**NEVER silent failures:**

```typescript
try {
  await operation();
} catch (error) {
  this.logger.error("Operation failed", { error });
  throw error;
}
```

---

## 💬 Communication Style

- Brief and direct
- Focus on results
- Module-specific context
- Highlight breaking changes immediately

---

## 📋 Summary

**AuditKit Principles:**

1. Reusability over specificity
2. 80%+ test coverage
3. Complete documentation
4. Strict versioning
5. Breaking changes = MAJOR bump + changeset
6. Zero app coupling
7. Configurable behavior

**When in doubt:** Ask, don't assume. AuditKit is used in multiple projects.

---

_Last Updated: February 3, 2026_  
_Version: 2.0.0_
