import { useQuery } from "@tanstack/vue-query";
import type { FetchCommentStatsResponse } from "src/shared/types/dto";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { useBackendCommentApi } from "./comment";

export function useCommentStatsQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchCommentStatsForPost } = useBackendCommentApi();
  const viewerScope = useViewerQueryScope();

  return useQuery({
    // Auth cleanup clears active caches; reconnect this observer on viewer changes.
    queryKey: [
      "commentStats",
      computed(() => toValue(conversationSlugId)),
      viewerScope,
    ],
    queryFn: () => fetchCommentStatsForPost(toValue(conversationSlugId)),
    enabled: computed(
      () => toValue(enabled) && toValue(conversationSlugId) !== ""
    ),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    retry: false,
  });
}

export function pickCommentStatsForActionBar(
  stats: FetchCommentStatsResponse
): Pick<
  FetchCommentStatsResponse,
  | "opinionCount"
  | "participantCount"
  | "voteCount"
  | "totalParticipantCount"
  | "totalVoteCount"
> {
  return {
    opinionCount: stats.opinionCount,
    participantCount: stats.participantCount,
    voteCount: stats.voteCount,
    totalParticipantCount: stats.totalParticipantCount,
    totalVoteCount: stats.totalVoteCount,
  };
}
