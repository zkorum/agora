import { QueryClient } from "@tanstack/vue-query";
import type { UserVote } from "src/composables/opinion/types";
import type { FetchOpinionPageResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { cacheCreatedOpinion } from "./createdOpinionCache";
import type { OpinionCache } from "./opinionCache";
import {
  initialOpinionPageRequest,
  type OpinionPageRequest,
  parseOpinionPageResponse,
} from "./opinionPageBoundary";

type CommentsTestKey = readonly [
  "comments",
  string,
  OpinionPageRequest["filter"],
  ...unknown[],
];
function initialRequestForKey(key: CommentsTestKey): OpinionPageRequest {
  return initialOpinionPageRequest({
    conversationSlugId: key[1],
    filter: key[2],
  });
}
function pageForKey({
  key,
  items,
  nextCursor,
}: { key: CommentsTestKey } & FetchOpinionPageResponse) {
  return parseOpinionPageResponse({
    request: initialRequestForKey(key),
    rawResponse: { items, nextCursor },
  });
}

const createdOpinion: DisplayedOpinionItem = {
  opinionSlugId: "new-op",
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
    sourceVersion: "00000000-0000-4000-8000-000000000001",
    status: "available",
    mode: "original",
    content: { content: "A new statement" },
    translationControl: null,
  },
};

describe("cacheCreatedOpinion", () => {
  it("inserts a new statement into the first server page without losing its cursor", async () => {
    const queryClient = new QueryClient();
    const queryKey: CommentsTestKey = [
      "comments",
      "conversation",
      "new",
      "user",
      "en",
      ["en"],
    ];
    const cursor: NonNullable<
      Extract<OpinionPageRequest, { filter: "new" | "moderated" }>["cursor"]
    > = {
      kind: "created",
      opinionSlugId: "last-op",
      opinionId: 12,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    const pageParams = [
      initialRequestForKey(queryKey),
      { conversationSlugId: "conversation", filter: "new", cursor },
    ] satisfies OpinionPageRequest[];
    queryClient.setQueryData<OpinionCache>(queryKey, {
      pages: [
        pageForKey({ key: queryKey, items: [], nextCursor: cursor }),
        pageForKey({ key: queryKey, items: [], nextCursor: null }),
      ],
      pageParams,
    });

    await cacheCreatedOpinion({
      queryClient,
      conversationSlugId: "conversation",
      displayedOpinionItem: createdOpinion,
      viewerUserId: "user",
    });

    expect(queryClient.getQueryData(queryKey)).toEqual({
      pages: [
        pageForKey({
          key: queryKey,
          items: [createdOpinion],
          nextCursor: cursor,
        }),
        pageForKey({ key: queryKey, items: [], nextCursor: null }),
      ],
      pageParams,
    });
    queryClient.clear();
  });

  it("keeps the confirmed auto-agree when older vote and statement reads finish", async () => {
    const queryClient = new QueryClient();
    const userVotesKey = ["userVotes", "conversation", "user"];
    const commentsKey: CommentsTestKey = [
      "comments",
      "conversation",
      "discover",
      "user",
      "en",
      ["en"],
    ];
    const existingVotes: UserVote[] = [
      { opinionSlugId: "old-op", votingAction: "disagree" },
    ];
    queryClient.setQueryData(userVotesKey, existingVotes);
    const emptyPage = {
      pages: [pageForKey({ key: commentsKey, items: [], nextCursor: null })],
      pageParams: [initialRequestForKey(commentsKey)],
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
      pages: [
        pageForKey({
          key: commentsKey,
          items: [createdOpinion],
          nextCursor: null,
        }),
      ],
      pageParams: [initialRequestForKey(commentsKey)],
    });
    queryClient.clear();
  });

  it("seeds only the current viewer's lists and vote state", async () => {
    const queryClient = new QueryClient();
    const filters: OpinionPageRequest["filter"][] = [
      "discover",
      "new",
      "my_votes",
    ];
    const updatedKeys: CommentsTestKey[] = filters.map((filter) => [
      "comments",
      "conversation",
      filter,
      "user",
      "en",
      ["en"],
    ]);
    const unchangedKeys: CommentsTestKey[] = [
      ["comments", "conversation", "moderated"],
      ["comments", "conversation", "hidden"],
      // A different participant's personalized list must not receive this vote.
      ["comments", "conversation", "my_votes", "other-user", "en", ["en"]],
      ["comments", "other-conversation", "new"],
    ];
    const otherUserVotesKey = ["userVotes", "conversation", "other-user"];
    queryClient.setQueryData(otherUserVotesKey, []);
    for (const queryKey of [...updatedKeys, ...unchangedKeys]) {
      queryClient.setQueryData<OpinionCache>(queryKey, {
        pages: [pageForKey({ key: queryKey, items: [], nextCursor: null })],
        pageParams: [initialRequestForKey(queryKey)],
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
        pages: [
          pageForKey({
            key: queryKey,
            items: [createdOpinion],
            nextCursor: null,
          }),
        ],
        pageParams: [initialRequestForKey(queryKey)],
      });
    }
    for (const queryKey of unchangedKeys) {
      expect(queryClient.getQueryData(queryKey)).toEqual({
        pages: [pageForKey({ key: queryKey, items: [], nextCursor: null })],
        pageParams: [initialRequestForKey(queryKey)],
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
    const queryKey: CommentsTestKey = [
      "comments",
      "conversation",
      "new",
      "user",
      "en",
      ["en"],
    ];
    let finishRead = () => {};
    const existingOpinion = {
      ...createdOpinion,
      opinionSlugId: "old-op",
    };
    const read = queryClient.fetchQuery({
      queryKey,
      queryFn: () =>
        new Promise<OpinionCache>((resolve) => {
          finishRead = () =>
            resolve({
              pages: [
                pageForKey({
                  key: queryKey,
                  items: [existingOpinion],
                  nextCursor: null,
                }),
              ],
              pageParams: [initialRequestForKey(queryKey)],
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
      pages: [
        pageForKey({
          key: queryKey,
          items: [existingOpinion],
          nextCursor: null,
        }),
      ],
      pageParams: [initialRequestForKey(queryKey)],
    });
    queryClient.clear();
  });
});
