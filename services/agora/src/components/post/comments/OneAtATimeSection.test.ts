import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import type { VotingSessionProgress } from "src/components/post/voting/VotingSessionToolbar.types";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type {
  CastVoteResponse,
  ConversationParticipationStatus,
  FetchNextUnansweredOpinionResponse,
} from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import type { useBackendAuthApi } from "src/utils/api/auth";
import type { useBackendCommentApi } from "src/utils/api/comment/comment";
import { participationRejectionFixture } from "src/utils/api/participation/participationTestFixtures";
import type { useBackendVoteApi } from "src/utils/api/vote";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from "vue";

type CommentApi = ReturnType<typeof useBackendCommentApi>;
type VoteApi = ReturnType<typeof useBackendVoteApi>;
type AuthApi = ReturnType<typeof useBackendAuthApi>;
type FetchNextOpinion = CommentApi["fetchNextUnansweredOpinion"];
type CastVote = VoteApi["castVoteForComment"];
type FetchVotes = VoteApi["fetchUserVotesForPostSlugIds"];
type EnsureParticipationAuth = AuthApi["ensureParticipationAuthState"];

const mocks = vi.hoisted(() => ({
  fetchNext: vi.fn<FetchNextOpinion>(),
  fetchOpinions: vi.fn<CommentApi["fetchOpinionsBySlugIdList"]>(),
  castVote: vi.fn<CastVote>(),
  fetchVotes: vi.fn<FetchVotes>(),
  ensureAuth: vi.fn<EnsureParticipationAuth>(),
  notify: vi.fn(),
}));

vi.mock("src/utils/api/comment/comment", () => ({
  useBackendCommentApi: () => ({
    fetchNextUnansweredOpinion: mocks.fetchNext,
    fetchOpinionsBySlugIdList: mocks.fetchOpinions,
  }),
}));
vi.mock("src/utils/api/vote", () => ({
  useBackendVoteApi: () => ({
    castVoteForComment: mocks.castVote,
    fetchUserVotesForPostSlugIds: mocks.fetchVotes,
  }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({ ensureParticipationAuthState: mocks.ensureAuth }),
}));
vi.mock("src/utils/api/comment/useCommentQueries", () => ({
  useInvalidateCommentQueries: () => ({ markAnalysisAsStale: vi.fn() }),
}));
vi.mock("src/utils/api/common", () => ({
  useCommonApi: () => ({ getErrorMessage: () => "error" }),
}));
vi.mock("src/composables/conversation/useParticipationGate", () => ({
  useParticipationGate: () => {
    const status = ref<ConversationParticipationStatus>({ status: "ready" });
    return {
      participationStatus: status,
      openParticipationOnboarding: vi.fn(),
      recordParticipationRejection: (next: ConversationParticipationStatus) => {
        status.value = next;
      },
      captureParticipationAction: () => ({
        isCurrent: () => true,
        handleBlockedReason: vi.fn(),
      }),
    };
  },
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/components/ui/PageLoadingSpinner.vue", () => ({
  default: defineComponent(() => () => h("div", { "data-testid": "loading" })),
}));
vi.mock("src/components/ui/ErrorRetryBlock.vue", () => ({
  default: defineComponent(
    (_, { emit }) =>
      () =>
        h(
          "button",
          { "data-testid": "retry", onClick: () => emit("retry") },
          "Retry"
        ),
    { emits: ["retry"] }
  ),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string, params?: { count: string }) =>
      params ? `${params.count} remaining` : key,
  }),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  return {
    useLanguageStore: defineStore("test-language", {
      state: () => ({ displayLanguage: "en", spokenLanguages: ["en"] }),
      actions: {
        changeDisplayLanguage({ newLanguage }: { newLanguage: string }) {
          this.displayLanguage = newLanguage;
          return Promise.resolve(true);
        },
      },
    }),
  };
});
vi.mock("src/components/post/voting/VotingSessionToolbar.vue", () => ({
  default: defineComponent(
    (
      props: {
        progress: VotingSessionProgress;
        canUndo: boolean;
        isBusy: boolean;
        isDisabled: boolean;
      },
      { emit }
    ) =>
      () =>
        h("div", { "data-testid": "toolbar" }, [
          h(
            "span",
            { "data-testid": "remaining" },
            props.progress.kind === "count"
              ? props.progress.label
              : `${props.progress.value}%`
          ),
          h(
            "button",
            {
              "data-testid": "undo",
              disabled: !props.canUndo || props.isBusy || props.isDisabled,
              onClick: () => emit("undo"),
            },
            "Undo"
          ),
        ]),
    {
      props: {
        progress: { type: Object, required: true },
        canUndo: { type: Boolean, required: true },
        isBusy: { type: Boolean, required: true },
        isDisabled: { type: Boolean, required: true },
      },
      emits: ["undo"],
    }
  ),
}));
vi.mock("./group/CommentGroup.vue", () => ({
  default: defineComponent(
    (
      props: {
        commentItemList: DisplayedOpinionItem[];
        votingUtilities: OpinionVotingUtilities;
        isVotingDisabled: boolean;
      },
      { emit }
    ) =>
      () => {
        const opinion = props.commentItemList.at(0);
        if (opinion === undefined) return h("div");
        return h("div", { "data-testid": "statement" }, [
          opinion.opinionSlugId,
          h(
            "button",
            {
              "data-testid": "agree",
              disabled: props.isVotingDisabled,
              onClick: () =>
                props.votingUtilities.castVote({
                  opinionSlugId: opinion.opinionSlugId,
                  sourceVersion: opinion.displayContent.sourceVersion,
                  voteAction: "agree",
                }),
            },
            "Agree"
          ),
          h(
            "button",
            {
              "data-testid": "delete",
              onClick: () => emit("deleted", opinion.opinionSlugId),
            },
            "Delete"
          ),
        ]);
      },
    {
      props: {
        commentItemList: { type: Array, required: true },
        votingUtilities: { type: Object, required: true },
        isVotingDisabled: { type: Boolean, required: true },
      },
      emits: ["deleted"],
    }
  ),
}));

