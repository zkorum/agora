import type { AnalysisCheckpoint } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { parseCheckpointQuery } from "src/utils/analysis/analysisRoute";
import { useAnalysisCheckpointsQuery } from "src/utils/api/comment/useCommentQueries";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import type { LocationQuery } from "vue-router";

export type ConversationActionBarStats = Pick<
  ExtendedConversation["metadata"],
  | "opinionCount"
  | "participantCount"
  | "voteCount"
  | "totalParticipantCount"
  | "totalVoteCount"
>;

interface UseConversationActionBarStatsParams {
  conversationData: MaybeRefOrGetter<ExtendedConversation | undefined>;
  currentTab: MaybeRefOrGetter<"comment" | "analysis">;
  routeQuery: MaybeRefOrGetter<LocationQuery>;
  overrideStats?: MaybeRefOrGetter<ConversationActionBarStats | undefined>;
}

export function useConversationActionBarStats({
  conversationData,
  currentTab,
  routeQuery,
  overrideStats,
}: UseConversationActionBarStatsParams) {
  const checkpointViewSnapshotId = computed(() =>
    parseCheckpointQuery({ query: toValue(routeQuery) })
  );
  const conversationSlugId = computed(
    () => toValue(conversationData)?.metadata.conversationSlugId ?? ""
  );
  const shouldLoadCheckpointStats = computed(
    () =>
      toValue(currentTab) === "analysis" &&
      checkpointViewSnapshotId.value !== undefined &&
      conversationSlugId.value !== ""
  );

  const analysisCheckpointsQuery = useAnalysisCheckpointsQuery({
    conversationSlugId,
    enabled: shouldLoadCheckpointStats,
  });

  const selectedCheckpoint = computed<AnalysisCheckpoint | undefined>(() => {
    if (!shouldLoadCheckpointStats.value) {
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

  const actionBarStats = computed<ConversationActionBarStats | undefined>(() => {
    const statsOverride =
      overrideStats === undefined ? undefined : toValue(overrideStats);
    if (statsOverride !== undefined) {
      return statsOverride;
    }

    const checkpoint = selectedCheckpoint.value;
    if (checkpoint !== undefined) {
      return pickActionBarStats(checkpoint);
    }

    const conversation = toValue(conversationData);
    if (conversation === undefined) {
      return undefined;
    }

    return pickActionBarStats(conversation.metadata);
  });

  const isLoadingCheckpointStats = computed(
    () =>
      shouldLoadCheckpointStats.value &&
      selectedCheckpoint.value === undefined &&
      (analysisCheckpointsQuery.isPending.value ||
        analysisCheckpointsQuery.isRefetching.value)
  );

  return {
    actionBarStats,
    isLoadingCheckpointStats,
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
