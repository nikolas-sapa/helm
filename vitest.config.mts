import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/dist/**"],
    projects: [
      ...["core", "agent", "cli", "runtime"].map((name) => ({
        extends: true,
        test: {
          name: `@helm/${name}`,
          root: `packages/${name}`,
        },
      })),
      {
        extends: true,
        resolve: {
          alias: [
            {
              // convex/_generated is gitignored; tests use the untyped anyApi equivalent.
              find: /^\.\.\/convex\/_generated\/api\.js$/,
              replacement: fileURLToPath(
                new URL("./apps/control-plane/test/stubs/convexApi.ts", import.meta.url),
              ),
            },
          ],
        },
        test: {
          name: "@helm/control-plane",
          root: "apps/control-plane",
        },
      },
    ],
  },
});
