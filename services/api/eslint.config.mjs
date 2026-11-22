// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { noReplicaRowLocks } from "./eslint/replica-routing.mjs";
// import json from "@eslint/json";
// import markdown from "@eslint/markdown";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: [],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "agora-db": {
                rules: { "no-replica-row-locks": noReplicaRowLocks },
            },
        },
        rules: {
            "agora-db/no-replica-row-locks": "error",
            "@typescript-eslint/no-unnecessary-condition": [
                "error",
                { allowConstantLoopConditions: "only-allowed-literals" },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/shared-backend/db.ts", "**/*.test.ts"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "MemberExpression[property.name='$replica']",
                    message:
                        "Use getReplicaDatabase(db) so transactions and explicit primary handles retain their connection and readers have a query-only type.",
                },
                {
                    selector:
                        "MemberExpression[computed=true][property.value='$replica']",
                    message:
                        "Use getReplicaDatabase(db) instead of accessing $replica directly.",
                },
            ],
        },
    },
    // {
    //     files: ["**/*.json"],
    //     ignores: ["package-lock.json"],
    //     ...json.configs["recommended"],
    // },
    // {
    //     files: ["**/*.jsonc"],
    //     ...json.configs.recommended,
    // },
    // {
    //     files: ["**/*.json5"],
    //     ...json.configs.recommended,
    // },
    {
        files: ["src/**"],
        rules: {
            "linebreak-style": ["error", "unix"],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        ignores: [
            "**/dist/",
            ".email-build/",
            "src/generated/email/",
            "src/shared-backend/email/",
            "eslint.config.mjs",
            "eslint/**/*.mjs",
            "jest.config.js",
            "scripts/**/*.mjs",
            "tests/**/*",
            "drizzle.config.ts",
            "vite.config.ts",
        ],
    },
    // {
    //     // Add plugins here
    //     plugins: { markdown, json },
    // },
    eslintConfigPrettier, // eslint-config-prettier last
);
