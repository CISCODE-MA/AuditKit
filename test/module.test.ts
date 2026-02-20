/**
 * Tests for AuditModule integration.
 */

import { Test } from "@nestjs/testing";

import { AuditModule, AuditService, AuditInterceptor, AUDIT_STORAGE, AUDIT_CONFIG } from "../src";
import type { AuditStorage, AuditEvent } from "../src";

describe("AuditModule", () => {
  describe("register()", () => {
    test("provides default console storage", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AuditModule.register()],
      }).compile();

      const storage = moduleRef.get(AUDIT_STORAGE);
      expect(storage).toBeDefined();
      expect(storage.save).toBeDefined();
    });

    test("provides AuditService", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AuditModule.register()],
      }).compile();

      const service = moduleRef.get(AuditService);
      expect(service).toBeDefined();
      expect(service.audit).toBeDefined();
    });

    test("provides AuditInterceptor", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AuditModule.register()],
      }).compile();

      const interceptor = moduleRef.get(AuditInterceptor);
      expect(interceptor).toBeDefined();
      expect(interceptor.intercept).toBeDefined();
    });

    test("accepts custom storage", async () => {
      const events: AuditEvent[] = [];
      const customStorage: AuditStorage = {
        save: async (event) => {
          events.push(event);
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [AuditModule.register({ storage: customStorage })],
      }).compile();

      const service = moduleRef.get(AuditService);
      await service.audit({
        actor: "user1",
        method: "POST",
        path: "/api/test",
        action: "TestController.test",
        statusCode: 200,
        duration: 50,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.actor).toBe("user1");
    });

    test("accepts custom config", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AuditModule.register({
            config: {
              enabled: false,
            },
          }),
        ],
      }).compile();

      const config = moduleRef.get(AUDIT_CONFIG);
      expect(config.enabled).toBe(false);
    });
  });

  describe("registerAsync()", () => {
    test("supports factory function", async () => {
      const events: AuditEvent[] = [];
      const customStorage: AuditStorage = {
        save: async (event) => {
          events.push(event);
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [
          AuditModule.registerAsync({
            useFactory: () => ({
              storage: customStorage,
              config: { enabled: true },
            }),
          }),
        ],
      }).compile();

      const service = moduleRef.get(AuditService);
      expect(service).toBeDefined();

      await service.audit({
        actor: "user1",
        method: "POST",
        path: "/api/test",
        action: "TestController.test",
        statusCode: 200,
        duration: 50,
      });

      expect(events).toHaveLength(1);
    });
  });
});

describe("AuditService", () => {
  let service: AuditService;
  let events: AuditEvent[];

  beforeEach(async () => {
    events = [];
    const customStorage: AuditStorage = {
      save: async (event) => {
        events.push(event);
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AuditModule.register({ storage: customStorage })],
    }).compile();

    service = moduleRef.get(AuditService);
  });

  test("creates audit event with all fields", async () => {
    await service.audit({
      actor: "user123",
      method: "POST",
      path: "/api/users",
      action: "UsersController.create",
      statusCode: 201,
      duration: 100,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      correlationId: "req-123",
      resource: "User",
      resourceId: "user-456",
    });

    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.actor).toBe("user123");
    expect(event.method).toBe("POST");
    expect(event.path).toBe("/api/users");
    expect(event.statusCode).toBe(201);
    expect(event.duration).toBe(100);
    expect(event.ip).toBe("192.168.1.1");
    expect(event.correlationId).toBe("req-123");
    expect(event.level).toBe("info");
  });

  test("sets error level for 5xx status", async () => {
    await service.audit({
      actor: "user1",
      method: "GET",
      path: "/api/test",
      action: "TestController.test",
      statusCode: 500,
      duration: 50,
      error: "Internal error",
    });

    expect(events[0]?.level).toBe("error");
  });

  test("sets warn level for 4xx status", async () => {
    await service.audit({
      actor: "user1",
      method: "GET",
      path: "/api/test",
      action: "TestController.test",
      statusCode: 404,
      duration: 50,
    });

    expect(events[0]?.level).toBe("warn");
  });

  test("masks sensitive data in changes", async () => {
    await service.audit({
      actor: "user1",
      method: "POST",
      path: "/api/users",
      action: "UsersController.create",
      statusCode: 201,
      duration: 50,
      before: { name: "John", password: "secret123" },
      after: { name: "John", password: "newpassword" },
    });

    const event = events[0]!;
    expect(event.changes?.before?.password).toBe("[REDACTED]");
    expect(event.changes?.after?.password).toBe("[REDACTED]");
    expect(event.changes?.before?.name).toBe("John");
  });

  test("shouldAudit respects method filter", () => {
    expect(service.shouldAudit("POST", "/api/test")).toBe(true);
    expect(service.shouldAudit("GET", "/api/test")).toBe(false); // GET not in default methods
  });
});
