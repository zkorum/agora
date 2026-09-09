import {
  type ConversationEmailUpdateHistoryRecord,
  Dto,
} from "src/shared/types/dto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type EffectScope, effectScope, isReadonly } from "vue";

import { useConversationUpdateReview } from "./useConversationUpdateReview";

const api = vi.hoisted(() => ({
  prepareDraft: vi.fn(),
  cancelDraft: vi.fn(),
  sendTest: vi.fn(),
  getTestStatus: vi.fn(),
  send: vi.fn(),
  getHistoryDetail: vi.fn(),
}));
vi.mock("src/utils/api/conversationUpdates/conversationEmailUpdates", () => ({
  useBackendConversationEmailUpdatesApi: () => api,
}));
const updateId = "00000000-0000-4000-8000-000000000001";
const testAttemptId = "00000000-0000-4000-8000-000000000002";
const deliveredRecord = {
  updateId,
  subject: "Server subject",
  bodyHtml: "<p>Message</p>",
  unsubscribeScope: "conversation",
  scope: { kind: "no_project", title: "Server sender" },
  conversations: [{ conversationSlugId: "conv000001", title: "Conversation" }],
  audienceEstimate: 27,
  ownerCopyCount: 2,
  acceptedAt: new Date(),
  status: "queued",
} satisfies ConversationEmailUpdateHistoryRecord;
const request = Dto.conversationEmailUpdatePrepareDraftRequest.parse({
  selection: { kind: "no_project", conversationSlugId: "conv000001" },
  subject: "Subject",
  bodyHtml: "<p>Message</p>",
});
function prepared(id = updateId) {
  return Dto.conversationEmailUpdatePrepareDraftResponse.parse({
    success: true,
    review: {
      updateId: id,
      preview: {
        subject: "Server subject",
        html: "<html>Server preview</html>",
        text: "Server plaintext",
      },
      language: "en",
      senderName: "Server sender",
      replyToName: "Server reply",
      replyToEmail: "reply@example.com",
      branding: { name: "Server brand", palette: "purple" },
      unsubscribeScope: "conversation",
      estimatedEligibleRecipientCount: 27,
      requiredOwnerCopyCount: 2,
      testDestinationEmail: "test@example.com",
      expiresAt: new Date("2099-01-01"),
    },
  });
}
const scopes: EffectScope[] = [];
let queryClient: QueryClient;
let app: ReturnType<typeof createApp>;
function mountFlow() {
  const scope = effectScope();
  scopes.push(scope);
  const notify = vi.fn();
  const onSent = vi.fn();
  const flow = app.runWithContext(() =>
    scope.run(() => useConversationUpdateReview({ notify, onSent }))
  );
  if (flow === undefined) throw new Error("Test scope did not initialize");
  return { flow, notify, onSent, scope };
}
beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient();
  app = createApp({});
  app.use(VueQueryPlugin, { queryClient });
  focusManager.setFocused(true);
  api.prepareDraft.mockResolvedValue(prepared());
  api.cancelDraft.mockResolvedValue({ success: true });
  api.getHistoryDetail.mockResolvedValue({
    success: true,
    record: deliveredRecord,
  });
  api.sendTest.mockResolvedValue({
    success: true,
    updateId,
    testAttemptId,
    status: "pending",
  });
  api.getTestStatus.mockResolvedValue({
    success: true,
    status: { state: "provider_accepted", providerAcceptedAt: new Date() },
  });
});
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  queryClient.clear();
  queryClient.unmount();
  focusManager.setFocused(undefined);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});
