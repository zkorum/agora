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

  describe("full round-trip scenarios", () => {
    // Simulate the exact save/restore cycle as useTabScrollRestoration:
    // 1. onBeforeRouteUpdate: save departing tab's scroll
    // 2. watcher: getRestorationTarget for arriving tab (with constant floorScroll)
    //
    // floorScroll is CONSTANT — computed once from the action bar's flow
    // position, cached, and reused for all tab switches.
    const FLOOR = 398;
    const VP = 800;

    /** Simulates: save FROM tab's scroll, then get TO tab's restoration target */
    function switchTab(
      state: ReturnType<typeof createState>,
      { from, fromScroll, to }: { from: string; fromScroll: number; to: string },
    ): number {
      state.savePosition({ routeName: from, currentScroll: fromScroll, viewportHeight: VP });
      return state.getRestorationTarget({ routeName: to, floorScroll: FLOOR });
    }

    it("first visit: comment at 0 → analysis → back to comment", () => {
      const state = createState();
      const a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 0, to: ANALYSIS_ROUTE });
      expect(a).toBe(FLOOR); // first visit → floor

      const c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c).toBe(FLOOR); // comment was at 0, clamped to floor
    });

    it("comment high → analysis (first visit) → comment restores high", () => {
      const state = createState();
      const a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 1500, to: ANALYSIS_ROUTE });
      expect(a).toBe(FLOOR); // first analysis visit

      const c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c).toBe(1500); // comment restores high
    });

    it("analysis high → comment low → analysis restores high", () => {
      const state = createState();
      // First visit to set up both tabs
      switchTab(state, { from: COMMENT_ROUTE, fromScroll: FLOOR, to: ANALYSIS_ROUTE });
      // User scrolls analysis to 1200, then goes back
      const c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: 1200, to: COMMENT_ROUTE });
      expect(c).toBe(FLOOR);

      // Go back to analysis — should restore 1200
      const a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: FLOOR, to: ANALYSIS_ROUTE });
      expect(a).toBe(1200);
    });

    it("both tabs high → positions preserved independently", () => {
      const state = createState();
      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: 1500, viewportHeight: VP });
      state.savePosition({ routeName: ANALYSIS_ROUTE, currentScroll: 900, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: COMMENT_ROUTE, floorScroll: FLOOR })).toBe(1500);
      expect(state.getRestorationTarget({ routeName: ANALYSIS_ROUTE, floorScroll: FLOOR })).toBe(900);
    });

    it("scroll higher on return: comment low → analysis → comment → scroll UP → analysis → comment restores UP position", () => {
      const state = createState();
      // Comment at 1000, go to analysis
      const a1 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 1000, to: ANALYSIS_ROUTE });
      expect(a1).toBe(FLOOR);

      // Back to comment — restores 1000
      const c1 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c1).toBe(1000);

      // User scrolls comment UP to 500 (lower than before)
      // Go to analysis
      const a2 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 500, to: ANALYSIS_ROUTE });
      expect(a2).toBe(FLOOR);

      // Back to comment — should be at 500 (the NEW position), not 1000
      const c2 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c2).toBe(500);
    });

    it("scroll much higher: comment at 2000 → analysis → comment → scroll to 600 → analysis → comment at 600", () => {
      const state = createState();
      const a1 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 2000, to: ANALYSIS_ROUTE });
      expect(a1).toBe(FLOOR);

      const c1 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c1).toBe(2000);

      // User scrolls way up to 600
      const a2 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 600, to: ANALYSIS_ROUTE });
      expect(a2).toBe(FLOOR);

      const c2 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c2).toBe(600); // updated, not 2000
    });

    it("scroll much lower: comment at floor → analysis → comment → scroll to 3000 → analysis → comment at 3000", () => {
      const state = createState();
      const a1 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: FLOOR, to: ANALYSIS_ROUTE });
      expect(a1).toBe(FLOOR);

      const c1 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c1).toBe(FLOOR);

      // User scrolls way down to 3000
      const a2 = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 3000, to: ANALYSIS_ROUTE });
      expect(a2).toBe(FLOOR);

      const c2 = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c2).toBe(3000); // updated to new deep position
    });

    it("many round-trips with changing positions", () => {
      const state = createState();

      // Round 1: both start at 0/floor
      let a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 0, to: ANALYSIS_ROUTE });
      expect(a).toBe(FLOOR);
      let c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: FLOOR, to: COMMENT_ROUTE });
      expect(c).toBe(FLOOR); // clamped from 0

      // Round 2: comment scrolled to 600, analysis scrolled to 800
      a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 600, to: ANALYSIS_ROUTE });
      expect(a).toBe(FLOOR); // analysis was at floor
      a = 800; // user scrolls analysis to 800
      c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: 800, to: COMMENT_ROUTE });
      expect(c).toBe(600);

      // Round 3: comment moved to 1500, analysis should still be 800
      a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 1500, to: ANALYSIS_ROUTE });
      expect(a).toBe(800);

      // Round 4: analysis moved to 1200, comment should still be 1500
      c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: 1200, to: COMMENT_ROUTE });
      expect(c).toBe(1500);

      // Round 5: comment moved DOWN to 400 (below floor), analysis should be 1200
      a = switchTab(state, { from: COMMENT_ROUTE, fromScroll: 400, to: ANALYSIS_ROUTE });
      expect(a).toBe(1200);

      // Round 6: back to comment — 400 > FLOOR so returns 400
      c = switchTab(state, { from: ANALYSIS_ROUTE, fromScroll: 1200, to: COMMENT_ROUTE });
      expect(c).toBe(400);
    });

    it("floor boundary: saved at exactly/above/below floor", () => {
      const state = createState();

      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: FLOOR, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: COMMENT_ROUTE, floorScroll: FLOOR })).toBe(FLOOR);

      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: FLOOR + 1, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: COMMENT_ROUTE, floorScroll: FLOOR })).toBe(FLOOR + 1);

      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: FLOOR - 1, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: COMMENT_ROUTE, floorScroll: FLOOR })).toBe(FLOOR);
    });

    it("floorScroll is constant across all calls (simulates cached value)", () => {
      const state = createState();
      // Even when the user scrolls to different positions, floorScroll stays constant
      // (this is what caching in useTabScrollRestoration ensures)
      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: 0, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: ANALYSIS_ROUTE, floorScroll: FLOOR })).toBe(FLOOR);

      state.savePosition({ routeName: ANALYSIS_ROUTE, currentScroll: 2000, viewportHeight: VP });
      expect(state.getRestorationTarget({ routeName: COMMENT_ROUTE, floorScroll: FLOOR })).toBe(FLOOR);

      state.savePosition({ routeName: COMMENT_ROUTE, currentScroll: 5000, viewportHeight: VP });
      // floorScroll is STILL FLOOR, not some sticky-contaminated value
      expect(state.getRestorationTarget({ routeName: ANALYSIS_ROUTE, floorScroll: FLOOR })).toBe(2000);
    });
  });
});

describe("computeFloorScroll", () => {
  it("returns elementTop minus headerHeight", () => {
    expect(computeFloorScroll({ elementTop: 500, headerHeight: 60 })).toBe(
      440
    );
  });

  it("clamps to zero when sentinel is above header", () => {
    expect(computeFloorScroll({ elementTop: 30, headerHeight: 60 })).toBe(0);
  });

  it("returns zero when elementTop equals headerHeight", () => {
    expect(computeFloorScroll({ elementTop: 60, headerHeight: 60 })).toBe(0);
  });
});
