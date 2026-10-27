import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, type Pinia } from "pinia";
import CommentActionBar from "src/components/post/comments/group/item/CommentActionBar.vue";
import type {
  OpinionVoteParams,
  UserVote,
} from "src/composables/opinion/types";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import type { CastVoteResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem, VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { participationRejectionFixture } from "src/utils/api/participation/participationTestFixtures";
import { getUserVotesQueryKey } from "src/utils/query/conversationQueryKeys";
import { seedNewGuestQueries } from "src/utils/query/guestQueryCache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, ref } from "vue";

const mocks = vi.hoisted(() => ({
  castVote:
    vi.fn<
      (params: {
        opinionSlugId: string;
        votingAction: VotingAction;
      }) => Promise<CastVoteResponse>
    >(),
  ensureAuth: vi.fn<() => Promise<void>>(),
  notify: vi.fn(),
  handleBlockedReason: vi.fn(),
}));
vi.mock("../vote", () => ({
  useBackendVoteApi: () => ({ castVoteForComment: mocks.castVote }),
}));
vi.mock("../auth", () => ({
  useBackendAuthApi: () => ({ ensureParticipationAuthState: mocks.ensureAuth }),
}));
vi.mock("../common", () => ({
  useCommonApi: () => ({ getErrorMessage: () => "network error" }),
}));
vi.mock("../../ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("../comment/useCommentQueries", () => ({
  useInvalidateCommentQueries: () => ({ markAnalysisAsStale: vi.fn() }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock(
  "src/components/authentication/intention/PreParticipationIntentionDialog.vue",
  () => ({
    default: { render: () => null },
  })
);
vi.mock("src/composables/conversation/useParticipationGate", () => ({
  useParticipationGate: () => ({
    participationStatus: ref({ status: "ready" }),
    openParticipationOnboarding: vi.fn(),
    captureParticipationAction: () => ({
      isCurrent: () => true,
      handleBlockedReason: mocks.handleBlockedReason,
    }),
  }),
}));
vi.mock("../post/useConversationQuery", () => ({
  useInvalidateConversationQuery: () => ({ invalidateConversation: vi.fn() }),
}));

import type { OpinionCache } from "../comment/opinionCache";
import { initialOpinionPageRequest } from "../comment/opinionPageBoundary";
import { useVoteMutation } from "./useVoteQueries";

const opinion: DisplayedOpinionItem = {
  opinionSlugId: "first",
  opinion: "A statement",
  username: "author",
  sourceLanguageCode: "en",
  createdAt: new Date(),
  updatedAt: new Date(),
  numParticipants: 0,
  numAgrees: 0,
  numDisagrees: 0,
  numPasses: 0,
  isSeed: false,
  moderation: { status: "unmoderated" },
  displayContent: {
    sourceVersion: "source",
    status: "available",
    mode: "original",
    content: { content: "A statement" },
    translationControl: null,
  },
};
const commentsKey = [
  "comments",
  "conversation",
  "discover",
  "viewer",
  "en",
  ["en"],
];
const cleanups: Array<() => void> = [];

beforeEach(() => {
  mocks.ensureAuth.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.resetAllMocks();
});

function mountVoting({
  queryClient = new QueryClient(),
  pinia = createPinia(),
}: { queryClient?: QueryClient; pinia?: Pinia } = {}) {
  const auth = useAuthenticationStore(pinia);
  auth.setLoginStatus({ isKnown: true, userId: "viewer" });
  const cache: OpinionCache = {
    pages: [
      {
        items: [opinion, { ...opinion, opinionSlugId: "second" }],
        nextCursor: null,
        nextRequest: undefined,
      },
    ],
    pageParams: [
      initialOpinionPageRequest({
        conversationSlugId: "conversation",
        filter: "discover",
      }),
    ],
  };
  if (queryClient.getQueryData(commentsKey) === undefined) {
    queryClient.setQueryData(commentsKey, cache);
  }
  let mutation: ReturnType<typeof useVoteMutation> | undefined;
  const app = createApp({
    setup() {
      mutation = useVoteMutation({ postSlugId: "conversation" });
      return () => h("div");
    },
  });
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  app.mount(document.createElement("div"));
  cleanups.push(() => {
    app.unmount();
    queryClient.clear();
  });
  if (mutation === undefined) throw new Error("Voting was not mounted");
  const { mutateAsync } = mutation;

  function vote({
    action,
    opinionSlugId = "first",
    isCurrent = () => true,
  }: {
    action: VotingAction;
    opinionSlugId?: string;
    isCurrent?: () => boolean;
  }) {
    return mutateAsync({
      opinionSlugId,
      voteAction: action,
      sourceVersion: "source",
      isCurrent,
    });
  }

  function votes() {
    return queryClient.getQueryData<UserVote[]>(
      getUserVotesQueryKey({
        conversationSlugId: "conversation",
        voterId: auth.userId,
      })
    );
  }
  function counts() {
    return queryClient
      .getQueryData<OpinionCache>(commentsKey)
      ?.pages[0]?.items.map(({ numAgrees, numDisagrees, numPasses }) => ({
        numAgrees,
        numDisagrees,
        numPasses,
      }));
  }
  return { vote, submit: mutateAsync, votes, counts, queryClient, pinia, auth };
}

function mountActionBar() {
  const queryClient = new QueryClient();
  const pinia = createPinia();
  useAuthenticationStore(pinia).setLoginStatus({
    isKnown: true,
    userId: "viewer",
  });
  const app = createApp({
    setup() {
      const voting = useOpinionVoting({ postSlugId: "conversation" });
      return () =>
        h(CommentActionBar, {
          commentItem: opinion,
          sourceVersion: "source",
          postSlugId: "conversation",
          votingUtilities: {
            userVotes: voting.userVotes.value,
            castVote: voting.castVote,
          },
          onViewAnalysis: () => undefined,
          isVotingDisabled: false,
          showVoteResults: true,
        });
    },
  });
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  const root = document.createElement("div");
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    queryClient.clear();
  });
  const disagree = root.querySelector(".voting-button--disagree");
  const agree = root.querySelector(".voting-button--agree");
  if (
    !(disagree instanceof HTMLButtonElement) ||
    !(agree instanceof HTMLButtonElement)
  ) {
    throw new Error("Vote buttons were not mounted");
  }
  return { disagree, agree };
}

describe("immediate last-choice-wins voting", () => {
  it.each([
    "survey_required",
    "survey_outdated",
    "account_required",
    "strong_verification_required",
    "email_verification_required",
    "event_ticket_required",
  ] as const)(
    "rolls back a backend %s rejection before opening onboarding",
    async (reason) => {
      const response = Promise.withResolvers<CastVoteResponse>();
      mocks.castVote.mockReturnValue(response.promise);
      const { agree } = mountActionBar();
      mocks.handleBlockedReason.mockImplementation(() => {
        expect(agree.getAttribute("aria-pressed")).toBe("false");
      });
      agree.click();
      await vi.waitFor(() =>
        expect(agree.getAttribute("aria-pressed")).toBe("true")
      );
      response.resolve(participationRejectionFixture(reason));
      await vi.waitFor(() =>
        expect(mocks.handleBlockedReason).toHaveBeenCalledExactlyOnceWith(
          participationRejectionFixture(reason)
        )
      );
    }
  );

  it("keeps the actual buttons enabled, accepts a new choice, and notifies once on rollback", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockRejectedValue(new Error("latest failed"));
    const { disagree, agree } = mountActionBar();
    disagree.click();
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    expect(disagree.disabled).toBe(false);
    expect(agree.disabled).toBe(false);
    agree.click();
    await vi.waitFor(() =>
      expect(agree.getAttribute("aria-pressed")).toBe("true")
    );
    first.resolve({ success: true });
    await vi.waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(1));
    expect(disagree.getAttribute("aria-pressed")).toBe("true");
    expect(agree.disabled).toBe(false);
  });

  it("shows the latest choice immediately and sends it after the earlier write", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    const last = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(last.promise);
    const { vote, votes, counts } = mountVoting();
    const disagree = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const agree = vote({ action: "agree" });
    await vi.waitFor(() =>
      expect(votes()).toEqual([
        { opinionSlugId: "first", votingAction: "agree" },
      ])
    );
    expect(counts()?.[0]).toEqual({
      numAgrees: 1,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(mocks.castVote).toHaveBeenCalledTimes(1);

    first.resolve({ success: true });
    expect(await disagree).toBeUndefined();
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(2));
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    last.resolve({ success: true });
    expect(await agree).toEqual({ success: true });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("replaces a queued choice immediately without waiting for the active write", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes } = mountVoting();
    const active = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const skipped = vote({ action: "disagree" });
    const latest = vote({ action: "pass" });
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("pass"));
    expect(await skipped).toBeUndefined();
    expect(mocks.castVote).toHaveBeenCalledTimes(1);
    first.resolve({ success: true });
    await Promise.all([active, latest]);
    expect(
      mocks.castVote.mock.calls.map(([request]) => request.votingAction)
    ).toEqual(["agree", "pass"]);
  });

  it("captures queued request values instead of retaining a caller's mutable input", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, submit } = mountVoting();
    const active = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const request: OpinionVoteParams & { isCurrent: () => boolean } = {
      opinionSlugId: "first",
      voteAction: "agree",
      sourceVersion: "source",
      isCurrent: () => true,
    };
    const queued = submit(request);
    request.voteAction = "pass";
    request.sourceVersion = "replaced-source";
    first.resolve({ success: true });
    await Promise.all([active, queued]);
    expect(mocks.castVote).toHaveBeenLastCalledWith(
      expect.objectContaining({
        votingAction: "agree",
        sourceVersion: "source",
      })
    );
  });

  it("keeps tap order even when cancelling an earlier read takes longer", async () => {
    mocks.castVote.mockResolvedValue({ success: true });
    const { vote, votes, queryClient } = mountVoting();
    const cancellation = Promise.withResolvers<void>();
    vi.spyOn(queryClient, "cancelQueries").mockImplementationOnce(
      () => cancellation.promise
    );
    const first = vote({ action: "disagree" });
    expect(votes()?.[0]?.votingAction).toBe("disagree");
    const latest = vote({ action: "agree" });
    expect(votes()?.[0]?.votingAction).toBe("agree");
    cancellation.resolve();
    await Promise.all([first, latest]);
    expect(
      mocks.castVote.mock.calls.map(([request]) => request.votingAction)
    ).toEqual(["agree"]);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
  });

  it("shares ordering and accepted rollback state across voting views", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockRejectedValue(new Error("latest failed"));
    const original = mountVoting();
    let originalViewIsCurrent = true;
    const active = original.vote({
      action: "disagree",
      isCurrent: () => originalViewIsCurrent,
    });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    originalViewIsCurrent = false;
    const replacement = mountVoting({
      queryClient: original.queryClient,
      pinia: original.pinia,
    });
    const latest = replacement.vote({ action: "agree" });
    const outcomes = Promise.allSettled([active, latest]);
    await vi.waitFor(() =>
      expect(replacement.votes()?.[0]?.votingAction).toBe("agree")
    );
    expect(mocks.castVote).toHaveBeenCalledTimes(1);
    first.resolve({ success: true });
    expect((await outcomes).map((outcome) => outcome.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(replacement.votes()).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
    expect(replacement.counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 1,
      numPasses: 0,
    });
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("repairs the shared cache after leaving a view without showing its stale error", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote.mockReturnValueOnce(first.promise);
    const { vote, votes, counts } = mountVoting();
    let viewIsCurrent = true;
    const active = vote({ action: "agree", isCurrent: () => viewIsCurrent });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    viewIsCurrent = false;
    first.reject(new Error("view left"));
    expect(await active).toBeUndefined();
    expect(votes()).toEqual([]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rolls back an invalidated queued choice without sending it", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote.mockReturnValueOnce(first.promise);
    const { vote, votes, counts } = mountVoting();
    const active = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    let viewIsCurrent = true;
    const queued = vote({ action: "disagree", isCurrent: () => viewIsCurrent });
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("disagree"));
    viewIsCurrent = false;
    first.resolve({ success: true });
    await Promise.all([active, queued]);
    expect(mocks.castVote).toHaveBeenCalledTimes(1);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 1,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("preserves other viewers' in-flight reads", async () => {
    const { vote, queryClient } = mountVoting();
    mocks.castVote.mockResolvedValue({ success: true });
    const votesRead = Promise.withResolvers<UserVote[]>();
    const commentsRead = Promise.withResolvers<OpinionCache>();
    let votesSignal: AbortSignal | undefined;
    let commentsSignal: AbortSignal | undefined;
    const foreignVotes = queryClient.fetchQuery({
      queryKey: getUserVotesQueryKey({
        conversationSlugId: "conversation",
        voterId: "other",
      }),
      queryFn: ({ signal }) => {
        votesSignal = signal;
        return votesRead.promise;
      },
    });
    const foreignComments = queryClient.fetchQuery({
      queryKey: ["comments", "conversation", "discover", "other", "en", ["en"]],
      queryFn: ({ signal }) => {
        commentsSignal = signal;
        return commentsRead.promise;
      },
    });
    await vote({ action: "agree" });
    expect(votesSignal?.aborted).toBe(false);
    expect(commentsSignal?.aborted).toBe(false);
    votesRead.resolve([]);
    commentsRead.resolve({ pages: [], pageParams: [] });
    await Promise.all([foreignVotes, foreignComments]);
  });

  it("ignores an older failure even when the latest choice matches it again", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes } = mountVoting();
    const initial = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const middle = vote({ action: "disagree" });
    const latest = vote({ action: "agree" });
    await vi.waitFor(() =>
      expect(votes()).toEqual([
        { opinionSlugId: "first", votingAction: "agree" },
      ])
    );
    first.reject(new Error("old request failed"));
    await Promise.all([initial, middle, latest]);
    expect(
      mocks.castVote.mock.calls.map(([request]) => request.votingAction)
    ).toEqual(["agree", "agree"]);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("restores the original vote when both choices fail and notifies once", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    const last = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(last.promise);
    const { vote, votes, counts } = mountVoting();
    const disagree = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const agree = vote({ action: "agree" });
    const outcomes = Promise.allSettled([disagree, agree]);
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    first.reject(new Error("first failed"));
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(2));
    last.reject(new Error("last failed"));
    expect((await outcomes).map((outcome) => outcome.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(votes()).toEqual([]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("rolls back to the last accepted vote when the latest choice is rejected", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(participationRejectionFixture("conversation_closed"));
    const { vote, votes, counts } = mountVoting();
    const disagree = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const agree = vote({ action: "agree" });
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    first.resolve({ success: true });
    await Promise.all([disagree, agree]);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 1,
      numPasses: 0,
    });
  });

  it("cancels immediately while the first vote is still pending", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes, counts } = mountVoting();
    const agree = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const cancel = vote({ action: "cancel" });
    await vi.waitFor(() => expect(votes()).toEqual([]));
    first.resolve({ success: true });
    await Promise.all([agree, cancel]);
    expect(votes()).toEqual([]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(
      mocks.castVote.mock.calls.map(([request]) => request.votingAction)
    ).toEqual(["agree", "cancel"]);
  });

  it("sends votes on different statements independently", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes } = mountVoting();
    const pending = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    await vote({ opinionSlugId: "second", action: "pass" });
    expect(mocks.castVote).toHaveBeenCalledTimes(2);
    first.reject(new Error("first failed"));
    await expect(pending).rejects.toThrow("first failed");
    expect(votes()).toEqual([
      { opinionSlugId: "second", votingAction: "pass" },
    ]);
  });

  it("restores a pre-existing vote when every new choice fails", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockResolvedValueOnce({ success: true })
      .mockReturnValueOnce(first.promise)
      .mockRejectedValue(new Error("latest failed"));
    const { vote, votes, counts } = mountVoting();
    await vote({ action: "pass" });
    const disagree = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(2));
    const agree = vote({ action: "agree" });
    const outcomes = Promise.allSettled([disagree, agree]);
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    first.reject(new Error("first failed"));
    expect((await outcomes).map((outcome) => outcome.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(votes()).toEqual([{ opinionSlugId: "first", votingAction: "pass" }]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 0,
      numDisagrees: 0,
      numPasses: 1,
    });
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("does not let an old account's request block or roll back a new account's choice", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes, auth, queryClient } = mountVoting();
    const old = vote({
      action: "disagree",
      isCurrent: () => auth.userId === "viewer",
    });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    auth.setLoginStatus({ isKnown: true, userId: "other" });
    await vote({ action: "agree" });
    expect(mocks.castVote).toHaveBeenCalledTimes(2);
    first.reject(new Error("old account failed"));
    await old;
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    expect(
      queryClient.getQueryData(
        getUserVotesQueryKey({
          conversationSlugId: "conversation",
          voterId: "viewer",
        })
      )
    ).toEqual([]);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("orders writes for the same account across an account switch and return", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ success: true });
    const { vote, auth, votes } = mountVoting();
    const old = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    auth.setLoginStatus({ isKnown: true, userId: "other" });
    await vote({ action: "pass" });
    auth.setLoginStatus({ isKnown: true, userId: "viewer" });
    const latest = vote({ action: "agree" });
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    expect(mocks.castVote).toHaveBeenCalledTimes(2);
    first.resolve({ success: true });
    expect(await old).toBeUndefined();
    expect(await latest).toEqual({ success: true });
    expect(mocks.castVote).toHaveBeenCalledTimes(3);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
  });

  it("does not promote an anonymous vote into a registered account that logs in while saving", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote.mockReturnValueOnce(first.promise);
    const { vote, auth, votes, queryClient } = mountVoting();
    auth.setLoginStatus({ isKnown: false });
    const pending = vote({ action: "agree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    auth.setLoginStatus({
      isKnown: true,
      userId: "registered",
      isLoggedIn: true,
    });
    first.resolve({ success: true });
    expect(await pending).toBeUndefined();
    expect(votes()).toBeUndefined();
    expect(
      queryClient.getQueryData(
        getUserVotesQueryKey({
          conversationSlugId: "conversation",
          voterId: "registered",
        })
      )
    ).toBeUndefined();
    expect(mocks.ensureAuth).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("preserves the latest choice through guest promotion and rolls it back to the accepted guest vote", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockRejectedValue(new Error("latest failed"));
    const { vote, votes, auth, queryClient } = mountVoting();
    auth.setLoginStatus({ isKnown: false });
    mocks.ensureAuth.mockImplementationOnce(() => {
      seedNewGuestQueries({ queryClient, userId: "guest" });
      auth.setLoginStatus({ isKnown: true, userId: "guest" });
      return Promise.resolve();
    });
    const disagree = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const agree = vote({ action: "agree" });
    const outcomes = Promise.allSettled([disagree, agree]);
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    first.resolve({ success: true });
    expect((await outcomes).map((outcome) => outcome.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("keeps guest-promotion ordering after an earlier anonymous request fails", async () => {
    const first = Promise.withResolvers<CastVoteResponse>();
    const second = Promise.withResolvers<CastVoteResponse>();
    mocks.castVote
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockResolvedValue({ success: true });
    const { vote, votes, auth, queryClient } = mountVoting();
    auth.setLoginStatus({ isKnown: false });
    const old = vote({ action: "disagree" });
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(1));
    const pending = vote({ action: "agree" });
    await vi.waitFor(() => expect(votes()?.[0]?.votingAction).toBe("agree"));
    first.reject(new Error("first failed"));
    await vi.waitFor(() => expect(mocks.castVote).toHaveBeenCalledTimes(2));
    seedNewGuestQueries({ queryClient, userId: "guest" });
    auth.setLoginStatus({ isKnown: true, userId: "guest" });
    const latest = vote({ action: "pass" });
    expect(votes()?.[0]?.votingAction).toBe("pass");
    expect(mocks.castVote).toHaveBeenCalledTimes(2);
    second.resolve({ success: true });
    await Promise.all([old, pending, latest]);
    expect(
      mocks.castVote.mock.calls.map(([request]) => request.votingAction)
    ).toEqual(["disagree", "agree", "pass"]);
    expect(votes()).toEqual([{ opinionSlugId: "first", votingAction: "pass" }]);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("keeps an accepted vote successful if refreshing participation auth fails", async () => {
    mocks.castVote.mockResolvedValue({ success: true });
    mocks.ensureAuth.mockRejectedValueOnce(new Error("auth refresh failed"));
    const { vote, votes, counts } = mountVoting();
    expect(await vote({ action: "agree" })).toEqual({ success: true });
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    expect(counts()?.[0]).toEqual({
      numAgrees: 1,
      numDisagrees: 0,
      numPasses: 0,
    });
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith(
      "voteSavedSessionRefreshFailed"
    );
    expect(await vote({ action: "disagree" })).toEqual({ success: true });
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
  });

  it("releases a failed statement queue so a later vote can succeed", async () => {
    mocks.castVote
      .mockRejectedValueOnce(new Error("failed vote"))
      .mockResolvedValue({ success: true });
    const { vote, votes } = mountVoting();
    await expect(vote({ action: "agree" })).rejects.toThrow("failed vote");
    expect(votes()).toEqual([]);
    expect(await vote({ action: "disagree" })).toEqual({ success: true });
    expect(votes()).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
});
