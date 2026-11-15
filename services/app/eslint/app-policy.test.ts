import { resolve } from "node:path";

import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "..");
const syntaxLint = new ESLint({
  cwd: root,
  overrideConfig: [tseslint.configs.disableTypeChecked],
});
const typedLint = new ESLint({ cwd: root });

async function messages({
  file = "src/lib/logic/agora/probe.ts",
  code,
  typed = false,
}: {
  file?: string;
  code: string;
  typed?: boolean;
}) {
  const results = await (typed ? typedLint : syntaxLint).lintText(code, {
    filePath: resolve(root, file),
  });
  const findings = results.flatMap((result) => result.messages);
  expect(findings.filter((finding) => finding.fatal)).toEqual([]);
  expect(
    findings.some((finding) => finding.message.includes("File ignored")),
  ).toBe(false);
  return findings;
}

async function policy({ file, code }: { file?: string; code: string }) {
  const findings = await messages({ file, code });
  return findings.filter((finding) =>
    ["app-policy/", "check-file/", "eslint-comments/"].some((prefix) =>
      finding.ruleId?.startsWith(prefix),
    ),
  );
}

describe("production tooling boundaries", () => {
  test.each([
    'import "@storybook/svelte-vite";',
    'export * from "@storybook/svelte-vite";',
    'export { default } from "vitest";',
    'export async function load() { return await import("vitest"); }',
    "export async function load() { return await import(`@storybook/svelte-vite`); }",
    'const name = "vitest"; export async function load() { return await import(name); }',
    'const name = "svelte-vite"; export async function load() { return await import(`@storybook/${name}`); }',
    'export async function load() { return await import("@story" + "book/svelte-vite"); }',
    'import "playwright";',
    'import "playwright-core";',
    'import "@playwright/test";',
    'import "@testing-library/svelte";',
    'import "eslint-plugin-svelte";',
    'import "@eslint-community/eslint-utils";',
    'import "@eslint-community/eslint-plugin-eslint-comments";',
    'import "@typescript-eslint/utils";',
    'import "typescript";',
    'import "../../../../node_modules/typescript/lib/typescript.js";',
    'import "../../../../node_modules/vitest/dist/index.js";',
    'import "../shared/probe.test.js";',
    'import "../../../../stories/fixture-state.svelte";',
    'import "../../../../.storybook/preview.js";',
    'import "../../../../eslint/app-policy.js";',
    'export const stories = import.meta.glob("/stories/**/*.svelte");',
    'export const tests = import.meta.glob(["/src/**/*.test.ts"], { eager: true });',
  ])("rejects %s", async (code) => {
    expect(await policy({ code })).toContainEqual(
      expect.objectContaining({ messageId: "tooling" }),
    );
  });

  test.each(["js", "ts", "mjs", "mts", "cjs", "cts", "svelte.js", "svelte.ts"])(
    "guards source %s files",
    async (extension) => {
      expect(
        await policy({
          file: `src/probe.${extension}`,
          code: 'import "vitest";',
        }),
      ).toContainEqual(expect.objectContaining({ messageId: "tooling" }));
    },
  );

  test("rejects tooling imported by a relative dependency path", async () => {
    expect(
      await policy({
        file: "src/probe.ts",
        code: 'import "../node_modules/@eslint-community/eslint-utils/index.js";',
      }),
    ).toContainEqual(expect.objectContaining({ messageId: "tooling" }));
  });

  test("guards Svelte scripts", async () => {
    expect(
      await policy({
        file: "src/lib/components/agora/probe.svelte",
        code: '<script lang="ts">import "vitest";</script>',
      }),
    ).toContainEqual(expect.objectContaining({ messageId: "tooling" }));
  });

  test.each([
    ["src/lib/logic/agora/probe.test.ts", 'import "vitest";'],
    [
      "stories/probe.stories.svelte",
      '<script lang="ts">import "@storybook/svelte-vite";</script>',
    ],
    [".storybook/probe.ts", 'import "@storybook/svelte-vite";'],
    ["src/probe.ts", 'import "storybook-helper";'],
    [
      "src/probe.ts",
      'export const posts = import.meta.glob(["/src/lib/posts/**/*.md", "!/src/**/*.test.ts"], { eager: true, query: "?raw" });',
    ],
  ])(
    "permits legitimate tooling scope/package boundary: %s",
    async (file, code) => {
      expect(await policy({ file, code })).toEqual([]);
    },
  );
});

