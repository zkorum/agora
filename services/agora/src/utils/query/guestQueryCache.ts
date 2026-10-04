import type { QueryClient, QueryKey } from "@tanstack/vue-query";

import { viewerQueryScopeSchema } from "./viewerScope";

// These existing query families include the viewer ID directly in their key.
const viewerIdIndexes: Readonly<Record<string, number | undefined>> = {
  comments: 3,
  userVotes: 2,
  nextUnansweredOpinion: 3,
};

function getGuestQueryKey({
  queryKey,
  userId,
}: {
  queryKey: QueryKey;
  userId: string;
}): QueryKey | undefined {
  const scope = viewerQueryScopeSchema.safeParse(queryKey.at(-1));
  if (scope.success && scope.data.userId === undefined) {
    return [...queryKey.slice(0, -1), { kind: "viewer", userId }];
  }
  const family = queryKey[0];
  const viewerIndex =
    typeof family === "string" ? viewerIdIndexes[family] : undefined;
  if (viewerIndex === undefined || queryKey[viewerIndex] !== undefined) {
    return undefined;
  }
  return queryKey.map((part, index) => (index === viewerIndex ? userId : part));
}

export function seedNewGuestQueries({
  queryClient,
  userId,
}: {
  queryClient: QueryClient;
  userId: string;
}): void {
  // A newly created guest has no prior account state. Seed before changing auth
  // so mounted observers retain their data and any optimistic first vote.
  for (const query of queryClient.getQueryCache().getAll()) {
    if (query.state.data === undefined) continue;
    const queryKey = getGuestQueryKey({ queryKey: query.queryKey, userId });
    if (queryKey === undefined) continue;
    if (queryClient.getQueryData(queryKey) === undefined) {
      queryClient.setQueryData(queryKey, query.state.data, {
        updatedAt: query.state.dataUpdatedAt,
      });
    }
    // Votes belong to the new guest now, not to a future anonymous session.
    if (query.queryKey[0] === "userVotes") {
      queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
    }
  }
}
