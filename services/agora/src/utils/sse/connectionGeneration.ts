import { abortIgnoringAbortError } from "./abort";

export interface SSEConnectionAttempt {
  abortController: AbortController;
  generation: number;
}

export interface SSEConnectionGeneration {
  invalidate: () => void;
  isCurrent: (attempt: SSEConnectionAttempt) => boolean;
  start: () => SSEConnectionAttempt;
}

export function createSSEConnectionGeneration(): SSEConnectionGeneration {
  let generation = 0;
  let currentAttempt: SSEConnectionAttempt | undefined;

  function invalidate(): void {
    generation += 1;
    if (currentAttempt !== undefined) {
      abortIgnoringAbortError(currentAttempt.abortController);
      currentAttempt = undefined;
    }
  }

  function start(): SSEConnectionAttempt {
    invalidate();
    const attempt = {
      abortController: new AbortController(),
      generation,
    };
    currentAttempt = attempt;
    return attempt;
  }

  function isCurrent(attempt: SSEConnectionAttempt): boolean {
    return currentAttempt === attempt && attempt.generation === generation;
  }

  return { invalidate, isCurrent, start };
}
