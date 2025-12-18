import js from "@eslint/js";
import jsonPlugin from "@eslint/json";
import pluginQuasar from "@quasar/app-vite/eslint";
import prettierSkipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default defineConfigWithVueTs(
  {
    /**
     * Ignore the following files.
     * Please note that pluginQuasar.configs.recommended() already ignores
     * the "node_modules" folder for you (and all other Quasar project
     * relevant folders and files).
     *
     * ESLint requires "ignores" key to be the only one in this object
     */
    ignores: ["**/src/shared/**", "**/src/api/**", "**/*.d.ts"],
  },

  pluginQuasar.configs.recommended(),
  js.configs.recommended,

  jsonPlugin.configs.recommended,

  /**
   * https://eslint.vuejs.org
   *
   * pluginVue.configs.base
   *   -> Settings and rules to enable correct ESLint parsing.
   * pluginVue.configs[ 'flat/essential']
   *   -> base, plus rules to prevent errors or unintended behavior.
   * pluginVue.configs["flat/strongly-recommended"]
   *   -> Above, plus rules to considerably improve code readability and/or dev experience.
   * pluginVue.configs["flat/recommended"]
   *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
   */
  pluginVue.configs["flat/recommended"],

  {
    files: ["**/*.ts", "**/*.vue"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parser: pluginVue.parser,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
  // https://github.com/vuejs/eslint-config-typescript
  vueTsConfigs.recommendedTypeChecked,

  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        extraFileExtensions: [".vue"],
      },

      globals: {
        ...globals.browser,
        ...globals.node, // SSR, Electron, config files
        process: "readonly", // process.env.*
        ga: "readonly", // Google Analytics
        cordova: "readonly",
        Capacitor: "readonly",
        chrome: "readonly", // BEX related
        browser: "readonly", // BEX related
      },
    },

    // add your custom rules here
    rules: {
      "prefer-promise-reject-errors": "off",

      // allow debugger during development only
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",

      quotes: ["error", "double", { avoidEscape: true }],

      // this rule, if on, would require explicit return type on the `render` function
      "@typescript-eslint/explicit-function-return-type": "off",

      // in plain CommonJS modules, you can't use `import foo = require('foo')` to pass this rule, so it has to be disabled
      "@typescript-eslint/no-var-requires": "off",

      // The core 'no-unused-vars' rules (in the eslint:recommended ruleset)
      // does not work with type definitions
      "no-unused-vars": "off",

      "vue/multi-word-component-names": 0,

      // conflicts with Prettier
      // see https://eslint.vuejs.org/user-guide/#conflict-with-prettier
      "vue/first-attribute-linebreak": [
        "off",
        {
          singleline: "beside",
          multiline: "beside",
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // useful to know, but too verbose https://stackoverflow.com/a/63488201/11046178
      "@typescript-eslint/no-floating-promises": ["error"],

      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // Vue component block order
      "vue/block-order": [
        "error",
        {
          order: ["template", "script", "style"],
        },
      ],

      // Vue script setup macros order
      "vue/define-macros-order": [
        "error",
        {
          order: ["defineOptions", "defineProps", "defineEmits", "defineSlots"],
        },
      ],

      // Enforce type-based declarations for defineEmits and defineProps
      "vue/define-emits-declaration": ["error", "type-based"],
      "vue/define-props-declaration": ["error", "type-based"],

      // Import ordering - automatically sorts imports
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Forbid unused props and other component properties
      "vue/no-unused-properties": [
        "error",
        {
          groups: ["props", "data", "computed", "methods", "setup"],
          deepData: true,
          ignorePublicMembers: false,
        },
      ],

      // Require prop types (for Options API components)
      "vue/require-prop-types": "error",

      // Catch unused slot bindings
      "vue/no-unused-vars": "error",

      // Enforce script setup API style (Composition API)
      "vue/component-api-style": ["error", ["script-setup"]],

      // Enforce camelCase for custom events
      "vue/custom-event-name-casing": ["error", "camelCase"],

      // Prevent required props with defaults (logical error)
      "vue/no-required-prop-with-default": "error",

      // Security: require rel attribute on target="_blank"
      "vue/no-template-target-blank": [
        "error",
        {
          allowReferrer: false,
          enforceDynamicLinks: "always",
        },
      ],

      // Code quality: remove useless mustaches
      "vue/no-useless-mustaches": "error",

      // Code quality: remove useless v-bind
      "vue/no-useless-v-bind": "error",
    },
  },

  {
    files: ["src-pwa/custom-service-worker.ts"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },

  prettierSkipFormatting
);
