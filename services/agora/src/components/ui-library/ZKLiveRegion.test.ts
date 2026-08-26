import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp, h, nextTick, ref } from "vue";

import ZKLiveRegion from "./ZKLiveRegion.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ZKLiveRegion", () => {
  it("stays mounted while its announced message changes", async () => {
    const message = ref("");
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(() =>
      h(ZKLiveRegion, { message: message.value, politeness: "polite" })
    );
    mountedApps.push(app);
    app.mount(container);
    const region = container.querySelector('[aria-live="polite"]');

    expect(region?.textContent?.trim()).toBe("");
    message.value = "Checking for eligible recipients...";
    await nextTick();

    expect(container.querySelector('[aria-live="polite"]')).toBe(region);
    expect(region?.textContent).toContain(
      "Checking for eligible recipients..."
    );
  });
});
