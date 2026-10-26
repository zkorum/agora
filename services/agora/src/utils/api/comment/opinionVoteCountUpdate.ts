import type { SSEConversationCommentStatsUpdatedData } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";

export function applyOpinionVoteCountUpdate({
  opinion,
  counts,
}: {
  opinion: DisplayedOpinionItem;
  counts: SSEConversationCommentStatsUpdatedData["opinionVoteCounts"][number];
}): { opinion: DisplayedOpinionItem; needsPermissionRefresh: boolean } {
  return {
    opinion: {
      ...opinion,
      numParticipants: counts.numParticipants,
      numAgrees: counts.numAgrees,
      numDisagrees: counts.numDisagrees,
      numPasses: counts.numPasses,
    },
    // Counts do not identify voters or the author's automatic self-vote exception.
    // Let the server refresh managers' action availability.
    needsPermissionRefresh: opinion.management?.canDelete === true,
  };
}
