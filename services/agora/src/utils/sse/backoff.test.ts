import { describe, expect, it } from "vitest";

import {
  getExponentialBackoffDelayMs,
  parseRetryAfterMs,
  shouldRetrySSEStatus,
} from "./backoff";

describe("getExponentialBackoffDelayMs", () => {
  it("grows exponentially and caps the jitter range", () => {
    const delay = (failureCount: number, randomUnitInterval: number) =>
      getExponentialBackoffDelayMs({
        failureCount,
        initialDelayMs: 1000,
        maximumDelayMs: 8000,
        minimumDelayMs: 0,
        multiplier: 2,
        randomUnitInterval,
      });

    expect(delay(0, 0)).toBe(500);
    expect(delay(0, 1)).toBe(1000);
    expect(delay(2, 1)).toBe(4000);
    expect(delay(10, 0)).toBe(4000);
    expect(delay(10, 1)).toBe(8000);
  });

  it("honors a bounded server minimum after jitter", () => {
    expect(
      getExponentialBackoffDelayMs({
        failureCount: 0,
        initialDelayMs: 1000,
        maximumDelayMs: 30_000,
        minimumDelayMs: 5000,
        multiplier: 2,
        randomUnitInterval: 0,
      })
    ).toBe(5000);
  });
});

describe("parseRetryAfterMs", () => {
  it("parses delta seconds and bounds the result", () => {
    expect(
      parseRetryAfterMs({
        value: " 12 ",
        nowMs: 0,
        maximumDelayMs: 30_000,
      })
    ).toBe(12_000);
    expect(
      parseRetryAfterMs({
        value: "120",
        nowMs: 0,
        maximumDelayMs: 30_000,
      })
    ).toBe(30_000);
  });

  it("parses HTTP dates relative to the supplied clock", () => {
    const nowMs = Date.parse("2026-08-03T12:00:00.000Z");

    expect(
      parseRetryAfterMs({
        value: "Mon, 03 Aug 2026 12:00:10 GMT",
        nowMs,
        maximumDelayMs: 30_000,
      })
    ).toBe(10_000);
    expect(
      parseRetryAfterMs({
        value: "Mon, 03 Aug 2026 11:59:50 GMT",
        nowMs,
        maximumDelayMs: 30_000,
      })
    ).toBe(0);
  });

  it("ignores absent and invalid values", () => {
    expect(
      parseRetryAfterMs({ value: null, nowMs: 0, maximumDelayMs: 30_000 })
    ).toBeUndefined();
    expect(
      parseRetryAfterMs({
        value: "later",
        nowMs: 0,
        maximumDelayMs: 30_000,
      })
    ).toBeUndefined();
  });
});

describe("shouldRetrySSEStatus", () => {
  it.each([408, 425, 429, 500, 503, 599])("retries status %i", (status) => {
    expect(shouldRetrySSEStatus(status)).toBe(true);
  });

  it.each([204, 400, 401, 403, 404, 600])(
    "does not generically retry status %i",
    (status) => {
      expect(shouldRetrySSEStatus(status)).toBe(false);
    }
  );
});
