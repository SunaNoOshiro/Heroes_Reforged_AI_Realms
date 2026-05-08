import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["json-summary", "json", "html", "text-summary"],
      reportsDirectory: "reports/coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/fixtures/**",
        "**/*.d.ts",
      ],
    },
  },
});
