import { describe, expect, it } from "vitest";

import { locales } from "$lib/paraglide/runtime";
import { SITE_ORIGIN } from "$lib/seo";

import { getResourcePost, renderResourceMarkdown } from "./resources";

describe("renderResourceMarkdown", () => {
  it("keeps English resource links on the unprefixed base locale", async () => {
    const html = await renderResourceMarkdown({
      markdown: `[relative](/resources/example?view=full#details) [absolute](${SITE_ORIGIN}/resources/example)`,
      locale: "en",
    });

    expect(html).toContain('href="/resources/example?view=full#details"');
    expect(html).toContain(`href="${SITE_ORIGIN}/resources/example"`);
  });

  it("prefixes same-origin resource links for a non-English LTR locale", async () => {
    const html = await renderResourceMarkdown({
      markdown: `[relative](/resources/example) [absolute](${SITE_ORIGIN}/resources/example)`,
      locale: "fr",
    });

    expect(html).toContain('href="/fr/resources/example"');
    expect(html).toContain(`href="${SITE_ORIGIN}/fr/resources/example"`);
  });

  it("prefixes RTL resource links without changing excluded hrefs", async () => {
    const markdown = [
      `[resource](/resources/example)`,
      `[localized](/fr/resources/example)`,
      `[external](https://example.com/resources/example)`,
      `[anchor](#details)`,
      `[email](mailto:hello@zkorum.com)`,
      `[other](/about)`,
    ].join(" ");

    const html = await renderResourceMarkdown({ markdown, locale: "ar" });

    expect(html).toContain('href="/ar/resources/example"');
    expect(html).toContain('href="/fr/resources/example"');
    expect(html).toContain('href="https://example.com/resources/example"');
    expect(html).toContain('href="#details"');
    expect(html).toContain('href="mailto:hello@zkorum.com"');
    expect(html).toContain('href="/about"');
  });
});

describe("AI charter translations", () => {
  it.each(locales)(
    "renders all bold passages correctly in %s",
    async (locale) => {
      const post = await getResourcePost({
        slug: "ai-charter-workshop",
        locale,
      });

      expect(post).not.toBeNull();
      expect(post?.content.includes("**")).toBe(false);
      expect(post?.content.match(/<strong>/g)).toHaveLength(17);
    },
  );
});
