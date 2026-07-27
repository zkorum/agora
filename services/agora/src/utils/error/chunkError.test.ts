import {
  isChunkLoadError,
  reloadForChunkError,
} from "src/utils/error/chunkError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("chunk load error detection", () => {
  it.each([
    "Failed to fetch dynamically imported module: /assets/page.js",
    "error loading dynamically imported module: /assets/page.js",
    "Importing a module script failed.",
    "Loading chunk 42 failed",
    "Loading CSS chunk 42 failed",
    "Unable to preload CSS for /assets/page.css",
  ])("recognizes %s", (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it("rejects unrelated errors and non-errors", () => {
    expect(isChunkLoadError(new Error("Request failed"))).toBe(false);
    expect(isChunkLoadError("Loading chunk 42 failed")).toBe(false);
  });
});

describe("chunk reload safety", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", false);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not reload while offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    expect(reloadForChunkError()).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });

  it("does not replace the chunk error when reading storage fails", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(reloadForChunkError()).toBe(false);
  });

  it("does not reload when the cooldown marker cannot be stored", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(reloadForChunkError()).toBe(false);
  });

  it("does not reload again during the cooldown", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("1");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(reloadForChunkError()).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });
});
