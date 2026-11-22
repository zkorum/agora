// @vitest-environment node
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const compatibilityLint = new ESLint({
  allowInlineConfig: false,
  cwd: fileURLToPath(new URL("../../../..", import.meta.url)),
  overrideConfigFile: fileURLToPath(
    new URL("../../eslint.compat.config.js", import.meta.url)
  ),
});
const browserFilePath =
  "services/agora/src/utils/api/vote/voteSubmissionQueue.ts";

describe("frontend UUID policy", () => {
  it("preserves type-aware application linting without a separate plugin dependency", async () => {
    const applicationLint = new ESLint({
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
    });
    const config = await applicationLint.calculateConfigForFile(
      "src/utils/api/vote/voteSubmissionQueue.ts"
    );
    expect(config?.rules?.["@typescript-eslint/no-floating-promises"]).toEqual([
      2,
    ]);
    expect(config?.languageOptions?.parserOptions?.projectService).toBe(true);
    expect(
      config?.plugins?.["@typescript-eslint"]?.rules?.["no-floating-promises"]
    ).toBeDefined();
  });

  it.each([
    "crypto.randomUUID();",
    "if (userClicked) crypto.randomUUID();",
    "const c = crypto; c.randomUUID();",
    "window.crypto.randomUUID();",
    'globalThis.crypto["randomUUID"]();',
    "const { randomUUID: createId } = crypto; createId();",
  ])("rejects unsupported native UUID access: %s", async (code) => {
    const results = await compatibilityLint.lintText(code, {
      filePath: browserFilePath,
    });
    expect(
      results.flatMap((result) =>
        result.messages.filter(
          (message) => message.ruleId === "no-restricted-properties"
        )
      )
    ).toHaveLength(1);
  });

  it("allows the maintained UUID implementation", async () => {
    const results = await compatibilityLint.lintText(
      'import { uid } from "quasar"; uid();',
      { filePath: browserFilePath }
    );
    expect(
      results.flatMap((result) =>
        result.messages.filter(
          (message) => message.ruleId === "no-restricted-properties"
        )
      )
    ).toEqual([]);
  });
});

describe("browser compatibility audit", () => {
  it("checks TypeScript inside Vue components", async () => {
    const results = await compatibilityLint.lintText(
      '<template><div /></template><script setup lang="ts">const enabled: boolean = true; if (enabled) new AbortController();</script>',
      { filePath: "services/agora/src/Bootstrap.vue" }
    );
    expect(results.some((result) => result.fatalErrorCount > 0)).toBe(false);
    expect(
      results.flatMap((result) =>
        result.messages.filter((message) => message.ruleId === "compat/compat")
      )
    ).toHaveLength(1);
  });

  it.each([
    "new AbortController();",
    "if (userClicked) new AbortController();",
    "new Intl.PluralRules();",
    'new Intl.DisplayNames(["en"], { type: "language" });',
  ])(
    "reports unsupported APIs without blanket exemptions: %s",
    async (code) => {
      const results = await compatibilityLint.lintText(code, {
        filePath: browserFilePath,
      });
      const warnings = results.flatMap((result) =>
        result.messages.filter((message) => message.ruleId === "compat/compat")
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.severity).toBe(1);
    }
  );

  it("allows specifically supplied polyfills", async () => {
    const results = await compatibilityLint.lintText(
      'Object.fromEntries([]); Object.hasOwn({}, "key"); Promise.allSettled([]); new AggregateError([]);',
      { filePath: browserFilePath }
    );
    expect(results.flatMap((result) => result.messages)).toEqual([]);
  });

  it("allows Segmenter access only in the shared helper and compatibility initializer", async () => {
    const code = 'new Intl.Segmenter(undefined, { granularity: "grapheme" });';
    const frontend = await compatibilityLint.lintText(code, {
      filePath: browserFilePath,
    });
    expect(
      frontend.flatMap((result) =>
        result.messages.filter(
          (message) => message.ruleId === "no-restricted-properties"
        )
      )
    ).toHaveLength(1);
    const shared = await compatibilityLint.lintText(code, {
      filePath: "services/shared/src/shared.ts",
    });
    expect(shared.flatMap((result) => result.messages)).toEqual([]);
    const initializer = await compatibilityLint.lintText(
      'typeof Intl.Segmenter !== "undefined";',
      { filePath: "services/agora/src/browserCompatibility.ts" }
    );
    expect(initializer.flatMap((result) => result.messages)).toEqual([]);
  });

  it("ignores inline directives without registering unrelated rule plugins", async () => {
    const results = await compatibilityLint.lintText(
      "/* eslint-disable @typescript-eslint/no-unsafe-return, no-restricted-properties */\ncrypto.randomUUID();",
      { filePath: browserFilePath }
    );
    const errors = results
      .flatMap((result) => result.messages)
      .filter((message) => message.severity === 2);
    expect(errors.map((message) => message.ruleId)).toEqual([
      "no-restricted-properties",
    ]);
  });

  it("checks canonical shared code rather than generated copies", async () => {
    expect(
      await compatibilityLint.isPathIgnored("services/shared/src/shared.ts")
    ).toBe(false);
    expect(
      await compatibilityLint.isPathIgnored(
        "services/agora/src/shared/shared.ts"
      )
    ).toBe(true);
    const results = await compatibilityLint.lintText("crypto.randomUUID();", {
      filePath: "services/shared/src/shared.ts",
    });
    expect(
      results.flatMap((result) =>
        result.messages.filter(
          (message) => message.ruleId === "no-restricted-properties"
        )
      )
    ).toHaveLength(1);
  });

  it("keeps fallback allowances local to their boundaries", async () => {
    const code = "new IntersectionObserver(() => {});";
    const approved = await compatibilityLint.lintText(code, {
      filePath: "services/agora/src/composables/ui/useStickyObserver.ts",
    });
    expect(approved.flatMap((result) => result.messages)).toEqual([]);
    const elsewhere = await compatibilityLint.lintText(code, {
      filePath: browserFilePath,
    });
    expect(
      elsewhere.flatMap((result) =>
        result.messages.filter((message) => message.ruleId === "compat/compat")
      )
    ).toHaveLength(1);
  });
});
