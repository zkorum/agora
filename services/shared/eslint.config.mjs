// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import json from "@eslint/json";
import markdown from "@eslint/markdown";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
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
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ["src/**"],
        rules: {
            "linebreak-style": ["error", "unix"],
        },
    },
    {
        ignores: ["**/dist/", "eslint.config.mjs", "jest.config.js", "val.js"],
    },
    {
        // Add plugins here
        plugins: { markdown, json },
    },
    eslintConfigPrettier, // eslint-config-prettier last
);
