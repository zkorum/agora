import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import pluginQuasar from "@quasar/app-vite/eslint";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import prettierSkipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import jsonPlugin from "@eslint/json";
import vueI18nPlugin from "@intlify/eslint-plugin-vue-i18n";

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
    ignores: ["**/src/shared/**", "**/src/api/**"],
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

  // Vue i18n plugin configuration
  ...vueI18nPlugin.configs["flat/recommended"],

  {
    files: ["**/*.ts", "**/*.vue"],
    languageOptions: {
      parser: pluginVue.parser,
    },
    settings: {
      "vue-i18n": {
        localeDir: "./src/i18n/**",
        messageSyntaxVersion: "^9.0.0",
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      // Vue i18n specific rules - enhanced schema validation
      "@intlify/vue-i18n/no-unused-keys": "warn",
      "@intlify/vue-i18n/no-missing-keys": "error",
      "@intlify/vue-i18n/no-raw-text": "off", // Disabled during gradual migration

      // Message syntax and structure validation
      "@intlify/vue-i18n/valid-message-syntax": "error",
      "@intlify/vue-i18n/no-duplicate-keys-in-locale": "error",

      // Key format and naming consistency
      "@intlify/vue-i18n/key-format-style": [
        "error",
        "camelCase",
        {
          allowArray: false,
          splitByDots: true,
        },
      ],

      // Security and best practices
      "@intlify/vue-i18n/no-html-messages": "warn",
      "@intlify/vue-i18n/no-v-html": "warn",
    },
  },
  // https://github.com/vuejs/eslint-config-typescript
  vueTsConfigs.recommendedTypeChecked,

  {
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
        { argsIgnorePattern: "^_" },
      ],

      // useful to know, but too verbose https://stackoverflow.com/a/63488201/11046178
      "@typescript-eslint/no-floating-promises": ["error"],

      "@typescript-eslint/switch-exhaustiveness-check": "error",
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