describe("architecture", () => {
  test("allows components to consume ordinary mock data", async () => {
    expect(
      await policy({
        file: "src/lib/components/agora/probe.ts",
        code: 'import "#lib/mock-data.js";',
      }),
    ).toEqual([]);
  });

  test.each([
    [
      "src/lib/components/agora/probe.ts",
      'import "#lib/assets/landing/use-cases/events-conferences.svg";',
      "feature",
    ],
    ["src/lib/components/agora/probe.ts", 'export * from "bits-ui";', "bits"],
    ["src/routes/+page.ts", 'import "bits-ui";', "bits"],
    ["src/probe.ts", 'import "../node_modules/bits-ui/dist/index.js";', "bits"],
    [
      "src/lib/logic/shared/probe.ts",
      "export async function load() { return await import(`bits-ui`); }",
      "bits",
    ],
    [
      "src/lib/components/agora/probe.ts",
      'const name = "bits-ui"; export async function load() { return await import(name); }',
      "bits",
    ],
    [
      "src/lib/ui/shared/probe.ts",
      'import "$components/agora/view-types.js";',
      "layer",
    ],
    [
      "src/lib/logic/shared/probe.ts",
      'import "#lib/ui/shared/view-types.js";',
      "layer",
    ],
    [
      "src/lib/logic/shared/probe.ts",
      'import "../../ui/shared/view-types.js";',
      "layer",
    ],
    ["src/lib/logic/shared/probe.ts", 'import "$app/navigation";', "layer"],
    [
      "src/lib/components/landing/probe.ts",
      'import "$ui/agora/view-types.js";',
      "feature",
    ],
    [
      "src/lib/ui/shared/probe.ts",
      'import "$logic/agora/qv-allocation.js";',
      "feature",
    ],
    ["src/probe.ts", 'import "../../agora/package.json";', "crossApp"],
    ["src/probe.ts", 'import "../../../external/other/index.js";', "crossApp"],
    ["src/probe.ts", 'import "vue";', "vue"],
    ["src/probe.ts", 'import "quasar";', "vue"],
    ["src/probe.ts", 'import "@vue/runtime-core";', "vue"],
    [
      "src/probe.ts",
      "export async function load() { return await import(`runed/kit`); }",
      "runed",
    ],
  ])(
    "rejects forbidden dependency from %s: %s",
    async (file, code, messageId) => {
      expect(await policy({ file, code })).toContainEqual(
        expect.objectContaining({ messageId }),
      );
    },
  );

  test.each([
    ["src/lib/ui/shared/probe.ts", 'import "bits-ui";'],
    [
      "src/lib/components/landing/probe.ts",
      'import "#lib/assets/partners/ngi.png?enhanced";',
    ],
    ["src/lib/components/agora/probe.ts", 'import "$ui/shared/view-types.js";'],
    ["src/lib/ui/agora/probe.ts", 'import "$logic/agora/qv-allocation.js";'],
    [
      "src/lib/server/landing/probe.ts",
      'import "$logic/landing/resource-types.js";',
    ],
    ["src/routes/+page.server.ts", 'import "$server/landing/resources.ts";'],
    [
      "src/lib/logic/shared/probe.ts",
      'import "../../../../../shared/src/languages.ts";',
    ],
    [
      "src/lib/server/landing/probe.test.ts",
      'import "$components/landing/faq-content.ts";',
    ],
  ])("permits intended dependency from %s: %s", async (file, code) => {
    expect(await policy({ file, code })).toEqual([]);
  });
});

