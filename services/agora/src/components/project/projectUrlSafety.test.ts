import { describe, expect, it } from "vitest";

import { getSafeProjectHref, getSafeProjectWebHref } from "./projectUrlSafety";

describe("project URL safety", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["http://example.com", undefined],
    ["https://user@example.com", undefined],
    ["javascript:alert(1)", undefined],
  ])("filters web URL %s", (value, expected) => {
    expect(getSafeProjectWebHref(value)).toBe(expected);
  });

  it("allows mail links and internal paths for action buttons", () => {
    expect(getSafeProjectHref("mailto:hello@example.com")).toBe(
      "mailto:hello@example.com"
    );
    expect(getSafeProjectHref("/project/example")).toBe("/project/example");
  });
});
