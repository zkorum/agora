import { fileURLToPath } from "node:url";

import tsParser from "@typescript-eslint/parser";
import compat from "eslint-plugin-compat";
import pluginVue from "eslint-plugin-vue";

const basePath = fileURLToPath(new URL("../..", import.meta.url));
const browserslistPath = fileURLToPath(new URL(".", import.meta.url));
const uuidRestriction = {
  property: "randomUUID",
  message: "Use Quasar uid() for frontend UUID generation.",
};
const polyfilledApis = [
  "Promise",
  "AggregateError",
  "Object.entries",
  "Object.values",
  "Object.fromEntries",
  "Object.getOwnPropertyDescriptors",
  "Object.hasOwn",
  "String.padStart",
  "Array.flatMap",
  "URL",
  "URLSearchParams",
  "queueMicrotask",
  "structuredClone",
  "Intl.getCanonicalLocales",
  "Intl.Locale",
  "Intl.Segmenter",
];

export default [
  {
    basePath,
    ignores: [
      "**/node_modules/**",
      "**/*.test.ts",
      "**/*.d.ts",
      "services/agora/src/api/**",
      "services/agora/src/shared/**",
      "services/agora/src/shared-app-api/**",
    ],
  },
  {
    basePath,
    files: [
      "services/agora/src/**/*.{ts,js,vue}",
      "services/shared/src/**/*.{ts,js,vue}",
      "services/shared-app-api/src/**/*.{ts,js,vue}",
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: { compat },
    settings: {
      browserslistOpts: { path: browserslistPath },
      ignoreConditionalChecks: true,
      polyfills: polyfilledApis,
    },
    rules: {
      "compat/compat": "warn",
      "no-restricted-properties": [
        "error",
        uuidRestriction,
        {
          property: "Segmenter",
          message: "Use the shared countPlainTextCharacters() helper.",
        },
      ],
    },
  },
  ...pluginVue.configs["flat/base"],
  {
    basePath,
    files: ["services/{agora,shared,shared-app-api}/src/**/*.vue"],
    languageOptions: {
      parserOptions: { parser: tsParser },
    },
  },
  {
    basePath,
    files: [
      "services/shared/src/shared.ts",
      "services/agora/src/browserCompatibility.ts",
    ],
    rules: {
      "no-restricted-properties": ["error", uuidRestriction],
    },
  },
  ...[
    {
      files: ["services/agora/src/composables/ui/useStickyObserver.ts"],
      api: "IntersectionObserver",
    },
    {
      files: [
        "services/agora/src/components/post/analysis/common/AnalysisClusterSelectorBar.vue",
        "services/agora/src/components/post/analysis/common/CompactFadeContainer.vue",
        "services/agora/src/components/ui-library/ZKContentDisclosure.vue",
      ],
      api: "ResizeObserver",
    },
    {
      files: ["services/agora/src/utils/crypto/store.ts"],
      api: "navigator.locks",
    },
  ].map(({ files, api }) => ({
    basePath,
    files,
    // These boundaries implement fallbacks; they do not supply global polyfills.
    settings: { polyfills: [...polyfilledApis, api] },
  })),
];