describe("filenames and barrels", () => {
  test.each([
    "probe.spec.ts",
    "probe.spec.js",
    "probe.spec.mts",
    "probe.test.js",
    "probe.test.mts",
  ])("rejects undiscovered test suffix %s", async (name) => {
    expect(
      await policy({ file: `tests/${name}`, code: "export {};" }),
    ).toContainEqual(
      expect.objectContaining({ ruleId: "check-file/filename-blocklist" }),
    );
  });
  test("rejects CamelCase files", async () => {
    expect(
      await policy({ file: "src/ExampleUtility.ts", code: "export {};" }),
    ).toContainEqual(
      expect.objectContaining({
        ruleId: "check-file/filename-naming-convention",
      }),
    );
  });
  test.each([
    "src/routes/+page.server.ts",
    "src/routes/+layout@.svelte",
    "src/app.d.ts",
    "tests/hello.test.ts",
  ])("permits framework/declaration/test names %s", async (file) => {
    expect(
      await policy({
        file,
        code: file.endsWith(".svelte") ? "<p>Hello</p>" : "export {};",
      }),
    ).toEqual([]);
  });
  test.each([
    'export * from "./greeting.js";',
    'export { getGreeting } from "./greeting.js";',
  ])("rejects authored index barrel %s", async (code) => {
    expect(
      await policy({ file: "src/lib/logic/shared/index.ts", code }),
    ).toContainEqual(
      expect.objectContaining({ ruleId: "app-policy/no-barrel-exports" }),
    );
  });
  test.each([
    'export * from "bits-ui";',
    'import { Button } from "bits-ui"; export { Button };',
  ])("checks Svelte module-script barrels too: %s", async (script) => {
    const findings = await policy({
      file: "src/lib/ui/shared/probe.svelte",
      code: `<script module lang="ts">${script}</script>`,
    });
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "app-policy/no-barrel-exports" }),
    );
  });
  test("rejects forwarding an imported default", async () => {
    expect(
      await policy({
        file: "src/lib/ui/shared/public-api.ts",
        code: 'import Button from "./button.svelte"; export default Button;',
      }),
    ).toContainEqual(
      expect.objectContaining({ ruleId: "app-policy/no-barrel-exports" }),
    );
  });
  test("permits an index module that defines its own API", async () => {
    expect(
      await policy({
        file: "src/lib/logic/shared/index.ts",
        code: "export const greeting = 'Hello';",
      }),
    ).toEqual([]);
  });
  test.each([
    'export * from "./greeting.js";',
    'import { getGreeting } from "./greeting.js"; export { getGreeting };',
  ])("rejects renamed library barrels too: %s", async (code) => {
    expect(
      await policy({ file: "src/lib/logic/shared/public-api.ts", code }),
    ).toContainEqual(
      expect.objectContaining({ ruleId: "app-policy/no-barrel-exports" }),
    );
  });
});

