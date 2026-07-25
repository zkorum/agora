import type {
  AnalysisCheckpoint,
  RankingStatsCheckpointsResponse,
} from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import { parseCheckpointQuery } from "src/utils/analysis/analysisRoute";
import {
  pickCommentStatsForActionBar,
  useAnalysisCheckpointsQuery,
  useCommentStatsQuery,
} from "src/utils/api/comment/useCommentQueries";
import { useRankingStatsCheckpointsQuery } from "src/utils/api/maxdiff/useMaxDiffQueries";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import type { LocationQuery } from "vue-router";

export type ConversationActionBarStats = Pick<
  ExtendedConversationDisplayData["metadata"],
  | "opinionCount"
  | "participantCount"
  | "voteCount"
  | "totalParticipantCount"
  | "totalVoteCount"
>;

interface UseConversationActionBarStatsParams {
  conversationData: MaybeRefOrGetter<
    ExtendedConversationDisplayData | undefined
  >;
  currentTab: MaybeRefOrGetter<"comment" | "analysis">;
  routeQuery: MaybeRefOrGetter<LocationQuery>;
  overrideStats?: MaybeRefOrGetter<ConversationActionBarStats | undefined>;
  enableCommentStats?: MaybeRefOrGetter<boolean>;
}

export function useConversationActionBarStats({
  conversationData,
  currentTab,
  routeQuery,
  overrideStats,
  enableCommentStats = true,
}: UseConversationActionBarStatsParams) {
  const checkpointViewSnapshotId = computed(() =>
    parseCheckpointQuery({ query: toValue(routeQuery) })
  );
  const conversationSlugId = computed(
    () => toValue(conversationData)?.metadata.conversationSlugId ?? ""
  );
  const shouldLoadPolisCheckpointStats = computed(() => {
    const conversation = toValue(conversationData);
    return (
      conversation?.metadata.conversationType === "polis" &&
      toValue(currentTab) === "analysis" &&
      checkpointViewSnapshotId.value !== undefined &&
      conversationSlugId.value !== ""
    );
  });
  const shouldLoadRankingCheckpointStats = computed(() => {
    const conversation = toValue(conversationData);
    return (
      conversation?.metadata.conversationType === "ranking" &&
      conversation.metadata.rankingMode === "bws" &&
      toValue(currentTab) === "analysis" &&
      checkpointViewSnapshotId.value !== undefined &&
      conversationSlugId.value !== ""
    );
  });
  const shouldLoadCommentStats = computed(() => {
    const conversation = toValue(conversationData);
    const isMaxDiffConversation =
      conversation?.metadata.conversationType === "ranking" &&
      conversation.metadata.rankingMode === "bws";
    return (
      toValue(currentTab) === "comment" &&
      toValue(enableCommentStats) &&
      conversationSlugId.value !== "" &&
      !isMaxDiffConversation
    );
  });

  const analysisCheckpointsQuery = useAnalysisCheckpointsQuery({
    conversationSlugId,
    enabled: shouldLoadPolisCheckpointStats,
  });
  const rankingCheckpointsQuery = useRankingStatsCheckpointsQuery({
    conversationSlugId,
    requestedRankingStatsSnapshotId: computed(() => {
      const checkpointId = checkpointViewSnapshotId.value;
      const conversation = toValue(conversationData);
      const liveSnapshotId =
        conversation?.metadata.conversationType === "ranking"
          ? conversation.metadata.rankingStatsSnapshotId
          : undefined;
      if (checkpointId === undefined) {
        return liveSnapshotId;
      }
      if (liveSnapshotId === undefined) {
        return checkpointId;
      }
      return Math.max(checkpointId, liveSnapshotId);
    }),
    enabled: shouldLoadRankingCheckpointStats,
  });
  const commentStatsQuery = useCommentStatsQuery({
    conversationSlugId,
    enabled: shouldLoadCommentStats,
  });

  const selectedAnalysisCheckpoint = computed<
    AnalysisCheckpoint | undefined
  >(() => {
    if (!shouldLoadPolisCheckpointStats.value) {
      return undefined;
    }

    const checkpointId = checkpointViewSnapshotId.value;
    if (checkpointId === undefined) {
      return undefined;
    }

    return analysisCheckpointsQuery.data.value?.find(
      (checkpoint) => checkpoint.conversationViewSnapshotId === checkpointId
    );
  });
  const selectedRankingCheckpoint = computed<
    RankingStatsCheckpointsResponse[number] | undefined
  >(() => {
    if (!shouldLoadRankingCheckpointStats.value) {
      return undefined;
    }
    const checkpointId = checkpointViewSnapshotId.value;
    if (checkpointId === undefined) {
      return undefined;
    }
    return rankingCheckpointsQuery.data.value?.find(
      (checkpoint) => checkpoint.rankingStatsSnapshotId === checkpointId
    );
  });

  const actionBarStats = computed<ConversationActionBarStats | undefined>(
    () => {
      const statsOverride =
        overrideStats === undefined ? undefined : toValue(overrideStats);
      if (statsOverride !== undefined) {
        return statsOverride;
      }

      if (
        shouldLoadCommentStats.value &&
        commentStatsQuery.data.value !== undefined
      ) {
        return pickCommentStatsForActionBar(commentStatsQuery.data.value);
      }

      const analysisCheckpoint = selectedAnalysisCheckpoint.value;
      if (analysisCheckpoint !== undefined) {
        return pickActionBarStats(analysisCheckpoint);
      }
      const rankingCheckpoint = selectedRankingCheckpoint.value;
      if (rankingCheckpoint !== undefined) {
        return {
          opinionCount: rankingCheckpoint.itemCount,
          participantCount: rankingCheckpoint.participantCount,
          voteCount: rankingCheckpoint.voteCount,
          totalParticipantCount: rankingCheckpoint.totalParticipantCount,
          totalVoteCount: rankingCheckpoint.totalVoteCount,
        };
      }

      const conversation = toValue(conversationData);
      if (conversation === undefined) {
        return undefined;
      }

      return pickActionBarStats(conversation.metadata);
    }
  );

  const isLoadingCheckpointStats = computed(
    () =>
      (shouldLoadPolisCheckpointStats.value &&
        selectedAnalysisCheckpoint.value === undefined &&
        (analysisCheckpointsQuery.isPending.value ||
          analysisCheckpointsQuery.isRefetching.value)) ||
      (shouldLoadRankingCheckpointStats.value &&
        selectedRankingCheckpoint.value === undefined)
  );
  const isLoadingCommentStats = computed(
    () =>
      shouldLoadCommentStats.value &&
      commentStatsQuery.data.value === undefined &&
      (commentStatsQuery.isPending.value ||
        commentStatsQuery.isRefetching.value)
  );

  return {
    actionBarStats,
    isLoadingCheckpointStats,
    isLoadingCommentStats,
    refetchCommentStats: () => commentStatsQuery.refetch(),
  };
}

function pickActionBarStats(
  stats: ConversationActionBarStats
): ConversationActionBarStats {
  return {
    opinionCount: stats.opinionCount,
    participantCount: stats.participantCount,
    voteCount: stats.voteCount,
    totalParticipantCount: stats.totalParticipantCount,
    totalVoteCount: stats.totalVoteCount,
  };
}
