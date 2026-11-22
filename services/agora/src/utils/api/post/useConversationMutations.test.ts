import {
  QueryClient,
  QueryObserver,
  VueQueryPlugin,
} from "@tanstack/vue-query";
import { createPinia } from "pinia";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type {
  CloseConversationResponse,
  OpenConversationResponse,
  UpdateConversationRequest,
  UpdateConversationResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type {
  ConversationTypeConfig,
  ExtendedConversation,
  PolisVotingPresentation,
} from "src/shared/types/zod";
import { zodConversationMetadata } from "src/shared/types/zod";
import { applyConversationTypeConfig } from "src/shared/utils/conversationTypeConfig";
import {
  applyParticipantStatements,
  defaultConversationStatementSettings,
} from "src/shared/utils/participantStatements";
import { useAuthenticationStore } from "src/stores/authentication";
import { getConversationQueryKey } from "src/utils/query/conversationQueryKeys";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h } from "vue";
import { createI18n } from "vue-i18n";

const mocks = vi.hoisted(() => ({
  save: vi.fn<
    (request: UpdateConversationRequest) => Promise<UpdateConversationResponse>
  >(),
  fetch: vi.fn<() => Promise<ConversationDetail>>(),
  close: vi.fn<() => Promise<CloseConversationResponse>>(),
  open: vi.fn<() => Promise<OpenConversationResponse>>(),
  results:
    vi.fn<() => Promise<ReturnType<typeof Dto.qvResultsResponse.parse>>>(),
}));
vi.mock("./qv", () => ({ useQvApi: () => ({ results: mocks.results }) }));
vi.mock("./postEdit", () => ({
  useBackendPostEditApi: () => ({ updateConversation: mocks.save }),
}));
vi.mock("./post", () => ({
  useBackendPostApi: () => ({
    fetchConversationBySlugIdWithDisplayContent: mocks.fetch,
    closeConversation: mocks.close,
    openConversation: mocks.open,
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: vi.fn() }),
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({ profileData: { userCommentList: [] } }),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  const { ref } = await import("vue");
  return {
    useLanguageStore: defineStore("language", () => ({
      displayLanguage: ref<SupportedDisplayLanguageCodes>("en"),
      spokenLanguages: ref<SupportedSpokenLanguageCodes[]>(["en"]),
    })),
  };
});

import { getQvCalculationFrontier } from "./qvCalculationState";
import {
  useCloseConversationMutation,
  useOpenConversationMutation,
  useUpdateConversationMutation,
} from "./useConversationMutations";
import {
  applyConversationRankingStatsUpdate,
  type ConversationDetail,
  useConversationQuery,
} from "./useConversationQuery";
import { useQvResults } from "./useQvResults";

const slug = "conv1234";
const viewerScope = {
  kind: "viewer",
  userId: "00000000-0000-4000-8000-000000000001",
} satisfies ViewerQueryScope;
const key = getConversationQueryKey({
  conversationSlugId: slug,
  displayLanguage: "en",
  spokenLanguages: ["en"],
  viewerScope,
});
const translatedKey = getConversationQueryKey({
  conversationSlugId: slug,
  displayLanguage: "fr",
  spokenLanguages: ["en"],
  viewerScope,
});
const legacyKey = ["conversation", slug];
const otherKey = ["conversation", "other123"];
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.clearAllMocks();
});

function conversation(config: ConversationTypeConfig): ConversationDetail {
  return {
    conversationData: {
      metadata: zodConversationMetadata.parse({
        ...config,
        participantStatements:
          defaultConversationStatementSettings(config).participantStatements,
        conversationSlugId: slug,
        createdAt: new Date("2026-01-01"),
        lastReactedAt: new Date("2026-01-01"),
        opinionCount: 0,
        voteCount: 0,
        participantCount: 0,
        totalOpinionCount: 0,
        totalVoteCount: 0,
        totalParticipantCount: 0,
        moderatedOpinionCount: 0,
        hiddenOpinionCount: 0,
        authorUsername: "author",
        participationMode: "account_required",
        isIndexed: true,
        aiLabelingEnabled: false,
        preferredOpinionGroupCount: null,
        isClosed: false,
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
      }),
      interaction: {
        hasVoted: false,
        votedIndex: 0,
        conversationCapabilities: {
          canEdit: true,
          canDelete: true,
          canModerate: true,
          canClose: true,
          canReopen: false,
        },
      },
    },
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000002",
      status: "available",
      mode: "original",
      content: { title: "Title", body: "Body" },
      translationControl: null,
    },
  };
}

