import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getElementScrollTop,
  getHeaderHeight,
  getScrollTop,
  getViewportHeight,
  scrollTo,
} from "./scroll";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("getHeaderHeight", () => {
  it("returns clientHeight of .q-header element", () => {
    const header = document.createElement("div");
    header.className = "q-header";
    Object.defineProperty(header, "clientHeight", { value: 56 });
    document.body.appendChild(header);

    expect(getHeaderHeight()).toBe(56);
  });

  it("returns 0 when .q-header is absent", () => {
    expect(getHeaderHeight()).toBe(0);
  });
});

describe("getElementScrollTop", () => {
  it("uses window.scrollY for window scroll", () => {
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 200, width: 0, height: 0 })
    );
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });

    expect(getElementScrollTop({ element })).toBe(300);
  });

  it("uses container offset for container scroll", () => {
    const container = document.createElement("div");
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 50, width: 0, height: 0 })
    );
    Object.defineProperty(container, "scrollTop", { value: 400 });

    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 150, width: 0, height: 0 })
    );

    expect(
      getElementScrollTop({ element, scrollContainer: container })
    ).toBe(500); // (150 - 50) + 400
  });
});

describe("scrollTo", () => {
  it("calls window.scrollTo without container", () => {
    const spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    scrollTo({ top: 500 });
    expect(spy).toHaveBeenCalledWith({ top: 500, behavior: undefined });
  });

  it("calls container.scrollTo with container", () => {
    const container = document.createElement("div");
    const scrollToSpy = vi.fn();
    container.scrollTo = scrollToSpy;
    scrollTo({ top: 300, behavior: "smooth", scrollContainer: container });
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 300,
      behavior: "smooth",
    });
  });
});

describe("getScrollTop", () => {
  it("returns window.scrollY without container", () => {
    Object.defineProperty(window, "scrollY", { value: 250, writable: true });
    expect(getScrollTop({})).toBe(250);
  });

  it("returns container.scrollTop with container", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollTop", { value: 600 });
    expect(getScrollTop({ scrollContainer: container })).toBe(600);
  });
});

describe("getViewportHeight", () => {
  it("returns window.innerHeight without container", () => {
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      writable: true,
    });
    expect(getViewportHeight({})).toBe(900);
  });

  it("returns container.clientHeight with container", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 700 });
    expect(getViewportHeight({ scrollContainer: container })).toBe(700);
  });
});
