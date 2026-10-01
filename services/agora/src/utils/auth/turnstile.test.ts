import { afterEach, describe, expect, it, vi } from "vitest";

import { loadTurnstile } from "./turnstile";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Turnstile script boundary", () => {
  it("parses the external widget API and rejects invalid widget IDs", async () => {
    const render = vi.fn(() => "widget-1");
    const reset = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("turnstile", { render, reset, remove });

    const api = await loadTurnstile();
    const container = document.createElement("div");
    const options: Parameters<
      Awaited<ReturnType<typeof loadTurnstile>>["render"]
    >[1] = {
      sitekey: "public-key",
      action: "phone_sms",
      appearance: "interaction-only",
      size: "flexible",
      callback: vi.fn(),
      "expired-callback": vi.fn(),
      "error-callback": vi.fn(),
    };
    expect(api.render(container, options)).toBe("widget-1");
    api.reset("widget-1");
    api.remove("widget-1");
    expect(render).toHaveBeenCalledWith(container, options);
    expect(reset).toHaveBeenCalledWith("widget-1");
    expect(remove).toHaveBeenCalledWith("widget-1");

    vi.stubGlobal("turnstile", {
      render: () => 12,
      reset,
      remove,
    });
    const broken = await loadTurnstile();
    expect(() => broken.render(container, options)).toThrow();
  });
});