function mountMutation(config: ConversationTypeConfig) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
  });
  const original = conversation(config);
  mocks.fetch.mockResolvedValue(original);
  queryClient.setQueryData<ConversationDetail>(key, original);
  queryClient.setQueryData<ConversationDetail>(translatedKey, original);
  const legacy: ExtendedConversation = {
    ...original.conversationData,
    payload: { title: "Title", body: "Body" },
  };
  queryClient.setQueryData<ExtendedConversation>(legacyKey, legacy);
  const other = conversation({
    conversationType: "polis",
    votingPresentation: "list",
  });
  other.conversationData.metadata.conversationSlugId = "other123";
  queryClient.setQueryData<ConversationDetail>(otherKey, other);

  const pinia = createPinia();
  const auth = useAuthenticationStore(pinia);
  auth.setLoginStatus({
    isKnown: true,
    isRegistered: true,
    isLoggedIn: true,
    userId: viewerScope.userId,
  });
  const target = document.createElement("div");
  document.body.append(target);
  let mutation: ReturnType<typeof useUpdateConversationMutation> | undefined;
  let lifecycle:
    | {
        close: ReturnType<typeof useCloseConversationMutation>;
        open: ReturnType<typeof useOpenConversationMutation>;
      }
    | undefined;
  let qvResults: ReturnType<typeof useQvResults> | undefined;
  const app = createApp({
    setup() {
      mutation = useUpdateConversationMutation();
      lifecycle = {
        close: useCloseConversationMutation(),
        open: useOpenConversationMutation(),
      };
      if (
        config.conversationType === "prioritizing" &&
        config.prioritizationType === "qv"
      ) {
        qvResults = useQvResults(slug);
      }
      const query = useConversationQuery({
        conversationSlugId: slug,
        enabled: () => auth.isLoggedIn,
      });
      return () => {
        const metadata = query.data.value?.conversationData.metadata;
        return h(
          "div",
          metadata === undefined
            ? "loading"
            : metadata.conversationType === "polis"
              ? metadata.votingPresentation
              : "ranking"
        );
      };
    },
  });
  app.use(pinia);
  app.use(createI18n({ legacy: false, locale: "en" }));
  app.use(VueQueryPlugin, { queryClient });
  app.mount(target);
  cleanups.push(() => {
    app.unmount();
    target.remove();
    queryClient.clear();
  });
  if (mutation === undefined) throw new Error("Mutation did not mount");
  if (lifecycle === undefined)
    throw new Error("Lifecycle mutations did not mount");

  return {
    mutation,
    lifecycle,
    queryClient,
    target,
    original,
    legacy,
    other,
    auth,
    qvResults,
  };
}

function request(
  conversationTypeConfig: UpdateConversationRequest["conversationTypeConfig"]
): UpdateConversationRequest {
  return {
    conversationSlugId: slug,
    conversationTitle: "Title",
    conversationBody: "Body",
    isIndexed: true,
    participationMode: "account_required",
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    languageSettingsSource: "conversation_override",
    conversationTypeConfig,
  };
}

