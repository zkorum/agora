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
  it("keeps the confirmed auto-agree when older vote and statement reads finish", async () => {
    const queryClient = new QueryClient();
    const userVotesKey = ["userVotes", "conversation"];
    const commentsKey = ["comments", "conversation", "discover"];
    const existingVotes: UserVote[] = [
      { opinionSlugId: "existing-opinion", votingAction: "disagree" },
    ];
    queryClient.setQueryData(userVotesKey, existingVotes);
    queryClient.setQueryData(commentsKey, []);

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
        new Promise<DisplayedOpinionItem[]>((resolve) => {
          finishCommentRead = () => resolve([]);
        }),
    });
    const readsSettled = Promise.allSettled([voteRead, commentRead]);

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
    });
    finishVoteRead();
    finishCommentRead();
    await readsSettled;

    expect(queryClient.getQueryData(userVotesKey)).toEqual([
      ...existingVotes,
      { opinionSlugId: createdOpinion.opinionSlugId, votingAction: "agree" },
    ]);
    expect(queryClient.getQueryData(commentsKey)).toEqual([createdOpinion]);
    queryClient.clear();
  });

  it("seeds ordinary lists and empty vote state without changing unrelated lists", async () => {
    const queryClient = new QueryClient();
    const updatedKeys = ["discover", "new", "my_votes"].map((filter) => [
      "comments", "conversation", filter, undefined, "en", ["en"],
    ]);
    const unchangedKeys = [
      ["comments", "conversation", "moderated"],
      ["comments", "conversation", "hidden"],
      ["comments", "conversation", "discover", "0"],
      ["comments", "other-conversation", "new"],
    ];
    for (const queryKey of [...updatedKeys, ...unchangedKeys]) {
      queryClient.setQueryData(queryKey, []);
    }

    // Reapplying a confirmed result must not duplicate the statement or its vote.
    for (let attempt = 0; attempt < 2; attempt++) {
      await cacheCreatedOpinion({
        queryClient,
        conversationSlugId: "conversation",
        displayedOpinionItem: createdOpinion,
      });
    }

    for (const queryKey of updatedKeys) {
      expect(queryClient.getQueryData(queryKey)).toEqual([createdOpinion]);
    }
    for (const queryKey of unchangedKeys) {
      expect(queryClient.getQueryData(queryKey)).toEqual([]);
    }
    expect(queryClient.getQueryData(["userVotes", "conversation"])).toEqual([
      { opinionSlugId: createdOpinion.opinionSlugId, votingAction: "agree" },
    ]);
    queryClient.clear();
  });

  it("lets an unfetched list finish loading instead of replacing it with a partial list", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["comments", "conversation", "new"];
    let finishRead = () => {};
    const existingOpinion = {
      ...createdOpinion,
      opinionSlugId: "existing-opinion",
    };
    const read = queryClient.fetchQuery({
      queryKey,
      queryFn: () =>
        new Promise<DisplayedOpinionItem[]>((resolve) => {
          finishRead = () => resolve([existingOpinion]);
        }),
    });

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
    });

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    expect(queryClient.getQueryState(queryKey)?.status).toBe("pending");
    finishRead();
    await read;
    expect(queryClient.getQueryData(queryKey)).toEqual([existingOpinion]);
    queryClient.clear();
  });
});
