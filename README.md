# @ciscode/audit-kit

Plug-and-play auditing library for NestJS with zero-impact interception.

## Implementation Steps

### 1. Installation

```bash
npm install @ciscode/audit-kit
```

### 2. Basic Setup

Add AuditModule to your AppModule:

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { AuditModule } from "@ciscode/audit-kit";

@Module({
  imports: [AuditModule.register()],
})
export class AppModule {}
```

### 3. Apply Interceptor Globally

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AuditInterceptor } from "@ciscode/audit-kit";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply globally
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  await app.listen(3000);
}
bootstrap();
```

### 4. Configure Storage (Optional)

Replace console logging with persistent storage:

```typescript
// mongo.storage.ts
import { AuditStorage, AuditEvent } from "@ciscode/audit-kit";
import { Collection } from "mongodb";

class MongoAuditStorage implements AuditStorage {
  constructor(private collection: Collection) {}

  async save(event: AuditEvent): Promise<void> {
    await this.collection.insertOne(event);
  }

  async find(query: any): Promise<AuditEvent[]> {
    return this.collection.find(query).toArray();
  }
}

// app.module.ts
@Module({
  imports: [
    AuditModule.register({
      storage: new MongoAuditStorage(mongoCollection),
    }),
  ],
})
export class AppModule {}
```

### 5. Advanced Configuration

```typescript
// app.module.ts
@Module({
  imports: [
    AuditModule.register({
      config: {
        enabled: process.env.AUDIT_ENABLED !== "false",
        methods: ["POST", "PUT", "DELETE", "PATCH"],
        excludePaths: ["/health", "/metrics", "/swagger"],
        sensitiveKeys: ["password", "token", "apiKey", "ssn", "creditCard"],
        captureChanges: true,
        maskValue: "[REDACTED]",
      },
      storage: new MongoAuditStorage(mongoCollection),
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### 6. Async Configuration with ConfigService

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    AuditModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        config: {
          enabled: config.get("AUDIT_ENABLED") !== "false",
          excludePaths: config.get("AUDIT_EXCLUDE_PATHS")?.split(",") || [],
          sensitiveKeys: config.get("AUDIT_SENSITIVE_KEYS")?.split(",") || [],
        },
        storage: new MongoAuditStorage(config.get("MONGODB_URI"), config.get("AUDIT_COLLECTION")),
      }),
    }),
  ],
})
export class AppModule {}
```

### 7. Custom Actor Extraction

```typescript
// actor.extractor.ts
import { Request } from "express";

export const extractActor = (req: Request): string => {
  // Extract from JWT token
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return payload.sub || payload.userId || "UNKNOWN";
    } catch {
      return "INVALID_TOKEN";
    }
  }

  // Fallback to API key
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) return `API_KEY:${apiKey.substring(0, 8)}`;

  return "GUEST";
};

// app.module.ts
@Module({
  imports: [
    AuditModule.register({
      config: {
        actorExtractor: extractActor,
      },
    }),
  ],
})
export class AppModule {}
```

### 8. Verify Implementation

Check that audit events are being logged:

```bash
# Console output should show audit events
npm run start:dev

# Make a request
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"secret123"}'

# Should see audit log in console
```

### 9. Production Deployment

1. **Replace Console Storage**:

   ```typescript
   // Use database storage in production
   AuditModule.register({
     storage: new PostgresAuditStorage(dbConfig),
   });
   ```

2. **Add Monitoring**:

   ```typescript
   // Add error monitoring
   process.on("unhandledRejection", (error) => {
     console.error("Audit storage error:", error);
   });
   ```

3. **Configure Retention**:
   ```typescript
   // Implement log rotation
   setInterval(
     () => {
       db.collection("audit_logs").deleteMany({
         timestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
       });
     },
     24 * 60 * 60 * 1000,
   );
   ```

## Features

- **Zero-Impact Interception**: Passively observes requests without modifying req/res
- **Fail-Safe**: Audit failures never affect the main application request
- **PII Masking**: Automatically masks sensitive fields (password, token, secret, etc.)
- **Deep Diffing**: Tracks changes between request body and response
- **Flexible Storage**: Console logging by default, easily pluggable for database storage
- **NestJS Dynamic Module**: `register()` and `registerAsync()` patterns

## Installation

```bash
npm install @ciscode/audit-kit
```

## Quick Start

For a minimal setup, follow steps 1-3 from the Implementation Steps above.

## Configuration

```typescript
AuditModule.register({
  config: {
    enabled: true, // Enable/disable auditing
    methods: ["POST", "PUT", "DELETE"], // Methods to audit (default: mutations)
    excludePaths: ["/health", "/metrics"], // Paths to exclude
    sensitiveKeys: ["ssn", "dob"], // Additional keys to mask
    captureChanges: true, // Capture before/after diff
    maskValue: "[REDACTED]", // Mask replacement text
  },
  storage: customStorageInstance, // Custom AuditStorage implementation
});
```

## Custom Storage

Implement the `AuditStorage` interface:

