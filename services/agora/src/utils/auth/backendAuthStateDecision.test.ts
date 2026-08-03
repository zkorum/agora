import { describe, expect, it } from "vitest";

import { getBackendAuthStatusAction } from "./backendAuthStateDecision";

const credentials = { email: null, phone: null, rarimo: null };

describe("getBackendAuthStatusAction", () => {
  it("resets unknown and logged-out registered DIDs", () => {
    expect(
      getBackendAuthStatusAction({
        isKnown: false,
        isLoggedIn: false,
        isRegistered: false,
        credentials,
      })
    ).toBe("reset-did");
    expect(
      getBackendAuthStatusAction({
        isKnown: true,
        isLoggedIn: false,
        isRegistered: true,
        userId: "user-a",
        credentials,
      })
    ).toBe("reset-did");
  });

  it("keeps active registered DIDs and guest DIDs", () => {
    expect(
      getBackendAuthStatusAction({
        isKnown: true,
        isLoggedIn: true,
        isRegistered: true,
        userId: "user-a",
        credentials,
      })
    ).toBe("apply-status");
    expect(
      getBackendAuthStatusAction({
        isKnown: true,
        isLoggedIn: false,
        isRegistered: false,
        userId: "guest-a",
        credentials,
      })
    ).toBe("apply-status");
  });
});
