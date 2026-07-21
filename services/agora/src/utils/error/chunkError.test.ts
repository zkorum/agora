import { isChunkLoadError } from "src/utils/error/chunkError";
import { describe, expect, it } from "vitest";

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
