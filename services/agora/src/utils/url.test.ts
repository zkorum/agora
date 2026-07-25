import { describe, expect, it } from "vitest";

import { isHttpsUrl, isOptionalHttpsUrl } from "./url";

describe("HTTPS URL validation", () => {
  it.each([
    ["https://example.com", true],
    [" https://example.com/path ", true],
    ["http://example.com", false],
    ["https://user@example.com", false],
    ["example.com", false],
    ["", false],
  ])("validates %s", (value, expected) => {
    expect(isHttpsUrl(value)).toBe(expected);
  });

  it("allows an empty optional value", () => {
    expect(isOptionalHttpsUrl("  ")).toBe(true);
  });
});
