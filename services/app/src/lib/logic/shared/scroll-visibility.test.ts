import { describe, expect, it } from "vitest";

import { createScrollVisibility } from "./scroll-visibility.svelte";

describe("createScrollVisibility", () => {
  it("starts not hidden", () => {
    const sv = createScrollVisibility();
    expect(sv.hidden).toBe(false);
  });

  it("stays visible when scroll position is below threshold", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(30);
    expect(sv.hidden).toBe(false);
  });

  it("hides at exactly the threshold when scrolling down from 0", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(50);
    expect(sv.hidden).toBe(true);
  });

  it("hides when scrolling down past threshold", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(60);
    sv.update(120);
    expect(sv.hidden).toBe(true);
  });

  it("shows when scrolling up", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(60);
    sv.update(120);
    expect(sv.hidden).toBe(true);

    sv.update(80);
    expect(sv.hidden).toBe(false);
  });

  it("returns to visible when scrolling back near top", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(60);
    sv.update(200);
    expect(sv.hidden).toBe(true);

    sv.update(30);
    expect(sv.hidden).toBe(false);
  });

  it("handles large scroll jumps", () => {
    const sv = createScrollVisibility({ threshold: 50 });
    sv.update(1000);
    sv.update(5000);
    expect(sv.hidden).toBe(true);

    sv.update(100);
    expect(sv.hidden).toBe(false);
  });

  it("uses default threshold of 50", () => {
    const sv = createScrollVisibility();
    sv.update(40);
    sv.update(49);
    expect(sv.hidden).toBe(false);
  });
});
