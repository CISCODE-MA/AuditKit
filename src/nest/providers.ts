/**
 * ============================================================================
 * AUDIT KIT MODULE - PROVIDER FACTORY
 * ============================================================================
 *
 * Factory functions for creating NestJS providers based on module configuration.
 *
 * Architecture:
 * - Wires concrete implementations to port interfaces
 * - Handles configuration-based provider selection
 * - Manages dependency injection setup
 *
 * @packageDocumentation
 */

import type { Provider } from "@nestjs/common";
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
import type { AuditKitModuleOptions } from "./interfaces";

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Creates all NestJS providers for AuditKit module.
 *
 * Providers created:
 * 1. AUDIT_KIT_OPTIONS - Module configuration
 * 2. ID_GENERATOR - ID generation implementation
 * 3. TIMESTAMP_PROVIDER - Timestamp provider implementation
 * 4. CHANGE_DETECTOR - Change detection implementation
 * 5. AUDIT_REPOSITORY - Repository implementation (MongoDB or In-Memory)
 * 6. AuditService - Core service (depends on all above)
 *
 * @param options - Module configuration options
 * @returns Array of NestJS providers
 *
 * @internal
 */
export function createAuditKitProviders(options: AuditKitModuleOptions): Provider[] {
  return [
    // Configuration provider
    {
      provide: AUDIT_KIT_OPTIONS,
      useValue: options,
    },

    // ID Generator provider
    {
      provide: ID_GENERATOR,
      useFactory: (): IIdGenerator => {
        const config = options.idGenerator ?? { type: "nanoid" };

        switch (config.type) {
          case "nanoid":
          default: {
            const options: {
              defaultLength?: number;
              defaultAlphabet?: string;
            } = {};

            if (config.defaultLength !== undefined) {
              options.defaultLength = config.defaultLength;
            }
            if (config.defaultAlphabet !== undefined) {
              options.defaultAlphabet = config.defaultAlphabet;
            }

            return new NanoidIdGenerator(options);
          }
        }
      },
    },

    // Timestamp Provider provider
    {
      provide: TIMESTAMP_PROVIDER,
      useFactory: (): ITimestampProvider => {
        const config = options.timestampProvider ?? { type: "system" };

        switch (config.type) {
          case "system":
          default: {
            const options: {
              defaultTimezone?: "utc" | "local";
              defaultPrecision?: "second" | "millisecond" | "microsecond";
            } = {};

            if (config.defaultTimezone !== undefined) {
              options.defaultTimezone = config.defaultTimezone;
            }
            if (config.defaultPrecision !== undefined) {
              options.defaultPrecision = config.defaultPrecision;
            }

            return new SystemTimestampProvider(options);
          }
        }
      },
    },

    // Change Detector provider
    {
      provide: CHANGE_DETECTOR,
      useFactory: (): IChangeDetector => {
        const config = options.changeDetector ?? { type: "deep-diff" };

        switch (config.type) {
          case "deep-diff":
          default:
            return new DeepDiffChangeDetector();
        }
      },
    },

    // Repository provider
    {
      provide: AUDIT_REPOSITORY,
      useFactory: async (): Promise<IAuditLogRepository> => {
        const config = options.repository;

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
    },

    // Core AuditService
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
  ];
}

/**
 * Creates async providers for module configuration.
 *
 * Used when options are provided via useFactory/useClass/useExisting.
 *
 * @param options - Async module options
 * @returns Array of async option providers
 *
 * @internal
 */
export function createAuditKitAsyncProviders(options: {
  useFactory?: (
    // eslint-disable-next-line no-unused-vars
    ...args: any[]
  ) => Promise<AuditKitModuleOptions> | AuditKitModuleOptions;
  inject?: any[];
  useClass?: any;
  useExisting?: any;
}): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: AUDIT_KIT_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  if (options.useClass) {
    return [
      {
        provide: AUDIT_KIT_OPTIONS,
        useFactory: async (optionsFactory: {
          createAuditKitOptions: () => Promise<AuditKitModuleOptions> | AuditKitModuleOptions;
        }) => {
          return await optionsFactory.createAuditKitOptions();
        },
        inject: [options.useClass],
      },
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  if (options.useExisting) {
    return [
      {
        provide: AUDIT_KIT_OPTIONS,
        useFactory: async (optionsFactory: {
          createAuditKitOptions: () => Promise<AuditKitModuleOptions> | AuditKitModuleOptions;
        }) => {
          return await optionsFactory.createAuditKitOptions();
        },
        inject: [options.useExisting],
      },
    ];
  }

  throw new Error("Invalid async options: must provide useFactory, useClass, or useExisting");
}
