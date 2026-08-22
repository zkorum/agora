import { logBrowserEvent } from "src/utils/devLogger";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  window.history.replaceState({}, "", "/");
  Reflect.deleteProperty(navigator, "sendBeacon");
  vi.restoreAllMocks();
});

describe("development browser logging privacy", () => {
  it("does not persist runtime logs from recipient action routes", () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    window.history.replaceState(
      {},
      "",
      "/email-updates/preferences/secret-token"
    );

    logBrowserEvent({
      level: "error",
      category: "runtime_error",
      message: "Failed on /email-updates/preferences/secret-token",
    });

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
