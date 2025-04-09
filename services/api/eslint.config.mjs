// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import json from "@eslint/json";
import markdown from "@eslint/markdown";

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
    },
    {
        files: ["**/*.json"],
        ignores: ["package-lock.json"],
        ...json.configs["recommended"],
    },
    {
        files: ["**/*.jsonc"],
        ...json.configs.recommended,
    },
    {
        files: ["**/*.json5"],
        ...json.configs.recommended,
    },
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
            "eslint.config.mjs",
            "jest.config.js",
            "tests/**/*",
            "drizzle.config.ts",
        ],
    },
    {
        // Add plugins here
        plugins: { markdown, json },
    },
    eslintConfigPrettier, // eslint-config-prettier last
);
