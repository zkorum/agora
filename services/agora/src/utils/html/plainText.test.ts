import { describe, expect, it } from "vitest";

import { plainTextToSafeHtml } from "./plainText";

describe("plainTextToSafeHtml", () => {
  it("escapes HTML control characters before rendering as HTML", () => {
    expect(
      plainTextToSafeHtml({ plainText: "<script>alert('xss')</script>" })
    ).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
  });

  it("escapes ampersands before angle brackets", () => {
    expect(plainTextToSafeHtml({ plainText: "Tom & <Jerry>" })).toBe(
      "Tom &amp; &lt;Jerry&gt;"
    );
  });

  it("preserves all supported newline forms as line breaks", () => {
    expect(plainTextToSafeHtml({ plainText: "one\ntwo\rthree\r\nfour" })).toBe(
      "one<br>two<br>three<br>four"
    );
  });

  it("leaves quotes as text content", () => {
    expect(plainTextToSafeHtml({ plainText: `"quoted" and 'single'` })).toBe(
      `"quoted" and 'single'`
    );
  });
});