describe("locked review API lifecycle", () => {
  it.each(["pending", "claimed", "attempting"])(
    "polls %s every two seconds beyond a minute without blocking the queue operation",
    async (state) => {
      api.getTestStatus.mockResolvedValue({ success: true, status: { state } });
      const { flow } = mountFlow();
      await flow.prepare(request);
      await flow.sendTest();
      await vi.advanceTimersByTimeAsync(0);
      expect(api.getTestStatus).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1999);
      expect(api.getTestStatus).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(api.getTestStatus).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(32);
      expect(flow.review.value?.test).toEqual({
        kind: "polling",
        testAttemptId,
      });
      expect(flow.testStatusFailed.value).toBe(false);
      await flow.sendTest();
      await flow.send();
      expect(api.sendTest).toHaveBeenCalledTimes(1);
      expect(api.send).not.toHaveBeenCalled();
    }
  );
  it.each(["transport", "unavailable"])(
    "stops on %s errors and retries only the same attempt without overlapping requests",
    async (failure) => {
      const { flow } = mountFlow();
      api.getTestStatus.mockResolvedValueOnce({
        success: true,
        status: { state: "pending" },
      });
      if (failure === "transport")
        api.getTestStatus.mockRejectedValueOnce(new Error("Request timed out"));
      else
        api.getTestStatus.mockResolvedValueOnce({
          success: false,
          reason: "test_status_unavailable",
        });
      await flow.prepare(request);
      await flow.sendTest();
      await vi.advanceTimersByTimeAsync(2000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(2);
      expect(flow.testStatusFailed.value).toBe(true);
      await vi.advanceTimersByTimeAsync(60_000);
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(2);
      expect(flow.review.value?.test).toEqual({
        kind: "polling",
        testAttemptId,
      });
      await flow.sendTest();
      await flow.send();
      expect(api.send).not.toHaveBeenCalled();

      const pending =
        Promise.withResolvers<
          ReturnType<typeof Dto.conversationEmailUpdateTestStatusResponse.parse>
        >();
      api.getTestStatus.mockReturnValueOnce(pending.promise);
      const retry = flow.retryTestStatus();
      const duplicateRetry = flow.retryTestStatus();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(3);
      expect(api.getTestStatus).toHaveBeenLastCalledWith({
        request: { testAttemptId },
        signal: expect.any(AbortSignal),
      });
      pending.resolve({ success: true, status: { state: "pending" } });
      await retry;
      await duplicateRetry;
      await vi.advanceTimersByTimeAsync(0);
      expect(flow.testStatusFailed.value).toBe(false);
      await vi.advanceTimersByTimeAsync(2000);
      expect(flow.review.value?.test).toEqual({
        kind: "accepted",
        testAttemptId,
      });
      expect(api.getTestStatus).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(4);
      expect(api.sendTest).toHaveBeenCalledTimes(1);
      expect(api.prepareDraft).toHaveBeenCalledTimes(1);
    }
  );
  it("does not overlap slow interval requests", async () => {
    const { flow } = mountFlow();
    api.getTestStatus.mockResolvedValueOnce({
      success: true,
      status: { state: "pending" },
    });
    const pending =
      Promise.withResolvers<
        ReturnType<typeof Dto.conversationEmailUpdateTestStatusResponse.parse>
      >();
    api.getTestStatus.mockReturnValueOnce(pending.promise);
    await flow.prepare(request);
    await flow.sendTest();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(api.getTestStatus).toHaveBeenCalledTimes(2);
    pending.resolve({ success: true, status: { state: "pending" } });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1999);
    expect(api.getTestStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.getTestStatus).toHaveBeenCalledTimes(3);
    expect(flow.review.value?.test.kind).toBe("accepted");
  });
  it("does not poll in the background and resumes the fixed interval when focused", async () => {
    const { flow } = mountFlow();
    api.getTestStatus.mockResolvedValue({
      success: true,
      status: { state: "pending" },
    });
    await flow.prepare(request);
    await flow.sendTest();
    await vi.advanceTimersByTimeAsync(0);
    focusManager.setFocused(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.getTestStatus).toHaveBeenCalledTimes(1);
    focusManager.setFocused(true);
    await vi.advanceTimersByTimeAsync(1999);
    expect(api.getTestStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.getTestStatus).toHaveBeenCalledTimes(2);
  });
  it.each(["cancellation", "disposal", "expiry"])(
    "aborts on %s and prevents late status from authorizing a new review even with reused IDs",
    async (exit) => {
      const { flow, scope, notify } = mountFlow();
      const response = prepared();
      if (!response.success) throw new Error("Expected successful fixture");
      response.review.expiresAt = new Date(Date.now() + 1000);
      api.prepareDraft.mockResolvedValueOnce(response);
      const pending =
        Promise.withResolvers<
          ReturnType<typeof Dto.conversationEmailUpdateTestStatusResponse.parse>
        >();
      const signals: AbortSignal[] = [];
      api.getTestStatus.mockImplementationOnce(
        ({ signal }: { signal: AbortSignal }) => {
          signals.push(signal);
          return pending.promise;
        }
      );
      await flow.prepare(request);
      await flow.sendTest();
      await vi.advanceTimersByTimeAsync(0);
      expect(signals[0]?.aborted).toBe(false);
      if (exit === "cancellation") {
        const cancellation = Promise.withResolvers<{ success: true }>();
        api.cancelDraft.mockReturnValueOnce(cancellation.promise);
        const leave = flow.leave();
        await vi.advanceTimersByTimeAsync(0);
        expect(signals[0]?.aborted).toBe(true);
        cancellation.resolve({ success: true });
        await leave;
      } else if (exit === "disposal") {
        scope.stop();
      } else {
        await vi.advanceTimersByTimeAsync(1000);
        expect(flow.review.value?.test.kind).toBe("invalid");
        expect(signals[0]?.aborted).toBe(true);
        await flow.retryTestStatus();
        await flow.send();
        expect(api.send).not.toHaveBeenCalled();
        await flow.leave();
      }
      await vi.advanceTimersByTimeAsync(1);
      expect(signals[0]?.aborted).toBe(true);
      expect(
        queryClient.getQueryCache().findAll({
          queryKey: ["conversationEmailUpdateTestStatus", updateId],
        })
      ).toHaveLength(0);

      const nextFlow = exit === "disposal" ? mountFlow().flow : flow;
      api.getTestStatus.mockResolvedValue({
        success: true,
        status: { state: "pending" },
      });
      await nextFlow.prepare(request);
      await nextFlow.sendTest();
      await vi.advanceTimersByTimeAsync(0);
      expect(api.getTestStatus).toHaveBeenCalledTimes(2);
      pending.resolve({
        success: true,
        status: { state: "provider_accepted", providerAcceptedAt: new Date() },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(nextFlow.review.value?.test).toEqual({
        kind: "polling",
        testAttemptId,
      });
      expect(notify).not.toHaveBeenCalledWith({ kind: "test-accepted" });
      await nextFlow.send();
      expect(api.send).not.toHaveBeenCalled();
    }
  );
  it.each([
    {
      response: {
        success: true,
        status: { state: "failed", reason: "unknown" },
      },
      kind: "untested",
      reason: "unknown",
    },
    {
      response: { success: false, reason: "test_not_found" },
      kind: "untested",
      reason: "test_not_found",
    },
    {
      response: { success: false, reason: "review_cancelled" },
      kind: "invalid",
      reason: "review_cancelled",
    },
  ])(
    "applies terminal test failure $reason and stops polling",
    async ({ response, kind, reason }) => {
      const { flow, notify } = mountFlow();
      api.getTestStatus.mockResolvedValue(
        Dto.conversationEmailUpdateTestStatusResponse.parse(response)
      );
      await flow.prepare(request);
      await flow.sendTest();
      await vi.advanceTimersByTimeAsync(0);
      expect(flow.review.value?.test.kind).toBe(kind);
      expect(flow.testStatusFailed.value).toBe(false);
      expect(notify).toHaveBeenCalledWith({ kind: "dto", error: { reason } });
      await vi.advanceTimersByTimeAsync(10_000);
      expect(api.getTestStatus).toHaveBeenCalledTimes(1);
      await flow.send();
      expect(api.send).not.toHaveBeenCalled();
    }
  );
  it("prepares once and binds test and final send to the backend snapshot", async () => {
    const { flow, onSent } = mountFlow();
    await flow.prepare(request);
    await flow.prepare(request);
    expect(api.prepareDraft).toHaveBeenCalledTimes(1);
    expect(api.prepareDraft).toHaveBeenCalledWith({
      selection: { kind: "no_project", conversationSlugId: "conv000001" },
      subject: "Subject",
      bodyHtml: "<p>Message</p>",
    });
    const testing = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await testing;
    expect(api.sendTest).toHaveBeenCalledWith({
      updateId,
      requestId: expect.any(String),
    });
    expect(flow.review.value?.test).toEqual({
      kind: "accepted",
      testAttemptId,
    });
    const record = { updateId, subject: "Sent" };
    api.send.mockResolvedValue({ success: true, record });
    await flow.send();
    expect(api.send).toHaveBeenCalledWith({
      updateId,
      testAttemptId,
      displayedParticipantEstimate: 27,
      contentPolicyAcknowledged: true,
    });
    expect(onSent).toHaveBeenCalledWith(record);
    expect(flow.state.value.kind).toBe("composing");
  });
  it("reuses the same UUID after a transport failure but uses a new one for another test", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    api.sendTest.mockRejectedValueOnce(new Error("Network"));
    await flow.sendTest();
    const first = api.sendTest.mock.calls[0];
    expect(flow.review.value?.test.kind).toBe("retry");
    const retry = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await retry;
    expect(api.sendTest.mock.calls[1]).toEqual(first);
    const another = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await another;
    expect(api.sendTest.mock.calls[2]).not.toEqual(first);
  });
  it("waits for cancellation and invalidates a successful test even for identical content", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const test = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await test;
    const cancellation = Promise.withResolvers<{ success: true }>();
    api.cancelDraft.mockReturnValueOnce(cancellation.promise);
    const leave = flow.leave();
    expect(flow.state.value.kind).toBe("cancelling");
    await flow.send();
    expect(api.send).not.toHaveBeenCalled();
    cancellation.resolve({ success: true });
    expect(await leave).toBe(true);
    api.prepareDraft.mockResolvedValue(
      prepared("00000000-0000-4000-8000-000000000003")
    );
    await flow.prepare(request);
    expect(flow.review.value?.test).toEqual({ kind: "untested" });
    expect(flow.review.value?.testRequested).toBe(false);
    await flow.send();
    expect(api.send).not.toHaveBeenCalled();
  });
  it("keeps the review and accepted test when cancellation fails and allows retry", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const test = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await test;
    api.cancelDraft.mockRejectedValueOnce(new Error("Network"));
    expect(await flow.leave()).toBe(false);
    expect(flow.state.value.kind).toBe("review");
    expect(flow.review.value?.test.kind).toBe("accepted");
    expect(flow.error.value).toBe("cancelError");
    expect(await flow.leave()).toBe(true);
  });
  it("does not resurrect prepare after navigation and cancels the stale result", async () => {
    const { flow } = mountFlow();
    const pending = Promise.withResolvers<ReturnType<typeof prepared>>();
    api.prepareDraft.mockReturnValueOnce(pending.promise);
    const prepare = flow.prepare(request);
    expect(await flow.leave()).toBe(true);
    pending.resolve(prepared());
    await prepare;
    expect(flow.state.value.kind).toBe("composing");
    expect(api.cancelDraft).toHaveBeenCalledWith({ updateId });
  });
  it("cancels prepare returned after disposal", async () => {
    const { flow, scope } = mountFlow();
    const pending = Promise.withResolvers<ReturnType<typeof prepared>>();
    api.prepareDraft.mockReturnValueOnce(pending.promise);
    const prepare = flow.prepare(request);
    scope.stop();
    pending.resolve(prepared());
    await prepare;
    expect(api.cancelDraft).toHaveBeenCalledWith({ updateId });
    expect(flow.review.value).toBeUndefined();
  });
  it("ignores pending test results after cancellation", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const pending = Promise.withResolvers<unknown>();
    api.sendTest.mockReturnValueOnce(pending.promise);
    const test = flow.sendTest();
    await flow.leave();
    pending.resolve({
      success: true,
      updateId,
      testAttemptId,
      status: "pending",
    });
    await test;
    expect(flow.state.value.kind).toBe("composing");
    expect(api.getTestStatus).not.toHaveBeenCalled();
  });
  it("blocks dismissal and duplicate sends while final send is pending", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const test = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await test;
    const pending = Promise.withResolvers<unknown>();
    api.send.mockReturnValueOnce(pending.promise);
    const send = flow.send();
    await flow.send();
    expect(api.send).toHaveBeenCalledTimes(1);
    expect(await flow.leave()).toBe(false);
    expect(api.cancelDraft).not.toHaveBeenCalled();
    pending.resolve({
      success: false,
      reason: "required_owner_copy_unavailable",
    });
    await send;
    expect(flow.state.value.kind).toBe("review");
  });
  it.each(["review_required", "review_expired", "review_cancelled"])(
    "disables test and send for %s",
    async (reason) => {
      const { flow, notify } = mountFlow();
      await flow.prepare(request);
      api.sendTest.mockResolvedValueOnce({ success: false, error: { reason } });
      await flow.sendTest();
      await flow.sendTest();
      await flow.send();
      expect(flow.review.value?.test.kind).toBe("invalid");
      expect(api.sendTest).toHaveBeenCalledTimes(1);
      expect(api.send).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith({ kind: "dto", error: { reason } });
    }
  );
  it("handles prepare validation failures without entering review", async () => {
    const { flow, notify } = mountFlow();
    api.prepareDraft.mockResolvedValueOnce({
      success: false,
      error: { reason: "sending_disabled" },
    });
    await flow.prepare(request);
    expect(flow.state.value.kind).toBe("composing");
    expect(flow.error.value).toBe("prepareError");
    expect(notify).toHaveBeenCalledWith({
      kind: "dto",
      error: { reason: "sending_disabled" },
    });
  });
  it("expires the review locally and cannot restore authorization from a late test response", async () => {
    const { flow } = mountFlow();
    const response = prepared();
    if (!response.success) throw new Error("Expected successful fixture");
    response.review.expiresAt = new Date(Date.now() + 1000);
    api.prepareDraft.mockResolvedValue(response);
    await flow.prepare(request);
    const pending = Promise.withResolvers<unknown>();
    api.sendTest.mockReturnValueOnce(pending.promise);
    const test = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1000);
    expect(flow.review.value?.test.kind).toBe("invalid");
    pending.resolve({
      success: true,
      updateId,
      testAttemptId,
      status: "pending",
    });
    await test;
    expect(flow.review.value?.test.kind).toBe("invalid");
    await flow.send();
    expect(api.send).not.toHaveBeenCalled();
  });
  it("exposes the entire review as deeply readonly", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    expect(isReadonly(flow.review.value)).toBe(true);
    expect(isReadonly(flow.review.value?.snapshot)).toBe(true);
    expect(isReadonly(flow.review.value?.snapshot.preview)).toBe(true);
    expect(isReadonly(flow.review.value?.snapshot.branding)).toBe(true);
    expect(isReadonly(flow.review.value?.test)).toBe(true);
  });
  it("retains the exact unknown final send through expiry and retries it without another test", async () => {
    const { flow, notify, onSent } = mountFlow();
    const response = prepared();
    if (!response.success) throw new Error("Expected successful fixture");
    response.review.expiresAt = new Date(Date.now() + 3000);
    api.prepareDraft.mockResolvedValue(response);
    await flow.prepare(request);
    const testing = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await testing;
    api.send.mockRejectedValueOnce(new Error("Accepted response lost"));
    await flow.send();
    expect(flow.review.value?.test).toEqual({
      kind: "send-unknown",
      testAttemptId,
    });
    expect(notify).toHaveBeenLastCalledWith({
      kind: "transport",
      operation: "send",
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(flow.review.value?.test).toEqual({
      kind: "send-unknown",
      testAttemptId,
    });
    await flow.sendTest();
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    api.send.mockResolvedValueOnce({ success: true, record: deliveredRecord });
    await flow.send();
    expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0]);
    expect(onSent).toHaveBeenCalledExactlyOnceWith(deliveredRecord);
    expect(flow.state.value.kind).toBe("composing");
  });
  it("reconciles an accepted unknown send on leave instead of trapping cancellation retries", async () => {
    const { flow, onSent } = mountFlow();
    const response = prepared();
    if (!response.success) throw new Error("Expected successful fixture");
    response.review.expiresAt = new Date(Date.now() + 3000);
    api.prepareDraft.mockResolvedValue(response);
    await flow.prepare(request);
    const testing = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await testing;
    api.send.mockRejectedValueOnce(new Error("Accepted response lost"));
    await flow.send();
    await vi.advanceTimersByTimeAsync(2000);
    expect(flow.review.value?.test.kind).toBe("send-unknown");
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "delivery_already_accepted",
    });
    const pending =
      Promise.withResolvers<
        ReturnType<
          typeof Dto.conversationEmailUpdateHistoryDetailResponse.parse
        >
      >();
    api.getHistoryDetail.mockReturnValueOnce(pending.promise);
    const leave = flow.leave();
    await vi.advanceTimersByTimeAsync(0);
    expect(flow.state.value.kind).toBe("reconciling");
    expect(flow.review.value?.test.kind).toBe("delivery-accepted");
    expect(flow.busy.value).toBe(true);
    await flow.sendTest();
    await flow.send();
    expect(api.sendTest).toHaveBeenCalledTimes(1);
    expect(api.send).toHaveBeenCalledTimes(1);
    pending.resolve(
      Dto.conversationEmailUpdateHistoryDetailResponse.parse({
        success: true,
        record: deliveredRecord,
      })
    );
    expect(await leave).toBe(true);
    expect(api.getHistoryDetail).toHaveBeenCalledWith({ updateId });
    expect(onSent).toHaveBeenCalledExactlyOnceWith(deliveredRecord);
    expect(flow.error.value).toBeUndefined();
  });
  it.each(["transport", "not-found"])(
    "keeps a known accepted delivery retryable when history lookup fails: %s",
    async (failure) => {
      const { flow, onSent } = mountFlow();
      await flow.prepare(request);
      api.cancelDraft.mockResolvedValueOnce({
        success: false,
        reason: "delivery_already_accepted",
      });
      if (failure === "transport")
        api.getHistoryDetail.mockRejectedValueOnce(new Error("Offline"));
      else
        api.getHistoryDetail.mockResolvedValueOnce({
          success: false,
          reason: "update_not_found",
        });
      expect(await flow.leave()).toBe(false);
      expect(flow.review.value?.test.kind).toBe("delivery-accepted");
      expect(flow.error.value).toBe("reconcileError");
      flow.dismissExitError();
      expect(flow.error.value).toBe("reconcileError");
      await flow.sendTest();
      await flow.send();
      expect(api.sendTest).not.toHaveBeenCalled();
      expect(api.send).not.toHaveBeenCalled();
      expect(await flow.leave()).toBe(true);
      expect(api.cancelDraft).toHaveBeenCalledTimes(1);
      expect(api.getHistoryDetail).toHaveBeenCalledTimes(2);
      expect(onSent).toHaveBeenCalledExactlyOnceWith(deliveredRecord);
    }
  );
  it("reconciles a definitive already-accepted test response", async () => {
    const { flow, onSent } = mountFlow();
    await flow.prepare(request);
    api.sendTest.mockResolvedValueOnce({
      success: false,
      error: { reason: "delivery_already_accepted" },
    });
    await flow.sendTest();
    expect(api.getHistoryDetail).toHaveBeenCalledWith({ updateId });
    expect(onSent).toHaveBeenCalledExactlyOnceWith(deliveredRecord);
    expect(flow.state.value.kind).toBe("composing");
  });
  it("allows safe exit when cancellation says the review no longer exists", async () => {
    const { flow, notify } = mountFlow();
    await flow.prepare(request);
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "review_not_found",
    });
    expect(await flow.leave()).toBe(true);
    expect(flow.state.value.kind).toBe("composing");
    expect(flow.error.value).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });
  it("clears only cancellation feedback on Stay without modifying test authorization", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const testing = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await testing;
    const before = flow.review.value;
    api.cancelDraft.mockRejectedValueOnce(new Error("Offline"));
    await flow.leave();
    expect(flow.error.value).toBe("cancelError");
    flow.dismissExitError();
    expect(flow.error.value).toBeUndefined();
    expect(flow.review.value?.snapshot).toBe(before?.snapshot);
    expect(flow.review.value?.test).toEqual(before?.test);
    expect(flow.review.value?.testRequested).toBe(true);
  });
  it("distinguishes definitive DTO rejection from a pending idempotent test retry", async () => {
    const { flow, notify } = mountFlow();
    await flow.prepare(request);
    api.sendTest.mockRejectedValueOnce(new Error("Lost response"));
    await flow.sendTest();
    expect(notify).toHaveBeenLastCalledWith({
      kind: "transport",
      operation: "test",
    });
    const firstRequest = api.sendTest.mock.calls[0];
    api.getTestStatus.mockResolvedValueOnce({
      success: true,
      status: { state: "pending" },
    });
    const retry = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    expect(flow.review.value?.test).toEqual({ kind: "polling", testAttemptId });
    await flow.sendTest();
    expect(api.sendTest).toHaveBeenCalledTimes(2);
    expect(api.sendTest.mock.calls[1]).toEqual(firstRequest);
    await vi.advanceTimersByTimeAsync(1500);
    await retry;
    const failure = Dto.conversationEmailUpdateSendTestResponse.parse({
      success: false,
      error: { reason: "test_rate_limited", retryAt: new Date() },
    });
    api.sendTest.mockResolvedValueOnce(failure);
    await flow.sendTest();
    expect(flow.review.value?.test.kind).toBe("untested");
    if (!failure.success)
      expect(notify).toHaveBeenLastCalledWith({
        kind: "dto",
        error: failure.error,
      });
  });
  it("does not let a late test response overwrite definitive delivery acceptance", async () => {
    const { flow } = mountFlow();
    await flow.prepare(request);
    const pendingTest =
      Promise.withResolvers<
        ReturnType<typeof Dto.conversationEmailUpdateSendTestResponse.parse>
      >();
    const pendingHistory =
      Promise.withResolvers<
        ReturnType<
          typeof Dto.conversationEmailUpdateHistoryDetailResponse.parse
        >
      >();
    api.sendTest.mockReturnValueOnce(pendingTest.promise);
    api.getHistoryDetail.mockReturnValueOnce(pendingHistory.promise);
    const test = flow.sendTest();
    api.cancelDraft.mockResolvedValueOnce({
      success: false,
      reason: "delivery_already_accepted",
    });
    const leave = flow.leave();
    await vi.advanceTimersByTimeAsync(0);
    pendingTest.resolve({
      success: true,
      updateId,
      testAttemptId,
      status: "pending",
    });
    await test;
    expect(flow.review.value?.test.kind).toBe("delivery-accepted");
    expect(api.getTestStatus).not.toHaveBeenCalled();
    pendingHistory.resolve({ success: true, record: deliveredRecord });
    expect(await leave).toBe(true);
  });
  it("does not fire a best-effort cancellation on disposal for an unknown final send", async () => {
    const { flow, scope } = mountFlow();
    await flow.prepare(request);
    const test = flow.sendTest();
    await vi.advanceTimersByTimeAsync(1500);
    await test;
    api.send.mockRejectedValueOnce(new Error("Response lost"));
    await flow.send();
    scope.stop();
    expect(api.cancelDraft).not.toHaveBeenCalled();
  });
});
import { focusManager, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
