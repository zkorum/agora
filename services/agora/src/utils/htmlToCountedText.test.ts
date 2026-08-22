import { htmlToCountedText } from "src/shared/richText";
import { describe, expect, it } from "vitest";

describe("htmlToCountedText", () => {
  it("matches the canonical server list and paragraph formatting", () => {
    expect(
      htmlToCountedText(
        "<p>Tasks:</p><ol><li>Register</li><li>Vote<ul><li>Early</li></ul></li></ol>"
      )
    ).toBe("Tasks:\n\n1. Register\n2. Vote\n    - Early");
  });

  it("does not include executable or hidden HTML nodes", () => {
    expect(
      htmlToCountedText(
        '<script>alert("x")</script><style>.hidden{display:none}</style><p>Visible &amp; safe</p>'
      )
    ).toBe("Visible & safe");
  });

  it("normalizes non-breaking spaces without wrapping Unicode text", () => {
    expect(htmlToCountedText("<p>مرحبا&nbsp;بكم 👨‍👩‍👧‍👦</p>")).toBe("مرحبا بكم 👨‍👩‍👧‍👦");
  });
});