import OneAtATimeSection from "./OneAtATimeSection.vue";

function opinion(opinionSlugId: string): DisplayedOpinionItem {
  return {
    opinionSlugId,
    opinion: opinionSlugId,
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
      content: { content: opinionSlugId },
      translationControl: null,
    },
  };
}

const opinions = [opinion("first"), opinion("second"), opinion("third")];
let availableOpinions: DisplayedOpinionItem[];
const databaseVotes = new Map<string, "agree">();
let queryClient: QueryClient;
let app: ReturnType<typeof createApp>;
let container: HTMLDivElement;
const section = ref<InstanceType<typeof OneAtATimeSection>>();
const isVisible = ref(true);

function nextResponse({
  excludedOpinionSlugIds,
}: {
  excludedOpinionSlugIds: readonly string[];
}): FetchNextUnansweredOpinionResponse {
  const remaining = availableOpinions.filter(
    (item) =>
      !databaseVotes.has(item.opinionSlugId) &&
      !excludedOpinionSlugIds.includes(item.opinionSlugId)
  );
  const next = remaining.at(0);
  return next === undefined
    ? { status: "caught_up", remainingCount: 0 }
    : { status: "ready", opinion: next, remainingCount: remaining.length };
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await nextTick();
}

async function click(testId: string): Promise<void> {
  const button = container.querySelector(`[data-testid="${testId}"]`);
  if (!(button instanceof HTMLButtonElement))
    throw new Error(`Missing test button ${testId}`);
  button.click();
  await settle();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  databaseVotes.clear();
  availableOpinions = [...opinions];
  mocks.fetchOpinions.mockImplementation(({ opinionSlugIdList }) =>
    Promise.resolve(
      availableOpinions
        .filter((item) => opinionSlugIdList.includes(item.opinionSlugId))
        .map((item) => ({
          opinion: item,
          conversationSlugId: "conversation",
          isOwn: false,
        }))
    )
  );
  isVisible.value = true;
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthenticationStore();
  auth.isAuthInitialized = true;
  mocks.ensureAuth.mockImplementation(() => {
    if (!auth.isKnown)
      auth.setLoginStatus({
        isKnown: true,
        isRegistered: false,
        userId: "guest",
      });
    return Promise.resolve({
      authStateChanged: true,
      needsCacheRefresh: false,
    });
  });
  mocks.fetchVotes.mockImplementation(() =>
    Promise.resolve(
      [...databaseVotes].map(([opinionSlugId, votingAction]) => ({
        opinionSlugId,
        votingAction,
      }))
    )
  );
  mocks.castVote.mockImplementation(({ opinionSlugId, votingAction }) => {
    if (votingAction === "agree") databaseVotes.set(opinionSlugId, "agree");
    // Cancellations remain buffered until the test advances persistence.
    return Promise.resolve({ success: true });
  });
  mocks.fetchNext.mockImplementation((request) =>
    Promise.resolve(nextResponse(request))
  );
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  app = createApp(
    defineComponent(
      () => () =>
        h(KeepAlive, undefined, {
          default: () =>
            isVisible.value
              ? h(OneAtATimeSection, {
                  ref: section,
                  postSlugId: "conversation",
                  editingOpinion: undefined,
                  order: "discover",
                  conversationAuthorUsername: "author",
                  conversationOrganizationName: "",
                  onViewAnalysis: vi.fn(),
                  isVotingDisabled: false,
                  conversationRouteContext: { kind: "normal" },
                })
              : undefined,
        })
    )
  );
  app.component(
    "QIcon",
    defineComponent(() => () => h("span"))
  );
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  container = document.createElement("div");
  app.mount(container);
  await settle();
});

