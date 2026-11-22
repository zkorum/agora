import { QueryClient, QueryObserver } from "@tanstack/vue-query";
import { Dto, type FetchProjectPageResponse } from "src/shared/types/dto";
import { zodSSEConversationQvStatsUpdatedData } from "src/shared/types/sse";
import type { ExtendedConversation } from "src/shared/types/zod";
import type { ConversationMetadata } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  acceptQvResultRead,
  beginQvLifecycleChange,
  getQvCalculationFrontier,
  reconcileQvCalculationLifecycle,
  retainQvCalculationEvent,
  settleQvLifecycleChange,
} from "./qvCalculationState";
import {
  applyQvStats,
  clearRetainedQvStats,
  getRetainedQvStats,
  invalidateProjectQvStats,
  reconcileQvStats,
  retainQvStats,
} from "./qvStatsUpdate";

function conversation({
  revision = 1,
  count = 2,
  isClosed = false,
}: {
  revision?: number;
  count?: number;
  isClosed?: boolean;
} = {}) {
  const metadata = {
    conversationSlugId: "qvtest01",
    participantStatements: { supported: false },
    conversationType: "prioritizing",
    prioritizationType: "qv",
    creditPricing: "quadratic",
    allowOpposition: true,
    qvStatsRevision: revision,
    participantCount: count,
    totalParticipantCount: count,
    opinionCount: 4,
    totalOpinionCount: 4,
    voteCount: 0,
    totalVoteCount: 0,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
    createdAt: new Date(),
    lastReactedAt: new Date(),
    authorUsername: "author",
    participationMode: "guest",
    isIndexed: true,
    aiLabelingEnabled: false,
    preferredOpinionGroupCount: null,
    isClosed,
    isFinalizing: false,
    isEdited: false,
    moderation: { status: "unmoderated" },
    externalSourceConfig: null,
    contentLanguageMetadata: {
      detectedDisplayLanguageCode: null,
      detectedSourceLanguageCode: null,
      detectedRawLanguageCode: null,
      detectionConfidence: null,
      autoDetectionStatus: "not_attempted",
    },
    languageSetting: {
      mode: "auto",
      languageCode: null,
      detectedLanguageCode: null,
      detectedSourceLanguageCode: null,
      detectedRawLanguageCode: null,
      detectionConfidence: null,
      autoDetectionStatus: "not_attempted",
    },
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
  } satisfies ConversationMetadata;
  return { metadata, privateDraft: [3, -2], currentResult: "untouched" };
}

