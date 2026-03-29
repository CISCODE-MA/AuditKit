# Features Instructions - Kit Module

> **Last Updated**: February 2026

---

## 🚀 Before Starting Any Feature

### Pre-Implementation Checklist

- [ ] **Check existing functionality** - Avoid duplication
- [ ] **Understand scope** - Breaking change? (MAJOR version)
- [ ] **Review public API impact** - Changes to exports?
- [ ] **Check dependencies** - Need new npm packages?
- [ ] **Plan backwards compatibility** - Can users upgrade smoothly?
- [ ] **Consider security** - Impact on auth/authorization?

### Questions to Ask

1. **Already implemented?**

   ```bash
   grep -r "featureName" src/
   ```

2. **Right place for this?**
   - Should this be in host app?
   - Too specific to one use case?

3. **Impact assessment?**
   - Breaking → MAJOR version
   - New feature → MINOR version
   - Enhancement → PATCH version

---

## 📋 Implementation Workflow

```
1. Design → 2. Implement → 3. Test → 4. Document → 5. Release
```

### 1️⃣ Design Phase

- [ ] Plan interface/method signatures
- [ ] Define error handling strategy
- [ ] Identify affected files
- [ ] Consider migration (if breaking)

### 2️⃣ Implementation Phase

- [ ] Create feature branch: `feature/description`
- [ ] Implement services layer
- [ ] Add repository methods (if needed)
- [ ] Update controllers (if needed)
- [ ] Add guards/middleware (if needed)
- [ ] Handle errors
- [ ] Add logging

### 3️⃣ Testing Phase

- [ ] Unit tests for services
- [ ] Integration tests for controllers
- [ ] Error scenario tests
- [ ] Edge case tests
- [ ] Coverage >= 80%

### 4️⃣ Documentation Phase

- [ ] Update JSDoc for public methods
- [ ] Update README with examples
- [ ] Update CHANGELOG
- [ ] Add troubleshooting notes

### 5️⃣ Release Phase

- [ ] Bump version: `npm version [minor|major]`
- [ ] Test in host app
- [ ] Create PR to `develop`
- [ ] Release from `master`

---

## ➕ Adding New Service Methods

### Example: Add `listByStatus()` Method

**Step 1: Design Interface**

````typescript
/**
 * Retrieve items filtered by status
 * @param status - The status to filter by
 * @returns Array of items with matching status
 * @throws {BadRequestException} If status is invalid
 * @example
 * ```typescript
 * const active = await service.listByStatus('active');
 * ```
 */
async listByStatus(status: string): Promise<Item[]>
````

**Step 2: Add Repository Method**

```typescript
// src/repositories/item.repository.ts
@Injectable()
export class ItemRepository {
  async findByStatus(status: string) {
    return this.itemModel.find({ status }).lean();
  }
}
```

**Step 3: Implement Service Method**

```typescript
// src/services/item.service.ts
@Injectable()
export class ItemService {
  constructor(
    private readonly items: ItemRepository,
    private readonly logger: LoggerService,
  ) {}

  async listByStatus(status: string) {
    // Validate input
    const validStatuses = ["active", "inactive", "pending"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    try {
      const items = await this.items.findByStatus(status);
      this.logger.log(`Retrieved ${items.length} items with status ${status}`, "ItemService");
      return items;
    } catch (error) {
      this.logger.error(`Failed to list by status: ${error.message}`, error.stack, "ItemService");
      throw new InternalServerErrorException("Failed to retrieve items");
    }
  }
}
```

**Step 4: Add Controller Endpoint (Optional)**

```typescript
// src/controllers/item.controller.ts
@Controller("api/items")
@UseGuards(AuthenticateGuard)
export class ItemController {
  @Get("status/:status")
  async getByStatus(@Param("status") status: string) {
    return this.itemService.listByStatus(status);
  }
}
```

**Step 5: Write Tests**

```typescript
// src/services/item.service.spec.ts
describe("listByStatus", () => {
  it("should return items with matching status", async () => {
    const mockItems = [{ id: "1", status: "active" }];
    mockRepository.findByStatus.mockResolvedValue(mockItems);

    const result = await service.listByStatus("active");

    expect(result).toEqual(mockItems);
    expect(mockRepository.findByStatus).toHaveBeenCalledWith("active");
  });

  it("should throw BadRequestException for invalid status", async () => {
    await expect(service.listByStatus("invalid")).rejects.toThrow(BadRequestException);
  });

  it("should throw InternalServerErrorException on DB error", async () => {
    mockRepository.findByStatus.mockRejectedValue(new Error("DB error"));

    await expect(service.listByStatus("active")).rejects.toThrow(InternalServerErrorException);
  });
});
```

---

## 🔧 Adding New DTOs

### Example: CreateItemDto

```typescript
// src/dtos/create-item.dto.ts
import { IsNotEmpty, IsString, IsEnum, IsOptional } from "class-validator";

export class CreateItemDto {
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  name: string;

  @IsEnum(["active", "inactive"], {
    message: "Status must be active or inactive",
  })
  status: "active" | "inactive";

  @IsOptional()
  @IsString()
  description?: string;
}
```

---

## 🛡️ Adding New Guards

### Example: RoleGuard

```typescript
// src/middleware/role.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>("role", context.getHandler());

    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return user?.role === requiredRole;
  }
}

// Decorator
export const RequireRole = (role: string) => SetMetadata("role", role);
```

**Usage:**

```typescript
@Controller("api/admin")
@UseGuards(AuthenticateGuard, RoleGuard)
export class AdminController {
  @Get()
  @RequireRole("admin")
  getAdminData() {
    return "Admin only data";
  }
}
```

---

## 📚 Exporting New Functionality

**Update module exports:**

```typescript
// src/index.ts
export { ItemService } from "./services/item.service";
export { CreateItemDto } from "./dtos/create-item.dto";
export { RoleGuard, RequireRole } from "./middleware/role.guard";
```

---

## ⚠️ Breaking Changes

### How to Handle

**Version 1.x.x → 2.0.0:**

1. **Document the change** in CHANGELOG
2. **Provide migration guide**
3. **Consider deprecation period**

**Example migration guide:**

````markdown
## Breaking Changes in v2.0.0

### Changed Method Signature

**Before (v1.x):**

```typescript
await service.createItem(name, status);
```
````

**After (v2.0):**

```typescript
await service.createItem({ name, status });
```

### Migration Steps

1. Update all calls to use object parameter
2. Run tests to verify

````

---

## 📦 Adding Dependencies

**When adding new npm package:**

```bash
npm install package-name
````

**Update package.json:**

```json
{
  "dependencies": {
    "package-name": "^1.0.0"
  }
}
```

** Document in README:**

```markdown
## Dependencies

- `package-name` - Brief description of why needed
```

---

## 📋 Feature Completion Checklist

- [ ] Interface designed
- [ ] Code implemented
- [ ] Tests written (80%+ coverage)
- [ ] JSDoc added
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Exports updated in index.ts
- [ ] Breaking changes documented
- [ ] Migration guide (if breaking)
- [ ] Tested in host app
- [ ] PR created
