import { computed, onScopeDispose, ref } from "vue";

export function useBoundedTranslationPolling({
  intervalMs,
  maxDurationMs,
  onTimeout,
}: {
  intervalMs: number;
  maxDurationMs: number;
  onTimeout: () => void;
}) {
  const isActive = ref(false);
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

  onScopeDispose(stop);

  return { refetchInterval, start, stop };
}
