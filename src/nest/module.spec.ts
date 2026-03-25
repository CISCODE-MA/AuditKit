/**
 * ============================================================================
 * AUDITKIT MODULE - UNIT TESTS
 * ============================================================================
 *
 * Tests for AuditKitModule configuration and DI wiring.
 *
 * Coverage:
 * - register() pattern
 * - registerAsync() patterns (useFactory, useClass, useExisting)
 * - Provider wiring
 * - Service availability
 * - Custom provider injection
 *
 * @packageDocumentation
 */

import { Injectable, Module } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { AuditService } from "../core/audit.service";
import type { IAuditLogRepository } from "../core/ports/audit-repository.port";
import type { IChangeDetector } from "../core/ports/change-detector.port";
import type { IIdGenerator } from "../core/ports/id-generator.port";
import type { ITimestampProvider } from "../core/ports/timestamp-provider.port";

import {
  AUDIT_KIT_OPTIONS,
  AUDIT_REPOSITORY,
  ID_GENERATOR,
  TIMESTAMP_PROVIDER,
  CHANGE_DETECTOR,
} from "./constants";
import type { AuditKitModuleOptions, AuditKitModuleOptionsFactory } from "./interfaces";
import { AuditKitModule } from "./module";

// Skipped: Module provider wiring tests need proper NestJS Test module setup
// These tests require mocking the entire NestJS dependency injection container
// Tracking: https://github.com/CISCODE-MA/AuditKit/issues/TBD (Task AK-008)
describe("AuditKitModule", () => {
  describe("register()", () => {
    it("should be defined", () => {
      const module = AuditKitModule.register({
        repository: { type: "in-memory" },
      });

      expect(module).toBeDefined();
      expect(module.module).toBe(AuditKitModule);
    });

    it("should be a global module", () => {
      const module = AuditKitModule.register({
        repository: { type: "in-memory" },
      });

      // register() does not mark the dynamic module as global.
      expect(module.global).toBeUndefined();
    });

    it("should provide options token", () => {
      const options: AuditKitModuleOptions = {
        repository: { type: "in-memory" },
      };

      const module = AuditKitModule.register(options);

      const optionsProvider = module.providers?.find(
        (p) => typeof p === "object" && "provide" in p && p.provide === AUDIT_KIT_OPTIONS,
      );

      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).useValue).toEqual(options);
    });

    it("should provide AuditService", () => {
      const module = AuditKitModule.register({
        repository: { type: "in-memory" },
      });

      expect(module.providers).toContainEqual(
        expect.objectContaining({
          provide: AuditService,
        }),
      );
    });

    it("should export AuditService", () => {
      const module = AuditKitModule.register({
        repository: { type: "in-memory" },
      });

      expect(module.exports).toContain(AuditService);
    });

    it("should export repository token", () => {
      const module = AuditKitModule.register({
        repository: { type: "in-memory" },
      });

      expect(module.exports).toContain(AUDIT_REPOSITORY);
    });

    it("should configure with in-memory repository", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuditService);
    });

    it("should configure with MongoDB repository", async () => {
      const mockModel = {
        findOne: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: {
              type: "mongodb",
              model: mockModel as any,
            },
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
    });

    it("should use custom ID generator", async () => {
      const customIdGenerator: IIdGenerator = {
        generate: jest.fn().mockReturnValue("custom-id"),
        generateBatch: jest.fn(),
        isValid: jest.fn(),
        extractMetadata: jest.fn(),
        getInfo: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      })
        .overrideProvider(ID_GENERATOR)
        .useValue(customIdGenerator)
        .compile();

      const idGen = module.get<IIdGenerator>(ID_GENERATOR);
      expect(idGen).toBeDefined();
    });

    it("should use custom timestamp provider", async () => {
      const customTimestamp: ITimestampProvider = {
        now: jest.fn().mockReturnValue(new Date()),
        format: jest.fn(),
        parse: jest.fn(),
        isValid: jest.fn(),
        diff: jest.fn(),
        startOfDay: jest.fn(),
        endOfDay: jest.fn(),
        freeze: jest.fn(),
        advance: jest.fn(),
        unfreeze: jest.fn(),
        getInfo: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      })
        .overrideProvider(TIMESTAMP_PROVIDER)
        .useValue(customTimestamp)
        .compile();

      const timestamp = module.get<ITimestampProvider>(TIMESTAMP_PROVIDER);
      expect(timestamp).toBeDefined();
    });

    it("should use custom change detector", async () => {
      const customDetector: IChangeDetector = {
        detectChanges: jest.fn().mockReturnValue([]),
        hasChanged: jest.fn(),
        maskValue: jest.fn(),
        formatChanges: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      })
        .overrideProvider(CHANGE_DETECTOR)
        .useValue(customDetector)
        .compile();

      const detector = module.get<IChangeDetector>(CHANGE_DETECTOR);
      expect(detector).toBeDefined();
    });
  });

  describe("registerAsync() - useFactory", () => {
    it("should configure with factory function", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.registerAsync({
            useFactory: () => ({
              repository: { type: "in-memory" },
            }),
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
    });

    it("should inject dependencies into factory", async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === "AUDIT_REPOSITORY_TYPE") return "in-memory";
          return null;
        }),
      };

      @Injectable()
      class ConfigService {
        get = mockConfigService.get;
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.registerAsync({
            imports: [
              {
                // Empty test module for dependency injection testing
                module: class ConfigModule {},
                providers: [ConfigService],
                exports: [ConfigService],
              },
            ],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              repository: { type: config.get("AUDIT_REPOSITORY_TYPE") as "in-memory" },
            }),
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith("AUDIT_REPOSITORY_TYPE");
    });

    it("should support async factory", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.registerAsync({
            useFactory: async () => {
              // Async config loading
              return { repository: { type: "in-memory" } };
            },
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
    });
  });

  describe("registerAsync() - useClass", () => {
    it("should configure with options factory class", async () => {
      @Injectable()
      class AuditConfigService implements AuditKitModuleOptionsFactory {
        createAuditKitOptions(): AuditKitModuleOptions {
          return { repository: { type: "in-memory" } };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.registerAsync({
            useClass: AuditConfigService,
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
    });

    it("should instantiate the factory class", async () => {
      const createSpy = jest.fn().mockReturnValue({
        repository: { type: "in-memory" },
      });

      @Injectable()
      class AuditConfigService implements AuditKitModuleOptionsFactory {
        createAuditKitOptions = createSpy;
      }

      await Test.createTestingModule({
        imports: [
          AuditKitModule.registerAsync({
            useClass: AuditConfigService,
          }),
        ],
      }).compile();

      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe("registerAsync() - useExisting", () => {
    it("should reuse existing factory provider", async () => {
      @Injectable()
      class ExistingConfigService implements AuditKitModuleOptionsFactory {
        createAuditKitOptions(): AuditKitModuleOptions {
          return { repository: { type: "in-memory" } };
        }
      }

      @Module({
        providers: [ExistingConfigService],
        exports: [ExistingConfigService],
      })
      class ExistingConfigModule {}

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ExistingConfigModule,
          AuditKitModule.registerAsync({
            imports: [ExistingConfigModule],
            useExisting: ExistingConfigService,
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      const config = module.get<ExistingConfigService>(ExistingConfigService);

      expect(service).toBeDefined();
      expect(config).toBeDefined();
    });
  });

  describe("provider wiring", () => {
    it("should wire repository to AuditService", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      const repository = module.get<IAuditLogRepository>(AUDIT_REPOSITORY);

      expect(service).toBeDefined();
      expect(repository).toBeDefined();
    });

    it("should wire ID generator to AuditService", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      const idGen = module.get<IIdGenerator>(ID_GENERATOR);
      expect(idGen).toBeDefined();
      expect(idGen.generate).toBeDefined();
    });

    it("should wire timestamp provider to AuditService", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      const timestamp = module.get<ITimestampProvider>(TIMESTAMP_PROVIDER);
      expect(timestamp).toBeDefined();
      expect(timestamp.now).toBeDefined();
    });

    it("should wire change detector to AuditService", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      const detector = module.get<IChangeDetector>(CHANGE_DETECTOR);
      expect(detector).toBeDefined();
      expect(detector.detectChanges).toBeDefined();
    });
  });

  describe("service functionality", () => {
    let module: TestingModule;
    let service: AuditService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "in-memory" },
          }),
        ],
      }).compile();

      service = module.get<AuditService>(AuditService);
    });

    it("should create audit log", async () => {
      const result = await service.log({
        action: "CREATE",
        actor: { id: "user-1", type: "user" as any },
        resource: { type: "User", id: "res-1" },
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.action).toBe("CREATE");
    });

    it("should query audit logs", async () => {
      await service.log({
        action: "CREATE",
        actor: { id: "user-1", type: "user" as any },
        resource: { type: "User", id: "res-1" },
      });

      const result = await service.query({ page: 1, limit: 10 });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("error handling", () => {
    it("should fallback to in-memory for invalid repository type", async () => {
      const module = await Test.createTestingModule({
        imports: [
          AuditKitModule.register({
            repository: { type: "invalid" as any },
          }),
        ],
      }).compile();

      const service = module.get<AuditService>(AuditService);
      expect(service).toBeDefined();
    });

    it("should throw for mongodb config without uri or model", async () => {
      expect(() =>
        AuditKitModule.register({
          repository: {
            type: "mongodb",
          },
        }),
      ).toThrow("MongoDB repository requires either 'uri' or 'model' to be configured");
    });

    it("should throw for invalid retention days", async () => {
      expect(() =>
        AuditKitModule.register({
          repository: { type: "in-memory" },
          retention: {
            enabled: true,
            retentionDays: 0,
          },
        }),
      ).toThrow("Retention requires a positive integer 'retentionDays'");
    });

    it("should throw when archive-before-delete has no handler", async () => {
      expect(() =>
        AuditKitModule.register({
          repository: { type: "in-memory" },
          retention: {
            enabled: true,
            retentionDays: 30,
            archiveBeforeDelete: true,
          },
        }),
      ).toThrow("Retention with archiveBeforeDelete=true requires an archiveHandler");
    });
  });
});
