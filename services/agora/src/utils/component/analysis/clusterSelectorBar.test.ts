import { describe, expect, it } from "vitest";

import {
  computeClusterSelectorContentFloorScroll,
  computeClusterSelectorRestoreTarget,
  computeClusterSelectorStickyTopOffset,
  computeIsClusterSelectorSticky,
  computeIsSecondaryContentMerged,
} from "./clusterSelectorBar";

describe("clusterSelectorBar", () => {
  it("attaches below the action bar while the action bar is stuck below the header", () => {
    expect(
      computeClusterSelectorStickyTopOffset({
        actionBarViewportTop: 20,
        actionBarHeight: 48,
        containerViewportTop: 0,
        headerHeight: 56,
      })
    ).toBe(68);
  });

  it("does not let the action bar offset move above the scroll container", () => {
    expect(
      computeClusterSelectorStickyTopOffset({
        actionBarViewportTop: -30,
        actionBarHeight: 48,
        containerViewportTop: 0,
        headerHeight: 56,
      })
    ).toBe(48);
  });

  it("caps the action bar offset at the header height", () => {
    expect(
      computeClusterSelectorStickyTopOffset({
        actionBarViewportTop: 90,
        actionBarHeight: 48,
        containerViewportTop: 0,
        headerHeight: 56,
      })
    ).toBe(104);
  });

  it("detects when the selector should become sticky", () => {
    expect(
      computeIsClusterSelectorSticky({
        sentinelViewportTop: 149,
        containerViewportTop: 0,
        stickyTopOffset: 148,
      })
    ).toBe(true);
  });

  it("keeps the selector unstuck before the sentinel reaches the sticky stack", () => {
    expect(
      computeIsClusterSelectorSticky({
        sentinelViewportTop: 151,
        containerViewportTop: 0,
        stickyTopOffset: 148,
      })
    ).toBe(false);
  });

  it("merges secondary content once it reaches the sticky selector", () => {
    expect(
      computeIsSecondaryContentMerged({
        secondaryContentViewportTop: 181,
        containerViewportTop: 0,
        stickyTopOffset: 148,
        selectorHeight: 32,
      })
    ).toBe(true);
  });

  it("subtracts the full sticky stack from content floor scroll", () => {
    expect(
      computeClusterSelectorContentFloorScroll({
        elementScrollPosition: 500,
        stickyTopOffset: 148,
        selectorHeight: 32,
      })
    ).toBe(320);
  });

  it("does not return a negative content floor scroll", () => {
    expect(
      computeClusterSelectorContentFloorScroll({
        elementScrollPosition: 40,
        stickyTopOffset: 48,
        selectorHeight: 32,
      })
    ).toBe(0);
  });

  it("restores saved scroll without going above the content floor", () => {
    expect(
      computeClusterSelectorRestoreTarget({
        savedScroll: 250,
        floorScroll: 320,
      })
    ).toBe(320);

    expect(
      computeClusterSelectorRestoreTarget({
        savedScroll: 500,
        floorScroll: 320,
      })
    ).toBe(500);
  });

  it("uses the content floor when no saved scroll exists", () => {
    expect(
      computeClusterSelectorRestoreTarget({
        savedScroll: undefined,
        floorScroll: 320,
      })
    ).toBe(320);
  });
});
