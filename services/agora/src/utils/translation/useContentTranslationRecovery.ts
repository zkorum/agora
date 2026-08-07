import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";
import type { MaybeRefOrGetter } from "vue";
import { onScopeDispose, ref, toValue, watch } from "vue";

import { subscribeToContentTranslationEvents } from "./contentTranslationEvents";

const RECOVERY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const;

export type ContentTranslationRefreshOutcome = "settled" | "pending" | "failed";

type ContentTranslationEventAction = "ignore" | "refresh" | "fail";
export type ContentTranslationEventSubject =
  SSEContentTranslationUpdatedData["subject"];

export function getContentTranslationEventIdentity({
  subject,
  targetLanguageCode,
}: {
  subject: ContentTranslationEventSubject | undefined;
  targetLanguageCode: string;
}): string {
  return JSON.stringify([subject, targetLanguageCode]);
}

export function isContentTranslationEventForIdentity({
  data,
  subject,
  targetLanguageCode,
}: {
  data: SSEContentTranslationUpdatedData;
  subject: ContentTranslationEventSubject | undefined;
  targetLanguageCode: string;
}): boolean {
  if (
    subject === undefined ||
    data.targetLanguageCode !== targetLanguageCode ||
    data.subject.kind !== subject.kind ||
    data.subject.sourceVersion !== subject.sourceVersion
  ) {
    return false;
  }
  if (data.subject.kind === "project" && subject.kind === "project") {
    return data.subject.projectSlug === subject.projectSlug;
  }
  if (data.subject.kind === "conversation" && subject.kind === "conversation") {
    return data.subject.conversationSlugId === subject.conversationSlugId;
  }
  if (data.subject.kind === "opinion" && subject.kind === "opinion") {
    return (
      data.subject.conversationSlugId === subject.conversationSlugId &&
      data.subject.opinionSlugId === subject.opinionSlugId
    );
  }
  if (
    data.subject.kind === "survey_question" &&
    subject.kind === "survey_question"
  ) {
    return (
      data.subject.conversationSlugId === subject.conversationSlugId &&
      data.subject.questionSlugId === subject.questionSlugId
    );
  }
  if (data.subject.kind === "ranking_item" && subject.kind === "ranking_item") {
    return (
      data.subject.conversationSlugId === subject.conversationSlugId &&
      data.subject.itemSlugId === subject.itemSlugId
    );
  }
  return false;
}

export function useContentTranslationRecovery({
  identity,
  enabled,
  isPending,
  classifyEvent,
  refresh,
  onFailure,
  subscribe = subscribeToContentTranslationEvents,
}: {
  identity: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
  isPending: MaybeRefOrGetter<boolean>;
  classifyEvent: (
    data: SSEContentTranslationUpdatedData
  ) => ContentTranslationEventAction;
  refresh: () => Promise<ContentTranslationRefreshOutcome>;
  onFailure: () => void;
  subscribe?: (
    listener: (data: SSEContentTranslationUpdatedData) => void
  ) => () => void;
}) {
  const isActive = ref(false);
  const isDocumentVisible = ref(
    typeof document === "undefined" || document.visibilityState === "visible"
  );
  let contextGeneration = 0;
  let delayIndex = 0;
  let latestEventTimestamp = Number.NEGATIVE_INFINITY;
  let refreshInFlightGeneration: number | undefined;
  let trailingRefreshGeneration: number | undefined;
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

  function clearRecoveryTimer(): void {
    if (recoveryTimer === undefined) {
      return;
    }
    clearTimeout(recoveryTimer);
    recoveryTimer = undefined;
  }

  function stop(): void {
    isActive.value = false;
    clearRecoveryTimer();
    trailingRefreshGeneration = undefined;
    contextGeneration += 1;
  }

  function scheduleRefresh(): void {
    if (
      !isActive.value ||
      !isDocumentVisible.value ||
      recoveryTimer !== undefined
    ) {
      return;
    }
    const delay =
      RECOVERY_DELAYS_MS[Math.min(delayIndex, RECOVERY_DELAYS_MS.length - 1)];
    delayIndex += 1;
    recoveryTimer = setTimeout(() => {
      recoveryTimer = undefined;
      void refreshNow();
    }, delay);
  }

  function start(): void {
    if (isActive.value) {
      scheduleRefresh();
      return;
    }
    isActive.value = true;
    delayIndex = 0;
    scheduleRefresh();
  }

  async function refreshNow(): Promise<void> {
    if (!isActive.value || !toValue(enabled) || !toValue(isPending)) {
      return;
    }
    const activeGeneration = contextGeneration;
    if (refreshInFlightGeneration === activeGeneration) {
      trailingRefreshGeneration = activeGeneration;
      return;
    }

    clearRecoveryTimer();
    refreshInFlightGeneration = activeGeneration;
    let outcome: ContentTranslationRefreshOutcome;
    try {
      outcome = await refresh();
    } catch {
      outcome = "pending";
    }

    if (refreshInFlightGeneration === activeGeneration) {
      refreshInFlightGeneration = undefined;
    }
    if (activeGeneration !== contextGeneration || !isActive.value) {
      return;
    }
    if (outcome === "failed") {
      stop();
      onFailure();
      return;
    }
    if (outcome === "settled" || !toValue(isPending)) {
      stop();
      return;
    }
    if (trailingRefreshGeneration === activeGeneration) {
      trailingRefreshGeneration = undefined;
      await refreshNow();
      return;
    }
    scheduleRefresh();
  }

  const unsubscribe = subscribe((data) => {
    if (!toValue(enabled) || !toValue(isPending)) {
      return;
    }
    const action = classifyEvent(data);
    if (action === "ignore" || data.timestamp <= latestEventTimestamp) {
      return;
    }
    latestEventTimestamp = data.timestamp;
    if (action === "fail") {
      stop();
      onFailure();
      return;
    }
    start();
    void refreshNow();
  });

  function handleVisibilityChange(): void {
    isDocumentVisible.value = document.visibilityState === "visible";
    if (!isDocumentVisible.value) {
      clearRecoveryTimer();
      return;
    }
    if (isActive.value) {
      void refreshNow();
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  watch(
    [() => toValue(identity), () => toValue(enabled), () => toValue(isPending)],
    ([nextIdentity, nextEnabled, nextIsPending], previous) => {
      if (nextIdentity !== previous[0]) {
        stop();
        latestEventTimestamp = Number.NEGATIVE_INFINITY;
      }
      if (nextEnabled && nextIsPending) {
        start();
      } else {
        stop();
      }
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    stop();
    unsubscribe();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  });

  return { isActive, refreshNow, start, stop };
}
