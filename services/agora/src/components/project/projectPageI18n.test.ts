import { describe, expect, test } from "vitest";

import { translateProjectPageText } from "./projectPageI18n";

describe("translateProjectPageText", () => {
  test("pluralizes the compact project details summary", () => {
    expect(
      translateProjectPageText({
        languageCode: "en",
        key: "projectDetailsSummary",
        params: { name: "Polity Cooperative", count: 1 },
      })
    ).toBe("Polity Cooperative & 1 other");

    expect(
      translateProjectPageText({
        languageCode: "en",
        key: "projectDetailsSummary",
        params: { name: "Polity Cooperative", count: 2 },
      })
    ).toBe("Polity Cooperative & 2 others");
  });
});
