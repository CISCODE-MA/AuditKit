/**
 * AuditModule - NestJS module for plug-and-play auditing.
 */

import { Module, Global } from "@nestjs/common";
import type { DynamicModule, Provider, Type } from "@nestjs/common";

import type { AuditConfig } from "../core/config";
import type { AuditStorage } from "../core/types";
import { ConsoleAuditStorage } from "../infra/console.storage";

import { AUDIT_STORAGE, AUDIT_CONFIG, AUDIT_MODULE_OPTIONS } from "./constants";
import { AuditInterceptor } from "./interceptor";
import { AuditService } from "./service";

/** Options for AuditModule.register() */
export interface AuditModuleOptions {
  /** Audit configuration */
  config?: AuditConfig;
  /** Custom storage implementation */
  storage?: AuditStorage;
  /** Make module global (default: true) */
  isGlobal?: boolean;
}

/** Options for AuditModule.registerAsync() */
export interface AuditModuleAsyncOptions {
  /** Modules to import */
  imports?: any[];
  /** Providers to inject into factory */
  inject?: any[];
  /** Factory function returning options */
  // eslint-disable-next-line no-unused-vars
  useFactory: (...args: any[]) => AuditModuleOptions | Promise<AuditModuleOptions>;
  /** Use existing provider */
  useExisting?: Type<AuditModuleOptionsFactory>;
  /** Use class provider */
  useClass?: Type<AuditModuleOptionsFactory>;
  /** Make module global (default: true) */
  isGlobal?: boolean;
}

/** Factory interface for async options */
export interface AuditModuleOptionsFactory {
  createAuditModuleOptions(): AuditModuleOptions | Promise<AuditModuleOptions>;
}

@Global()
@Module({})
export class AuditModule {
  /**
   * Register AuditModule with synchronous configuration.
   *
   * @example
   * ```typescript
   * // Basic usage with console logging
   * AuditModule.register()
   *
   * // With custom config
   * AuditModule.register({
   *   config: {
   *     excludePaths: ['/health', '/metrics'],
   *     sensitiveKeys: ['ssn', 'dob'],
   *   },
   * })
   *
   * // With custom storage
   * AuditModule.register({
   *   storage: new MongoAuditStorage(mongoClient),
   * })
   * ```
   */
  static register(options: AuditModuleOptions = {}): DynamicModule {
    const { config, storage, isGlobal = true } = options;

    const storageProvider: Provider = {
      provide: AUDIT_STORAGE,
      useValue: storage || new ConsoleAuditStorage(),
    };

    const configProvider: Provider = {
      provide: AUDIT_CONFIG,
      useValue: config || {},
    };

    return {
      module: AuditModule,
      global: isGlobal,
      providers: [storageProvider, configProvider, AuditService, AuditInterceptor],
      exports: [AUDIT_STORAGE, AUDIT_CONFIG, AuditService, AuditInterceptor],
    };
  }

  /**
   * Register AuditModule with asynchronous configuration.
   *
   * @example
   * ```typescript
   * AuditModule.registerAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (configService: ConfigService) => ({
   *     config: {
   *       enabled: configService.get('AUDIT_ENABLED') !== 'false',
   *       excludePaths: configService.get('AUDIT_EXCLUDE_PATHS')?.split(','),
   *     },
   *     storage: new MongoAuditStorage(configService.get('MONGO_URI')),
   *   }),
   * })
   * ```
   */
  static registerAsync(asyncOptions: AuditModuleAsyncOptions): DynamicModule {
    const { imports = [], isGlobal = true } = asyncOptions;

    const asyncProviders = this.createAsyncProviders(asyncOptions);

    const storageProvider: Provider = {
      provide: AUDIT_STORAGE,
      inject: [AUDIT_MODULE_OPTIONS],
      useFactory: (options: AuditModuleOptions) => {
        return options.storage || new ConsoleAuditStorage();
      },
    };

    const configProvider: Provider = {
      provide: AUDIT_CONFIG,
      inject: [AUDIT_MODULE_OPTIONS],
      useFactory: (options: AuditModuleOptions) => {
        return options.config || {};
      },
    };

    return {
      module: AuditModule,
      global: isGlobal,
      imports,
      providers: [
        ...asyncProviders,
        storageProvider,
        configProvider,
        AuditService,
        AuditInterceptor,
      ],
      exports: [AUDIT_STORAGE, AUDIT_CONFIG, AuditService, AuditInterceptor],
    };
  }

  private static createAsyncProviders(_options: AuditModuleAsyncOptions): Provider[] {
    if (_options.useFactory) {
      return [
        {
          provide: AUDIT_MODULE_OPTIONS,
          useFactory: _options.useFactory,
          inject: _options.inject || [],
        },
      ];
    }

    if (_options.useClass) {
      return [
        {
          provide: AUDIT_MODULE_OPTIONS,
          useFactory: async (factory: AuditModuleOptionsFactory) =>
            factory.createAuditModuleOptions(),
          inject: [_options.useClass],
        },
        {
          provide: _options.useClass,
          useClass: _options.useClass,
        },
      ];
    }

    if (_options.useExisting) {
      return [
        {
          provide: AUDIT_MODULE_OPTIONS,
          useFactory: async (factory: AuditModuleOptionsFactory) =>
            factory.createAuditModuleOptions(),
          inject: [_options.useExisting],
        },
      ];
    }

    return [];
  }
}
