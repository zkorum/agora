import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "eslint.config.mjs",
      "drizzle.config.ts",
      "jest.config.js",
    ],
    rules: {
      "linebreak-style": ["error", "unix"],
      indent: ["error", 4],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
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
  }
);
