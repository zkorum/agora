// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

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
            "vite.config.ts",
            "tests/**/*",
            "src/api/**",
            "src/crypto/**",
            "src/crypto-polyfill.js",
            "src/shared/**",
        ],
    },
    eslintConfigPrettier, // eslint-config-prettier last
);
