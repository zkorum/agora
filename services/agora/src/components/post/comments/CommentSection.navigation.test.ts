import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, defineStore } from "pinia";
import { useConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationParentState } from "src/composables/conversation/useConversationParentState";
import { isOpinionListRoute } from "src/composables/opinion/opinionLinkRoute";
import type {
  GetOpinionBySlugIdListResponse,
  OpinionTarget,
} from "src/shared/types/dto";
import type {
  DisplayedOpinionItem,
  ExtendedConversationDisplayData,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useLanguageStore } from "src/stores/language";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useUserStore } from "src/stores/user";
import type { useBackendCommentApi } from "src/utils/api/comment/comment";
import { getOpinionTargetQueryKey } from "src/utils/api/comment/opinionTargetQueryKey";
import { resetLocalAuthState } from "src/utils/auth/localAuthState";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { getConversationRouteContextFromRoute } from "src/utils/router/conversationRouteContext";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
} from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const mocks = vi.hoisted(() => ({
  fetchTargets:
    vi.fn<
      ReturnType<typeof useBackendCommentApi>["fetchOpinionsBySlugIdList"]
    >(),
  fetchPage:
    vi.fn<ReturnType<typeof useBackendCommentApi>["fetchOpinionPage"]>(),
  notify: vi.fn(),
  conversationData: vi.fn<() => ExtendedConversationDisplayData | undefined>(),
  fetchStats:
    vi.fn<
      ReturnType<typeof useBackendCommentApi>["fetchCommentStatsForPost"]
    >(),
  queryClient: vi.fn<() => QueryClient>(),
}));