describe("conversation lifecycle freshness", () => {
  it.each(["close", "open"] as const)(
    "reconciles a failed %s despite fresh ready results and preserves newer cache updates",
    async (operation) => {
      mocks.results.mockResolvedValue(
        Dto.qvResultsResponse.parse({
          status: "ready",
          generation: 1,
          calculationId: "00000000-0000-4000-8000-000000000003",
          capturedAt: new Date(),
          participantCount: 1,
          items: [],
        })
      );
      const { lifecycle, queryClient, qvResults } = mountMutation({
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        allowOpposition: true,
      });
      await vi.waitFor(() =>
        expect(qvResults?.ready.value?.status).toBe("ready")
      );
      // Let the generation-key switch settle before checking request counts.
      await vi.waitFor(() =>
        expect(qvResults?.query.isFetching.value).toBe(false)
      );
      const readsBefore = mocks.results.mock.calls.length;
      const response = Promise.withResolvers<{ success: true }>();
      const refreshed = Promise.withResolvers<ConversationDetail>();
      mocks.fetch.mockReturnValue(refreshed.promise);
      mocks[operation].mockReturnValue(response.promise);
      const saving = lifecycle[operation].mutateAsync({
        conversationSlugId: slug,
      });
      const rejected = expect(saving).rejects.toThrow("Offline");
      await vi.waitFor(() => expect(mocks[operation]).toHaveBeenCalledOnce());
      expect(qvResults?.ready.value).toBeUndefined();
      queryClient.setQueryData<ConversationDetail>(key, (data) =>
        data === undefined
          ? data
          : {
              ...data,
              conversationData: {
                ...data.conversationData,
                metadata: {
                  ...data.conversationData.metadata,
                  participantCount: 7,
                },
                interaction: {
                  ...data.conversationData.interaction,
                  conversationCapabilities: {
                    ...data.conversationData.interaction
                      .conversationCapabilities,
                    canEdit: false,
                  },
                },
              },
            }
      );
      response.reject(new Error("Offline"));
      await rejected;
      expect(
        queryClient.getQueryData<ConversationDetail>(key)?.conversationData
          .metadata.participantCount
      ).toBe(7);
      expect(
        queryClient.getQueryData<ConversationDetail>(key)?.conversationData
          .interaction.conversationCapabilities.canEdit
      ).toBe(false);
      await vi.waitFor(() => {
        expect(mocks.results.mock.calls.length).toBeGreaterThan(readsBefore);
        expect(qvResults?.ready.value?.status).toBe("ready");
        expect(
          getQvCalculationFrontier({ queryClient, slug }).requiresFreshRead
        ).toBe(false);
      });
    }
  );
  it.each(["close", "open"] as const)(
    "refreshes server permissions after %s without inventing the reverse permission",
    async (operation) => {
      const { lifecycle, queryClient } = mountMutation({
        conversationType: "polis",
        votingPresentation: "list",
      });
      const response = Promise.withResolvers<{ success: true }>();
      mocks[operation].mockReturnValue(response.promise);
      const saving = lifecycle[operation].mutateAsync({
        conversationSlugId: slug,
      });
      await vi.waitFor(() => expect(mocks[operation]).toHaveBeenCalledOnce());
      expect(
        queryClient.getQueryData<ConversationDetail>(key)?.conversationData
          .interaction.conversationCapabilities
      ).toMatchObject({ canClose: false, canReopen: false });
      const refreshed = conversation({
        conversationType: "polis",
        votingPresentation: "list",
      });
      refreshed.conversationData.metadata.isClosed = operation === "close";
      refreshed.conversationData.interaction.conversationCapabilities = {
        canEdit: false,
        canDelete: false,
        canModerate: false,
        canClose: false,
        canReopen: false,
      };
      mocks.fetch.mockResolvedValue(refreshed);
      response.resolve({ success: true });
      await saving;
      await vi.waitFor(() =>
        expect(
          queryClient.getQueryData<ConversationDetail>(key)?.conversationData
            .interaction.conversationCapabilities.canEdit
        ).toBe(false)
      );
    }
  );

  it.each(["close", "open"] as const)(
    "does not restore cleared account data after a failed %s",
    async (operation) => {
      const { lifecycle, queryClient, auth } = mountMutation({
        conversationType: "polis",
        votingPresentation: "list",
      });
      const response = Promise.withResolvers<{ success: true }>();
      mocks[operation].mockReturnValue(response.promise);
      const saving = lifecycle[operation].mutateAsync({
        conversationSlugId: slug,
      });
      const rejection = expect(saving).rejects.toThrow("Offline");
      await vi.waitFor(() => expect(mocks[operation]).toHaveBeenCalledOnce());
      auth.setLoginStatus({ isKnown: false, isLoggedIn: false });
      queryClient.clear();
      response.reject(new Error("Offline"));
      await rejection;
      expect(queryClient.getQueryData(key)).toBeUndefined();
    }
  );
  it.each([
    { conversationType: "polis", votingPresentation: "list" },
    {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    },
  ] satisfies ConversationTypeConfig[])(
    "does not restore finalizing state from an older $conversationType frame",
    async (config) => {
      const { queryClient } = mountMutation(config);
      const current = conversation(config);
      const stale = conversation(config);
      for (const { value, id } of [
        { value: current, id: 2 },
        { value: stale, id: 1 },
      ]) {
        const metadata = value.conversationData.metadata;
        if (metadata.conversationType === "polis")
          metadata.conversationViewSnapshotId = id;
        else if (
          metadata.conversationType === "prioritizing" &&
          metadata.prioritizationType === "comparisons"
        )
          metadata.rankingStatsSnapshotId = id;
      }
      current.conversationData.metadata.isClosed = true;
      current.conversationData.metadata.isFinalizing = false;
      stale.conversationData.metadata.isClosed = true;
      stale.conversationData.metadata.isFinalizing = true;
      queryClient.setQueryData(key, current);
      mocks.fetch.mockResolvedValue(stale);
      await queryClient.refetchQueries({ queryKey: key, exact: true });
      expect(
        queryClient.getQueryData<ConversationDetail>(key)?.conversationData
          .metadata
      ).toMatchObject({
        isClosed: true,
        isFinalizing: false,
      });
    }
  );

  it("uses the close selection version rather than ranking snapshot order", async () => {
    const config = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    } as const;
    const { queryClient } = mountMutation(config);
    const withResult = ({
      snapshotId,
      selectionRevision,
      voteCount,
    }: {
      snapshotId: number;
      selectionRevision: number;
      voteCount: number;
    }) => {
      const value = conversation(config);
      const metadata = value.conversationData.metadata;
      if (
        metadata.conversationType !== "prioritizing" ||
        metadata.prioritizationType !== "comparisons"
      )
        throw new Error("Missing comparison fixture");
      metadata.isClosed = true;
      metadata.rankingStatsSnapshotId = snapshotId;
      metadata.voteCount = voteCount;
      metadata.comparisonCloseSelectionVersion = {
        closeId: 8,
        selectionRevision,
      };
      return value;
    };
    const live = withResult({
      snapshotId: 42,
      selectionRevision: 1,
      voteCount: 3,
    });
    const closing = withResult({
      snapshotId: 7,
      selectionRevision: 2,
      voteCount: 9,
    });
    queryClient.setQueryData(key, live);
    mocks.fetch.mockResolvedValue(closing);
    await queryClient.refetchQueries({ queryKey: key, exact: true });
    expect(
      queryClient.getQueryData<ConversationDetail>(key)?.conversationData
        .metadata
    ).toMatchObject({ rankingStatsSnapshotId: 7, voteCount: 9 });

    mocks.fetch.mockResolvedValue(live);
    await queryClient.refetchQueries({ queryKey: key, exact: true });
    expect(
      queryClient.getQueryData<ConversationDetail>(key)?.conversationData
        .metadata
    ).toMatchObject({ rankingStatsSnapshotId: 7, voteCount: 9 });

    const event = {
      conversationSlugId: slug,
      rankingStatsSnapshotId: 7,
      checkpointChanged: false,
      closedSelectionChanged: true,
      comparisonCloseSelectionVersion: { closeId: 8, selectionRevision: 2 },
      opinionCount: 2,
      voteCount: 9,
      participantCount: 4,
      totalOpinionCount: 2,
      totalVoteCount: 9,
      totalParticipantCount: 4,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      isClosed: true,
      timestamp: 1,
    } as const;
    expect(
      applyConversationRankingStatsUpdate({
        conversation: live.conversationData,
        data: event,
      }).metadata
    ).toMatchObject({ rankingStatsSnapshotId: 7, voteCount: 9 });
    const reopened = withResult({
      snapshotId: 7,
      selectionRevision: 2,
      voteCount: 9,
    });
    reopened.conversationData.metadata.isClosed = false;
    expect(
      applyConversationRankingStatsUpdate({
        conversation: reopened.conversationData,
        data: event,
      }).metadata.isClosed
    ).toBe(false);
    queryClient.setQueryData(key, reopened);
    mocks.fetch.mockResolvedValue(closing);
    await queryClient.refetchQueries({ queryKey: key, exact: true });
    expect(
      queryClient.getQueryData<ConversationDetail>(key)?.conversationData
        .metadata.isClosed
    ).toBe(false);
  });
});

