import { type QueryClient, useQuery } from "@tanstack/vue-query";

function comparisonCloseRefreshKey(conversationSlugId: string) {
  return ["comparison-close-refresh", conversationSlugId] as const;
}

export function signalComparisonCloseRefresh({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): void {
  queryClient.setQueryData<number>(
    comparisonCloseRefreshKey(conversationSlugId),
    (previous) => (previous ?? 0) + 1
  );
}

export function useComparisonCloseRefresh(conversationSlugId: string) {
  return useQuery<number>({
    queryKey: comparisonCloseRefreshKey(conversationSlugId),
    enabled: false,
  }).data;
}
