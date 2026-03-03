# General Instructions - Kit Module

> **Last Updated**: February 2026

---

## 📦 Package Overview

### What is this module?

This is a production-ready NestJS module providing enterprise-grade functionality for modern applications.

**Type**: Backend NestJS Module  
**Framework**: NestJS 10+/11+ with MongoDB + Mongoose  
**Distribution**: NPM package  
**License**: MIT

### Key Characteristics

| Characteristic    | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| **Architecture**  | Repository pattern, dependency injection, layered structure |
| **Database**      | MongoDB via Mongoose (host app connection)                  |
| **Security**      | Secure by default, follows NestJS best practices            |
| **Extensibility** | Configurable via env vars, exportable services/decorators   |
| **Testing**       | Target: 80%+ coverage                                       |

---

## 🏗️ Architecture Pattern

```
┌─────────────────────────────────────────┐
│          CONTROLLERS LAYER              │
│  ┌──────────────────────────────────┐   │
│  │    HTTP Request Handlers         │   │
│  │    - Validation                  │   │
│  │    - Routing                     │   │
│  └──────────┬───────────────────────┘   │
└──────────────┼─────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│           SERVICES LAYER                │
│  ┌──────────────────────────────────┐   │
│  │     Business Logic               │   │
│  │     - Core Operations            │   │
│  │     - Validation                 │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         REPOSITORIES LAYER              │
│  ┌──────────────────────────────────┐   │
│  │     Database Abstraction         │   │
│  │     - CRUD Operations            │   │
│  │     - Queries                    │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│            MODELS LAYER                 │
│  ┌──────────────────────────────────┐   │
│  │    Mongoose Schemas              │   │
│  │    - Data Models                 │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── controllers/       # HTTP request handlers
├── services/         # Business logic
├── repositories/     # Database abstraction
├── models/           # Mongoose schemas
├── dtos/             # Data Transfer Objects
├── middleware/       # Guards, interceptors
├── utils/            # Helper functions
└── index.ts          # Public API exports
```

---

## 📝 Coding Standards

### TypeScript Strictness

```typescript
// Always use strict types
interface UserData {
  id: string;
  name: string;
}

// ✅ Good
function getUser(id: string): Promise<UserData | null>;

// ❌ Bad
function getUser(id: any): Promise<any>;
```

### Error Handling

```typescript
// ✅ Use NestJS exceptions
throw new NotFoundException("Resource not found");

// ❌ Don't use generic errors
throw new Error("Not found");
```

### Async/Await

```typescript
// ✅ Always use async/await
async function fetchData() {
  const result = await repository.find();
  return result;
}

// ❌ Avoid promise chains
function fetchData() {
  return repository.find().then((result) => result);
}
```

---

## 🔐 Security Best Practices

- Validate all inputs using DTOs
- Use guards for authorization
- Never expose sensitive data
- Log security events
- Use environment variables for secrets

---

## 📚 Documentation Requirements

### JSDoc for Public Methods

```typescript
/**
 * Retrieve item by ID
 * @param id - The item identifier
 * @returns The item or null if not found
 * @throws {NotFoundException} If item doesn't exist
 */
async findById(id: string): Promise<Item | null>
```

---

## 🧪 Testing Philosophy

- **Target**: 80%+ code coverage
- **Test behavior**, not implementation
- **Mock external dependencies**
- **Test edge cases and error scenarios**

---

## 🚀 Development Workflow

1. **Design** - Plan interface and data flow
2. **Implement** - Write code following standards
3. **Test** - Unit and integration tests
4. **Document** - JSDoc and README updates
5. **Release** - Semantic versioning

---

## ⚠️ Common Gotchas

### 1. Module Imports

```typescript
// ✅ Use path aliases
import { UserService } from "@services/user.service";

// ❌ Relative imports
import { UserService } from "../../../services/user.service";
```

### 2. Dependency Injection

```typescript
// ✅ Inject dependencies
constructor(
  private readonly userService: UserService,
  private readonly logger: LoggerService,
) {}

// ❌ Create instances
const userService = new UserService();
```

---

## 📦 Environment Configuration

Required environment variables should be documented:

```bash
# Database
MONGO_URI=mongodb://localhost:27017/database

# Application
NODE_ENV=development
PORT=3000
```

---

## 🔍 Debugging Tips

- Use NestJS built-in logger
- Add debug logs at key points
- Use VS Code debugger
- Check MongoDB queries

---

## 📋 Pre-Release Checklist

- [ ] All tests passing
- [ ] Coverage >= 80%
- [ ] JSDoc complete
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] No console.log statements
- [ ] Environment vars documented
