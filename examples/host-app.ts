/**
 * Example host app to test AuditKit integration.
 * Run with: npx ts-node --esm examples/host-app.ts
 */

import "reflect-metadata";
import { Module, Controller, Get, Post, Body, Injectable } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AuditModule, AuditInterceptor } from "../src";
import type { AuditEvent, AuditStorage } from "../src";

// ============ Custom In-Memory Storage ============
@Injectable()
class InMemoryAuditStorage implements AuditStorage {
  private events: AuditEvent[] = [];

  async save(event: AuditEvent): Promise<void> {
    this.events.push(event);
    console.log("\n📝 AUDIT EVENT CAPTURED:");
    console.log(`   Action: ${event.action}`);
    console.log(`   Actor: ${event.actor}`);
    console.log(`   Method: ${event.method} ${event.path}`);
    console.log(`   Status: ${event.statusCode} (${event.duration}ms)`);
    if (event.changes?.modifiedFields?.length) {
      console.log(`   Changes: ${event.changes.modifiedFields.join(", ")}`);
    }
    console.log("");
  }

  getAll(): AuditEvent[] {
    return this.events;
  }
}

// ============ Sample Controller ============
@Controller("users")
class UsersController {
  private users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ];

  @Get()
  findAll() {
    return this.users;
  }

  @Get(":id")
  findOne() {
    return this.users[0];
  }

  @Post()
  create(@Body() body: { name: string; email: string; password: string }) {
    const newUser = {
      id: String(this.users.length + 1),
      name: body.name,
      email: body.email,
    };
    this.users.push(newUser);
    return newUser;
  }
}

@Controller("health")
class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}

// ============ App Module ============
const storage = new InMemoryAuditStorage();

@Module({
  imports: [
    AuditModule.register({
      storage,
      config: {
        enabled: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Audit all methods for demo
        excludePaths: ["/health"], // Exclude health checks
        sensitiveKeys: ["password", "secret", "token"],
      },
    }),
  ],
  controllers: [UsersController, HealthController],
})
class AppModule {}

// ============ Bootstrap ============
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });

  // Apply AuditInterceptor globally
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  const port = 3333;
  await app.listen(port);

  console.log("🚀 AuditKit Test Server running on http://localhost:" + port);
  console.log("");
  console.log("Try these requests:");
  console.log("  GET  http://localhost:" + port + "/users           → Lists users (audited)");
  console.log(
    "  POST http://localhost:" + port + "/users           → Create user (audited, password masked)",
  );
  console.log("  GET  http://localhost:" + port + "/health          → Health check (excluded)");
  console.log("");
  console.log(
    'Example POST body: {"name":"Test","email":"test@example.com","password":"secret123"}',
  );
  console.log("");
}

bootstrap().catch(console.error);
