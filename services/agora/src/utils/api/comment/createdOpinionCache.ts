import type { QueryClient } from "@tanstack/vue-query";
import type { UserVote } from "src/composables/opinion/types";
import type { DisplayedOpinionItem } from "src/shared/types/zod";

import { type OpinionCache, prependCachedOpinion } from "./opinionCache";

export async function cacheCreatedOpinion({
  queryClient,
  conversationSlugId,
  displayedOpinionItem,
  viewerUserId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  displayedOpinionItem: DisplayedOpinionItem;
  viewerUserId: string | undefined;
}): Promise<void> {
  const userVotesKey = ["userVotes", conversationSlugId, viewerUserId];
  const commentsKey = ["comments", conversationSlugId];

  // In-flight reads may predate creation; don't let them replace the confirmed write.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: userVotesKey }),
    queryClient.cancelQueries({
      queryKey: commentsKey,
      predicate: ({ state }) => state.data !== undefined,
    }),
  ]);

  queryClient.setQueryData<UserVote[]>(userVotesKey, (oldData) => [
    ...(oldData?.filter(
      (vote) => vote.opinionSlugId !== displayedOpinionItem.opinionSlugId
    ) ?? []),
    {
      opinionSlugId: displayedOpinionItem.opinionSlugId,
      votingAction: "agree",
    },
  ]);

  queryClient.setQueriesData<OpinionCache>(
    {
      queryKey: commentsKey,
      predicate: ({ queryKey }) =>
        ["discover", "new", "my_votes"].includes(String(queryKey[2])) &&
        queryKey[3] === viewerUserId,
    },
    (oldData) => {
      // An unfetched lazy list must stay unfetched, rather than look complete.
      if (oldData === undefined) {
        return oldData;
      }
      return prependCachedOpinion({
        cache: oldData,
        opinion: displayedOpinionItem,
      });
    }
  );
}
