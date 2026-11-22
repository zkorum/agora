import eslint from "@eslint/js";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import checkFile from "eslint-plugin-check-file";
import eslintConfigPrettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sveltePlugin from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";

import appPolicy from "./eslint/app-policy.js";

export default tseslint.config(
  {
    ignores: [
      ".svelte-kit/",
      ".netlify/",
      "build/",
      "node_modules/",
      "dist/",
      "static/",
      "test-results/",
      "playwright-report/",
      "storybook-static/",
      "src/lib/paraglide/",
      "vite.config.ts.timestamp-*",
      "postcss.config.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
    plugins: {
      "app-policy": appPolicy,
      "check-file": checkFile,
      "eslint-comments": eslintComments,
    },
    rules: {
      "app-policy/no-html-lint-directives": "error",
      "eslint-comments/no-use": "error",
      "check-file/filename-blocklist": [
        "error",
        {
          "**/*.spec.*": "*.test.ts",
          "**/*.test.!(ts)": "*.test.ts",
        },
      ],
      "no-extend-native": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": true,
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
    },
  },
  {
    ignores: [
      "**/+{page,layout,server,error}{,.server,@*,.server@*}.{js,ts,svelte}",
      "**/$types.d.ts",
    ],
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
  {
    files: [
      "src/lib/**/*.{js,ts,mjs,mts,cjs,cts,svelte}",
      "**/index.{js,ts,mjs,mts,cjs,cts}",
    ],
    ignores: ["**/*.d.ts", "**/*.test.ts"],
    rules: { "app-policy/no-barrel-exports": "error" },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
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
    files: ["**/*.svelte"],
    rules: {
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: "(?:^|:)(?:max|min)-\\[[^\\]]+\\]:",
              message:
                "Use a named Tailwind viewport breakpoint, or a container query for component layout.",
            },
            {
              pattern:
                "\\[(?:color:)?(?:#[\\da-fA-F]{3,8}(?![\\da-fA-F])|(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb|color)\\()",
              message:
                "Use a design-system color utility or CSS custom property instead of a literal color.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["eslint.config.js", "vite.config.ts", "playwright.config.ts"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["src/**/*.{js,ts,mjs,mts,cjs,cts,jsx,tsx,svelte}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
      "import-x": importX,
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "import-x/no-unresolved": [
        "error",
        {
          caseSensitive: true,
          ignore: ["^\\$app/", "^\\$env/", "^\\$service-worker$"],
        },
      ],
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
    files: ["{src,stories}/**/*.{js,ts,mjs,mts,cjs,cts,jsx,tsx,svelte}"],
    rules: {
      "app-policy/module-boundaries": "error",
    },
  },
  {
    files: ["**/*.svelte"],
    rules: {
      "app-policy/use-design-system": "error",
      "app-policy/module-boundaries": "error",
      // Disabled: This codebase uses localizeHref() from Paraglide for i18n-aware navigation
      // instead of SvelteKit's resolve(). The rule can't detect this equivalent pattern.
      "svelte/no-navigation-without-resolve": "off",
      "svelte/block-lang": ["error", { script: "ts" }],
      "svelte/button-has-type": "error",
      "svelte/no-target-blank": "error",
      "svelte/no-top-level-browser-globals": "error",
      "svelte/no-inspect": "error",
      "svelte/no-at-debug-tags": "error",
    },
  },
  {
    files: ["**/*.svelte.ts", "**/*.svelte.js"],
    rules: { "svelte/no-top-level-browser-globals": "error" },
  },
  {
    files: ["src/routes/resources/[[]slug[]]/+page.svelte"],
    rules: {
      // Resource HTML comes only from repository-owned Markdown, not user input.
      "svelte/no-at-html-tags": "off",
    },
  },
  {
    files: ["src/lib/components/agora/project-detail.svelte"],
    rules: {
      // This sink receives only the output of getProjectBodyDisplayHtml.
      "svelte/no-at-html-tags": "off",
    },
  },
  eslintConfigPrettier,
  ...sveltePlugin.configs["flat/prettier"],
);
