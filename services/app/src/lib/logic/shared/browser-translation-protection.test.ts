import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("browser translation protection", () => {
  const htmlTemplate = readFileSync(
    new URL("../../../app.html", import.meta.url),
    "utf8",
  );

  it("opts the whole application out of browser page translation", () => {
    expect(htmlTemplate).toMatch(/<html[^>]*class="[^"]*notranslate[^"]*"/);
    expect(htmlTemplate).toMatch(/<html[^>]*translate="no"/);
    expect(htmlTemplate).toContain(
      '<meta name="google" content="notranslate" />',
    );
  });
});
