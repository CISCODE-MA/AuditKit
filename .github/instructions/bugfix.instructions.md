# Bugfix Instructions - Kit Module

> **Last Updated**: February 2026

---

## 🔍 Bug Investigation Process

### Phase 1: Reproduce

**Before writing any code:**

1. **Understand the issue** - Read bug report carefully
2. **Reproduce locally** - Create minimal test case
3. **Verify it's a bug** - Not expected behavior or user error
4. **Check documentation** - Is feature documented correctly?

**Create failing test FIRST:**

```typescript
describe("Bug: Service returns null unexpectedly", () => {
  it("should return data when ID exists", async () => {
    mockRepository.findById.mockResolvedValue(mockData);

    // This SHOULD pass but currently FAILS
    const result = await service.findById("existing-id");
    expect(result).toBeDefined();
  });
});
```

### Phase 2: Identify Root Cause

**Investigation tools:**

- **Logging** - Add temporary debug logs
- **Debugger** - Use VS Code debugger
- **Unit tests** - Isolate failing component
- **Git blame** - Check when code was added

```typescript
// Add debug logging
this.logger.debug(`Input: ${JSON.stringify(input)}`, "ServiceName");
this.logger.debug(`Result: ${JSON.stringify(result)}`, "ServiceName");
```

### Phase 3: Understand Impact

**Critical questions:**

- How many users affected?
- Is this a security issue? (Priority: CRITICAL)
- Is there a workaround?
- Does this affect other features?
- What version introduced this?

---

## 🐛 Common Bug Categories

### 1. Database Issues

| Bug Type                | Symptoms              | Solution                                  |
| ----------------------- | --------------------- | ----------------------------------------- |
| **Query returns null**  | Expected data missing | Check populate, fix query filter          |
| **Duplicate key error** | Cannot create record  | Add validation, handle unique constraints |
| **Population error**    | Relations missing     | Fix populate path, check ref              |

**Example fix:**

```typescript
// ❌ BUG - Missing populate
async findUserWithRoles(id: string) {
  return this.userModel.findById(id); // roles = [ObjectId(...)]
}

// ✅ FIX - Populate relations
async findUserWithRoles(id: string) {
  return this.userModel
    .findById(id)
    .populate('roles') // roles = [{ name: 'admin', ... }]
    .lean();
}
```

### 2. Async/Promise Issues

| Bug Type                | Symptoms              | Solution              |
| ----------------------- | --------------------- | --------------------- |
| **Missing await**       | Unexpected Promise    | Add await keyword     |
| **Unhandled rejection** | Crash/silent failure  | Add try-catch         |
| **Race condition**      | Intermittent failures | Use proper async flow |

**Example fix:**

```typescript
// ❌ BUG - Missing await
async processItems(items: Item[]) {
  items.forEach(item => this.process(item)); // Fire and forget!
}

// ✅ FIX - Proper async handling
async processItems(items: Item[]) {
  await Promise.all(items.map(item => this.process(item)));
}
```

### 3. Validation Errors

| Bug Type               | Symptoms               | Solution             |
| ---------------------- | ---------------------- | -------------------- |
| **Missing validation** | Invalid data accepted  | Add DTO validation   |
| **Wrong type**         | Type errors at runtime | Fix TypeScript types |
| **Edge case**          | Crashes on null/undef  | Add null checks      |

**Example fix:**

```typescript
// ❌ BUG - No null check
function getName(user: User): string {
  return user.profile.name; // Crashes if profile is null
}

// ✅ FIX - Defensive programming
function getName(user: User | null): string {
  return user?.profile?.name ?? "Unknown";
}
```

### 4. Guard/Auth Issues

| Bug Type                | Symptoms                   | Solution             |
| ----------------------- | -------------------------- | -------------------- |
| **Unauthorized access** | Wrong users can access     | Fix guard logic      |
| **Token rejection**     | Valid tokens rejected      | Fix token validation |
| **Role check fails**    | Permission check incorrect | Fix role comparison  |

**Example fix:**

```typescript
// ❌ BUG - Comparing ObjectId to string
if (user.roles.includes(requiredRoleId)) {
  // Always false
  return true;
}

// ✅ FIX - Convert to strings
const roleIds = user.roles.map((r) => r.toString());
if (roleIds.includes(requiredRoleId)) {
  return true;
}
```

### 5. Error Handling

| Bug Type             | Symptoms              | Solution                     |
| -------------------- | --------------------- | ---------------------------- |
| **Swallowed errors** | Silent failures       | Throw or log errors          |
| **Wrong error type** | Incorrect HTTP status | Use correct NestJS exception |
| **Missing logs**     | Can't debug issues    | Add structured logging       |

**Example fix:**

```typescript
// ❌ BUG - Error swallowed
async sendEmail(email: string) {
  try {
    await this.mail.send(email);
  } catch (error) {
    console.error(error); // ❌ Swallows error!
  }
}

// ✅ FIX - Proper error handling
async sendEmail(email: string) {
  try {
    await this.mail.send(email);
    this.logger.log(`Email sent to ${email}`, 'MailService');
  } catch (error) {
    this.logger.error(
      `Failed to send email: ${error.message}`,
      error.stack,
      'MailService'
    );
    throw new InternalServerErrorException('Email service unavailable');
  }
}
```

---

## 🔧 Fix Implementation Process

### 1. Write Failing Test

```typescript
// Test that currently fails
it("should fix the bug", async () => {
  const result = await service.buggyMethod();
  expect(result).toBe(expectedValue);
});
```

### 2. Implement Fix

```typescript
// Fix the code
async buggyMethod() {
  // New corrected implementation
  return correctValue;
}
```

### 3. Verify Test Passes

```bash
npm test -- buggy-service.spec.ts
```

### 4. Test Edge Cases

```typescript
it("should handle edge case", async () => {
  const result = await service.buggyMethod(edgeCaseInput);
  expect(result).toBeDefined();
});
```

### 5. Update Documentation

```typescript
/**
 * Method that was buggy
 *
 * @fixed Version 1.2.3 - Fixed null pointer issue
 * @param input - The input parameter
 * @returns The expected result
 */
async buggyMethod(input: string): Promise<Result>
```

---

## ⚠️ Common Gotchas

### 1. Timezone Issues

```typescript
// ❌ Potential bug - Timezone-dependent
const date = new Date();

// ✅ Better - Use UTC
const date = new Date().toISOString();
```

### 2. Floating Point Comparison

```typescript
// ❌ Bug - Direct comparison
if (price === 10.2) {
} // Might fail due to precision

// ✅ Fix - Use tolerance
if (Math.abs(price - 10.2) < 0.01) {
}
```

### 3. MongoDB ObjectId Comparison

```typescript
// ❌ Bug - Comparing objects
if (user._id === userId) {
} // Always false

// ✅ Fix - Convert to string
if (user._id.toString() === userId) {
}
```

---

## 📋 Bugfix Checklist

- [ ] Bug reproduced locally
- [ ] Failing test created
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] All tests pass
- [ ] Edge cases tested
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] No regression (other features still work)
