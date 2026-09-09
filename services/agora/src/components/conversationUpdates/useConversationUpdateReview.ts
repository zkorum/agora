import {
  type QueryFunctionContext,
  skipToken,
  useQuery,
} from "@tanstack/vue-query";
import type {
  ConversationEmailUpdateHistoryRecord,
  Dto,
} from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { computed, onScopeDispose, readonly, shallowRef, watch } from "vue";

type Review = Extract<
  ReturnType<typeof Dto.conversationEmailUpdatePrepareDraftResponse.parse>,
  { success: true }
>["review"];
type PrepareFailure = Extract<
  ReturnType<typeof Dto.conversationEmailUpdatePrepareDraftResponse.parse>,
  { success: false }
>["error"];
type TestFailure = Extract<
  ReturnType<typeof Dto.conversationEmailUpdateSendTestResponse.parse>,
  { success: false }
>["error"];
type ReasonFailure = Pick<
  Extract<
    | ReturnType<typeof Dto.conversationEmailUpdateSendResponse.parse>
    | ReturnType<typeof Dto.conversationEmailUpdateCancelDraftResponse.parse>
    | ReturnType<typeof Dto.conversationEmailUpdateTestStatusResponse.parse>
    | ReturnType<typeof Dto.conversationEmailUpdateHistoryDetailResponse.parse>
    | ReturnType<
        typeof Dto.conversationEmailUpdateAudienceEstimateResponse.parse
      >,
    { success: false }
  >,
  "reason"
>;
type TestDeliveryFailure = Pick<
  Extract<
    Extract<
      ReturnType<typeof Dto.conversationEmailUpdateTestStatusResponse.parse>,
      { success: true }
    >["status"],
    { state: "failed" }
  >,
  "reason"
>;
export type ReviewFailure =
  | PrepareFailure
  | TestFailure
  | ReasonFailure
  | TestDeliveryFailure;
export type ReviewEvent =
  | { kind: "dto"; error: ReviewFailure }
  | {
      kind: "transport";
      operation: "prepare" | "test" | "send" | "cancel" | "reconcile";
    }
  | { kind: "test-accepted" };
type TestState =
  | { kind: "untested" }
  | { kind: "requesting"; requestId: string }
  | { kind: "retry"; requestId: string }
  | { kind: "polling"; testAttemptId: string }
  | { kind: "accepted"; testAttemptId: string }
  | { kind: "sending"; testAttemptId: string }
  | { kind: "send-unknown"; testAttemptId: string }
  | { kind: "delivery-accepted" }
  | { kind: "invalid" };
type LockedReview = {
  snapshot: Review;
  test: TestState;
  testRequested: boolean;
};
type ReviewState =
  | { kind: "composing" }
  | { kind: "preparing" }
  | ({ kind: "review" | "cancelling" | "reconciling" } & LockedReview);

