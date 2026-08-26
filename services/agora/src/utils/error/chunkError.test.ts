import {
  hasChunkErrorRecoveryStarted,
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
  const createChunkError = (): Error =>
    new Error("Failed to fetch dynamically imported module: /assets/page.js");

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
    const error = createChunkError();

    expect(reloadForChunkError({ error })).toBe("blocked");
    expect(hasChunkErrorRecoveryStarted(error)).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });

  it("does not replace the chunk error when reading storage fails", () => {
    const error = createChunkError();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(reloadForChunkError({ error })).toBe("blocked");
    expect(hasChunkErrorRecoveryStarted(error)).toBe(false);
  });

  it("does not reload when the cooldown marker cannot be stored", () => {
    const error = createChunkError();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(reloadForChunkError({ error })).toBe("blocked");
    expect(hasChunkErrorRecoveryStarted(error)).toBe(false);
  });

  it("does not reload again during the cooldown", () => {
    const error = createChunkError();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("1");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(reloadForChunkError({ error })).toBe("blocked");
    expect(hasChunkErrorRecoveryStarted(error)).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("coalesces only the same error and retries it after the cooldown", () => {
    const chunkError = createChunkError();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const now = vi.spyOn(Date, "now").mockReturnValue(20_000);
    vi.spyOn(Storage.prototype, "getItem")
      .mockReturnValueOnce(null)
      .mockReturnValue("20000");

    expect(
      reloadForChunkError({
        error: chunkError,
        navigateTo: window.location.href,
      })
    ).toBe("started");
    expect(hasChunkErrorRecoveryStarted(chunkError)).toBe(true);
    expect(hasChunkErrorRecoveryStarted(createChunkError())).toBe(false);

    now.mockReturnValue(29_999);
    expect(reloadForChunkError({ error: chunkError })).toBe("pending");
    const distinctError = new Error(chunkError.message);
    expect(reloadForChunkError({ error: distinctError })).toBe("blocked");
    expect(hasChunkErrorRecoveryStarted(distinctError)).toBe(false);

    now.mockReturnValue(30_000);
    expect(
      reloadForChunkError({
        error: chunkError,
        navigateTo: window.location.href,
      })
    ).toBe("started");
  });
});
