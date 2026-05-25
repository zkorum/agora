import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        environment: "node",
        exclude: ["dist/**", "node_modules/**"],
    },
});
