import { type MaybeRefOrGetter,onScopeDispose, toValue, watch } from "vue";

const MAX_ATTEMPTS = 6;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export function useVoteReconciliation({
  needsConfirmation,
  isBusy,
  captureSession,
  confirm,
}: {
  needsConfirmation: MaybeRefOrGetter<boolean>;
  isBusy: MaybeRefOrGetter<boolean>;
  captureSession: () => () => boolean;
  confirm: (context: { signal: AbortSignal; isCurrent: () => boolean }) => Promise<void>;
}) {
  let active = true;
  let attempts = 0;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function stop(): void {
    generation += 1;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = undefined;
  }

  function schedule(): void {
    if (!active || timer !== undefined || controller !== undefined || attempts >= MAX_ATTEMPTS ||
        !toValue(needsConfirmation) || toValue(isBusy)) return;
    const delay = Math.min(INITIAL_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
    timer = setTimeout(() => {
      timer = undefined;
      void run();
    }, delay);
  }

  async function run(): Promise<void> {
    if (!active || !toValue(needsConfirmation) || toValue(isBusy)) return;
    const requestGeneration = generation;
    const currentSession = captureSession();
    const request = new AbortController();
    controller = request;
    attempts += 1;
    const isCurrent = () => active && !request.signal.aborted &&
      generation === requestGeneration && currentSession();
    try {
      await confirm({ signal: request.signal, isCurrent });
    } catch {
      // Preserve the optimistic state and retry transient reads with backoff.
    } finally {
      if (generation === requestGeneration) {
        controller = undefined;
        if (isCurrent()) schedule();
      }
    }
  }

  function restart(): void {
    stop();
    attempts = 0;
    schedule();
  }

  function pause(): void {
    active = false;
    stop();
  }

  function resume(): void {
    active = true;
    restart();
  }

  watch(() => toValue(isBusy), busy => {
    if (busy) stop();
    else schedule();
  });
  onScopeDispose(pause);
  return { restart, pause, resume };
}
