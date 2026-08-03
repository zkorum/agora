interface ExponentialBackoffDelayParams {
  failureCount: number;
  initialDelayMs: number;
  maximumDelayMs: number;
  minimumDelayMs: number;
  multiplier: number;
  randomUnitInterval: number;
}

interface ParseRetryAfterParams {
  value: string | null;
  nowMs: number;
  maximumDelayMs: number;
}

export function getExponentialBackoffDelayMs({
  failureCount,
  initialDelayMs,
  maximumDelayMs,
  minimumDelayMs,
  multiplier,
  randomUnitInterval,
}: ExponentialBackoffDelayParams): number {
  const exponentialMaximum = Math.min(
    initialDelayMs * multiplier ** failureCount,
    maximumDelayMs
  );
  // Equal jitter avoids immediate retries while spreading reconnect attempts.
  const jitteredDelay = Math.round(
    exponentialMaximum * (0.5 + randomUnitInterval * 0.5)
  );
  return Math.max(minimumDelayMs, jitteredDelay);
}

export function parseRetryAfterMs({
  value,
  nowMs,
  maximumDelayMs,
}: ParseRetryAfterParams): number | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (/^\d+$/.test(trimmedValue)) {
    return Math.min(Number(trimmedValue) * 1000, maximumDelayMs);
  }

  const retryAtMs = Date.parse(trimmedValue);
  if (!Number.isFinite(retryAtMs)) {
    return undefined;
  }

  return Math.min(Math.max(0, retryAtMs - nowMs), maximumDelayMs);
}

export function shouldRetrySSEStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  );
}
