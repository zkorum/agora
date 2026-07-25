import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";

import {
  clearRetainedConversationRankingStatsUpdate,
  getRetainedConversationRankingStatsUpdate,
  retainConversationRankingStatsUpdate,
} from "./rankingStatsUpdate";

function rankingStatsUpdate(rankingStatsSnapshotId: number) {
  return {
    conversationSlugId: "ranking1",
    rankingStatsSnapshotId,
    checkpointChanged: false,
    opinionCount: 3,
    voteCount: 5,
    participantCount: 2,
    totalOpinionCount: 4,
    totalVoteCount: 6,
    totalParticipantCount: 3,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
    isClosed: false,
    timestamp: rankingStatsSnapshotId,
  } satisfies Parameters<typeof retainConversationRankingStatsUpdate>[0]["data"];
}

describe("ranking stats SSE retention", () => {
  it("retains only the newest payload before a conversation cache exists", () => {
    const queryClient = new QueryClient();
    const newest = rankingStatsUpdate(12);

    expect(
      retainConversationRankingStatsUpdate({
        queryClient,
        data: newest,
      })
    ).toBe(true);
    expect(
      retainConversationRankingStatsUpdate({
        queryClient,
        data: rankingStatsUpdate(11),
      })
    ).toBe(false);
    expect(
      getRetainedConversationRankingStatsUpdate({
        queryClient,
        conversationSlugId: newest.conversationSlugId,
      })
    ).toEqual(newest);
  });

  it("isolates retained payloads between query clients", () => {
    const firstQueryClient = new QueryClient();
    const secondQueryClient = new QueryClient();

    retainConversationRankingStatsUpdate({
      queryClient: firstQueryClient,
      data: rankingStatsUpdate(7),
    });

    expect(
      getRetainedConversationRankingStatsUpdate({
        queryClient: secondQueryClient,
        conversationSlugId: "ranking1",
      })
    ).toBeUndefined();
  });

  it("clears only after an authoritative response catches up", () => {
    const queryClient = new QueryClient();
    retainConversationRankingStatsUpdate({
      queryClient,
      data: rankingStatsUpdate(9),
    });

    clearRetainedConversationRankingStatsUpdate({
      queryClient,
      conversationSlugId: "ranking1",
      throughSnapshotId: 8,
    });
    expect(
      getRetainedConversationRankingStatsUpdate({
        queryClient,
        conversationSlugId: "ranking1",
      })
    ).toBeDefined();

    clearRetainedConversationRankingStatsUpdate({
      queryClient,
      conversationSlugId: "ranking1",
      throughSnapshotId: 9,
    });
    expect(
      getRetainedConversationRankingStatsUpdate({
        queryClient,
        conversationSlugId: "ranking1",
      })
    ).toBeUndefined();
  });
});
