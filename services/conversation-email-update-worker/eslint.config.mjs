// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unnecessary-condition": [
                "error",
                { allowConstantLoopConditions: "only-allowed-literals" },
            ],
        },
    },
    {
        ignores: [
            "dist/",
            "node_modules/",
            "src/shared/",
            "src/shared-backend/",
            "eslint.config.mjs",
            "assertProductionBuild.mjs",
            "vite.config.ts",
        ],
    },
    eslintConfigPrettier,
);
