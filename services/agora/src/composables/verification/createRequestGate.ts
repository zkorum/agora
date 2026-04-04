import { type Ref, ref } from "vue";

export interface RequestGate {
  isBusy: Ref<boolean>;
  isTerminated: Ref<boolean>;
  start: () => number | null;
  isCurrent: (requestId: number) => boolean;
  finish: (requestId: number) => void;
  terminate: () => void;
}

export function createRequestGate(): RequestGate {
  const isBusy = ref(false);
  const isTerminated = ref(false);
  let currentRequestId = 0;

  function start(): number | null {
    if (isBusy.value || isTerminated.value) {
      return null;
    }
    currentRequestId += 1;
    isBusy.value = true;
    return currentRequestId;
  }

  function isCurrent(requestId: number): boolean {
    return (
      isTerminated.value === false &&
      isBusy.value === true &&
      currentRequestId === requestId
    );
  }

  function finish(requestId: number) {
    if (currentRequestId === requestId) {
      isBusy.value = false;
    }
  }

  function terminate() {
    currentRequestId += 1;
    isBusy.value = false;
    isTerminated.value = true;
  }

  return {
    isBusy,
    isTerminated,
    start,
    isCurrent,
    finish,
    terminate,
  };
}
