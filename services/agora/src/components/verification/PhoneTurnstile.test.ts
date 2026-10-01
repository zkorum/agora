import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";

import PhoneTurnstile from "./PhoneTurnstile.vue";

const mockWidget = vi.hoisted(() => {
  let callback: ((token: string) => void) | undefined;
  return {
    getCallback: () => callback,
    setCallback: (value: (token: string) => void) => {
      callback = value;
    },
    reset: vi.fn(),
    remove: vi.fn(),
  };
});

vi.mock("src/utils/processEnv", () => ({
  processEnv: { VITE_PHONE_TURNSTILE_SITE_KEY: "test-site-key" },
}));
vi.mock("src/utils/auth/turnstile", () => ({
  loadTurnstile: () =>
    Promise.resolve({
      render: (
        _container: HTMLElement,
        options: { callback: (token: string) => void }
      ) => {
        mockWidget.setCallback(options.callback);
        return "widget-1";
      },
      reset: mockWidget.reset,
      remove: mockWidget.remove,
    }),
}));

afterEach(() => {
  mockWidget.reset.mockClear();
  mockWidget.remove.mockClear();
});

describe("phone Turnstile widget", () => {
  it("consumes and resets each token, and removes the widget on unmount", async () => {
    const widget = ref<InstanceType<typeof PhoneTurnstile>>();
    const app = createApp({
      setup: () => () => h(PhoneTurnstile, { ref: widget }),
    });
    const target = document.createElement("div");
    document.body.append(target);
    app.mount(target);
    try {
      await nextTick();
      await vi.waitFor(() => expect(mockWidget.getCallback()).toBeDefined());
      mockWidget.getCallback()?.("first-token");
      expect(widget.value?.takeToken()).toBe("first-token");
      expect(widget.value?.takeToken()).toBeUndefined();
      expect(mockWidget.reset).toHaveBeenCalledExactlyOnceWith("widget-1");

      mockWidget.getCallback()?.("second-token");
      expect(widget.value?.takeToken()).toBe("second-token");
      expect(mockWidget.reset).toHaveBeenCalledTimes(2);
    } finally {
      app.unmount();
      target.remove();
    }
    expect(mockWidget.remove).toHaveBeenCalledExactlyOnceWith("widget-1");
  });
});