```typescript
import { AuditStorage, AuditEvent } from "@ciscode/audit-kit";

class MongoAuditStorage implements AuditStorage {
  constructor(private db: Db) {}

  async save(event: AuditEvent): Promise<void> {
    await this.db.collection("audit_logs").insertOne(event);
  }
}

// Use it
AuditModule.register({
  storage: new MongoAuditStorage(mongoDb),
});
```

## Async Configuration

```typescript
AuditModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    config: {
      enabled: config.get("AUDIT_ENABLED") !== "false",
      excludePaths: config.get("AUDIT_EXCLUDE_PATHS")?.split(","),
    },
  }),
});
```

## Audit Event Structure

```typescript
interface AuditEvent {
  id: string; // Unique event ID
  timestamp: Date; // When it occurred
  actor: string; // User ID or 'GUEST'
  method: string; // HTTP method
  path: string; // Request path
  action: string; // Controller.handler
  statusCode: number; // Response status
  duration: number; // Request duration (ms)
  level: "info" | "warn" | "error";
  changes?: {
    // For mutations
    before: object;
    after: object;
    modifiedFields: string[];
  };
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  error?: string;
}
```

## Security

AuditKit follows security best practices:

- All sensitive data is masked by default
- Zero-impact interception prevents audit failures from affecting application
- No external dependencies except `uuid`
- Framework-agnostic core logic

## Performance

- RxJS `tap` operator ensures auditing happens after response is sent
- Asynchronous storage with fire-and-forget pattern
- Configurable path exclusion for high-traffic endpoints
- Minimal overhead (typically <1ms)

## Production Considerations

1. **Storage**: Replace console logging with persistent storage (MongoDB, PostgreSQL, etc.)
2. **Sampling**: For high-traffic applications, consider sampling strategies
3. **Indexing**: Index `actor`, `timestamp`, and `path` fields for query performance
4. **Retention**: Implement log rotation or archival policies
5. **Monitoring**: Monitor audit storage health and failure rates

## Comparison with Alternatives

| Feature             | AuditKit           | NestJS Logger        | Custom Middleware            |
| ------------------- | ------------------ | -------------------- | ---------------------------- |
| Zero Impact         | ✅                 | ❌                   | ⚠️ Depends on implementation |
| PII Masking         | ✅ Built-in        | ❌                   | ❌ Manual                    |
| Deep Diffing        | ✅                 | ❌                   | ❌ Manual                    |
| Storage Flexibility | ✅ Interface-based | ⚠️ Logger transports | ⚠️ Custom implementation     |
| NestJS Integration  | ✅ Native          | ✅ Native            | ⚠️ Manual                    |

## API Reference

### AuditModule

#### `register(options: AuditModuleOptions)`

Synchronous module registration.

```typescript
interface AuditModuleOptions {
  config?: AuditConfig;
  storage?: AuditStorage;
  isGlobal?: boolean; // default: true
}
```

#### `registerAsync(options: AuditModuleAsyncOptions)`

Asynchronous module registration with factory pattern.

```typescript
interface AuditModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => AuditModuleOptions | Promise<AuditModuleOptions>;
  useExisting?: Type<AuditModuleOptionsFactory>;
  useClass?: Type<AuditModuleOptionsFactory>;
  isGlobal?: boolean; // default: true
}
```

### AuditConfig

```typescript
interface AuditConfig {
  enabled?: boolean; // default: true
  level?: "info" | "warn" | "error"; // default: 'info'
  methods?: string[]; // default: ['POST', 'PUT', 'PATCH', 'DELETE']
  excludePaths?: string[]; // default: []
  sensitiveKeys?: string[]; // default: ['password', 'token', 'secret', ...]
  captureChanges?: boolean; // default: true
  maxDiffDepth?: number; // default: 5
  maskValue?: string; // default: '[MASKED]'
  actorExtractor?: ActorExtractor;
}
```

### AuditStorage Interface

```typescript
interface AuditStorage {
  save(event: AuditEvent): Promise<void>;
  find?(query: AuditQuery): Promise<AuditEvent[]>;
}
```

### AuditEvent

```typescript
interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: string;
  method: string;
  path: string;
  action: string;
  statusCode: number;
  duration: number;
  level: "info" | "warn" | "error";
  changes?: AuditChanges;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}
```

## Troubleshooting

### Audit events not appearing

1. Check `config.enabled` is `true`
2. Verify the HTTP method is in `config.methods`
3. Ensure the path is not in `config.excludePaths`
4. Check storage implementation for errors

### Performance impact

1. Use `excludePaths` for high-traffic endpoints
2. Consider sampling for very high-volume applications
3. Monitor storage write performance

### PII not masked

1. Verify field names match `config.sensitiveKeys`
2. Check for case sensitivity
3. Ensure `config.captureChanges` is `true`

## Scripts

- `npm run build` - Build to `dist/`
- `npm test` - Run tests
- `npm run typecheck` - TypeScript validation
- `npm run lint` - ESLint validation
- `npm run format` - Prettier check
- `npx changeset` - Create a changeset

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes using `npx changeset`
4. Submit a pull request

## License

MIT

## Support

For issues, questions, or feature requests, please [open an issue](https://github.com/ciscode/audit-kit/issues).
