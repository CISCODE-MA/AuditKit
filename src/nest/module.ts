import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";

export type DeveloperKitModuleOptions = Record<string, never>;

@Module({})
export class DeveloperKitModule {
  static register(_options: DeveloperKitModuleOptions = {}): DynamicModule {
    void _options;

    return {
      module: DeveloperKitModule,
      providers: [],
      exports: [],
    };
  }
}
