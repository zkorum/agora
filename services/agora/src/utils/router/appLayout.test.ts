import { describe, expect, it } from "vitest";

import { shouldUseDrawerLayout } from "./appLayout";

describe("shouldUseDrawerLayout", () => {
  it("does not render the persistent layout before the route resolves", () => {
    expect(shouldUseDrawerLayout(undefined)).toBe(false);
    expect(shouldUseDrawerLayout(null)).toBe(false);
  });

  it("keeps project routes outside the persistent layout", () => {
    expect(shouldUseDrawerLayout("/project/[projectSlug]")).toBe(false);
    expect(
      shouldUseDrawerLayout("/project/[projectSlug]/conversation/[postSlugId]/")
    ).toBe(false);
  });

  it("keeps standalone application flows outside the persistent layout", () => {
    expect(shouldUseDrawerLayout("/conversation/[postSlugId].embed")).toBe(
      false
    );
    expect(shouldUseDrawerLayout("/conversation/[postSlugId].onboarding")).toBe(
      false
    );
    expect(shouldUseDrawerLayout("/onboarding/step1-login/")).toBe(false);
    expect(shouldUseDrawerLayout("/verify/email/")).toBe(false);
    expect(shouldUseDrawerLayout("/welcome/")).toBe(false);
    expect(shouldUseDrawerLayout("/[...all]")).toBe(false);
  });

  it("uses the persistent layout for regular application routes", () => {
    expect(shouldUseDrawerLayout("/")).toBe(true);
  });
});
