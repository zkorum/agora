import { describe, expect, it } from "vitest";

import { getAuthenticationStartKeyAction } from "./authKeyAction";

describe("getAuthenticationStartKeyAction", () => {
  it("overwrites a retired registered DID", () => {
    expect(
      getAuthenticationStartKeyAction({
        isKnown: true,
        isRegistered: true,
        isLoggedIn: false,
      })
    ).toBe("overwrite");
  });

  it.each([
    { isKnown: false, isRegistered: false, isLoggedIn: false },
    { isKnown: true, isRegistered: false, isLoggedIn: false },
    { isKnown: true, isRegistered: true, isLoggedIn: true },
  ])("keeps the current DID for $isKnown/$isRegistered/$isLoggedIn", (state) => {
    expect(getAuthenticationStartKeyAction(state)).toBe("create");
  });
});
