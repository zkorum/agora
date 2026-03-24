import { describe, expect, it } from "vitest";

import { computeBannerState } from "./bannerState";

describe("computeBannerState", () => {
  it("returns 'discover' when no clustering signal is present", () => {
    expect(
      computeBannerState({
        clusteredThisMount: false,
        clusteredFromCache: false,
        clusteredInSession: false,
      })
    ).toBe("discover");
  });

  it("returns 'celebration' when first detected this mount and cache has not caught up", () => {
    expect(
      computeBannerState({
        clusteredThisMount: true,
        clusteredFromCache: false,
        clusteredInSession: false,
      })
    ).toBe("celebration");
  });

  it("returns 'celebration' when detected this mount with session but cache has not caught up", () => {
    expect(
      computeBannerState({
        clusteredThisMount: true,
        clusteredFromCache: false,
        clusteredInSession: true,
      })
    ).toBe("celebration");
  });

  it("returns 'refine' when detected this mount and cache has caught up", () => {
    expect(
      computeBannerState({
        clusteredThisMount: true,
        clusteredFromCache: true,
        clusteredInSession: false,
      })
    ).toBe("refine");
  });

  it("returns 'refine' when only cache knows user is clustered", () => {
    expect(
      computeBannerState({
        clusteredThisMount: false,
        clusteredFromCache: true,
        clusteredInSession: false,
      })
    ).toBe("refine");
  });

  it("returns 'refine' when only session knows user is clustered (the bug fix)", () => {
    expect(
      computeBannerState({
        clusteredThisMount: false,
        clusteredFromCache: false,
        clusteredInSession: true,
      })
    ).toBe("refine");
  });

  it("returns 'refine' when all signals are true", () => {
    expect(
      computeBannerState({
        clusteredThisMount: true,
        clusteredFromCache: true,
        clusteredInSession: true,
      })
    ).toBe("refine");
  });
});
