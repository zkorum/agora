import { describe, expect, it } from "vitest";

import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it("returns default greeting when count is 0", () => {
    expect(getGreeting({ count: 0 })).toBe("Hello, world!");
  });

  it("returns singular message when count is 1", () => {
    expect(getGreeting({ count: 1 })).toBe("Hello! You've clicked 1 time.");
  });

  it("returns plural message when count is greater than 1", () => {
    expect(getGreeting({ count: 5 })).toBe("Hello! You've clicked 5 times.");
  });
});
