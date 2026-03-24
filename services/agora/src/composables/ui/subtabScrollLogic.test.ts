import { describe, expect, it } from "vitest";

import { createSubtabScrollState } from "./subtabScrollLogic";

type TestTab = "Summary" | "Agreements" | "Disagreements" | "Divisive";

describe("createSubtabScrollState", () => {
  it("returns action-bar for first visit to a non-default tab", () => {
    const state = createSubtabScrollState<TestTab>();
    const target = state.getRestorationTarget({
      tab: "Agreements",
      defaultTab: "Summary",
      isExplicitNavigation: false,
    });
    expect(target).toBe("action-bar");
  });

  it("returns action-bar for the default tab (Summary)", () => {
    const state = createSubtabScrollState<TestTab>();
    state.savePosition({ tab: "Summary", currentScroll: 300 });
    const target = state.getRestorationTarget({
      tab: "Summary",
      defaultTab: "Summary",
      isExplicitNavigation: false,
    });
    expect(target).toBe("action-bar");
  });

  it("returns action-bar for explicit navigation even with saved position", () => {
    const state = createSubtabScrollState<TestTab>();
    state.savePosition({ tab: "Agreements", currentScroll: 500 });
    const target = state.getRestorationTarget({
      tab: "Agreements",
      defaultTab: "Summary",
      isExplicitNavigation: true,
    });
    expect(target).toBe("action-bar");
  });

  it("restores saved position on round-trip", () => {
    const state = createSubtabScrollState<TestTab>();

    // Visit Agreements, scroll to 500
    state.savePosition({ tab: "Agreements", currentScroll: 500 });

    // Switch to Disagreements (first visit)
    expect(
      state.getRestorationTarget({
        tab: "Disagreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe("action-bar");

    // Switch back to Agreements
    expect(
      state.getRestorationTarget({
        tab: "Agreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe(500);
  });

  it("overwrites saved position on re-save", () => {
    const state = createSubtabScrollState<TestTab>();

    state.savePosition({ tab: "Agreements", currentScroll: 500 });
    state.savePosition({ tab: "Agreements", currentScroll: 800 });

    const target = state.getRestorationTarget({
      tab: "Agreements",
      defaultTab: "Summary",
      isExplicitNavigation: false,
    });
    expect(target).toBe(800);
  });

  it("clearAll resets all saved positions", () => {
    const state = createSubtabScrollState<TestTab>();

    state.savePosition({ tab: "Agreements", currentScroll: 500 });
    state.savePosition({ tab: "Disagreements", currentScroll: 300 });
    state.clearAll();

    expect(
      state.getRestorationTarget({
        tab: "Agreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe("action-bar");
    expect(
      state.getRestorationTarget({
        tab: "Disagreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe("action-bar");
  });

  it("tracks positions independently per tab", () => {
    const state = createSubtabScrollState<TestTab>();

    state.savePosition({ tab: "Agreements", currentScroll: 100 });
    state.savePosition({ tab: "Disagreements", currentScroll: 200 });
    state.savePosition({ tab: "Divisive", currentScroll: 300 });

    expect(
      state.getRestorationTarget({
        tab: "Agreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe(100);
    expect(
      state.getRestorationTarget({
        tab: "Disagreements",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe(200);
    expect(
      state.getRestorationTarget({
        tab: "Divisive",
        defaultTab: "Summary",
        isExplicitNavigation: false,
      }),
    ).toBe(300);
  });

  it("saves position 0 and restores it", () => {
    const state = createSubtabScrollState<TestTab>();

    state.savePosition({ tab: "Agreements", currentScroll: 0 });

    const target = state.getRestorationTarget({
      tab: "Agreements",
      defaultTab: "Summary",
      isExplicitNavigation: false,
    });
    expect(target).toBe(0);
  });
});
