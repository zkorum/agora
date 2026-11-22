const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/** Models time spent waiting for a response without simulating errors. */
export function createMockResponse({ delayMs = 0 } = {}) {
  return async function respond<Result>(
    operation: () => Result | Promise<Result>,
  ): Promise<Result> {
    if (delayMs > 0) await wait(delayMs);
    return operation();
  };
}
