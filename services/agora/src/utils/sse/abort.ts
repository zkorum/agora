type Abortable = Pick<AbortController, "abort" | "signal">;

export function abortIgnoringAbortError(abortable: Abortable): void {
  try {
    abortable.abort();
  } catch (error) {
    // iOS Safari may throw after aborting a fetch; ignore it only if cancellation completed.
    if (
      !(error instanceof DOMException) ||
      error.name !== "AbortError" ||
      !abortable.signal.aborted
    ) {
      throw error;
    }
  }
}
