import { isAxiosError } from "axios";

const defaultRetryDelaysMs = [1_000, 3_000, 10_000, 30_000] as const;

interface AuthInitializationController {
  initialize: () => Promise<void>;
  retryNow: () => Promise<void>;
  stop: () => void;
}

interface CreateAuthInitializationControllerParams {
  refreshAuthState: () => Promise<unknown>;
  markInitialized: () => void;
  onError: (error: unknown) => void;
  retryDelaysMs?: readonly [number, ...number[]];
}

export function isTransientAuthInitializationError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (status !== undefined) {
    return status >= 500 || status === 408 || status === 425 || status === 429;
  }
  return (
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT"
  );
}

export function createAuthInitializationController({
  refreshAuthState,
  markInitialized,
  onError,
  retryDelaysMs = defaultRetryDelaysMs,
}: CreateAuthInitializationControllerParams): AuthInitializationController {
  let refreshPromise: Promise<void> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  let canRetry = false;
  let stopped = false;

  function clearRetryTimer(): void {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  }

  function scheduleRetry(): void {
    if (stopped || retryTimer !== undefined) {
      return;
    }
    const delayIndex = Math.min(retryAttempt, retryDelaysMs.length - 1);
    const delayMs = retryDelaysMs[delayIndex] ?? retryDelaysMs[0];
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void runRefresh();
    }, delayMs);
  }

  async function runRefresh(): Promise<void> {
    if (stopped) {
      return;
    }
    if (refreshPromise !== undefined) {
      return await refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        await refreshAuthState();
        canRetry = false;
        retryAttempt = 0;
        clearRetryTimer();
      } catch (error) {
        onError(error);
        canRetry = isTransientAuthInitializationError(error);
        if (canRetry) {
          scheduleRetry();
        }
      } finally {
        refreshPromise = undefined;
      }
    })();
    return await refreshPromise;
  }

  async function initialize(): Promise<void> {
    try {
      await runRefresh();
    } finally {
      markInitialized();
    }
  }

  async function retryNow(): Promise<void> {
    if (!canRetry) {
      return;
    }
    clearRetryTimer();
    await runRefresh();
  }

  function stop(): void {
    stopped = true;
    canRetry = false;
    clearRetryTimer();
  }

  return { initialize, retryNow, stop };
}
