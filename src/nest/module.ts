/**
 * ============================================================================
 * AUDIT KIT MODULE - MAIN MODULE
 * ============================================================================
 *
 * NestJS dynamic module for AuditKit.
 *
 * Registration Patterns:
 * 1. register() - Synchronous registration with static configuration
 * 2. registerAsync() - Async registration with factory/class/existing provider
 *
 * Module Exports:
 * - AuditService: Core service for creating and querying audit logs
 * - All utility providers (ID generator, timestamp, change detector)
 * - Repository implementation (MongoDB or In-Memory)
 *
 * @packageDocumentation
 */

import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import type { ConnectOptions } from "mongoose";
import { connect } from "mongoose";

import { AuditService } from "../core/audit.service";
import type { IAuditLogRepository } from "../core/ports/audit-repository.port";
import type { IChangeDetector } from "../core/ports/change-detector.port";
import type { IIdGenerator } from "../core/ports/id-generator.port";
import type { ITimestampProvider } from "../core/ports/timestamp-provider.port";
import { DeepDiffChangeDetector } from "../infra/providers/change-detector/deep-diff-change-detector";
import { NanoidIdGenerator } from "../infra/providers/id-generator/nanoid-id-generator";
import { SystemTimestampProvider } from "../infra/providers/timestamp/system-timestamp-provider";
import { InMemoryAuditRepository } from "../infra/repositories/in-memory/in-memory-audit.repository";
import { AuditLogSchema } from "../infra/repositories/mongodb/audit-log.schema";
import { MongoAuditRepository } from "../infra/repositories/mongodb/mongo-audit.repository";

import {
  AUDIT_KIT_OPTIONS,
  AUDIT_REPOSITORY,
  CHANGE_DETECTOR,
  ID_GENERATOR,
  TIMESTAMP_PROVIDER,
} from "./constants";
import type { AuditKitModuleAsyncOptions, AuditKitModuleOptions } from "./interfaces";
import { createAuditKitAsyncProviders, createAuditKitProviders } from "./providers";

// ============================================================================
// AUDIT KIT MODULE
// ============================================================================

/**
 * AuditKit NestJS module.
 *
 * Provides comprehensive audit logging capabilities with:
 * - Multi-repository support (MongoDB, In-Memory)
 * - Pluggable utility providers
 * - Type-safe configuration
 * - Synchronous and asynchronous registration
 *
 * @example Basic synchronous registration
 * ```typescript
 * @Module({
 *   imports: [
 *     AuditKitModule.register({
 *       repository: {
 *         type: 'mongodb',
 *         uri: 'mongodb://localhost:27017/auditdb'
 *       }
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * @example Async registration with ConfigService
 * ```typescript
 * @Module({
 *   imports: [
 *     AuditKitModule.registerAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         repository: {
 *           type: 'mongodb',
 *           uri: config.get('MONGO_URI')
 *         }
 *       })
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * @example Using AuditService in your code
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly auditService: AuditService) {}
 *
 *   async updateUser(id: string, updates: UpdateUserDto, actor: Actor) {
 *     const user = await this.userRepository.findById(id);
 *     const updated = await this.userRepository.update(id, updates);
 *
 *     // Log the change
 *     await this.auditService.log({
 *       action: 'UPDATE',
 *       actor,
 *       resource: { type: 'User', id: user.id, label: user.email },
 *       before: user,
 *       after: updated
 *     });
 *
 *     return updated;
 *   }
 * }
 * ```
 */
@Module({})
export class AuditKitModule {
  /**
   * Registers AuditKit module with static configuration.
   *
   * Use this when all configuration values are known at compile/startup time.
   *
   * @param options - Module configuration options
   * @returns Dynamic module
   *
   * @example With MongoDB
   * ```typescript
   * AuditKitModule.register({
   *   repository: {
   *     type: 'mongodb',
   *     uri: 'mongodb://localhost:27017/auditdb',
   *     database: 'auditdb'
   *   }
   * })
   * ```
   *
   * @example With In-Memory
   * ```typescript
   * AuditKitModule.register({
   *   repository: {
   *     type: 'in-memory'
   *   }
   * })
   * ```
   *
   * @example With custom providers
   * ```typescript
   * AuditKitModule.register({
   *   repository: {
   *     type: 'mongodb',
   *     uri: process.env.MONGO_URI
   *   },
   *   idGenerator: {
   *     type: 'nanoid',
   *     defaultLength: 16
   *   },
   *   timestampProvider: {
   *     type: 'system',
   *     defaultTimezone: 'utc'
   *   }
   * })
   * ```
   */
  static register(options: AuditKitModuleOptions): DynamicModule {
    const providers = createAuditKitProviders(options);

    return {
      module: AuditKitModule,
      providers,
      exports: [AuditService, AUDIT_REPOSITORY, ID_GENERATOR, TIMESTAMP_PROVIDER, CHANGE_DETECTOR],
    };
  }

