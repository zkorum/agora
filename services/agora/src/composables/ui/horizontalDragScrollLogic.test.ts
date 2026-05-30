import { describe, expect, it } from "vitest";

import {
  clampHorizontalScrollLeft,
  getHorizontalDragScrollLeft,
  getHorizontalScrollMax,
  hasHorizontalDragExceededThreshold,
} from "./horizontalDragScrollLogic";

describe("horizontalDragScrollLogic", () => {
  it("returns zero max scroll when content fits", () => {
    expect(getHorizontalScrollMax({ scrollWidth: 300, clientWidth: 400 })).toBe(
      0
    );
  });

  it("returns overflow width as max scroll", () => {
    expect(getHorizontalScrollMax({ scrollWidth: 900, clientWidth: 400 })).toBe(
      500
    );
  });

  it("clamps scroll values to the available range", () => {
    expect(
      clampHorizontalScrollLeft({ scrollLeft: -20, maxScrollLeft: 200 })
    ).toBe(0);
    expect(
      clampHorizontalScrollLeft({ scrollLeft: 80, maxScrollLeft: 200 })
    ).toBe(80);
    expect(
      clampHorizontalScrollLeft({ scrollLeft: 240, maxScrollLeft: 200 })
    ).toBe(200);
  });

  it("keeps clicks below the drag threshold", () => {
    expect(
      hasHorizontalDragExceededThreshold({
        startClientX: 100,
        currentClientX: 103,
        thresholdPx: 4,
      })
    ).toBe(false);
  });

  it("starts dragging once movement reaches the threshold", () => {
    expect(
      hasHorizontalDragExceededThreshold({
        startClientX: 100,
        currentClientX: 96,
        thresholdPx: 4,
      })
    ).toBe(true);
  });

  it("moves scroll opposite to pointer drag and clamps at the left edge", () => {
    expect(
      getHorizontalDragScrollLeft({
        startClientX: 100,
        currentClientX: 150,
        startScrollLeft: 30,
        maxScrollLeft: 200,
      })
    ).toBe(0);
  });

  it("moves scroll opposite to pointer drag and clamps at the right edge", () => {
    expect(
      getHorizontalDragScrollLeft({
        startClientX: 100,
        currentClientX: 0,
        startScrollLeft: 150,
        maxScrollLeft: 200,
      })
    ).toBe(200);
  });
});
