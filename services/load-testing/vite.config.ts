import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: {
                "scenario1-single-conversation": resolve(
                    __dirname,
                    "src/scenario1-single-conversation.ts",
                ),
                "scenario2-multiple-conversations": resolve(
                    __dirname,
                    "src/scenario2-multiple-conversations.ts",
                ),
            },
            formats: ["cjs"],
            fileName: (format, entryName) => `${entryName}.cjs`,
        },
        outDir: "dist",
        rollupOptions: {
            external: [
                /^k6(\/.*)?$/,  // All k6 modules including k6/experimental/webcrypto
            ],
            output: {
                format: "cjs",
                exports: "named",
            },
        },
        target: "esnext",
        // Don't use ssr mode - we want everything bundled
        minify: false,
    },
    resolve: {
        // Prefer browser/module versions when available
        mainFields: ["module", "main"],
        alias: {
            // Map Node.js crypto to k6's global crypto
            crypto: resolve(__dirname, "src/crypto-polyfill.js"),
        },
    },
});