afterEach(() => {
  app.unmount();
  queryClient.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("Polis repeated Undo", () => {
  it("restores previous statements after completion and keeps counts stable during buffered cancellation", async () => {
    expect(container.textContent).toContain("3 remaining");
    await click("agree");
    await click("agree");
    await click("agree");
    expect(container.querySelector('[data-testid="statement"]')).toBeNull();
    expect(container.textContent).toContain("0 remaining");

    await click("undo");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.textContent).toContain("1 remaining");
    await click("undo");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(container.textContent).toContain("2 remaining");
    await vi.advanceTimersByTimeAsync(1000);
    expect(container.textContent).toContain("2 remaining");

    databaseVotes.delete("third");
    databaseVotes.delete("second");
    await vi.advanceTimersByTimeAsync(1000);
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.textContent).toContain("1 remaining");
    await click("agree");
    expect(container.querySelector('[data-testid="statement"]')).toBeNull();
    expect(container.textContent).toContain("0 remaining");
  });

  it("rolls back a failed Undo, including the prior caught-up state and history", async () => {
    await click("agree");
    await click("agree");
    await click("agree");
    mocks.castVote.mockRejectedValueOnce(new Error("network failure"));
    await click("undo");
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith("voteUnconfirmed");
    expect(container.querySelector('[data-testid="statement"]')).toBeNull();
    expect(container.textContent).toContain("0 remaining");
    await click("undo");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
  });

  it("ignores repeated Undo input until the first cancellation settles", async () => {
    await click("agree");
    await click("agree");
    const deferred = Promise.withResolvers<{ success: true }>();
    mocks.castVote.mockReturnValueOnce(deferred.promise);
    await click("undo");
    await click("undo");
    expect(mocks.castVote).toHaveBeenCalledTimes(3);
    deferred.resolve({ success: true });
    await settle();
    await click("undo");
    expect(mocks.castVote).toHaveBeenCalledTimes(4);
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("first");
  });

  it("does not attach an old in-flight vote to another account's history", async () => {
    const deferred = Promise.withResolvers<{ success: true }>();
    mocks.castVote.mockReturnValueOnce(deferred.promise);
    await click("agree");
    useAuthenticationStore().setLoginStatus({
      isKnown: true,
      userId: "other",
      isRegistered: true,
      isLoggedIn: true,
    });
    await settle();
    deferred.resolve({ success: true });
    await settle();
    const undo = container.querySelector('[data-testid="undo"]');
    expect(undo instanceof HTMLButtonElement && undo.disabled).toBe(true);
  });
});

