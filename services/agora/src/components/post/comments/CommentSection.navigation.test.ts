import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, defineStore } from "pinia";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import {
  getOpinionFilterSelection,
  isOpinionListRoute,
} from "src/composables/opinion/opinionLinkRoute";
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
import type { useBackendCommentApi } from "src/utils/api/comment/comment";
import { getOpinionTargetQueryKey } from "src/utils/api/comment/opinionTargetQueryKey";
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
  watch,
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
}));

vi.mock("src/stores/user", () => ({
  useUserStore: defineStore("test-user", {
    state: () => ({
      profileData: {
        userName: "different-from-statement-author",
        isSiteModerator: false,
      },
    }),
  }),
}));
vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: defineStore("test-auth", {
    state: (): { userId: string | undefined } => ({ userId: "viewer" }),
    actions: {
      setLoginStatus(status: { userId?: string }) {
        this.userId = status.userId;
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
    },
  }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({ loadAuthenticatedModules: vi.fn() }),
}));
vi.mock("src/utils/api/comment/comment", () => ({
  useBackendCommentApi: () => ({
    fetchOpinionsBySlugIdList: mocks.fetchTargets,
    fetchOpinionPage: mocks.fetchPage,
  }),
}));
vi.mock("src/utils/api/comment/useCommentQueries", () => ({
  useInvalidateCommentQueries: () => ({
    invalidateAll: vi.fn(),
    markCommentsAsStale: vi.fn(),
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
vi.mock("src/components/ui/AsyncStateHandler.vue", () => ({
  default: defineComponent(
    (_, { slots }) =>
      () =>
        h("div", slots.default?.())
  ),
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
  vi.clearAllMocks();
  mocks.fetchTargets.mockResolvedValue([target()]);
  mocks.fetchPage.mockResolvedValue({
    items: [],
    nextCursor: null,
    nextRequest: undefined,
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
}: {
  presentation?: "list" | "one_at_a_time";
  url?: string;
  loaded?: boolean;
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
  const initialFilterSelection = getOpinionFilterSelection(
    router.currentRoute.value
  );
  const filter = ref<CommentFilterOptions>(
    initialFilterSelection.kind === "explicit"
      ? initialFilterSelection.filter
      : "discover"
  );
  const editingOpinion = ref<DisplayedOpinionItem>();
  const root = defineComponent(() => {
    watch(
      [
        () => router.currentRoute.value.path,
        () => router.currentRoute.value.query.filter,
      ],
      () => {
        const route = router.currentRoute.value;
        const selection = getOpinionFilterSelection(route);
        if (
          isOpinionListRoute({ route, conversationSlugId: "conversa" }) &&
          selection.kind === "explicit"
        ) {
          filter.value = selection.filter;
        }
      }
    );
    return () =>
      h(KeepAlive, null, () =>
        visible.value &&
        isOpinionListRoute({
          route: router.currentRoute.value,
          conversationSlugId: "conversa",
        })
          ? h(ConversationCommentTab, {
              conversationData: conversationData.value,
              moderationHistoryTrigger: 0,
              commentFilter: filter.value,
              editingOpinion: editingOpinion.value,
              onViewAnalysis: vi.fn(),
              conversationRouteContext: getConversationRouteContextFromRoute(
                router.currentRoute.value
              ),
              "onUpdate:commentFilter": (value: CommentFilterOptions) => {
                filter.value = value;
              },
            })
          : null
      );
  });
  const container = document.createElement("div");
  document.body.append(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  app = createApp(root);
  const pinia = createPinia();
  app.use(pinia);
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
  app.mount(container);
  await nextTick();
  return {
    router,
    conversationData,
    filter,
    editingOpinion,
    visible,
    container,
    auth: useAuthenticationStore(pinia),
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
    expect(highlighted(container)).toBe("");
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
    expect(highlighted(container)).toBe("");
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
    expect(highlighted(container)).toBe("");
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
    expect(highlighted(container)).toBe("");
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
    const response = Promise.withResolvers<GetOpinionBySlugIdListResponse>();
    mocks.fetchTargets.mockReturnValueOnce(response.promise);
    mocks.fetchPage.mockClear();
    auth.setLoginStatus({ isKnown: false });
    await nextTick();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
    response.resolve([target({ isOwn: false })]);
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
    expect(highlighted(container)).toBe("");
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
