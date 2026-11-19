import { readFileSync } from "node:fs";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { getFaqContent } from "$components/landing/faq-content";
import { baseLocale, locales } from "$lib/paraglide/runtime";

import { getResourcePosts } from "./resources";

const messages = new Map(
  Object.entries(
    import.meta.glob<Record<string, string>>("/messages/*.json", {
      eager: true,
      import: "default",
    }),
  ),
);
const posts = import.meta.glob<string>(
  ["/src/lib/posts/**/*.md", "!/src/lib/posts/README.md"],
  { eager: true, query: "?raw", import: "default" },
);
const englishMessages = messages.get("/messages/en.json") ?? {};
const englishPostPaths = Object.keys(posts).filter((path) =>
  path.startsWith("/src/lib/posts/en/"),
);
const translatedLocales = locales.filter((locale) => locale !== baseLocale);

describe("landing localization", () => {
  it("supports the Quasar app's display languages", () => {
    const source = ts.createSourceFile(
      "languages.ts",
      readFileSync(
        new URL("../../../../../shared/src/languages.ts", import.meta.url),
        "utf8",
      ),
      ts.ScriptTarget.Latest,
    );
    const displayLanguages: string[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(source) === "ZodSupportedDisplayLanguageCodes" &&
        node.initializer &&
        ts.isCallExpression(node.initializer)
      ) {
        for (const argument of node.initializer.arguments) {
          if (!ts.isArrayLiteralExpression(argument)) continue;
          for (const element of argument.elements) {
            if (ts.isStringLiteral(element)) {
              displayLanguages.push(element.text.toLowerCase());
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
    expect(displayLanguages.length).toBeGreaterThan(0);
    expect([...locales].sort()).toEqual(displayLanguages.sort());
  });

  it.each(locales)("has complete messages and posts for %s", (locale) => {
    const translatedMessages = messages.get(`/messages/${locale}.json`);
    expect(translatedMessages).toBeDefined();
    expect(Object.keys(translatedMessages ?? {}).sort()).toEqual(
      Object.keys(englishMessages).sort(),
    );

    for (const [key, value] of Object.entries(translatedMessages ?? {})) {
      expect(value.trim(), key).not.toBe("");
      expect(value.match(/\{[^}]+\}/g) ?? [], key).toEqual(
        englishMessages[key].match(/\{[^}]+\}/g) ?? [],
      );
    }

    for (const englishPath of englishPostPaths) {
      const translatedPath = englishPath.replace("/en/", `/${locale}/`);
      expect(posts[translatedPath], translatedPath).toBeDefined();
    }
  });

  it.each(locales)(
    "includes the comparison and case study in the %s FAQ",
    (locale) => {
      const items = getFaqContent(locale).groups.flatMap(
        (group) => group.items,
      );
      expect(items.some((item) => item.comparison)).toBe(true);
      expect(
        items.some((item) =>
          item.answer.includes("/resources/ai-charter-workshop"),
        ),
      ).toBe(true);
      expect(
        items.some((item) => item.answer.includes("/conversation/nRAynpw")),
      ).toBe(true);
    },
  );

  it.each(translatedLocales)(
    "keeps resource categories and dates consistent in %s",
    (locale) => {
      const translatedPosts = new Map(
        getResourcePosts({ locale }).map(({ slug, type, date }) => [
          slug,
          { type, date },
        ]),
      );
      for (const { slug, type, date } of getResourcePosts({
        locale: baseLocale,
      })) {
        expect(translatedPosts.get(slug), slug).toEqual({ type, date });
      }
    },
  );

  it.each(translatedLocales)(
    "does not leave English paragraphs in %s posts",
    (locale) => {
      for (const englishPath of englishPostPaths) {
        const english = posts[englishPath] ?? "";
        const translatedPath = englishPath.replace("/en/", `/${locale}/`);
        const translated = posts[translatedPath] ?? "";
        const paragraphs = english
          .split(/\n\s*\n/)
          .filter(
            (paragraph) =>
              paragraph.length > 80 &&
              !paragraph.startsWith("---") &&
              !paragraph.startsWith("<") &&
              !paragraph.startsWith("!["),
          );
        const untranslated = paragraphs.filter((paragraph) =>
          translated.includes(paragraph),
        );
        expect(untranslated, translatedPath).toEqual([]);
      }
    },
  );
});
