import { describe, expect, it } from "vitest";

import { formatResourceDate, parseResourceDate } from "./resource-date";

describe("parseResourceDate", () => {
  it("parses an ISO date at midnight UTC", () => {
    expect(parseResourceDate("2024-09-01").toISOString()).toBe(
      "2024-09-01T00:00:00.000Z",
    );
  });

  it.each(["September 2024", "2024-9-1", "2024-02-30", 20240901])(
    "rejects invalid resource date %s",
    (value) => {
      expect(() => parseResourceDate(value)).toThrow();
    },
  );
});

describe("formatResourceDate", () => {
  const date = parseResourceDate("2024-09-01");

  it.each([
    ["en", "September 1, 2024"],
    ["fr", "1 septembre 2024"],
    ["ja", "2024年9月1日"],
  ])("formats the date for the %s locale", (locale, expected) => {
    expect(formatResourceDate({ date, locale })).toBe(expected);
  });
});
