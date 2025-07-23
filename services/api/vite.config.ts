import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // optional: make sure Vitest uses the same alias resolution
        globals: true,
        environment: "node",
    },
});
