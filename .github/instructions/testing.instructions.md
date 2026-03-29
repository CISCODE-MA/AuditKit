# Testing Instructions - Kit Module

> **Last Updated**: February 2026  
> **Testing Framework**: Jest  
> **Coverage Target**: 80%+

---

## 🎯 Testing Philosophy

### Test Behavior, Not Implementation

**✅ Test what the code does:**

```typescript
it("should throw error when user not found", async () => {
  await expect(service.findById("invalid-id")).rejects.toThrow(NotFoundException);
});
```

**❌ Don't test how it does it:**

```typescript
it("should call repository.findById", async () => {
  const spy = jest.spyOn(repository, "findById");
  await service.findById("id");
  expect(spy).toHaveBeenCalled(); // Testing implementation!
});
```

---

## 📊 Coverage Targets

| Layer            | Minimum Coverage | Priority    |
| ---------------- | ---------------- | ----------- |
| **Services**     | 90%+             | 🔴 Critical |
| **Repositories** | 70%+             | 🟡 High     |
| **Guards**       | 95%+             | 🔴 Critical |
| **Controllers**  | 80%+             | 🟢 Medium   |
| **DTOs**         | 100%             | 🔴 Critical |
| **Utils**        | 80%+             | 🟢 Medium   |

**Overall Target**: 80%+

---

## 📁 Test File Organization

### File Placement

Tests live next to the code:

```
src/services/
  ├── user.service.ts
  └── user.service.spec.ts  ← Same directory
```

### Naming Convention

| Code File            | Test File                 |
| -------------------- | ------------------------- |
| `user.service.ts`    | `user.service.spec.ts`    |
| `user.repository.ts` | `user.repository.spec.ts` |

---

## 🎭 Test Structure

### Standard Template

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnderTest } from "./service-under-test";
import { DependencyOne } from "./dependency-one";

describe("ServiceUnderTest", () => {
  let service: ServiceUnderTest;
  let dependency: jest.Mocked<DependencyOne>;

  beforeEach(async () => {
    const mockDependency = {
      method: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceUnderTest, { provide: DependencyOne, useValue: mockDependency }],
    }).compile();

    service = module.get<ServiceUnderTest>(ServiceUnderTest);
    dependency = module.get(DependencyOne);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("methodName", () => {
    it("should return expected result", async () => {
      // Arrange
      dependency.method.mockResolvedValue("data");

      // Act
      const result = await service.methodName();

      // Assert
      expect(result).toBe("expected");
    });

    it("should handle errors", async () => {
      // Arrange
      dependency.method.mockRejectedValue(new Error("DB error"));

      // Act & Assert
      await expect(service.methodName()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
```

---

## 🎭 Mocking Patterns

### Mocking Repositories

```typescript
const mockRepository = {
  findById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  list: jest.fn(),
};

// In test
mockRepository.findById.mockResolvedValue({
  _id: "id",
  name: "Test",
});
```

### Mocking Mongoose Models

```typescript
const mockModel = {
  findById: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  find: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue({}),
  exec: jest.fn(),
};
```

### Mocking NestJS Logger

```typescript
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
```

---

## 📋 Test Categories

### 1. Service Tests

**What to test:**

- ✅ Business logic correctness
- ✅ Error handling
- ✅ Edge cases
- ✅ State changes

**Example:**

```typescript
describe("createItem", () => {
  it("should create item with valid data", async () => {
    mockRepository.create.mockResolvedValue(mockItem);

    const result = await service.createItem(validDto);

    expect(result).toEqual(mockItem);
  });

  it("should throw BadRequestException for invalid data", async () => {
    await expect(service.createItem(invalidDto)).rejects.toThrow(BadRequestException);
  });
});
```

### 2. Repository Tests

**What to test:**

- ✅ CRUD operations
- ✅ Query logic
- ✅ Population/aggregation

**Example:**

```typescript
describe("findByEmail", () => {
  it("should return user when email exists", async () => {
    modelMock.findOne.mockResolvedValue(mockUser);

    const user = await repository.findByEmail("test@example.com");

    expect(user).toEqual(mockUser);
    expect(modelMock.findOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });
  });
});
```

### 3. Guard Tests

**What to test:**

- ✅ Allow authorized requests
- ✅ Deny unauthorized requests
- ✅ Token validation
- ✅ Role checks

**Example:**

```typescript
describe("canActivate", () => {
  it("should allow authenticated users", async () => {
    const context = createMockContext(validToken);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it("should deny missing token", async () => {
    const context = createMockContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
```

### 4. Controller Tests

**What to test:**

- ✅ Route handlers call correct service methods
- ✅ Response formatting
- ✅ Error propagation

**Example:**

```typescript
describe("getItems", () => {
  it("should return list of items", async () => {
    mockService.list.mockResolvedValue([mockItem]);

    const result = await controller.getItems();

    expect(result).toEqual([mockItem]);
    expect(mockService.list).toHaveBeenCalled();
  });
});
```

---

## 🧪 Test Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test -- user.service.spec.ts
```

---

## ⚠️ Common Mistakes

### 1. Testing Implementation Details

```typescript
// ❌ BAD
it("should call bcrypt.hash", () => {
  const spy = jest.spyOn(bcrypt, "hash");
  service.method();
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD
it("should hash password", async () => {
  const result = await service.hashPassword("password");
  expect(result).not.toBe("password");
  expect(result.length).toBeGreaterThan(20);
});
```

### 2. Not Cleaning Up Mocks

```typescript
// ✅ Always clean up
afterEach(() => {
  jest.clearAllMocks();
});
```

### 3. Ignoring Async

```typescript
// ❌ Missing await
it("test", () => {
  expect(service.asyncMethod()).resolves.toBe("value");
});

// ✅ Proper async handling
it("test", async () => {
  await expect(service.asyncMethod()).resolves.toBe("value");
});
```

---

## 📋 Pre-Merge Checklist

- [ ] All tests passing
- [ ] Coverage >= 80%
- [ ] No skipped tests (it.skip)
- [ ] No focused tests (it.only)
- [ ] Mocks cleaned up in afterEach
- [ ] Async operations properly awaited
- [ ] Error cases tested
