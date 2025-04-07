import { defineConfig } from "eslint/config";
import markdown from "@eslint/markdown";
import json from "@eslint/json";

export default defineConfig([
  {
    plugins: {
      markdown,
      json,
    },
  },
  {
    files: ["**/*.md"],
    language: "markdown/commonmark",
    // rules: {
    //   "markdown/no-html": "ignore",
    // },
  },
  // lint JSON files
  {
    files: ["**/*.json"],
    language: "json/json",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },

  // lint JSONC files
  {
    files: ["**/*.jsonc", ".vscode/*.json"],
    language: "json/jsonc",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },

  // lint JSON5 files
  {
    files: ["**/*.json5"],
    language: "json/json5",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },
]);