export function useConversationUpdateReview({
  notify,
  onSent,
}: {
  notify: (event: ReviewEvent) => void;
  onSent: (record: ConversationEmailUpdateHistoryRecord) => void;
}) {
  const api = useBackendConversationEmailUpdatesApi();
  const state = shallowRef<ReviewState>({ kind: "composing" });
  const error = shallowRef<
    "prepareError" | "cancelError" | "reconcileError" | undefined
  >();
  let generation = 0;
  let disposed = false;
  let expiryTimer: number | undefined;
  const review = computed(() =>
    state.value.kind !== "composing" && state.value.kind !== "preparing"
      ? readonly(state.value)
      : undefined
  );
  const busy = computed(
    () =>
      state.value.kind === "preparing" ||
      state.value.kind === "cancelling" ||
      state.value.kind === "reconciling" ||
      review.value?.test.kind === "sending"
  );
  // Changing the key on exit detaches the observer and aborts its request;
  // disabling a query alone would leave an in-flight request running.
  const testStatusIdentity = computed(() => {
    const current = state.value;
    return current.kind === "review" && current.test.kind === "polling"
      ? {
          token: generation,
          updateId: current.snapshot.updateId,
          testAttemptId: current.test.testAttemptId,
        }
      : undefined;
  });
  const testStatusQuery = useQuery({
    queryKey: computed(() => [
      "conversationEmailUpdateTestStatus",
      testStatusIdentity.value?.updateId,
      testStatusIdentity.value?.testAttemptId,
      testStatusIdentity.value?.token,
    ]),
    queryFn: computed(() => {
      const identity = testStatusIdentity.value;
      return identity === undefined
        ? skipToken
        : async ({ signal }: QueryFunctionContext) => ({
            ...identity,
            response: await api.getTestStatus({
              request: { testAttemptId: identity.testAttemptId },
              signal,
            }),
          });
    }),
    enabled: computed(() => testStatusIdentity.value !== undefined),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      const response = query.state.data?.response;
      return query.state.status !== "error" &&
        response?.success === true &&
        ["pending", "claimed", "attempting"].includes(response.status.state)
        ? 2000
        : false;
    },
  });
  const testStatusFailed = computed(() => {
    const response = testStatusQuery.data.value?.response;
    return (
      testStatusIdentity.value !== undefined &&
      !testStatusQuery.isFetching.value &&
      (testStatusQuery.isError.value ||
        (response?.success === false &&
          response.reason === "test_status_unavailable"))
    );
  });

  watch(testStatusQuery.data, (result) => {
    expireReview();
    const current = state.value;
    if (
      result === undefined ||
      !isCurrent(result) ||
      current.kind !== "review" ||
      current.test.kind !== "polling" ||
      current.test.testAttemptId !== result.testAttemptId
    )
      return;
    const { response, testAttemptId } = result;
    if (!response.success) {
      if (response.reason !== "test_status_unavailable")
        handleFailure({ reason: response.reason });
    } else if (response.status.state === "provider_accepted") {
      updateTest({ kind: "accepted", testAttemptId });
      notify({ kind: "test-accepted" });
    } else if (response.status.state === "failed") {
      handleFailure({ reason: response.status.reason });
    }
  });

  async function retryTestStatus(): Promise<void> {
    expireReview();
    if (disposed || !testStatusFailed.value) return;
    await testStatusQuery.refetch({ cancelRefetch: false });
  }

  function expireReview(): void {
    window.clearTimeout(expiryTimer);
    if (disposed) return;
    const current = review.value;
    if (current === undefined) return;
    const remaining = current.snapshot.expiresAt.getTime() - Date.now();
    if (remaining > 0) {
      expiryTimer = window.setTimeout(
        expireReview,
        Math.min(remaining, 2_147_483_647)
      );
    } else if (
      current.test.kind !== "sending" &&
      current.test.kind !== "send-unknown" &&
      current.test.kind !== "delivery-accepted"
    ) {
      updateTest({ kind: "invalid" });
    }
  }

  function isCurrent({
    token,
    updateId,
  }: {
    token: number;
    updateId: string;
  }): boolean {
    return (
      !disposed &&
      generation === token &&
      review.value?.snapshot.updateId === updateId
    );
  }

  async function cancelOrphan(updateId: string): Promise<void> {
    try {
      await api.cancelDraft({ updateId });
    } catch (cause) {
      // An unreachable server leaves the abandoned review to its server-side expiry.
      console.error("Failed to cancel abandoned Email Update review", cause);
    }
  }

  async function prepare(
    request: ReturnType<
      typeof Dto.conversationEmailUpdatePrepareDraftRequest.parse
    >
  ): Promise<void> {
    if (state.value.kind !== "composing") return;
    const token = ++generation;
    error.value = undefined;
    state.value = { kind: "preparing" };
    try {
      const response = await api.prepareDraft(request);
      if (disposed || token !== generation) {
        if (response.success) await cancelOrphan(response.review.updateId);
        return;
      }
      if (!response.success) {
        state.value = { kind: "composing" };
        error.value = "prepareError";
        notify({ kind: "dto", error: response.error });
        return;
      }
      state.value = {
        kind: "review",
        snapshot: response.review,
        test: { kind: "untested" },
        testRequested: false,
      };
      expireReview();
    } catch (cause) {
      if (disposed || token !== generation) return;
      console.error("Failed to prepare Email Update review", cause);
      state.value = { kind: "composing" };
      error.value = "prepareError";
      notify({ kind: "transport", operation: "prepare" });
    }
  }

  function updateTest(test: TestState): void {
    const current = review.value;
    if (
      current !== undefined &&
      current.test.kind !== "invalid" &&
      current.test.kind !== "send-unknown" &&
      current.test.kind !== "delivery-accepted"
    )
      state.value = { ...current, test };
  }

  function handleFailure(failure: ReviewFailure): void {
    const { reason } = failure;
    updateTest({
      kind:
        reason === "review_required" ||
        reason === "review_not_found" ||
        reason === "review_expired" ||
        reason === "review_cancelled" ||
        reason === "delivery_already_accepted"
          ? "invalid"
          : "untested",
    });
    notify({ kind: "dto", error: failure });
  }

  async function sendTest(): Promise<void> {
    expireReview();
    const current = state.value;
    if (
      current.kind !== "review" ||
      !["untested", "retry", "accepted"].includes(current.test.kind)
    )
      return;
    const updateId = current.snapshot.updateId;
    const token = generation;
    // Keep this ID after a transport failure: retrying must not queue another test.
    const requestId =
      current.test.kind === "retry"
        ? current.test.requestId
        : crypto.randomUUID();
    state.value = {
      ...current,
      testRequested: true,
      test: { kind: "requesting", requestId },
    };
    try {
      const response = await api.sendTest({ updateId, requestId });
      if (!isCurrent({ token, updateId })) return;
      if (!response.success) {
        if (response.error.reason === "delivery_already_accepted") {
          await reconcileAcceptedDelivery();
          return;
        }
        handleFailure(response.error);
        return;
      }
      updateTest({ kind: "polling", testAttemptId: response.testAttemptId });
    } catch (cause) {
      if (!isCurrent({ token, updateId })) return;
      console.error("Failed to queue Email Update test", cause);
      updateTest({ kind: "retry", requestId });
      notify({ kind: "transport", operation: "test" });
    }
  }

  async function send(): Promise<void> {
    expireReview();
    const current = state.value;
    if (
      current.kind !== "review" ||
      (current.test.kind !== "accepted" && current.test.kind !== "send-unknown")
    )
      return;
    const { testAttemptId } = current.test;
    const updateId = current.snapshot.updateId;
    const token = generation;
    state.value = { ...current, test: { kind: "sending", testAttemptId } };
    try {
      const response = await api.send({
        updateId,
        testAttemptId,
        displayedParticipantEstimate:
          current.snapshot.estimatedEligibleRecipientCount,
        contentPolicyAcknowledged: true,
      });
      if (!isCurrent({ token, updateId })) return;
      if (!response.success) {
        if (
          response.reason === "delivery_already_active" ||
          response.reason === "required_owner_copy_unavailable"
        ) {
          updateTest({ kind: "accepted", testAttemptId });
          notify({ kind: "dto", error: response });
        } else {
          handleFailure({ reason: response.reason });
        }
        return;
      }
      finishSend(response.record);
    } catch (cause) {
      if (!isCurrent({ token, updateId })) return;
      console.error("Failed to send Email Update", cause);
      // A lost response is not a rejection. Preserve the exact final-send request,
      // including after review expiry, until the server resolves its outcome.
      updateTest({ kind: "send-unknown", testAttemptId });
      notify({ kind: "transport", operation: "send" });
    } finally {
      expireReview();
    }
  }

  function finishSend(record: ConversationEmailUpdateHistoryRecord): void {
    generation += 1;
    window.clearTimeout(expiryTimer);
    error.value = undefined;
    state.value = { kind: "composing" };
    onSent(record);
  }

  async function reconcileAcceptedDelivery(): Promise<boolean> {
    const current = review.value;
    if (current === undefined) return false;
    state.value = {
      ...current,
      kind: "review",
      test: { kind: "delivery-accepted" },
    };
    notify({ kind: "dto", error: { reason: "delivery_already_accepted" } });
    return await reconcile();
  }

  async function reconcile(): Promise<boolean> {
    const current = state.value;
    if (current.kind !== "review" || current.test.kind !== "delivery-accepted")
      return false;
    const token = generation;
    const updateId = current.snapshot.updateId;
    state.value = { ...current, kind: "reconciling" };
    error.value = undefined;
    try {
      const response = await api.getHistoryDetail({ updateId });
      if (!isCurrent({ token, updateId })) return false;
      if (response.success) {
        finishSend(response.record);
        return true;
      }
      notify({ kind: "dto", error: response });
    } catch (cause) {
      if (!isCurrent({ token, updateId })) return false;
      console.error("Failed to reconcile accepted Email Update", cause);
      notify({ kind: "transport", operation: "reconcile" });
    }
    state.value = current;
    error.value = "reconcileError";
    return false;
  }

  function dismissExitError(): void {
    if (error.value === "cancelError") error.value = undefined;
  }

  async function leave(): Promise<boolean> {
    const current = state.value;
    if (
      current.kind === "cancelling" ||
      current.kind === "reconciling" ||
      (current.kind === "review" && current.test.kind === "sending")
    )
      return false;
    if (current.kind === "review" && current.test.kind === "delivery-accepted")
      return await reconcile();
    if (current.kind === "preparing" || current.kind === "composing") {
      generation += 1;
      state.value = { kind: "composing" };
      error.value = undefined;
      return true;
    }
    const token = generation;
    state.value = { ...current, kind: "cancelling" };
    error.value = undefined;
    try {
      const response = await api.cancelDraft({
        updateId: current.snapshot.updateId,
      });
      if (!isCurrent({ token, updateId: current.snapshot.updateId }))
        return false;
      if (!response.success) {
        switch (response.reason) {
          case "delivery_already_accepted":
            return await reconcileAcceptedDelivery();
          case "review_not_found":
            break;
        }
      }
      generation += 1;
      state.value = { kind: "composing" };
      return true;
    } catch (cause) {
      if (!isCurrent({ token, updateId: current.snapshot.updateId }))
        return false;
      console.error("Failed to cancel Email Update review", cause);
      state.value = { ...(review.value ?? current), kind: "review" };
      error.value = "cancelError";
      notify({ kind: "transport", operation: "cancel" });
      return false;
    }
  }

  onScopeDispose(() => {
    disposed = true;
    generation += 1;
    window.clearTimeout(expiryTimer);
    const current = review.value;
    // Hard browser exits cannot await cancellation. Unsaved reviews expire on
    // the server; never attempt to cancel an unresolved or accepted delivery.
    if (
      current !== undefined &&
      current.test.kind !== "sending" &&
      current.test.kind !== "send-unknown" &&
      current.test.kind !== "delivery-accepted"
    )
      void cancelOrphan(current.snapshot.updateId);
  });

  return {
    state: readonly(state),
    review,
    busy,
    error: readonly(error),
    testStatusFailed,
    retryTestStatus,
    prepare,
    sendTest,
    send,
    leave,
    reconcile,
    dismissExitError,
  };
}
