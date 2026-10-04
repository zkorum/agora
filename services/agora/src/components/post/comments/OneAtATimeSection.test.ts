import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import type { VotingSessionProgress } from "src/components/post/voting/VotingSessionToolbar.types";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";

const mocks = vi.hoisted(() => ({
  fetchNext: vi.fn(),
  castVote: vi.fn(),
  fetchVotes: vi.fn(),
  ensureAuth: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("src/utils/api/comment/comment", () => ({
  useBackendCommentApi: () => ({ fetchNextUnansweredOpinion: mocks.fetchNext }),
}));
vi.mock("src/utils/api/vote", () => ({
  useBackendVoteApi: () => ({ castVoteForComment: mocks.castVote, fetchUserVotesForPostSlugIds: mocks.fetchVotes }),
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
  useParticipationGate: () => ({ shouldOpenParticipationModal: () => Promise.resolve(false), openParticipationOnboarding: vi.fn() }),
}));
vi.mock("src/utils/ui/notify", () => ({ useNotify: () => ({ showNotifyMessage: mocks.notify }) }));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string, params?: { count: string }) => params ? `${params.count} remaining` : key }),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  return { useLanguageStore: defineStore("test-language", { state: () => ({ displayLanguage: "en", spokenLanguages: ["en"] }) }) };
});
vi.mock("src/components/post/voting/VotingSessionToolbar.vue", () => ({
  default: defineComponent((props: {
    progress: VotingSessionProgress; canUndo: boolean; isBusy: boolean; isDisabled: boolean;
  }, { emit }) => () => h("div", { "data-testid": "toolbar" }, [
    h("span", { "data-testid": "remaining" }, props.progress.kind === "count" ? props.progress.label : `${props.progress.value}%`),
    h("button", { "data-testid": "undo", disabled: !props.canUndo || props.isBusy || props.isDisabled, onClick: () => emit("undo") }, "Undo"),
  ]), {
    props: {
      progress: { type: Object, required: true },
      canUndo: { type: Boolean, required: true },
      isBusy: { type: Boolean, required: true },
      isDisabled: { type: Boolean, required: true },
    },
    emits: ["undo"],
  }),
}));
vi.mock("./group/CommentGroup.vue", () => ({
  default: defineComponent((props: {
    commentItemList: DisplayedOpinionItem[]; votingUtilities: OpinionVotingUtilities; isVotingDisabled: boolean;
  }) => () => {
    const opinion = props.commentItemList.at(0);
    if (opinion === undefined) return h("div");
    return h("div", { "data-testid": "statement" }, [
      opinion.opinionSlugId,
      h("button", {
        "data-testid": "agree",
        disabled: props.isVotingDisabled,
        onClick: () => props.votingUtilities.castVote({ opinionSlugId: opinion.opinionSlugId, voteAction: "agree" }),
      }, "Agree"),
    ]);
  }, {
    props: {
      commentItemList: { type: Array, required: true },
      votingUtilities: { type: Object, required: true },
      isVotingDisabled: { type: Boolean, required: true },
    },
  }),
}));

import OneAtATimeSection from "./OneAtATimeSection.vue";

function opinion(opinionSlugId: string): DisplayedOpinionItem {
  return {
    opinionSlugId, opinion: opinionSlugId, sourceLanguageCode: "en",
    username: "author", createdAt: new Date(), updatedAt: new Date(),
    numParticipants: 0, numAgrees: 0, numDisagrees: 0, numPasses: 0,
    moderation: { status: "unmoderated" }, isSeed: false,
    displayContent: { sourceVersion: "source", status: "available", mode: "original", content: { content: opinionSlugId }, translationControl: null },
  };
}

const opinions = [opinion("first"), opinion("second"), opinion("third")];
const databaseVotes = new Map<string, "agree">();
let queryClient: QueryClient;
let app: ReturnType<typeof createApp>;
let container: HTMLDivElement;

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await nextTick();
}

async function click(testId: string): Promise<void> {
  const button = container.querySelector(`[data-testid="${testId}"]`);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing test button ${testId}`);
  button.click();
  await settle();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  databaseVotes.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthenticationStore();
  auth.isAuthInitialized = true;
  mocks.ensureAuth.mockImplementation(() => {
    if (!auth.isKnown) auth.setLoginStatus({ isKnown: true, isRegistered: false, userId: "guest" });
    return Promise.resolve({ authStateChanged: true, needsCacheRefresh: false });
  });
  mocks.fetchVotes.mockImplementation(() => Promise.resolve([...databaseVotes].map(([opinionSlugId, votingAction]) => ({ opinionSlugId, votingAction }))));
  mocks.castVote.mockImplementation(({ opinionSlugId, votingAction }: { opinionSlugId: string; votingAction: string }) => {
    if (votingAction === "agree") databaseVotes.set(opinionSlugId, "agree");
    // Cancellations remain buffered until the test advances persistence.
    return Promise.resolve({ success: true });
  });
  mocks.fetchNext.mockImplementation(({ excludedOpinionSlugIds }: { excludedOpinionSlugIds: string[] }) => {
    const remaining = opinions.filter(item => !databaseVotes.has(item.opinionSlugId) && !excludedOpinionSlugIds.includes(item.opinionSlugId));
    const next = remaining.at(0);
    return Promise.resolve(next === undefined
      ? { status: "caught_up", remainingCount: 0 }
      : { status: "ready", opinion: next, remainingCount: remaining.length });
  });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  app = createApp(OneAtATimeSection, {
    postSlugId: "conversation", order: "discover", conversationAuthorUsername: "author",
    conversationOrganizationName: "", participationMode: "guest", requiresEventTicket: undefined,
    surveyGate: undefined, onViewAnalysis: vi.fn(), isVotingDisabled: false,
    conversationRouteContext: { kind: "normal" },
  });
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
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("third");
    expect(container.textContent).toContain("1 remaining");
    await click("undo");
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("second");
    expect(container.textContent).toContain("2 remaining");
    await vi.advanceTimersByTimeAsync(1000);
    expect(container.textContent).toContain("2 remaining");

    databaseVotes.delete("third");
    databaseVotes.delete("second");
    await vi.advanceTimersByTimeAsync(1000);
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("second");
    await click("agree");
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("third");
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
    expect(container.querySelector('[data-testid="statement"]')).toBeNull();
    expect(container.textContent).toContain("0 remaining");
    await click("undo");
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("third");
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
    expect(container.querySelector('[data-testid="statement"]')?.textContent).toContain("first");
  });

  it("does not attach an old in-flight vote to another account's history", async () => {
    const deferred = Promise.withResolvers<{ success: true }>();
    mocks.castVote.mockReturnValueOnce(deferred.promise);
    await click("agree");
    useAuthenticationStore().setLoginStatus({ isKnown: true, userId: "other", isRegistered: true, isLoggedIn: true });
    await settle();
    deferred.resolve({ success: true });
    await settle();
    const undo = container.querySelector('[data-testid="undo"]');
    expect(undo instanceof HTMLButtonElement && undo.disabled).toBe(true);
  });
});
