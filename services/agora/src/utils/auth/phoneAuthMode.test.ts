import { describe, expect, it } from "vitest";

import {
  getEffectivePhoneAuthMode,
  getPhoneAuthAvailability,
  pausePhoneRegistration,
  usePhoneAuthAvailability,
} from "./phoneAuthMode";

describe("getEffectivePhoneAuthMode", () => {
  it.each([
    ["enabled", "enabled", "enabled"],
    ["enabled", "login_only", "login_only"],
    ["login_only", "enabled", "login_only"],
    ["login_only", "disabled", "disabled"],
    ["disabled", "enabled", "disabled"],
  ] as const)(
    "combines %s configuration with %s backend mode",
    (configuredMode, backendMode, expectedMode) => {
      expect(getEffectivePhoneAuthMode({ configuredMode, backendMode })).toBe(
        expectedMode
      );
    }
  );
});

describe("getPhoneAuthAvailability", () => {
  it.each([
    ["enabled", "login", true],
    ["enabled", "registration", true],
    ["enabled", "credential", true],
    ["login_only", "login", true],
    ["login_only", "registration", false],
    ["login_only", "credential", false],
    ["disabled", "login", false],
    ["disabled", "registration", false],
    ["disabled", "credential", false],
  ] as const)("returns %s/%s availability", (mode, purpose, available) => {
    expect(getPhoneAuthAvailability({ mode, purpose }).available).toBe(
      available
    );
  });

  it("distinguishes technical shutdown from registration restrictions", () => {
    expect(
      getPhoneAuthAvailability({ mode: "disabled", purpose: "login" })
    ).toEqual({ available: false, reason: "technical_unavailable" });
    expect(
      getPhoneAuthAvailability({
        mode: "login_only",
        purpose: "registration",
      })
    ).toEqual({ available: false, reason: "registration_unavailable" });
  });
});

it("keeps phone login available after registration is paused at runtime", () => {
  const login = usePhoneAuthAvailability("login");
  const registration = usePhoneAuthAvailability("registration");
  pausePhoneRegistration();

  expect(login.value).toEqual({ available: true });
  expect(registration.value).toEqual({
    available: false,
    reason: "registration_unavailable",
  });
});
