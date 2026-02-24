import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      enabled: true,
      reporter: ["text", "html", "lcov"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/test/**"],
      threshold: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    globals: true,
    watch: false,
  },
});