vi.mock("src/stores/user", () => ({
  useUserStore: defineStore("test-user", {
    state: () => ({
      profileData: {
        userName: "different-from-statement-author",
        isSiteModerator: false,
      },
    }),
    actions: {
      clearProfileData() {
        this.profileData.isSiteModerator = false;
      },
    },
  }),
}));
vi.mock("src/stores/language", () => ({
  useLanguageStore: defineStore("test-language", {
    state: () => ({ displayLanguage: "en", spokenLanguages: ["en"] }),
    actions: {
      changeDisplayLanguage({ newLanguage }: { newLanguage: string }) {
        this.displayLanguage = newLanguage;
        return Promise.resolve(true);
      },
      clearLanguagePreferences: () => Promise.resolve(true),
    },
  }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({ loadAuthenticatedModules: vi.fn() }),
}));
vi.mock("src/composables/zupass/useZupassVerification", () => ({
  resetZupassModuleState: vi.fn(),
}));
vi.mock("src/stores/newConversationDrafts", () => ({
  useNewPostDraftsStore: () => ({ resetDraft: vi.fn() }),
}));
vi.mock("src/stores/newOpinionDrafts", () => ({
  useNewOpinionDraftsStore: () => ({ clearOpinionDrafts: vi.fn() }),
}));
vi.mock("src/stores/notification", () => ({
  useNotificationStore: () => ({ clearNotificationData: vi.fn() }),
}));
vi.mock("src/stores/onboarding/email", () => ({
  emailVerificationStore: () => ({ reset: vi.fn() }),
}));
vi.mock("src/stores/onboarding/phone", () => ({
  phoneVerificationStore: () => ({ reset: vi.fn() }),
}));
vi.mock("src/stores/topic", () => ({
  useTopicStore: () => ({ clearTopicsData: vi.fn() }),
}));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  deleteDid: () => Promise.resolve(),
  deleteDidIfCurrent: vi.fn(),
}));
vi.mock("src/utils/query/client", () => ({
  get queryClient() {
    return mocks.queryClient();
  },
}));
vi.mock("src/utils/api/maxdiff/useMaxDiffQueries", () => ({
  useRankingStatsCheckpointsQuery: () => ({
    data: ref(),
    isPending: ref(true),
    isRefetching: ref(false),
  }),
}));
vi.mock("src/utils/api/post/useConversationQuery", () => ({
  useConversationQuery: () => ({
    data: computed(() => {
      const data = mocks.conversationData();
      return data === undefined
        ? undefined
        : { conversationData: data, displayContent: undefined };
    }),
  }),
}));
vi.mock("src/utils/api/vote/useVoteQueries", () => ({
  useInvalidateVoteQueries: () => ({ invalidateUserVotes: vi.fn() }),
}));
vi.mock("src/utils/api/comment/comment", () => ({
  useBackendCommentApi: () => ({
    fetchOpinionsBySlugIdList: mocks.fetchTargets,
    fetchOpinionPage: mocks.fetchPage,
    fetchCommentStatsForPost: mocks.fetchStats,
  }),
}));
vi.mock("src/utils/api/comment/useCommentQueries", () => ({
  useAnalysisCheckpointsQuery: () => ({
    data: ref(),
    isPending: ref(true),
    isRefetching: ref(false),
  }),
  useInvalidateCommentQueries: () => ({
    invalidateAll: vi.fn(),
    markCommentsAsStale: vi.fn(),
    invalidateComments: vi.fn(),
    markAnalysisAsStale: vi.fn(),
  }),
}));
vi.mock("src/composables/opinion/useOpinionVoting", () => ({
  useOpinionVoting: () => ({
    userVotes: computed(() => []),
    castVote: vi.fn(),
    fetchUserVotingData: vi.fn(),
  }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/components/feed/NewContentPill.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("./OneAtATimeSection.vue", () => ({
  default: defineComponent(
    () => () => h("div", { "data-testid": "one-at-a-time" })
  ),
}));
vi.mock("./group/CommentGroup.vue", () => ({
  default: defineComponent(
    (props: { highlightedOpinion: DisplayedOpinionItem | null }) => () =>
      h(
        "div",
        { "data-testid": "highlight" },
        props.highlightedOpinion?.opinionSlugId
      ),
    { props: { highlightedOpinion: { type: [Object, null], required: true } } }
  ),
}));

import ConversationCommentTab from "../ConversationCommentTab.vue";

function target({
  slugId = "statement",
  isOwn = true,
  conversationSlugId = "conversa",
}: {
  slugId?: string;
  isOwn?: boolean;
  conversationSlugId?: string;
} = {}): OpinionTarget {
  return {
    conversationSlugId,
    isOwn,
    opinion: {
      opinionSlugId: slugId,
      opinion: "My statement",
      sourceLanguageCode: "en",
      username: "author",
      createdAt: new Date(),
      updatedAt: new Date(),
      numParticipants: 0,
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 0,
      moderation: { status: "unmoderated" },
      isSeed: false,
      displayContent: {
        sourceVersion: "source",
        status: "available",
        mode: "original",
        content: { content: "My statement" },
        translationControl: null,
      },
    },
  };
}

function conversation(
  votingPresentation: "list" | "one_at_a_time"
): ExtendedConversationDisplayData {
  return {
    metadata: {
      conversationSlugId: "conversa",
      conversationType: "polis",
      votingPresentation,
      createdAt: new Date(),
      lastReactedAt: new Date(),
      opinionCount: 1,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 1,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "facilitator",
      participationMode: "guest",
      isIndexed: true,
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: "en",
        detectedSourceLanguageCode: "en",
        detectedRawLanguageCode: "en",
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      languageSetting: {
        mode: "manual",
        languageCode: "en",
        detectedLanguageCode: "en",
        detectedSourceLanguageCode: "en",
        detectedRawLanguageCode: "en",
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
      isClosed: false,
      isEdited: false,
      moderation: { status: "unmoderated" },
      externalSourceConfig: null,
    },
    interaction: {
      hasVoted: false,
      votedIndex: 0,
      conversationCapabilities: {
        canEdit: false,
        canDelete: false,
      },
    },
  };
}

let app: ReturnType<typeof createApp> | undefined;
let queryClient: QueryClient | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.fetchTargets.mockResolvedValue([target()]);
  mocks.fetchPage.mockResolvedValue({
    items: [],
    nextCursor: null,
    nextRequest: undefined,
  });
  mocks.fetchStats.mockResolvedValue({
    conversationViewSnapshotId: 1,
    opinionCount: 1,
    voteCount: 0,
    participantCount: 0,
    totalOpinionCount: 1,
    totalVoteCount: 0,
    totalParticipantCount: 0,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
    isClosed: false,
  });
});
afterEach(() => {
  app?.unmount();
  queryClient?.clear();
  document.body.replaceChildren();
});

async function mountStatementLink({
  presentation = "list",
  url = "/conversation/conversa/?opinion=statement",
  loaded = true,
  authenticated = true,
}: {
  presentation?: "list" | "one_at_a_time";
  url?: string;
  loaded?: boolean;
  authenticated?: boolean;
} = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/conversation/:postSlugId/",
        name: "/conversation/[postSlugId]/",
        component: { template: "<div />" },
      },
      {
        path: "/project/:projectSlug/conversation/:postSlugId/",
        name: "/project/[projectSlug]/conversation/[postSlugId]/",
        component: { template: "<div />" },
      },
      {
        path: "/conversation/:postSlugId/onboarding/",
        name: "/conversation/[postSlugId].onboarding/",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(url);
  const conversationData = ref<ExtendedConversationDisplayData | undefined>(
    loaded ? conversation(presentation) : undefined
  );
  const visible = ref(true);
  mocks.conversationData.mockImplementation(() => conversationData.value);
  const editingOpinion = ref<DisplayedOpinionItem>();
  let parentState: ReturnType<typeof useConversationParentState> | undefined;
  const root = defineComponent(() => {
    const state = useConversationParentState({
      analysisRouteName: "/conversation/[postSlugId]/analysis",
      commentRouteNames: [
        "/conversation/[postSlugId]/",
        "/project/[projectSlug]/conversation/[postSlugId]/",
      ],
      routeContext: computed(() =>
        getConversationRouteContextFromRoute(router.currentRoute.value)
      ),
    });
    parentState = state;
    const stats = useConversationActionBarStats({
      conversationData: state.conversationData,
      currentTab: state.currentTab,
      routeQuery: computed(() => router.currentRoute.value.query),
    });
    return () =>
      h("div", [
        h(
          "output",
          {
            "data-testid": "action-bar",
            "aria-busy":
              state.isCurrentTabLoading.value ||
              stats.isLoadingCommentStats.value ||
              stats.isLoadingCheckpointStats.value,
          },
          stats.actionBarStats.value?.opinionCount
        ),
        h(KeepAlive, null, () =>
          visible.value &&
          isOpinionListRoute({
            route: router.currentRoute.value,
            conversationSlugId: "conversa",
          })
            ? h(ConversationCommentTab, {
                conversationData: conversationData.value,
                opinionState: state.opinionState,
                editingOpinion: editingOpinion.value,
                onViewAnalysis: vi.fn(),
                conversationRouteContext: getConversationRouteContextFromRoute(
                  router.currentRoute.value
                ),
              })
            : null
        ),
      ]);
  });
  const container = document.createElement("div");
  document.body.append(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mocks.queryClient.mockReturnValue(queryClient);
  app = createApp(root);
  const pinia = createPinia();
  app.use(pinia);
  const auth = useAuthenticationStore(pinia);
  if (authenticated) auth.setLoginStatus({ isKnown: true, userId: "viewer" });
  app.use(router);
  app.use(VueQueryPlugin, { queryClient });
  app.component(
    "QInfiniteScroll",
    defineComponent(
      (_, { slots }) =>
        () =>
          h("div", slots.default?.())
    )
  );
  app.component(
    "QSpinnerDots",
    defineComponent(() => () => h("span", { "data-testid": "list-spinner" }))
  );
  app.component(
    "QIcon",
    defineComponent(() => () => h("span"))
  );
  app.mount(container);
  await nextTick();
  if (parentState === undefined)
    throw new Error("Conversation parent was not mounted");
  const state = parentState;
  const filter = computed({
    get: () => state.commentFilter.value,
    set: (value: CommentFilterOptions) =>
      state.opinionState.selectFilter(value),
  });
  return {
    router,
    conversationData,
    filter,
    editingOpinion,
    isLoading: state.isCurrentTabLoading,
    selectFilter: state.selectCommentFilter,
    visible,
    container,
    auth,
    user: useUserStore(pinia),
    language: useLanguageStore(pinia),
    flow: onboardingFlowStore(pinia),
    onboarding: useConversationOnboardingStore(pinia),
    onboardingExit: app.runWithContext(useConversationOnboardingExit),
  };
}

function highlighted(container: HTMLElement): string | undefined {
  return (
    container.querySelector('[data-testid="highlight"]')?.textContent ??
    undefined
  );
}

describe("statement URL navigation", () => {
  it("does not cancel a pending target when moderator metadata restores Hidden", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { auth, user, filter, container } = await mountStatementLink({
      url: "/conversation/conversa/?opinion=statement&filter=hidden",
    });
    expect(filter.value).toBe("discover");
    auth.setLoginStatus({ isRegistered: true, isLoggedIn: true });
    user.profileData.isSiteModerator = true;
    await nextTick();
    expect(mocks.fetchTargets.mock.calls[0]?.[0].signal?.aborted).toBe(false);
    response.resolve([target({ isOwn: false })]);
    await vi.waitFor(() => {
      expect(filter.value).toBe("hidden");
      expect(highlighted(container)).toBe("statement");
    });
  });
  it("recovers the list and action-bar stats after real auth cleanup clears the cache", async () => {
    const { container, auth, filter, isLoading } = await mountStatementLink({
      url: "/conversation/conversa/?opinion=statement&filter=my_statements",
    });
    await vi.waitFor(() => {
      expect(highlighted(container)).toBe("statement");
      expect(
        container
          .querySelector('[data-testid="action-bar"]')
          ?.getAttribute("aria-busy")
      ).toBe("false");
    });
    mocks.fetchPage.mockClear();
    mocks.fetchStats.mockClear();
    mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);

    await app?.runWithContext(async () => {
      await resetLocalAuthState();
    });

    await vi.waitFor(() => {
      expect(auth.isGuestOrLoggedIn).toBe(false);
      expect(filter.value).toBe("discover");
      expect(highlighted(container)).toBe("statement");
      expect(isLoading.value).toBe(false);
      expect(mocks.fetchStats).toHaveBeenCalledOnce();
      expect(
        mocks.fetchPage.mock.calls.map(([request]) => request.filter)
      ).toEqual(["discover"]);
      expect(
        container
          .querySelector('[data-testid="action-bar"]')
          ?.getAttribute("aria-busy")
      ).toBe("false");
      expect(
        container.querySelector('[data-testid="list-spinner"]')
      ).toBeNull();
    });
  });
  it.each(["my_statements", "my_votes"])(
    "keeps a linked statement when guest creation restores %s",
    async (requestedFilter) => {
      mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);
      const { auth, filter, container, isLoading } = await mountStatementLink({
        url: `/conversation/conversa/?opinion=statement&filter=${requestedFilter}`,
        authenticated: false,
      });
      await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
      const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
      mocks.fetchTargets.mockReturnValueOnce(response.promise);
      auth.setLoginStatus({ isKnown: true, userId: "new-guest" });
      await vi.waitFor(() =>
        expect(mocks.fetchTargets).toHaveBeenCalledTimes(2)
      );
      expect(mocks.fetchTargets.mock.calls.at(-1)?.[0].signal?.aborted).toBe(
        false
      );
      expect(
        container.querySelector('[data-testid="list-spinner"]')
      ).not.toBeNull();
      response.resolve([target({ isOwn: false })]);
      await vi.waitFor(() => {
        expect(filter.value).toBe(requestedFilter);
        expect(highlighted(container)).toBe("statement");
        expect(isLoading.value).toBe(false);
        expect(
          container.querySelector('[data-testid="list-spinner"]')
        ).toBeNull();
      });
    }
  );

  it.each(["my_statements", "my_votes", "hidden"])(
    "keeps anonymous one-at-a-time %s links in the configured voting view",
    async (requestedFilter) => {
      const { container, filter } = await mountStatementLink({
        presentation: "one_at_a_time",
        authenticated: false,
        url: `/conversation/conversa/?opinion=statement&filter=${requestedFilter}`,
      });
      expect(filter.value).toBe("discover");
      expect(
        container.querySelector('[data-testid="one-at-a-time"]')
      ).not.toBeNull();
      expect(mocks.fetchTargets).not.toHaveBeenCalled();
      expect(mocks.fetchPage).not.toHaveBeenCalled();
    }
  );
  it.each([
    { path: "/conversation/conversa/", filter: "my_statements" },
    { path: "/conversation/conversa/", filter: "my_votes" },
    { path: "/conversation/conversa/", filter: "hidden" },
    {
      path: "/project/project/conversation/conversa/",
      filter: "my_statements",
    },
    { path: "/project/project/conversation/conversa/", filter: "my_votes" },
    { path: "/project/project/conversation/conversa/", filter: "hidden" },
  ])(
    "opens a copied $filter link anonymously at $path",
    async ({ path, filter: requestedFilter }) => {
      mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);
      const { filter, container, isLoading, router } = await mountStatementLink(
        {
          url: `${path}?opinion=statement&filter=${requestedFilter}`,
          authenticated: false,
        }
      );

      await vi.waitFor(() => {
        expect(highlighted(container)).toBe("statement");
        expect(filter.value).toBe("discover");
        expect(isLoading.value).toBe(false);
      });
      expect(
        mocks.fetchPage.mock.calls.map(([request]) => request.filter)
      ).toEqual(["discover"]);
      expect(router.currentRoute.value.query.opinion).toBe("statement");
    }
  );

  it.each(["my_statements", "my_votes", "hidden"])(
    "falls back from an anonymous %s URL without a statement target",
    async (requestedFilter) => {
      const { filter, isLoading } = await mountStatementLink({
        url: `/conversation/conversa/?filter=${requestedFilter}`,
        authenticated: false,
      });
      await vi.waitFor(() => {
        expect(filter.value).toBe("discover");
        expect(isLoading.value).toBe(false);
      });
      expect(mocks.fetchTargets).not.toHaveBeenCalled();
      expect(
        mocks.fetchPage.mock.calls.map(([request]) => request.filter)
      ).toEqual(["discover"]);
    }
  );

  it.each(["my_statements", "my_votes"])(
    "stops requesting %s after logout while keeping the linked statement",
    async (requestedFilter) => {
      const { auth, filter, container, isLoading } = await mountStatementLink({
        url: `/conversation/conversa/?opinion=statement&filter=${requestedFilter}`,
      });
      await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
      await vi.waitFor(() => expect(isLoading.value).toBe(false));
      mocks.fetchPage.mockClear();
      mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);

      auth.setLoginStatus({ isKnown: false });

      await vi.waitFor(() => {
        expect(filter.value).toBe("discover");
        expect(highlighted(container)).toBe("statement");
        expect(isLoading.value).toBe(false);
        expect(
          mocks.fetchPage.mock.calls.map(([request]) => request.filter)
        ).toEqual(["discover"]);
      });
    }
  );

  for (const mode of ["LOGIN", "SIGNUP"] satisfies Array<"LOGIN" | "SIGNUP">) {
    for (const presentation of ["list", "one_at_a_time"] satisfies Array<
      "list" | "one_at_a_time"
    >) {
      it.each([
        "/conversation/conversa/",
        "/project/project/conversation/conversa/",
      ])(`resumes ${presentation} after ${mode} at %s`, async (url) => {
        mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);
        const { router, auth, flow, onboarding, onboardingExit, container } =
          await mountStatementLink({
            presentation,
            url,
          });
        auth.setLoginStatus({ isKnown: false });
        onboarding.startResumeEntry({
          conversationSlugId: "conversa",
          returnTarget: router.currentRoute.value.fullPath,
        });
        flow.onboardingMode = mode;
        await router.push("/conversation/conversa/onboarding/");
        expect(
          container.querySelector('[data-testid="one-at-a-time"]')
        ).toBeNull();
        expect(highlighted(container)).toBeUndefined();
        auth.setLoginStatus({ isKnown: true, userId: "authenticated-viewer" });
        await onboardingExit.exitToConversation({
          conversationSlugId: "conversa",
        });

        expect(router.currentRoute.value.path).toBe(url);
        expect(router.currentRoute.value.query.opinion).toBeUndefined();
        if (presentation === "one_at_a_time") {
          expect(
            container.querySelector('[data-testid="one-at-a-time"]')
          ).not.toBeNull();
          expect(mocks.fetchTargets).not.toHaveBeenCalled();
          expect(mocks.fetchPage).not.toHaveBeenCalled();
        } else {
          expect(highlighted(container)).toBeFalsy();
          expect(
            container.querySelector('[data-testid="one-at-a-time"]')
          ).toBeNull();
        }
      });
    }
  }

  it.each(["discover", "new"] satisfies CommentFilterOptions[])(
    "never renders a list for one-at-a-time %s, including direct statement URLs",
    async (filter) => {
      const { container } = await mountStatementLink({
        presentation: "one_at_a_time",
        url: `/project/project/conversation/conversa/?opinion=statement&filter=${filter}`,
      });
      expect(
        container.querySelector('[data-testid="one-at-a-time"]')
      ).not.toBeNull();
      expect(mocks.fetchTargets).not.toHaveBeenCalled();
      expect(mocks.fetchPage).not.toHaveBeenCalled();
    }
  );

  it("still highlights linked statements in one-at-a-time review lists", async () => {
    const { container, filter } = await mountStatementLink({
      presentation: "one_at_a_time",
      url: "/conversation/conversa/?opinion=statement&filter=my_statements",
    });
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("my_statements");
    expect(container.querySelector('[data-testid="one-at-a-time"]')).toBeNull();
  });

  it("keeps the linked statement highlighted in a list conversation", async () => {
    const { filter, container, router } = await mountStatementLink();
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("discover");
    expect(mocks.fetchTargets).toHaveBeenCalledTimes(1);
    expect(
      mocks.fetchPage.mock.calls.map(([request]) => request.filter)
    ).toEqual(["discover"]);
    expect(router.currentRoute.value.query.opinion).toBe("statement");
  });

  it("uses Discover for another author's statement", async () => {
    mocks.fetchTargets.mockResolvedValue([target({ isOwn: false })]);
    const { filter, container } = await mountStatementLink();
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("discover");
    expect(container.querySelector('[data-testid="one-at-a-time"]')).toBeNull();
  });

  it("supports manually entered project conversation links", async () => {
    const { filter, container } = await mountStatementLink({
      url: "/project/project/conversation/conversa/?opinion=statement",
    });
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("discover");
  });

  it("rejects ambiguous repeated statement parameters before making a target request", async () => {
    const { container } = await mountStatementLink({
      url: "/conversation/conversa/?opinion=statement&opinion=second",
    });
    expect(mocks.fetchTargets).not.toHaveBeenCalled();
    expect(highlighted(container)).toBeFalsy();
  });

  it("uses refreshed backend presentation even while the URL targets a statement", async () => {
    const { conversationData, filter, container } = await mountStatementLink({
      presentation: "list",
    });
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("discover");
    for (const mode of ["one_at_a_time", "list"] satisfies Array<
      "list" | "one_at_a_time"
    >) {
      conversationData.value = conversation(mode);
      await vi.waitFor(() =>
        expect(
          container.querySelector('[data-testid="one-at-a-time"]') !== null
        ).toBe(mode === "one_at_a_time")
      );
      expect(filter.value).toBe("discover");
      if (mode === "list") {
        await vi.waitFor(() =>
          expect(highlighted(container)).toBe("statement")
        );
      }
    }
  });

  it("restores the linked statement and its ownership context after cancelling an edit", async () => {
    const { filter, container, editingOpinion } = await mountStatementLink({
      presentation: "one_at_a_time",
      url: "/conversation/conversa/?opinion=statement&filter=my_statements",
    });
    await vi.waitFor(() => expect(filter.value).toBe("my_statements"));
    editingOpinion.value = target({ slugId: "editing" }).opinion;
    await vi.waitFor(() => expect(highlighted(container)).toBe("editing"));
    editingOpinion.value = undefined;
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
  });

  it("does not let a late statement response override the backend's one-at-a-time setting", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { conversationData, filter, container } = await mountStatementLink({
      presentation: "list",
    });
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    conversationData.value = conversation("one_at_a_time");
    await nextTick();
    response.resolve([target()]);
    await nextTick();
    expect(filter.value).toBe("discover");
    expect(
      container.querySelector('[data-testid="one-at-a-time"]')
    ).not.toBeNull();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("waits for the conversation before loading or selecting a statement view", async () => {
    const { conversationData, filter, container } = await mountStatementLink({
      loaded: false,
    });
    expect(mocks.fetchTargets).not.toHaveBeenCalled();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    conversationData.value = conversation("list");
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    expect(filter.value).toBe("discover");
  });

  it("ignores an old response after navigating to a different statement and preserves URL context", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { router, container } = await mountStatementLink();
    mocks.fetchTargets.mockResolvedValue([target({ slugId: "second" })]);
    await router.push(
      "/conversation/conversa/?opinion=second&context=keep#anchor"
    );
    await vi.waitFor(() => expect(highlighted(container)).toBe("second"));
    response.resolve([target()]);
    await nextTick();
    expect(highlighted(container)).toBe("second");
    expect(router.currentRoute.value.fullPath).toContain(
      "opinion=second&context=keep#anchor"
    );
  });

  it("clears the previous highlight for missing or cross-conversation statements", async () => {
    const { router, container } = await mountStatementLink();
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    mocks.fetchTargets.mockResolvedValue([
      target({ slugId: "missing", conversationSlugId: "another" }),
    ]);
    await router.push("/conversation/conversa/?opinion=missing");
    await vi.waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith("statementNotFound")
    );
    expect(highlighted(container)).toBeFalsy();
  });

  it("does not restore a pending highlight after a manual filter selection", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { router, filter, container } = await mountStatementLink();
    filter.value = "my_votes";
    await router.replace("/conversation/conversa/?filter=my_votes");
    response.resolve([target()]);
    await nextTick();
    expect(filter.value).toBe("my_votes");
    expect(highlighted(container)).toBeFalsy();
  });

  it("keeps one-at-a-time Discover when clearing the statement URL", async () => {
    const { router, filter, container } = await mountStatementLink({
      presentation: "one_at_a_time",
    });
    expect(filter.value).toBe("discover");
    await router.replace("/conversation/conversa/?filter=discover");
    await vi.waitFor(() =>
      expect(
        container.querySelector('[data-testid="one-at-a-time"]')
      ).not.toBeNull()
    );
  });

  it("ignores responses for the previous authenticated viewer", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { auth, container } = await mountStatementLink();
    const nextResponse =
      Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(nextResponse.promise);
    auth.setLoginStatus({ isKnown: true, userId: "another-viewer" });
    await nextTick();
    response.resolve([target()]);
    await nextTick();
    expect(highlighted(container)).toBeFalsy();
    expect(
      queryClient?.getQueryData(
        getOpinionTargetQueryKey({
          opinionSlugId: "statement",
          viewerUserId: "viewer",
          displayLanguage: "en",
          spokenLanguages: ["en"],
        })
      )
    ).toBeUndefined();
    nextResponse.resolve([target({ isOwn: false })]);
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
  });

  it("returns to one-at-a-time Discover when a review target no longer belongs to the viewer", async () => {
    const { auth, filter } = await mountStatementLink({
      presentation: "one_at_a_time",
    });
    filter.value = "my_statements";
    await vi.waitFor(() => expect(mocks.fetchPage).toHaveBeenCalled());
    expect(filter.value).toBe("my_statements");
    mocks.fetchPage.mockClear();
    auth.setLoginStatus({ isKnown: false });
    await nextTick();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(filter.value).toBe("discover"));
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("ignores a response in the previous display language", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    const { language, container } = await mountStatementLink();
    const nextResponse =
      Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(nextResponse.promise);
    await language.changeDisplayLanguage({ newLanguage: "fr" });
    response.resolve([target()]);
    await nextTick();
    expect(highlighted(container)).toBeFalsy();
    expect(
      queryClient?.getQueryData(
        getOpinionTargetQueryKey({
          opinionSlugId: "statement",
          viewerUserId: "viewer",
          displayLanguage: "en",
          spokenLanguages: ["en"],
        })
      )
    ).toBeUndefined();
    nextResponse.resolve([target()]);
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
  });

  it("does not populate caches or notify after a pending page is unmounted", async () => {
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    await mountStatementLink();
    app?.unmount();
    app = undefined;
    response.resolve([target()]);
    await nextTick();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(
      queryClient?.getQueryData(
        getOpinionTargetQueryKey({
          opinionSlugId: "statement",
          viewerUserId: "viewer",
          displayLanguage: "en",
          spokenLanguages: ["en"],
        })
      )
    ).toBeUndefined();
  });

  it("reopens the statement when returning to a cached page", async () => {
    const { router, filter, visible, container } = await mountStatementLink();
    await vi.waitFor(() => expect(highlighted(container)).toBe("statement"));
    filter.value = "my_votes";
    await router.replace("/conversation/conversa/?filter=my_votes");
    visible.value = false;
    await nextTick();
    await router.push("/conversation/conversa/?opinion=statement");
    visible.value = true;
    await vi.waitFor(() => expect(filter.value).toBe("discover"));
    expect(highlighted(container)).toBe("statement");
  });
});
