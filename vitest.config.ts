import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The suite covers the pure booking logic, which needs no database.
    setupFiles: ["tests/setup.ts"],
    // Transforming the modules is the bulk of a run and the sources rarely
    // change between two, so the result is kept on disk.
    fsModuleCache: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
