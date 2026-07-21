import { computed, onScopeDispose, ref } from "vue";

export function useBoundedTranslationPolling({
  intervalMs,
  maxDurationMs,
  maxConsecutiveRequestFailures,
  onRequestFailureLimit,
  onTimeout,
}: {
  intervalMs: number;
  maxDurationMs: number;
  maxConsecutiveRequestFailures?: number;
  onRequestFailureLimit?: () => void;
  onTimeout: () => void;
}) {
  const isActive = ref(false);
  let consecutiveRequestFailures = 0;
  let stopTimeout: ReturnType<typeof setTimeout> | undefined;

  const refetchInterval = computed(() => {
    if (!isActive.value) {
      return false;
    }
    return intervalMs;
  });

  function clearStopTimeout(): void {
    if (stopTimeout !== undefined) {
      clearTimeout(stopTimeout);
      stopTimeout = undefined;
    }
  }

  function stop(): void {
    isActive.value = false;
    consecutiveRequestFailures = 0;
    clearStopTimeout();
  }

  function start(): void {
    stop();
    isActive.value = true;
    stopTimeout = setTimeout(() => {
      stopTimeout = undefined;
      isActive.value = false;
      onTimeout();
    }, maxDurationMs);
  }

  function recordRequestSuccess(): void {
    consecutiveRequestFailures = 0;
  }

  function recordRequestFailure(): void {
    if (
      !isActive.value ||
      maxConsecutiveRequestFailures === undefined ||
      onRequestFailureLimit === undefined
    ) {
      return;
    }

    consecutiveRequestFailures += 1;
    if (consecutiveRequestFailures >= maxConsecutiveRequestFailures) {
      stop();
      onRequestFailureLimit();
    }
  }

  onScopeDispose(stop);

  return {
    isActive,
    refetchInterval,
    recordRequestFailure,
    recordRequestSuccess,
    start,
    stop,
  };
}
