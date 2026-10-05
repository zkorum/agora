import { QueryClient } from "@tanstack/vue-query";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { getUserVotesQueryKey } from "../../query/conversationQueryKeys";
import { seedNewGuestQueries } from "../../query/guestQueryCache";
import type { OpinionCache } from "../comment/opinionCache";
import { initialOpinionPageRequest } from "../comment/opinionPageBoundary";
import {
  applyOptimisticVote,
  confirmVoteCache,
  restoreVoteCache,
} from "./voteCache";

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

const anonymousVotesKey = getUserVotesQueryKey({
  conversationSlugId: "conversation",
  voterId: undefined,
});
const guestVotesKey = getUserVotesQueryKey({
  conversationSlugId: "conversation",
  voterId: "guest",
});
const viewerVotesKey = getUserVotesQueryKey({
  conversationSlugId: "conversation",
  voterId: "viewer",
});

function opinionCache(items: DisplayedOpinionItem[]): OpinionCache {
  return {
    pages: [{ items, nextCursor: null, nextRequest: undefined }],
    pageParams: [
      initialOpinionPageRequest({
        conversationSlugId: "conversation",
        filter: "discover",
      }),
    ],
  };
}

describe("statement-scoped vote rollback", () => {
  it("retains another successful vote and rolls back a failed vote after guest promotion", () => {
    const queryClient = new QueryClient();
    const anonymousKey = [
      "comments",
      "conversation",
      "discover",
      undefined,
      "en",
      ["en"],
    ];
    const guestKey = [
      "comments",
      "conversation",
      "discover",
      "guest",
      "en",
      ["en"],
    ];
    queryClient.setQueryData(
      anonymousKey,
      opinionCache([opinion, { ...opinion, opinionSlugId: "second" }])
    );
    applyOptimisticVote({
      queryClient,
      votesKey: anonymousVotesKey,
      params: { opinionSlugId: "first", voteAction: "agree" },
    });
    const failed = applyOptimisticVote({
      queryClient,
      votesKey: anonymousVotesKey,
      params: { opinionSlugId: "second", voteAction: "agree" },
    });
    seedNewGuestQueries({ queryClient, userId: "guest" });
    restoreVoteCache({
      queryClient,
      votesKey: guestVotesKey,
      snapshot: failed,
    });
    expect(
      queryClient.getQueryData(["userVotes", "conversation", "guest"])
    ).toEqual([{ opinionSlugId: "first", votingAction: "agree" }]);
    expect(queryClient.getQueryData(anonymousVotesKey)).toBeUndefined();
    expect(
      queryClient
        .getQueryData<OpinionCache>(guestKey)
        ?.pages[0]?.items.map((item) => item.numAgrees)
    ).toEqual([1, 0]);
    queryClient.clear();
  });

  it("promotes only the confirmed statement instead of replacing an existing viewer's votes", () => {
    const queryClient = new QueryClient();
    const snapshot = applyOptimisticVote({
      queryClient,
      votesKey: anonymousVotesKey,
      params: { opinionSlugId: "first", voteAction: "agree" },
    });
    queryClient.setQueryData(
      ["userVotes", "conversation", "guest"],
      [{ opinionSlugId: "existing", votingAction: "pass" }]
    );
    confirmVoteCache({ queryClient, votesKey: guestVotesKey, snapshot });
    expect(
      queryClient.getQueryData(["userVotes", "conversation", "guest"])
    ).toEqual([
      { opinionSlugId: "existing", votingAction: "pass" },
      { opinionSlugId: "first", votingAction: "agree" },
    ]);
    queryClient.clear();
  });

  it("does not overwrite a newer authoritative count during rollback", () => {
    const queryClient = new QueryClient();
    const key = ["comments", "conversation", "new", "viewer", "en", ["en"]];
    queryClient.setQueryData(key, opinionCache([opinion]));
    const snapshot = applyOptimisticVote({
      queryClient,
      votesKey: viewerVotesKey,
      params: { opinionSlugId: "first", voteAction: "agree" },
    });
    queryClient.setQueryData(
      key,
      opinionCache([{ ...opinion, numAgrees: 20 }])
    );
    restoreVoteCache({ queryClient, votesKey: viewerVotesKey, snapshot });
    expect(
      queryClient.getQueryData<OpinionCache>(key)?.pages[0]?.items[0]?.numAgrees
    ).toBe(20);
    queryClient.clear();
  });

  it("leaves a newer vote intact when an older request fails", () => {
    const queryClient = new QueryClient();
    const failed = applyOptimisticVote({
      queryClient,
      votesKey: viewerVotesKey,
      params: { opinionSlugId: "first", voteAction: "agree" },
    });
    applyOptimisticVote({
      queryClient,
      votesKey: viewerVotesKey,
      params: { opinionSlugId: "first", voteAction: "disagree" },
    });

    restoreVoteCache({
      queryClient,
      votesKey: viewerVotesKey,
      snapshot: failed,
    });

    expect(queryClient.getQueryData(viewerVotesKey)).toEqual([
      { opinionSlugId: "first", votingAction: "disagree" },
    ]);
    queryClient.clear();
  });
});
