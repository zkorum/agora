import { describe, expect, it } from "vitest";

import { computeFloorScroll, createTabScrollState } from "./tabScrollLogic";

const ANALYSIS_ROUTE = "/conversation/[postSlugId]/analysis";
const COMMENT_ROUTE = "/conversation/[postSlugId]/";

describe("createTabScrollState", () => {
  function createState() {
    return createTabScrollState({ analysisRouteName: ANALYSIS_ROUTE });
  }

  describe("resolveTabName", () => {
    it("returns 'analysis' when route matches analysis name", () => {
      const state = createState();
      expect(state.resolveTabName(ANALYSIS_ROUTE)).toBe("analysis");
    });

    it("returns 'comment' for any other route name", () => {
      const state = createState();
      expect(state.resolveTabName(COMMENT_ROUTE)).toBe("comment");
      expect(state.resolveTabName("some/random/route")).toBe("comment");
    });
  });

  describe("savePosition", () => {
    it("returns minHeight equal to scroll plus viewport", () => {
      const state = createState();
      const result = state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 500,
        viewportHeight: 800,
      });
      expect(result.minHeight).toBe("1300px");
    });

    it("handles zero scroll position", () => {
      const state = createState();
      const result = state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 0,
        viewportHeight: 800,
      });
      expect(result.minHeight).toBe("800px");
    });
  });

  describe("save and restore cycle", () => {
    it("restores saved scroll position for a tab", () => {
      const state = createState();
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 750,
        viewportHeight: 800,
      });
      const target = state.getRestorationTarget({
        routeName: COMMENT_ROUTE,
        floorScroll: 200,
      });
      expect(target).toBe(750);
    });

    it("returns floor when no saved position exists", () => {
      const state = createState();
      const target = state.getRestorationTarget({
        routeName: COMMENT_ROUTE,
        floorScroll: 300,
      });
      expect(target).toBe(300);
    });

    it("returns floor when saved position is below floor", () => {
      const state = createState();
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 100,
        viewportHeight: 800,
      });
      const target = state.getRestorationTarget({
        routeName: COMMENT_ROUTE,
        floorScroll: 300,
      });
      expect(target).toBe(300);
    });

    it("preserves positions for both tabs independently", () => {
      const state = createState();
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 500,
        viewportHeight: 800,
      });
      state.savePosition({
        routeName: ANALYSIS_ROUTE,
        currentScroll: 1200,
        viewportHeight: 800,
      });

      expect(
        state.getRestorationTarget({
          routeName: COMMENT_ROUTE,
          floorScroll: 0,
        })
      ).toBe(500);
      expect(
        state.getRestorationTarget({
          routeName: ANALYSIS_ROUTE,
          floorScroll: 0,
        })
      ).toBe(1200);
    });

    it("overwrites previous position on re-save", () => {
      const state = createState();
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 500,
        viewportHeight: 800,
      });
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 900,
        viewportHeight: 800,
      });
      const target = state.getRestorationTarget({
        routeName: COMMENT_ROUTE,
        floorScroll: 0,
      });
      expect(target).toBe(900);
    });
  });

  describe("getSavedPosition", () => {
    it("returns undefined when no position is saved", () => {
      const state = createState();
      expect(state.getSavedPosition("comment")).toBeUndefined();
      expect(state.getSavedPosition("analysis")).toBeUndefined();
    });

    it("returns saved position after savePosition", () => {
      const state = createState();
      state.savePosition({
        routeName: COMMENT_ROUTE,
        currentScroll: 400,
        viewportHeight: 800,
      });
      expect(state.getSavedPosition("comment")).toBe(400);
    });
  });
});

describe("computeFloorScroll", () => {
  it("returns sentinelTop minus headerHeight", () => {
    expect(computeFloorScroll({ sentinelTop: 500, headerHeight: 60 })).toBe(
      440
    );
  });

  it("clamps to zero when sentinel is above header", () => {
    expect(computeFloorScroll({ sentinelTop: 30, headerHeight: 60 })).toBe(0);
  });

  it("returns zero when sentinelTop equals headerHeight", () => {
    expect(computeFloorScroll({ sentinelTop: 60, headerHeight: 60 })).toBe(0);
  });
});
