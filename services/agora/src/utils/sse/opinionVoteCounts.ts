import type { SSEEventDataByType } from "src/shared/types/sse";
import { parseRealtimeCursor } from "src/shared/utils/realtimeCursor";

type OpinionVoteCountsUpdate = Pick<
  SSEEventDataByType["opinion_vote_counts_updated"],
  "conversationSlugId" | "opinionVoteCounts"
>;

export function createOpinionVoteCountsTracker() {
  const latestDeliveryByOpinion = new Map<string, number>();
  let trackedConversation: string | undefined;

  return {
    clear(): void {
      latestDeliveryByOpinion.clear();
      trackedConversation = undefined;
    },
    retain({
      data,
      eventId,
    }: {
      data: OpinionVoteCountsUpdate;
      eventId: string | null;
    }): OpinionVoteCountsUpdate {
      if (trackedConversation !== data.conversationSlugId) {
        latestDeliveryByOpinion.clear();
        trackedConversation = data.conversationSlugId;
      }
      const deliveryId = parseRealtimeCursor(eventId);
      if (deliveryId === undefined) return data;
      return {
        ...data,
        // Partial updates must be ordered per statement, not per conversation.
        opinionVoteCounts: data.opinionVoteCounts.filter((counts) => {
          const previous = latestDeliveryByOpinion.get(counts.opinionSlugId);
          if (previous !== undefined && previous >= deliveryId) return false;
          latestDeliveryByOpinion.set(counts.opinionSlugId, deliveryId);
          return true;
        }),
      };
    },
  };
}
