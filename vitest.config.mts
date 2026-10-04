import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/dist/**"],
    projects: ["core", "agent", "cli", "runtime"].map((name) => ({
      extends: true,
      test: {
        name: `@helm/${name}`,
        root: `packages/${name}`,
      },
    })),
  },
});
