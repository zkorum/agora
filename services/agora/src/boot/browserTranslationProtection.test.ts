import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("browser translation protection", () => {
  const htmlTemplate = readFileSync(
    resolve(process.cwd(), "index.html"),
    "utf8"
  );

  it("opts the whole application out of browser page translation", () => {
    expect(htmlTemplate).toMatch(/<html[^>]*class="[^"]*notranslate[^"]*"/);
    expect(htmlTemplate).toMatch(/<html[^>]*translate="no"/);
    expect(htmlTemplate).toContain(
      '<meta name="google" content="notranslate" />'
    );
  });
});
