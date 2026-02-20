/**
 * Integration test - verifies AuditKit works end-to-end with NestJS.
 */

import { Controller, Get, Post, Body, Module, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AuditModule, AuditInterceptor } from "../src";
import type { AuditEvent, AuditStorage } from "../src";

// In-memory storage for capturing events
class TestAuditStorage implements AuditStorage {
  events: AuditEvent[] = [];

  async save(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  clear(): void {
    this.events = [];
  }
}

// Test controller
@Controller("users")
class UsersController {
  @Get()
  findAll() {
    return [{ id: "1", name: "John" }];
  }

  @Post()
  create(@Body() body: { name: string; password: string }) {
    return { id: "2", name: body.name };
  }
}

@Controller("health")
class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}

describe("AuditKit Integration", () => {
  let app: INestApplication;
  let storage: TestAuditStorage;

  beforeAll(async () => {
    storage = new TestAuditStorage();

    @Module({
      imports: [
        AuditModule.register({
          storage,
          config: {
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            excludePaths: ["/health"],
          },
        }),
      ],
      controllers: [UsersController, HealthController],
    })
    class TestModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(app.get(AuditInterceptor));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    storage.clear();
  });

  test("audits GET request", async () => {
    await request(app.getHttpServer()).get("/users").expect(200);

    expect(storage.events).toHaveLength(1);
    const event = storage.events[0]!;
    expect(event.method).toBe("GET");
    expect(event.path).toBe("/users");
    expect(event.statusCode).toBe(200);
    expect(event.action).toBe("UsersController.findAll");
    expect(event.actor).toBe("GUEST");
    expect(event.level).toBe("info");
  });

  test("audits POST request with masked password", async () => {
    await request(app.getHttpServer())
      .post("/users")
      .send({ name: "Test User", password: "secret123" })
      .expect(201);

    expect(storage.events).toHaveLength(1);
    const event = storage.events[0]!;
    expect(event.method).toBe("POST");
    expect(event.path).toBe("/users");
    expect(event.action).toBe("UsersController.create");

    // Password should be masked in the before snapshot
    expect(event.changes?.before?.password).toBe("[REDACTED]");
    expect(event.changes?.before?.name).toBe("Test User");
  });

  test("excludes health endpoint", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);

    expect(storage.events).toHaveLength(0);
  });

  test("captures duration", async () => {
    await request(app.getHttpServer()).get("/users").expect(200);

    expect(storage.events).toHaveLength(1);
    const event = storage.events[0]!;
    expect(event.duration).toBeGreaterThanOrEqual(0);
    expect(event.duration).toBeLessThan(5000); // Should be fast
  });

  test("captures timestamp", async () => {
    const before = new Date();
    await request(app.getHttpServer()).get("/users").expect(200);
    const after = new Date();

    expect(storage.events).toHaveLength(1);
    const event = storage.events[0]!;
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("generates unique event IDs", async () => {
    await request(app.getHttpServer()).get("/users").expect(200);
    await request(app.getHttpServer()).get("/users").expect(200);

    expect(storage.events).toHaveLength(2);
    expect(storage.events[0]!.id).not.toBe(storage.events[1]!.id);
  });
});
