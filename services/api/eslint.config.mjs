// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

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
        },
    },
    {
        ignores: [
            "**/dist/",
            "eslint.config.mjs",
            "jest.config.js",
            "val.js",
            "tests/**/*",
            "drizzle.config.ts",
        ],
    },
);
