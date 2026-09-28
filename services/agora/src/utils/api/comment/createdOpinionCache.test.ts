import { QueryClient } from "@tanstack/vue-query";
import type { UserVote } from "src/composables/opinion/types";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { cacheCreatedOpinion } from "./createdOpinionCache";

const createdOpinion: DisplayedOpinionItem = {
  opinionSlugId: "new-opinion",
  opinion: "A new statement",
  sourceLanguageCode: "en",
  createdAt: new Date(),
  updatedAt: new Date(),
  numParticipants: 1,
  numAgrees: 1,
  numDisagrees: 0,
  numPasses: 0,
  username: "author",
  moderation: { status: "unmoderated" },
  isSeed: false,
  displayContent: {
    sourceVersion: "new-content",
    status: "available",
    mode: "original",
    content: { content: "A new statement" },
    translationControl: null,
  },
};

describe("cacheCreatedOpinion", () => {
  it("inserts a new statement into the first server page without losing its cursor", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["comments", "conversation", "new", "user", "en", ["en"]];
    const cursor = {
      kind: "created",
      opinionSlugId: "last-opinion",
      opinionId: 12,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    queryClient.setQueryData(queryKey, {
      pages: [
        { items: [], nextCursor: cursor },
        { items: [], nextCursor: null },
      ],
      pageParams: [null, cursor],
    });

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
      viewerUserId: "user",
    });

    expect(queryClient.getQueryData(queryKey)).toEqual({
      pages: [
        { items: [createdOpinion], nextCursor: cursor },
        { items: [], nextCursor: null },
      ],
      pageParams: [null, cursor],
    });
    queryClient.clear();
  });

  it("keeps the confirmed auto-agree when older vote and statement reads finish", async () => {
    const queryClient = new QueryClient();
    const userVotesKey = ["userVotes", "conversation", "user"];
    const commentsKey = [
      "comments",
      "conversation",
      "discover",
      "user",
      "en",
      ["en"],
    ];
    const existingVotes: UserVote[] = [
      { opinionSlugId: "existing-opinion", votingAction: "disagree" },
    ];
    queryClient.setQueryData(userVotesKey, existingVotes);
    const emptyPage = {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [null],
    };
    queryClient.setQueryData(commentsKey, emptyPage);

    let finishVoteRead = () => {};
    let finishCommentRead = () => {};
    const voteRead = queryClient.fetchQuery({
      queryKey: userVotesKey,
      queryFn: () =>
        new Promise<UserVote[]>((resolve) => {
          finishVoteRead = () => resolve(existingVotes);
        }),
    });
    const commentRead = queryClient.fetchQuery({
      queryKey: commentsKey,
      queryFn: () =>
        new Promise<typeof emptyPage>((resolve) => {
          finishCommentRead = () => resolve(emptyPage);
        }),
    });
    const readsSettled = Promise.allSettled([voteRead, commentRead]);

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
      viewerUserId: "user",
    });
    finishVoteRead();
    finishCommentRead();
    await readsSettled;

    expect(queryClient.getQueryData(userVotesKey)).toEqual([
      ...existingVotes,
      { opinionSlugId: createdOpinion.opinionSlugId, votingAction: "agree" },
    ]);
    expect(queryClient.getQueryData(commentsKey)).toEqual({
      pages: [{ items: [createdOpinion], nextCursor: null }],
      pageParams: [null],
    });
    queryClient.clear();
  });

  it("seeds only the current viewer's lists and vote state", async () => {
    const queryClient = new QueryClient();
    const updatedKeys = ["discover", "new", "my_votes"].map((filter) => [
      "comments",
      "conversation",
      filter,
      "user",
      "en",
      ["en"],
    ]);
    const unchangedKeys = [
      ["comments", "conversation", "moderated"],
      ["comments", "conversation", "hidden"],
      // A different participant's personalized list must not receive this vote.
      ["comments", "conversation", "my_votes", "other-user", "en", ["en"]],
      ["comments", "other-conversation", "new"],
    ];
    const otherUserVotesKey = ["userVotes", "conversation", "other-user"];
    queryClient.setQueryData(otherUserVotesKey, []);
    for (const queryKey of [...updatedKeys, ...unchangedKeys]) {
      queryClient.setQueryData(queryKey, {
        pages: [{ items: [], nextCursor: null }],
        pageParams: [null],
      });
    }

    // Reapplying a confirmed result must not duplicate the statement or its vote.
    for (let attempt = 0; attempt < 2; attempt++) {
      await cacheCreatedOpinion({
        queryClient,
        conversationSlugId: "conversation",
        displayedOpinionItem: createdOpinion,
        viewerUserId: "user",
      });
    }

    for (const queryKey of updatedKeys) {
      expect(queryClient.getQueryData(queryKey)).toEqual({
        pages: [{ items: [createdOpinion], nextCursor: null }],
        pageParams: [null],
      });
    }
    for (const queryKey of unchangedKeys) {
      expect(queryClient.getQueryData(queryKey)).toEqual({
        pages: [{ items: [], nextCursor: null }],
        pageParams: [null],
      });
    }
    expect(
      queryClient.getQueryData(["userVotes", "conversation", "user"])
    ).toEqual([
      { opinionSlugId: createdOpinion.opinionSlugId, votingAction: "agree" },
    ]);
    expect(queryClient.getQueryData(otherUserVotesKey)).toEqual([]);
    queryClient.clear();
  });

  it("lets an unfetched list finish loading instead of replacing it with a partial list", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["comments", "conversation", "new", "user", "en", ["en"]];
    let finishRead = () => {};
    const existingOpinion = {
      ...createdOpinion,
      opinionSlugId: "existing-opinion",
    };
    const read = queryClient.fetchQuery({
      queryKey,
      queryFn: () =>
        new Promise<{
          pages: { items: DisplayedOpinionItem[]; nextCursor: null }[];
          pageParams: null[];
        }>((resolve) => {
          finishRead = () =>
            resolve({
              pages: [{ items: [existingOpinion], nextCursor: null }],
              pageParams: [null],
            });
        }),
    });

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
      viewerUserId: "user",
    });

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    expect(queryClient.getQueryState(queryKey)?.status).toBe("pending");
    finishRead();
    await read;
    expect(queryClient.getQueryData(queryKey)).toEqual({
      pages: [{ items: [existingOpinion], nextCursor: null }],
      pageParams: [null],
    });
    queryClient.clear();
  });
});