const update = {
  conversationSlugId: "qvtest01",
  qvStatsRevision: 7,
  participantCount: 8,
};
describe("QV participant-only live reconciliation", () => {
  it("invalidates the known project without invalidating unrelated cached projects", () => {
    const queryClient = new QueryClient();
    const data: ExtendedConversation = {
      metadata: { ...conversation().metadata, currentProjectSlug: "project-a" },
      payload: { title: "QV", body: "" },
      interaction: {
        hasVoted: false,
        votedIndex: 0,
        conversationCapabilities: {
          canEdit: false,
          canDelete: false,
          canModerate: false,
          canClose: false,
          canReopen: false,
        },
      },
    };
    queryClient.setQueryData(["conversation", "qvtest01"], data);
    // No body is needed here: the known detail establishes the relationship even
    // when this activity falls outside the project's loaded page.
    queryClient.setQueryData(["projectPage", "project-a"], { activities: [] });
    queryClient.setQueryData(["projectPage", "project-b"], { activities: [] });
    invalidateProjectQvStats({ queryClient, conversationSlugId: "qvtest01" });
    expect(
      queryClient.getQueryState(["projectPage", "project-a"])?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(["projectPage", "project-b"])?.isInvalidated
    ).toBe(false);
    queryClient.clear();
  });
  it("refreshes only visible projects when an off-page activity has no cached relationship", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["projectPage", "inactive"], { activities: [] });
    const observer = new QueryObserver<
      Pick<FetchProjectPageResponse, "activities">
    >(queryClient, {
      queryKey: ["projectPage", "visible"],
      queryFn: () => Promise.resolve({ activities: [] }),
      initialData: { activities: [] },
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});
    invalidateProjectQvStats({ queryClient, conversationSlugId: "unknown1" });
    expect(
      queryClient.getQueryState(["projectPage", "inactive"])?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(["projectPage", "inactive"])?.fetchStatus
    ).toBe("idle");
    expect(
      queryClient.getQueryState(["projectPage", "visible"])?.isInvalidated
    ).toBe(true);
    unsubscribe();
    queryClient.clear();
  });
  it("fences old lifecycle metadata independently of participant statistics", () => {
    const queryClient = new QueryClient();
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: "qvtest01", generation: 2, status: "open" },
    });
    const before = conversation({ isClosed: true, revision: 8, count: 5 });
    const after = reconcileQvCalculationLifecycle({
      queryClient,
      conversation: {
        ...before,
        metadata: { ...before.metadata, qvGeneration: 1 },
      },
    });
    expect(after.metadata).toMatchObject({
      qvGeneration: 2,
      isClosed: false,
      isFinalizing: false,
      participantCount: 5,
      qvStatsRevision: 8,
    });
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: "qvtest01", generation: 3, status: "ready" },
    });
    expect(
      reconcileQvCalculationLifecycle({
        queryClient,
        conversation: {
          ...before,
          metadata: { ...before.metadata, qvGeneration: 3, isFinalizing: true },
        },
      }).metadata.isFinalizing
    ).toBe(false);
    expect(
      reconcileQvCalculationLifecycle({
        queryClient,
        conversation: {
          ...before,
          metadata: {
            ...before.metadata,
            qvGeneration: 3,
            isClosed: false,
            isFinalizing: false,
          },
        },
      }).metadata.isClosed
    ).toBe(true);
  });
  it("does not treat optimistic metadata as a newer server lifecycle phase", () => {
    const queryClient = new QueryClient();
    const slug = "qvtest01";
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: slug, generation: 2, status: "open" },
    });
    const change = beginQvLifecycleChange({ queryClient, slug });
    const optimistic = conversation({ isClosed: true });
    reconcileQvCalculationLifecycle({
      queryClient,
      conversation: {
        ...optimistic,
        metadata: {
          ...optimistic.metadata,
          qvGeneration: 2,
          isFinalizing: true,
        },
      },
    });
    settleQvLifecycleChange({ queryClient, slug, change });
    expect(getQvCalculationFrontier({ queryClient, slug }).status).toBe("open");
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: change.epoch,
        result: { status: "open", generation: 2 },
      })
    ).toBeDefined();
  });
  it("does not mark an accepted fallback as initial finalization", () => {
    const queryClient = new QueryClient();
    const before = conversation({ isClosed: true, count: 5 });
    acceptQvResultRead({
      queryClient,
      slug: "qvtest01",
      epoch: 0,
      result: Dto.qvResultsResponse.parse({
        status: "ready",
        generation: 2,
        calculationId: "00000000-0000-4000-8000-000000000001",
        capturedAt: new Date(),
        participantCount: 3,
        items: [],
        refreshStatus: "calculating",
      }),
    });
    const after = reconcileQvCalculationLifecycle({
      queryClient,
      conversation: {
        ...before,
        metadata: { ...before.metadata, qvGeneration: 1, isFinalizing: true },
      },
    });
    expect(after.metadata).toMatchObject({
      qvGeneration: 2,
      isClosed: true,
      isFinalizing: false,
      participantCount: 5,
    });
  });
  it.each([false, true])("changes counts only, while closed=%s", (isClosed) => {
    const before = conversation({ isClosed });
    const after = applyQvStats({ conversation: before, data: update });
    expect(after).toEqual({
      ...before,
      metadata: {
        ...before.metadata,
        participantCount: 8,
        totalParticipantCount: 8,
        qvStatsRevision: 7,
      },
    });
    expect(after.privateDraft).toBe(before.privateDraft);
  });
  it("ignores duplicate, older and other-conversation events", () => {
    const before = conversation({ revision: 7 });
    for (const data of [
      update,
      { ...update, qvStatsRevision: 6 },
      { ...update, conversationSlugId: "other001" },
    ]) {
      expect(applyQvStats({ conversation: before, data })).toBe(before);
    }
  });
  it("retains an event before a cache exists and fences late HTTP/feed responses", () => {
    const queryClient = new QueryClient();
    expect(retainQvStats({ queryClient, data: update })).toBe(true);
    const after = reconcileQvStats({
      queryClient,
      conversation: conversation(),
    });
    expect(after.metadata.participantCount).toBe(8);
    reconcileQvStats({
      queryClient,
      conversation: conversation({ revision: 9, count: 5 }),
    });
    expect(retainQvStats({ queryClient, data: update })).toBe(false);
    expect(
      reconcileQvStats({ queryClient, conversation: conversation() }).metadata
        .participantCount
    ).toBe(5);
    clearRetainedQvStats(queryClient);
    expect(
      reconcileQvStats({ queryClient, conversation: conversation() }).metadata
        .participantCount
    ).toBe(2);
  });
  it("isolates query clients and accepts decreasing counts at newer revisions", () => {
    const queryClient = new QueryClient();
    retainQvStats({ queryClient, data: { ...update, participantCount: 0 } });
    expect(
      reconcileQvStats({ queryClient, conversation: conversation() }).metadata
        .participantCount
    ).toBe(0);
    expect(
      reconcileQvStats({
        queryClient: new QueryClient(),
        conversation: conversation(),
      }).metadata.participantCount
    ).toBe(2);
  });
  it("can reconcile an older display even when another HTTP read already retained the event", () => {
    const queryClient = new QueryClient();
    reconcileQvStats({
      queryClient,
      conversation: conversation({ revision: 9, count: 5 }),
    });
    expect(retainQvStats({ queryClient, data: update })).toBe(false);
    const data = getRetainedQvStats({
      queryClient,
      conversationSlugId: update.conversationSlugId,
    });
    if (data === undefined) throw new Error("Missing retained QV count");
    expect(
      applyQvStats({ conversation: conversation(), data }).metadata
        .participantCount
    ).toBe(5);
  });
  it("rejects lifecycle/result fields and extra aggregate counters at the event boundary", () => {
    expect(zodSSEConversationQvStatsUpdatedData.parse(update)).toEqual(update);
    for (const field of [
      "isClosed",
      "isFinalizing",
      "resultId",
      "voteCount",
      "creditsSpent",
      "allocationCount",
    ]) {
      expect(
        zodSSEConversationQvStatsUpdatedData.safeParse({
          ...update,
          [field]: 1,
        }).success
      ).toBe(false);
    }
  });
});
