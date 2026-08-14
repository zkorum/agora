import { reloadForChunkError } from "src/utils/error/chunkError";
import {
  createVueChunkErrorHandler,
  handleUnhandledChunkError,
} from "src/utils/error/chunkErrorRecovery";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("src/utils/error/chunkError", () => ({
  isChunkLoadError: vi.fn((error: unknown) => error instanceof Error),
  reloadForChunkError: vi.fn(),
}));

const chunkError = new Error(
  "Failed to fetch dynamically imported module: /assets/email.js"
);

describe("chunk error recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only consumes an unhandled rejection when recovery starts", () => {
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    const reload = vi.mocked(reloadForChunkError);
    reload
      .mockReturnValueOnce("blocked")
      .mockReturnValueOnce("started")
      .mockReturnValueOnce("pending");

    handleUnhandledChunkError({
      reason: chunkError,
      preventDefault,
      stopImmediatePropagation,
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopImmediatePropagation).not.toHaveBeenCalled();

    handleUnhandledChunkError({
      reason: chunkError,
      preventDefault,
      stopImmediatePropagation,
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();

    handleUnhandledChunkError({
      reason: chunkError,
      preventDefault,
      stopImmediatePropagation,
    });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(2);
  });

  it("delegates Vue errors when recovery does not start", () => {
    const existingHandler = vi.fn();
    const handler = createVueChunkErrorHandler(existingHandler);
    const reload = vi.mocked(reloadForChunkError);
    reload.mockReturnValueOnce("blocked").mockReturnValueOnce("pending");

    handler(chunkError, null, "test");
    expect(existingHandler).toHaveBeenCalledOnce();

    handler(chunkError, null, "test");
    expect(existingHandler).toHaveBeenCalledOnce();
  });
});
