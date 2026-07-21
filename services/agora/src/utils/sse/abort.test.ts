import { describe, expect, it, vi } from "vitest";

import { abortIgnoringAbortError } from "./abort";

describe("abortIgnoringAbortError", () => {
  it("aborts a controller normally", () => {
    const abortController = new AbortController();

    abortIgnoringAbortError(abortController);

    expect(abortController.signal.aborted).toBe(true);
  });

  it("suppresses an AbortError after cancellation completes", () => {
    const abortController = new AbortController();
    const abort = vi.fn(() => {
      abortController.abort();
      throw new DOMException("Fetch is aborted", "AbortError");
    });

    expect(() => {
      abortIgnoringAbortError({ abort, signal: abortController.signal });
    }).not.toThrow();
    expect(abort).toHaveBeenCalledOnce();
  });

  it("rethrows an AbortError when cancellation did not complete", () => {
    const abortController = new AbortController();
    const error = new DOMException("Fetch is aborted", "AbortError");
    const abort = vi.fn(() => {
      throw error;
    });

    expect(() => {
      abortIgnoringAbortError({ abort, signal: abortController.signal });
    }).toThrow(error);
  });

  it("rethrows unexpected errors", () => {
    const abortController = new AbortController();
    const error = new Error("Unexpected abort failure");
    const abort = vi.fn(() => {
      abortController.abort();
      throw error;
    });

    expect(() => {
      abortIgnoringAbortError({ abort, signal: abortController.signal });
    }).toThrow(error);
  });
});
