import eslint from "@eslint/js";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sveltePlugin from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";

export default tseslint.config(
  {
    ignores: [
      ".svelte-kit/",
      "build/",
      "node_modules/",
      "dist/",
      "static/",
      "vite.config.ts.timestamp-*",
      "postcss.config.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  ...sveltePlugin.configs["flat/recommended"],
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  eslintPluginBetterTailwindcss.configs["recommended"],
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app.css",
      },
    },
  },
  {
    files: [
      "eslint.config.js",
      "svelte.config.js",
      "vite.config.ts",
      "playwright.config.ts",
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["src/**/*.ts", "src/**/*.svelte", "src/**/*.svelte.ts"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "linebreak-style": ["error", "unix"],
      "no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.svelte"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      // Disabled: This codebase uses localizeHref() from Paraglide for i18n-aware navigation
      // instead of SvelteKit's resolve(). The rule can't detect this equivalent pattern.
      "svelte/no-navigation-without-resolve": "off",
    },
  },
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
  eslintConfigPrettier,
  ...sveltePlugin.configs["flat/prettier"],
);