  /**
   * Registers AuditKit module with async configuration.
   *
   * Use this when configuration values come from:
   * - ConfigService
   * - Remote configuration service
   * - Database
   * - Any other async source
   *
   * Supports three patterns:
   * 1. useFactory - Provide a factory function
   * 2. useClass - Provide a class implementing AuditKitModuleOptionsFactory
   * 3. useExisting - Reuse an existing provider
   *
   * @param options - Async configuration options
   * @returns Dynamic module
   *
   * @example With useFactory and ConfigService
   * ```typescript
   * AuditKitModule.registerAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     repository: {
   *       type: 'mongodb',
   *       uri: config.get('MONGO_URI'),
   *       database: config.get('MONGO_DB')
   *     },
   *     idGenerator: {
   *       type: 'nanoid',
   *       defaultLength: config.get('ID_LENGTH', 21)
   *     }
   *   })
   * })
   * ```
   *
   * @example With useClass
   * ```typescript
   * @Injectable()
   * class AuditKitConfigService implements AuditKitModuleOptionsFactory {
   *   constructor(private config: ConfigService) {}
   *
   *   createAuditKitOptions(): AuditKitModuleOptions {
   *     return {
   *       repository: {
   *         type: 'mongodb',
   *         uri: this.config.get('MONGO_URI')
   *       }
   *     };
   *   }
   * }
   *
   * AuditKitModule.registerAsync({
   *   useClass: AuditKitConfigService
   * })
   * ```
   *
   * @example With useExisting
   * ```typescript
   * AuditKitModule.registerAsync({
   *   imports: [SharedConfigModule],
   *   useExisting: AuditKitConfigService
   * })
   * ```
   */
  static registerAsync(options: AuditKitModuleAsyncOptions): DynamicModule {
    const asyncProviders = createAuditKitAsyncProviders(options);

    return {
      module: AuditKitModule,
      imports: options.imports ?? [],
      providers: [
        ...asyncProviders,
        // ID Generator
        {
          provide: ID_GENERATOR,
          useFactory: (moduleOptions: AuditKitModuleOptions): IIdGenerator => {
            const config = moduleOptions.idGenerator ?? { type: "nanoid" };

            switch (config.type) {
              case "nanoid":
              default: {
                const providerOptions: {
                  defaultLength?: number;
                  defaultAlphabet?: string;
                } = {};

                if (config.defaultLength !== undefined) {
                  providerOptions.defaultLength = config.defaultLength;
                }
                if (config.defaultAlphabet !== undefined) {
                  providerOptions.defaultAlphabet = config.defaultAlphabet;
                }

                return new NanoidIdGenerator(providerOptions);
              }
            }
          },
          inject: [AUDIT_KIT_OPTIONS],
        },
        // Timestamp Provider
        {
          provide: TIMESTAMP_PROVIDER,
          useFactory: (moduleOptions: AuditKitModuleOptions): ITimestampProvider => {
            const config = moduleOptions.timestampProvider ?? { type: "system" };

            switch (config.type) {
              case "system":
              default: {
                const providerOptions: {
                  defaultTimezone?: "utc" | "local";
                  defaultPrecision?: "second" | "millisecond" | "microsecond";
                } = {};

                if (config.defaultTimezone !== undefined) {
                  providerOptions.defaultTimezone = config.defaultTimezone;
                }
                if (config.defaultPrecision !== undefined) {
                  providerOptions.defaultPrecision = config.defaultPrecision;
                }

                return new SystemTimestampProvider(providerOptions);
              }
            }
          },
          inject: [AUDIT_KIT_OPTIONS],
        },
        // Change Detector
        {
          provide: CHANGE_DETECTOR,
          useFactory: (moduleOptions: AuditKitModuleOptions): IChangeDetector => {
            const config = moduleOptions.changeDetector ?? { type: "deep-diff" };

            switch (config.type) {
              case "deep-diff":
              default:
                return new DeepDiffChangeDetector();
            }
          },
          inject: [AUDIT_KIT_OPTIONS],
        },
        // Repository
        {
          provide: AUDIT_REPOSITORY,
          useFactory: async (
            moduleOptions: AuditKitModuleOptions,
          ): Promise<IAuditLogRepository> => {
            const config = moduleOptions.repository;

            switch (config.type) {
              case "mongodb": {
                // If a model is provided, use it directly
                if (config.model) {
                  return new MongoAuditRepository(config.model);
                }

                // Otherwise, create a connection and model
                if (!config.uri) {
                  throw new Error(
                    "MongoDB repository requires either 'uri' or 'model' to be configured",
                  );
                }

                const connectionOptions: Partial<ConnectOptions> = {};
                if (config.database !== undefined) {
                  connectionOptions.dbName = config.database;
                }

                const connection = await connect(config.uri, connectionOptions as ConnectOptions);
                const model = connection.model("AuditLog", AuditLogSchema);
                return new MongoAuditRepository(model);
              }

              case "in-memory":
              default:
                return new InMemoryAuditRepository();
            }
          },
          inject: [AUDIT_KIT_OPTIONS],
        },
        // Audit Service
        {
          provide: AuditService,
          useFactory: (
            repository: IAuditLogRepository,
            idGenerator: IIdGenerator,
            timestampProvider: ITimestampProvider,
            changeDetector: IChangeDetector,
          ) => {
            return new AuditService(repository, idGenerator, timestampProvider, changeDetector);
          },
          inject: [AUDIT_REPOSITORY, ID_GENERATOR, TIMESTAMP_PROVIDER, CHANGE_DETECTOR],
        },
      ],
      exports: [AuditService, AUDIT_REPOSITORY, ID_GENERATOR, TIMESTAMP_PROVIDER, CHANGE_DETECTOR],
    };
  }
}
