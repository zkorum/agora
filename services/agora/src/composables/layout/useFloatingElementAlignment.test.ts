import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h, nextTick, ref } from "vue";

import { useFloatingElementAlignment } from "./useFloatingElementAlignment";

const apps: App[] = [];

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
  });
});

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mountAlignment() {
  const layout = document.createElement("main");
  layout.style.paddingInlineStart = "340px";
  const anchor = document.createElement("div");
  layout.append(anchor);
  document.body.append(layout);
  const measure = vi.spyOn(anchor, "getBoundingClientRect");
  measure.mockImplementation(
    () =>
      new DOMRect(
        Number.parseFloat(layout.style.paddingInlineStart) / 2,
        0,
        543,
        64
      )
  );

  const enabled = ref(true);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      const style = useFloatingElementAlignment({
        anchor: () => anchor,
        enabled: () => enabled.value,
      });
      return () => h("div", { class: "floating", style: style.value });
    },
  });
  apps.push(app);
  app.mount(host);
  const floating = host.querySelector(".floating");
  if (!(floating instanceof HTMLElement)) throw new Error("Missing overlay");
  return { layout, enabled, measure, floating };
}

async function flushMeasurement(): Promise<void> {
  await nextTick();
  vi.advanceTimersToNextFrame();
  await nextTick();
}

describe("floating element alignment", () => {
  it("waits for measured geometry instead of displaying a guessed position", async () => {
    const { floating } = mountAlignment();
    expect(floating.style.visibility).toBe("hidden");
    await flushMeasurement();
    expect(floating.style.visibility).toBe("");
    expect(floating.style.left).toBe("170px");
    expect(floating.style.width).toBe("543px");
  });

  it("follows delayed ancestor padding changes without an anchor resize", async () => {
    const { layout, measure, floating } = mountAlignment();
    await flushMeasurement();
    measure.mockClear();

    // The resize event can precede Quasar's responsive drawer update.
    window.dispatchEvent(new Event("resize"));
    await flushMeasurement();
    expect(floating.style.left).toBe("170px");
    measure.mockClear();

    layout.style.paddingInlineStart = "200px";
    await flushMeasurement();
    expect(floating.style.left).toBe("100px");
    expect(floating.style.width).toBe("543px");
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("coalesces invalidations and cancels pending work while inactive", async () => {
    const { layout, enabled, measure, floating } = mountAlignment();
    await flushMeasurement();
    measure.mockClear();

    layout.style.paddingInlineStart = "200px";
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    await flushMeasurement();
    expect(measure).toHaveBeenCalledTimes(1);
    measure.mockClear();

    window.dispatchEvent(new Event("resize"));
    enabled.value = false;
    await flushMeasurement();
    layout.style.paddingInlineStart = "0px";
    window.dispatchEvent(new Event("resize"));
    await flushMeasurement();
    expect(measure).not.toHaveBeenCalled();
    expect(floating.style.visibility).toBe("hidden");

    enabled.value = true;
    await flushMeasurement();
    expect(measure).toHaveBeenCalledTimes(1);
    expect(floating.style.visibility).toBe("");
    expect(floating.style.left).toBe("0px");
  });
});
