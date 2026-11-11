import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
  shallowRef,
} from "vue";

import { useStickyObserver } from "./useStickyObserver";

const apps: App[] = [];
const frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  let frameId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
});

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  frames.clear();
});

function flushFrames(): void {
  const callbacks = [...frames.values()];
  frames.clear();
  for (const callback of callbacks) callback(0);
}

function mountObserver({ keepAlive = false }: { keepAlive?: boolean } = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const state = shallowRef<ReturnType<typeof useStickyObserver>>();
  const shown = ref(true);
  const component = defineComponent({
    setup() {
      const observer = useStickyObserver();
      state.value = observer;
      return () => h("div", { ref: observer.sentinelElement });
    },
  });
  const app = createApp({
    render: () =>
      keepAlive
        ? h(KeepAlive, () => (shown.value ? h(component) : undefined))
        : h(component),
  });
  apps.push(app);
  app.mount(container);
  const sentinel = state.value?.sentinelElement.value;
  if (state.value === undefined || sentinel === null || sentinel === undefined)
    throw new Error("Missing observer state");
  const bounds = vi.spyOn(sentinel, "getBoundingClientRect");
  bounds.mockReturnValue(new DOMRect(0, 100, 1, 0));
  return { state: state.value, sentinel, bounds, app, shown };
}

describe("sticky observer browser compatibility", () => {
  it("uses the native observer without fallback scroll listeners", async () => {
    let notify: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const observer: IntersectionObserver = {
      root: null,
      rootMargin: "0px",
      thresholds: [0],
      observe,
      unobserve: vi.fn(),
      disconnect,
      takeRecords: () => [],
    };
    const createObserver = vi.fn(function (
      callback: IntersectionObserverCallback
    ) {
      notify = callback;
      return observer;
    });
    vi.stubGlobal("IntersectionObserver", createObserver);
    const { state, sentinel, bounds } = mountObserver();
    await nextTick();
    await nextTick();
    expect(observe).toHaveBeenCalledWith(sentinel);
    notify?.([], observer);
    notify?.(
      [
        {
          target: sentinel,
          time: 0,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: new DOMRect(0, -20, 1, 0),
          intersectionRect: new DOMRect(),
          rootBounds: null,
        },
      ],
      observer
    );
    expect(state.isSticky.value).toBe(true);
    bounds.mockClear();
    window.dispatchEvent(new Event("scroll"));
    expect(bounds).not.toHaveBeenCalled();
    state.sentinelElement.value = null;
    await nextTick();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(state.isSticky.value).toBe(false);
  });

  it("tracks sticky state without IntersectionObserver and cleans up on unmount", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const header = document.createElement("header");
    header.className = "q-header";
    document.body.append(header);
    vi.spyOn(header, "clientHeight", "get").mockReturnValue(48);
    const { state, sentinel, bounds, app } = mountObserver();
    await nextTick();
    await nextTick();
    expect(state.headerHeight.value).toBe(48);
    expect(state.isSticky.value).toBe(false);

    bounds.mockReturnValue(new DOMRect(0, 20, 1, 0));
    sentinel.dispatchEvent(new Event("scroll"));
    flushFrames();
    expect(state.isSticky.value).toBe(true);

    bounds.mockReturnValue(new DOMRect(0, 60, 1, 0));
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(state.isSticky.value).toBe(false);

    app.unmount();
    apps.splice(apps.indexOf(app), 1);
    bounds.mockClear();
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(bounds).not.toHaveBeenCalled();
  });

  it("clears sticky state when the sentinel disappears", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { state, bounds } = mountObserver();
    bounds.mockReturnValue(new DOMRect(0, -20, 1, 0));
    await nextTick();
    await nextTick();
    expect(state.isSticky.value).toBe(true);
    state.sentinelElement.value = null;
    await nextTick();
    expect(state.isSticky.value).toBe(false);
    bounds.mockClear();
    window.dispatchEvent(new Event("scroll"));
    flushFrames();
    expect(bounds).not.toHaveBeenCalled();
  });

  it("coalesces fallback scroll measurements and cancels pending work on unmount", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { bounds, app } = mountObserver();
    await nextTick();
    bounds.mockClear();
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("scroll"));
    expect(bounds).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    flushFrames();
    expect(bounds).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("scroll"));
    app.unmount();
    apps.splice(apps.indexOf(app), 1);
    expect(frames.size).toBe(0);
  });

  it("pauses fallback work while kept alive and refreshes on reactivation", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { state, bounds, shown } = mountObserver({ keepAlive: true });
    await nextTick();
    expect(state.isSticky.value).toBe(false);
    window.dispatchEvent(new Event("scroll"));
    shown.value = false;
    await nextTick();
    expect(frames.size).toBe(0);
    bounds.mockReturnValue(new DOMRect(0, -20, 1, 0));
    bounds.mockClear();
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    state.refresh();
    flushFrames();
    expect(bounds).not.toHaveBeenCalled();
    expect(state.isSticky.value).toBe(false);
    shown.value = true;
    await nextTick();
    expect(bounds).toHaveBeenCalled();
    expect(state.isSticky.value).toBe(true);
  });

  it("recreates the native observer when the header height changes and after reactivation", async () => {
    const disconnect = vi.fn();
    const createObserver = vi.fn(function () {
      return { observe: vi.fn(), disconnect };
    });
    vi.stubGlobal("IntersectionObserver", createObserver);
    const header = document.createElement("header");
    header.className = "q-header";
    document.body.append(header);
    const height = vi.spyOn(header, "clientHeight", "get").mockReturnValue(48);
    const { state, shown, bounds } = mountObserver({ keepAlive: true });
    await nextTick();
    expect(createObserver).toHaveBeenLastCalledWith(expect.any(Function), {
      rootMargin: "-48px 0px 0px 0px",
    });
    height.mockReturnValue(64);
    state.refresh();
    await nextTick();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(createObserver).toHaveBeenLastCalledWith(expect.any(Function), {
      rootMargin: "-64px 0px 0px 0px",
    });
    height.mockReturnValue(80);
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    await nextTick();
    expect(createObserver).toHaveBeenLastCalledWith(expect.any(Function), {
      rootMargin: "-80px 0px 0px 0px",
    });
    shown.value = false;
    await nextTick();
    expect(disconnect).toHaveBeenCalledTimes(3);
    bounds.mockClear();
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(bounds).not.toHaveBeenCalled();
    shown.value = true;
    await nextTick();
    expect(createObserver).toHaveBeenCalledTimes(4);
  });
});
