import { expect, test, vi } from "vitest";

import { createMockResponse } from "./mock-response.js";

test("mock latency delays reads and writes without changing their values", async () => {
  vi.useFakeTimers();
  try {
    const respond = createMockResponse({ delayMs: 50 });
    const operation = vi.fn(() => "saved");
    const result = respond(operation);
    await vi.advanceTimersByTimeAsync(49);
    expect(operation).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe("saved");
    expect(operation).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});