describe("conversation presentation edits", () => {
  it.each([false, true])(
    "rolls back a rejected published method change without restoring cleared account data (signOut=%s)",
    async (signOut) => {
      const config = {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
      } as const;
      const { mutation, queryClient, auth } = mountMutation(config);
      const response = Promise.withResolvers<UpdateConversationResponse>();
      mocks.save.mockReturnValue(response.promise);
      const saving = mutation.mutateAsync(
        request({ ...config, comparisonMethod: "pairwise" })
      );
      await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
      if (signOut) {
        queryClient.clear();
        auth.setLoginStatus({ isKnown: false });
      }
      response.resolve({
        success: false,
        reason: "conversation_type_fixed",
      });
      await saving;
      const metadata =
        queryClient.getQueryData<ConversationDetail>(key)?.conversationData
          .metadata;
      if (signOut) expect(metadata).toBeUndefined();
      else expect(metadata).toMatchObject(config);
    }
  );

  it("installs the committed Polis presentation setting", async () => {
    const { mutation, queryClient } = mountMutation({
      conversationType: "polis",
      votingPresentation: "list",
    });
    const config = {
      conversationType: "polis",
      votingPresentation: "one_at_a_time",
    } as const;
    mocks.save.mockResolvedValue({
      success: true,
      participantStatements: { supported: true, enabled: true },
      conversationTypeConfig: config,
    });
    await mutation.mutateAsync({
      ...request(config),
      expectedConversationTypeConfig: {
        conversationType: "polis",
        votingPresentation: "list",
      },
    });
    const metadata =
      queryClient.getQueryData<ConversationDetail>(key)?.conversationData
        .metadata;
    expect(metadata).toMatchObject(config);
    expect(metadata).not.toHaveProperty("comparisonMethod");
    expect(zodConversationMetadata.safeParse(metadata).success).toBe(true);
    expect(
      queryClient.getQueryData<ExtendedConversation>(legacyKey)?.metadata
    ).toMatchObject(config);
  });

  it("keeps the score snapshot when refreshing an unchanged comparison config", () => {
    const original = conversation({
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    });
    const metadata = original.conversationData.metadata;
    if (
      metadata.conversationType !== "prioritizing" ||
      metadata.prioritizationType !== "comparisons"
    )
      throw new Error("Missing comparison fixture");
    metadata.rankingStatsSnapshotId = 42;
    const refreshed = applyConversationTypeConfig({
      metadata,
      config: {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
      },
    });
    expect(refreshed).toMatchObject({
      comparisonMethod: "bws",
      rankingStatsSnapshotId: 42,
    });
    expect(zodConversationMetadata.safeParse(refreshed).success).toBe(true);
  });
  it.each([
    { before: "list", after: "one_at_a_time" },
    { before: "one_at_a_time", after: "list" },
  ] satisfies Array<{
    before: PolisVotingPresentation;
    after: PolisVotingPresentation;
  }>)(
    "switches $before to $after without a refetch",
    async ({ before, after }) => {
      const { mutation, queryClient, target, original, other } = mountMutation({
        conversationType: "polis",
        votingPresentation: before,
      });
      mocks.save.mockResolvedValue({
        success: true,
        participantStatements: { supported: true, enabled: true },
      });

      expect(target.textContent).toBe(before);
      await mutation.mutateAsync(
        request({ conversationType: "polis", votingPresentation: after })
      );

      await vi.waitFor(() => expect(target.textContent).toBe(after));
      expect(queryClient.getQueryData<ConversationDetail>(key)).toEqual({
        ...original,
        conversationData: {
          ...original.conversationData,
          metadata: {
            ...original.conversationData.metadata,
            votingPresentation: after,
          },
        },
      });
      expect(queryClient.getQueryData(translatedKey)).toMatchObject({
        conversationData: { metadata: { votingPresentation: after } },
      });
      expect(queryClient.getQueryData(legacyKey)).toMatchObject({
        metadata: { votingPresentation: after },
      });
      expect(queryClient.getQueryData(otherKey)).toEqual(other);
      expect(mocks.fetch).not.toHaveBeenCalled();
    }
  );

  it.each(["rejected", "network error"])(
    "restores the previous view after a %s",
    async (failure) => {
      const { mutation, queryClient, target, original, legacy } = mountMutation(
        {
          conversationType: "polis",
          votingPresentation: "list",
        }
      );
      const response = Promise.withResolvers<UpdateConversationResponse>();
      mocks.save.mockReturnValue(response.promise);
      const saving = mutation.mutateAsync(
        request({
          conversationType: "polis",
          votingPresentation: "one_at_a_time",
        })
      );
      await vi.waitFor(() => expect(target.textContent).toBe("one_at_a_time"));

      if (failure === "rejected") {
        response.resolve({ success: false, reason: "not_author" });
        await saving;
      } else {
        const rejected = expect(saving).rejects.toThrow("Offline");
        response.reject(new Error("Offline"));
        await rejected;
      }

      await vi.waitFor(() => expect(target.textContent).toBe("list"));
      expect(queryClient.getQueryData(key)).toEqual(original);
      expect(queryClient.getQueryData(translatedKey)).toEqual(original);
      expect(queryClient.getQueryData(legacyKey)).toEqual(legacy);
    }
  );

  it("preserves ranking metadata without adding Polis settings", async () => {
    const config: ConversationTypeConfig = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    };
    const { mutation, queryClient, original } = mountMutation(config);
    mocks.save.mockResolvedValue({
      success: true,
      participantStatements: { supported: true, enabled: false },
    });
    await mutation.mutateAsync(request(config));
    expect(queryClient.getQueryData(key)).toEqual(original);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("preserves a remotely updated participant policy when rolling back an unrelated edit", async () => {
    const { mutation, queryClient, target } = mountMutation({
      conversationType: "polis",
      votingPresentation: "list",
    });
    const response = Promise.withResolvers<UpdateConversationResponse>();
    mocks.save.mockReturnValue(response.promise);
    const saving = mutation.mutateAsync(
      request({
        conversationType: "polis",
        votingPresentation: "one_at_a_time",
      })
    );
    await vi.waitFor(() => expect(target.textContent).toBe("one_at_a_time"));
    queryClient.setQueryData<ConversationDetail>(key, (current) =>
      current === undefined
        ? undefined
        : {
            ...current,
            conversationData: {
              ...current.conversationData,
              metadata: applyParticipantStatements({
                metadata: current.conversationData.metadata,
                participantStatements: { supported: true, enabled: false },
              }),
            },
          }
    );
    response.resolve({
      success: false,
      reason: "participant_statements_changed",
    });
    await saving;
    expect(
      queryClient.getQueryData<ConversationDetail>(key)?.conversationData
        .metadata
    ).toMatchObject({
      votingPresentation: "list",
      participantStatements: { supported: true, enabled: false },
    });
  });

  it.each([
    { failure: "rejected", signOut: false },
    { failure: "rejected", signOut: true },
    { failure: "network error", signOut: false },
    { failure: "network error", signOut: true },
  ])(
    "does not restore cleared account data after $failure (signOut=$signOut)",
    async ({ failure, signOut }) => {
      const { mutation, queryClient, target, auth } = mountMutation({
        conversationType: "polis",
        votingPresentation: "list",
      });
      const response = Promise.withResolvers<UpdateConversationResponse>();
      mocks.save.mockReturnValue(response.promise);
      const saving = mutation.mutateAsync(
        request({
          conversationType: "polis",
          votingPresentation: "one_at_a_time",
        })
      );
      await vi.waitFor(() => expect(target.textContent).toBe("one_at_a_time"));
      queryClient.clear();
      if (signOut) auth.setLoginStatus({ isKnown: false });

      if (failure === "rejected") {
        response.resolve({ success: false, reason: "not_author" });
        await saving;
      } else {
        const rejected = expect(saving).rejects.toThrow("Offline");
        response.reject(new Error("Offline"));
        await rejected;
      }

      expect(queryClient.getQueryData(key)).toBeUndefined();
      expect(queryClient.getQueryData(translatedKey)).toBeUndefined();
      expect(queryClient.getQueryData(legacyKey)).toBeUndefined();
    }
  );
});

describe("analysis settings edits", () => {
  it("invalidates nested caches when prior conversation metadata is absent", async () => {
    const { mutation, queryClient } = mountMutation({
      conversationType: "polis",
      votingPresentation: "list",
    });
    queryClient.removeQueries({ queryKey: ["conversation", slug] });
    const manifestKey = ["analysisFrameManifest", slug];
    const labelsKey = ["analysisFrameGroupLabels", slug];
    queryClient.setQueryData(manifestKey, "cached manifest");
    queryClient.setQueryData(labelsKey, "cached labels");
    mocks.save.mockResolvedValue({
      success: true,
      participantStatements: { supported: true, enabled: true },
    });

    await mutation.mutateAsync(
      request({
        conversationType: "polis",
        votingPresentation: "list",
        aiLabelingEnabled: true,
        preferredOpinionGroupCount: 3,
      })
    );

    expect(queryClient.getQueryState(manifestKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(labelsKey)?.isInvalidated).toBe(true);
  });

  it("refreshes the frame manifest before refetching analysis", async () => {
    const { mutation, queryClient } = mountMutation({
      conversationType: "polis",
      votingPresentation: "list",
    });
    const manifestKey = [
      "analysisFrameManifest",
      slug,
      "facilitator_preference",
      undefined,
      false,
    ];
    const analysisKey = [
      "analysis",
      slug,
      "facilitator_preference",
      undefined,
      false,
    ];
    queryClient.setQueryData(manifestKey, 2);
    queryClient.setQueryData(analysisKey, 2);
    const fetchManifest = vi.fn(() => Promise.resolve(3));
    const observer = new QueryObserver(queryClient, {
      queryKey: analysisKey,
      queryFn: () =>
        queryClient.fetchQuery({
          queryKey: manifestKey,
          queryFn: fetchManifest,
          staleTime: Infinity,
        }),
      staleTime: Infinity,
    });
    cleanups.push(observer.subscribe(() => undefined));
    mocks.save.mockResolvedValue({
      success: true,
      participantStatements: { supported: true, enabled: true },
    });

    await mutation.mutateAsync(
      request({
        conversationType: "polis",
        votingPresentation: "list",
        preferredOpinionGroupCount: 3,
      })
    );

    await vi.waitFor(() =>
      expect(queryClient.getQueryData(analysisKey)).toBe(3)
    );
    expect(fetchManifest).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "invalidates AI frame caches only when labeling changes (%s)",
    async (aiLabelingEnabled) => {
      const { mutation, queryClient } = mountMutation({
        conversationType: "polis",
        votingPresentation: "list",
      });
      const manifestKey = ["analysisFrameManifest", slug];
      const labelsKey = ["analysisFrameGroupLabels", slug];
      queryClient.setQueryData(manifestKey, "cached manifest");
      queryClient.setQueryData(labelsKey, "cached labels");
      mocks.save.mockResolvedValue({
        success: true,
        participantStatements: { supported: true, enabled: true },
      });

      await mutation.mutateAsync(
        request({
          conversationType: "polis",
          votingPresentation: "one_at_a_time",
          aiLabelingEnabled,
        })
      );

      expect(queryClient.getQueryState(manifestKey)?.isInvalidated).toBe(
        aiLabelingEnabled
      );
      expect(queryClient.getQueryState(labelsKey)?.isInvalidated).toBe(
        aiLabelingEnabled
      );
      expect(mocks.fetch).not.toHaveBeenCalled();
    }
  );
});