describe("type safety and suppression policy", () => {
  test("rejects ordinary casts but preserves const assertions", async () => {
    const rejected = await messages({
      code: "export function parse(value: unknown) { return value as { name: string }; }",
    });
    expect(rejected).toContainEqual(
      expect.objectContaining({
        ruleId: "@typescript-eslint/consistent-type-assertions",
      }),
    );
    const accepted = await messages({
      code: 'export const mode = "preview" as const;',
    });
    expect(accepted).toEqual([]);
  });
  test("a descriptive ts-expect-error does not bypass the policy", async () => {
    expect(
      await messages({
        code: '// @ts-expect-error: this description used to be enough\nexport const count: number = "one";',
      }),
    ).toContainEqual(
      expect.objectContaining({ ruleId: "@typescript-eslint/ban-ts-comment" }),
    );
  });
  test.each(["ts-ignore", "ts-nocheck"])(
    "rejects @%s directives",
    async (directive) => {
      expect(
        await messages({
          code: `// @${directive}\nexport const count: number = "one";`,
        }),
      ).toContainEqual(
        expect.objectContaining({
          ruleId: "@typescript-eslint/ban-ts-comment",
        }),
      );
    },
  );
  test("retains the non-null assertion prohibition", async () => {
    expect(
      await messages({
        code: "export function value(input: string | undefined) { return input!; }",
      }),
    ).toContainEqual(
      expect.objectContaining({
        ruleId: "@typescript-eslint/no-non-null-assertion",
      }),
    );
  });
  test("inline directives neither disable checks nor silently pass", async () => {
    const findings = await messages({
      code: "// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport type Unsafe = any;",
    });
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "eslint-comments/no-use" }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "@typescript-eslint/no-explicit-any" }),
    );
  });
  test.each(["src/hooks.client.test.ts", "tests/home.test.ts"])(
    "rejects floating promises in %s",
    async (file) => {
      expect(
        await messages({
          file,
          code: "export function start() { Promise.resolve(1); }",
          typed: true,
        }),
      ).toContainEqual(
        expect.objectContaining({
          ruleId: "@typescript-eslint/no-floating-promises",
        }),
      );
    },
  );
  test("rejects platform prototype modifications", async () => {
    expect(
      await messages({
        code: "Array.prototype.at = function() { return undefined; };",
      }),
    ).toContainEqual(expect.objectContaining({ ruleId: "no-extend-native" }));
  });
  test("rejects an unawaited Playwright assertion", async () => {
    expect(
      await messages({
        file: "tests/home.test.ts",
        typed: true,
        code: 'import { expect, type Page } from "@playwright/test"; export function check(page: Page) { expect(page.getByRole("button")).toBeVisible(); }',
      }),
    ).toContainEqual(
      expect.objectContaining({
        ruleId: "@typescript-eslint/no-floating-promises",
      }),
    );
  });
});

describe("Svelte-specific contracts", () => {
  test("accepts Kit 3 guarded browser access and rejects unguarded access", async () => {
    const file = "src/lib/logic/shared/scroll-visibility.svelte.ts";
    expect(
      await messages({
        file,
        code: 'import { browser } from "$app/env"; export const width = browser ? window.innerWidth : 0;',
      }),
    ).toEqual([]);
    expect(
      await messages({ file, code: "export const width = window.innerWidth;" }),
    ).toContainEqual(
      expect.objectContaining({
        ruleId: "svelte/no-top-level-browser-globals",
      }),
    );
  });
  test("does not reject browser access inside lifecycle callbacks", async () => {
    expect(
      await messages({
        file: "src/probe.svelte",
        code: '<script lang="ts">import { onMount } from "svelte"; onMount(() => { window.scrollTo(0, 0); });</script>',
      }),
    ).toEqual([]);
  });
  test("HTML lint directives cannot suppress Svelte checks", async () => {
    const findings = await messages({
      file: "src/probe.svelte",
      code: '<!-- eslint-disable svelte/no-at-html-tags --><script lang="ts">let { content }: { content: string } = $props();</script>{@html content}',
    });
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "svelte/no-at-html-tags" }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "app-policy/no-html-lint-directives" }),
    );
  });
  test.each([
    ["src/routes/resources/[slug]/+page.svelte", false],
    ["src/routes/resources/new/+page.svelte", true],
    ["src/lib/ui/shared/probe.svelte", true],
  ])("limits the trusted HTML exception to %s", async (file, rejected) => {
    const findings = await messages({
      file,
      code: '<script lang="ts">let { content }: { content: string } = $props();</script>{@html content}',
    });
    expect(
      findings.some((finding) => finding.ruleId === "svelte/no-at-html-tags"),
    ).toBe(rejected);
  });
});
