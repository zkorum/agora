import { describe, expect, it } from "vitest";

import { createRequestGate } from "./createRequestGate";

describe("createRequestGate", () => {
  it("allows one in-flight request at a time", () => {
    const gate = createRequestGate();

    const firstRequestId = gate.start();

    expect(firstRequestId).toBe(1);
    expect(gate.isBusy.value).toBe(true);
    expect(gate.start()).toBeNull();

    gate.finish(firstRequestId!);

    expect(gate.isBusy.value).toBe(false);
    expect(gate.start()).toBe(2);
  });

  it("invalidates stale requests after termination", () => {
    const gate = createRequestGate();

    const requestId = gate.start();

    expect(gate.isCurrent(requestId!)).toBe(true);

    gate.terminate();

    expect(gate.isTerminated.value).toBe(true);
    expect(gate.isBusy.value).toBe(false);
    expect(gate.isCurrent(requestId!)).toBe(false);
    expect(gate.start()).toBeNull();
  });

  it("ignores finish calls from superseded requests", () => {
    const gate = createRequestGate();

    const requestId = gate.start();
    gate.terminate();
    gate.finish(requestId!);

    expect(gate.isBusy.value).toBe(false);
    expect(gate.isTerminated.value).toBe(true);
  });
});
