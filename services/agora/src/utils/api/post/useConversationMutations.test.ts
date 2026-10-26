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
  UpdateConversationRequest,
  UpdateConversationResponse,
} from "src/shared/types/dto";
import type {
  ConversationTypeConfig,
  ExtendedConversation,
  PolisVotingPresentation,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { getConversationQueryKey } from "src/utils/query/conversationQueryKeys";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h } from "vue";

const mocks = vi.hoisted(() => ({
  save: vi.fn<
    (request: UpdateConversationRequest) => Promise<UpdateConversationResponse>
  >(),
  fetch: vi.fn<() => Promise<ConversationDetail>>(),
}));
vi.mock("./postEdit", () => ({
  useBackendPostEditApi: () => ({ updateConversation: mocks.save }),
}));
vi.mock("./post", () => ({
  useBackendPostApi: () => ({
    fetchConversationBySlugIdWithDisplayContent: mocks.fetch,
  }),
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

import { useUpdateConversationMutation } from "./useConversationMutations";
import {
  type ConversationDetail,
  useConversationQuery,
} from "./useConversationQuery";

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
      metadata: {
        ...config,
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
      },
      interaction: {
        hasVoted: false,
        votedIndex: 0,
        conversationCapabilities: {
          canEdit: true,
          canDelete: true,
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
  const queryClient = new QueryClient();
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
  const app = createApp({
    setup() {
      mutation = useUpdateConversationMutation();
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
  app.use(VueQueryPlugin, { queryClient });
  app.mount(target);
  cleanups.push(() => {
    app.unmount();
    target.remove();
    queryClient.clear();
  });
  if (mutation === undefined) throw new Error("Mutation did not mount");

  return { mutation, queryClient, target, original, legacy, other, auth };
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
  it.each([
    { conversationType: "polis", votingPresentation: "list" },
    { conversationType: "ranking", rankingMode: "bws" },
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
        else metadata.rankingStatsSnapshotId = id;
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
});

describe("conversation presentation edits", () => {
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
      mocks.save.mockResolvedValue({ success: true });

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
      conversationType: "ranking",
      rankingMode: "bws",
    };
    const { mutation, queryClient, original } = mountMutation(config);
    mocks.save.mockResolvedValue({ success: true });
    await mutation.mutateAsync(request(config));
    expect(queryClient.getQueryData(key)).toEqual(original);
    expect(mocks.fetch).not.toHaveBeenCalled();
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
    mocks.save.mockResolvedValue({ success: true });

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
    mocks.save.mockResolvedValue({ success: true });

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
      mocks.save.mockResolvedValue({ success: true });

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
