import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // optional: make sure Vitest uses the same alias resolution
        globals: true,
        environment: "node",
    },
});
