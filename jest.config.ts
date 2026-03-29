import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  clearMocks: true,
  testMatch: ["<rootDir>/test/**/*.test.ts", "<rootDir>/src/**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: ["node_modules/(?!(nanoid)/)"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/index.ts"],
  coverageDirectory: "coverage",
};

export default config;