describe("one-at-a-time prefetching", () => {
  it("settles unrelated outstanding votes after deleting the current statement", async () => {
    await click("agree");
    const second = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote.mockReturnValueOnce(second.promise);
    await click("agree");
    availableOpinions = availableOpinions.filter(
      (item) => item.opinionSlugId !== "third"
    );
    await click("delete");
    expect(container.textContent).not.toContain("caughtUp");
    second.resolve({ success: true });
    await settle();
    expect(container.textContent).toContain("caughtUp");
  });

  it("lets people keep voting while unrelated statement responses are pending", async () => {
    await click("agree");
    const second = Promise.withResolvers<CastVoteResponse>();
    const third = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    const nextButton = container.querySelector('[data-testid="agree"]');
    expect(nextButton instanceof HTMLButtonElement && nextButton.disabled).toBe(
      false
    );
    await click("agree");
    expect(mocks.castVote).toHaveBeenCalledTimes(3);
    expect(container.textContent).not.toContain("caughtUp");
    third.resolve({ success: true });
    await settle();
    expect(container.textContent).not.toContain("caughtUp");
    second.resolve({ success: true });
    await settle();
    expect(container.textContent).toContain("caughtUp");
  });

  it("defers a network-uncertainty explanation until its statement is shown for review", async () => {
    await click("agree");
    mocks.castVote.mockRejectedValueOnce(new Error("response lost"));
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(mocks.notify).not.toHaveBeenCalled();
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith("voteUnconfirmed");
  });

  it("explains an unavailable rejected statement at the next transition rather than interrupting reading", async () => {
    mocks.castVote.mockResolvedValueOnce({
      success: false,
      reason: "statement_changed",
    });
    mocks.fetchOpinions.mockResolvedValueOnce([]);
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(mocks.notify).not.toHaveBeenCalled();
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith("voteUnavailable");
  });

  it("keeps the current and next statements ready and refills without interrupting reading", async () => {
    expect(mocks.fetchNext).toHaveBeenCalledTimes(2);
    expect(mocks.fetchNext).toHaveBeenLastCalledWith(
      expect.objectContaining({ excludedOpinionSlugIds: ["first"] })
    );
    expect(container.textContent).toContain("3 remaining");

    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(container.textContent).toContain("2 remaining");
    expect(mocks.fetchNext).toHaveBeenCalledTimes(3);
    expect(mocks.fetchNext).toHaveBeenLastCalledWith(
      expect.objectContaining({ excludedOpinionSlugIds: ["first", "second"] })
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(section.value?.isLoading).toBe(false);
    expect(container.querySelector('[data-testid="retry"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");

    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    expect(mocks.fetchNext).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("2 remaining");
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
  });

  it("only shows delayed loading when rapid votes exhaust the prefetched statement", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    await click("agree");

    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    const agree = container.querySelector('[data-testid="agree"]');
    expect(agree instanceof HTMLButtonElement && agree.disabled).toBe(true);
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(container.textContent).not.toContain("caughtUp");

    await vi.advanceTimersByTimeAsync(199);
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(section.value?.isLoading).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(container.querySelector('[data-testid="loading"]')).not.toBeNull();
    expect(section.value?.isLoading).toBe(true);

    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(container.textContent).toContain("1 remaining");
    expect(section.value?.isLoading).toBe(false);
    expect(mocks.castVote).toHaveBeenCalledTimes(2);
  });

  it("never flashes loading for a refill that completes within the delay", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    await click("agree");
    await vi.advanceTimersByTimeAsync(100);
    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    await vi.advanceTimersByTimeAsync(200);
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
  });

  it("accepts a prefetched statement while a vote is still being acknowledged", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    const vote = Promise.withResolvers<{ success: true }>();
    mocks.castVote.mockReturnValueOnce(vote.promise);
    await click("agree");
    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.textContent).not.toContain("caughtUp");

    vote.resolve({ success: true });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
  });

  it("finishes directly when the prefetch has already confirmed there are no more statements", async () => {
    await click("agree");
    await click("agree");
    const callsBeforeLastVote = mocks.fetchNext.mock.calls.length;
    await click("agree");
    await vi.advanceTimersByTimeAsync(1000);
    expect(container.textContent).toContain("caughtUp");
    expect(container.textContent).toContain("0 remaining");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(mocks.fetchNext).toHaveBeenCalledTimes(callsBeforeLastVote);
  });

  it("keeps background errors out of the current card and offers retry if the buffer is exhausted", async () => {
    mocks.fetchNext.mockRejectedValueOnce(new Error("network failure"));
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(container.querySelector('[data-testid="retry"]')).toBeNull();

    await click("agree");
    expect(container.querySelector('[data-testid="retry"]')).not.toBeNull();
    expect(container.textContent).not.toContain("caughtUp");
    await click("retry");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
  });

  it("does not reuse another account's prefetched statement or a late response", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    mocks.fetchNext.mockResolvedValueOnce({
      status: "ready",
      opinion: opinion("other-account"),
      remainingCount: 1,
    });
    useAuthenticationStore().setLoginStatus({
      isKnown: true,
      userId: "other",
      isRegistered: true,
      isLoggedIn: true,
    });
    await settle();
    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("other-account");
  });

  it("defers statement rejection feedback until the refreshed statement is naturally shown again", async () => {
    mocks.castVote.mockResolvedValueOnce({
      success: false,
      reason: "statement_changed",
    });
    const edited = opinion("first");
    edited.displayContent.sourceVersion = "edited-source";
    availableOpinions = [edited, ...opinions.slice(1)];
    mocks.fetchNext.mockImplementation((request) => {
      const response = nextResponse(request);
      return Promise.resolve(
        response.status === "ready" &&
          response.opinion.opinionSlugId === "first"
          ? { ...response, opinion: edited }
          : response
      );
    });
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(mocks.notify).not.toHaveBeenCalled();
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("first");
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith("voteChanged");
    await click("agree");
    expect(mocks.castVote).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceVersion: "edited-source" })
    );
  });

  it("preserves the prefetched statement across an edit of the current one", async () => {
    const edited = opinion("first");
    edited.displayContent.sourceVersion = "edited-source";
    section.value?.acknowledgeEditedOpinion(edited);
    await settle();
    expect(mocks.fetchNext).toHaveBeenCalledTimes(2);
    await click("agree");
    expect(mocks.castVote).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceVersion: "edited-source" })
    );
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
  });

  it("keeps the next statement visible and stops further voting when the conversation closes", async () => {
    mocks.castVote.mockResolvedValueOnce(
      participationRejectionFixture("conversation_closed")
    );
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(container.textContent).toContain("3 remaining");
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith("votingUnavailable");
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(mocks.castVote).toHaveBeenCalledTimes(1);
  });

  it("keeps an eligible in-flight refill through Undo without changing the local statement order", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    await click("undo");
    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("first");
    expect(container.textContent).toContain("3 remaining");
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("second");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    await click("agree");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
  });

  it("drops the old-language buffer when language preferences change", async () => {
    const localized = opinion("first");
    localized.displayContent.sourceVersion = "localized-source";
    mocks.fetchNext.mockResolvedValueOnce({
      status: "ready",
      opinion: localized,
      remainingCount: 3,
    });
    await useLanguageStore().changeDisplayLanguage({ newLanguage: "fr" });
    await settle();
    await click("agree");
    expect(mocks.castVote).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceVersion: "localized-source" })
    );
  });

  it("does not show a stale caught-up state when a new-statement refresh is still pending", async () => {
    await click("agree");
    await click("agree");
    availableOpinions.push(opinion("fourth"));
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    useOpinionUpdatesStore().markNewOpinion("conversation");
    await settle();
    await click("agree");
    expect(container.textContent).not.toContain("caughtUp");
    refill.resolve({
      status: "ready",
      opinion: opinion("fourth"),
      remainingCount: 1,
    });
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("fourth");
  });

  it("refreshes progress after Undo persistence even when a next statement is already buffered", async () => {
    await click("agree");
    await click("agree");
    await click("agree");
    await click("undo");
    availableOpinions.push(opinion("fourth"));
    useOpinionUpdatesStore().markNewOpinion("conversation");
    await settle();
    const callsBeforeConfirmation = mocks.fetchNext.mock.calls.length;
    databaseVotes.delete("third");
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.fetchNext.mock.calls.length).toBeGreaterThan(
      callsBeforeConfirmation
    );
    expect(container.textContent).toContain("2 remaining");
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
  });

  it("does not accumulate an unused next-statement cache entry for each vote", async () => {
    await click("agree");
    await click("agree");
    await click("agree");
    expect(
      queryClient.getQueryCache().findAll({
        queryKey: ["nextUnansweredOpinion", "conversation"],
      })
    ).toHaveLength(1);
  });

  it("pauses further prefetches while the cached page is inactive and resumes on return", async () => {
    const refill = Promise.withResolvers<FetchNextUnansweredOpinionResponse>();
    mocks.fetchNext.mockReturnValueOnce(refill.promise);
    await click("agree");
    await click("agree");
    isVisible.value = false;
    await settle();
    const callsBeforeReturn = mocks.fetchNext.mock.calls.length;
    refill.resolve({
      status: "ready",
      opinion: opinion("third"),
      remainingCount: 1,
    });
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.fetchNext).toHaveBeenCalledTimes(callsBeforeReturn);
    isVisible.value = true;
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("third");
    expect(container.querySelector('[data-testid="loading"]')).toBeNull();
    expect(mocks.fetchNext.mock.calls.length).toBeGreaterThan(
      callsBeforeReturn
    );
  });

  it("preserves a new statement fetched while an Undo request subsequently fails", async () => {
    await click("agree");
    await click("agree");
    await click("agree");
    const cancellation = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote.mockReturnValueOnce(cancellation.promise);
    await click("undo");
    availableOpinions.push(opinion("fourth"));
    useOpinionUpdatesStore().markNewOpinion("conversation");
    await settle();
    cancellation.resolve(participationRejectionFixture("conversation_locked"));
    await settle();
    expect(
      container.querySelector('[data-testid="statement"]')?.textContent
    ).toContain("fourth");
    expect(container.textContent).toContain("1 remaining");
    expect(container.textContent).not.toContain("caughtUp");
  });
});
