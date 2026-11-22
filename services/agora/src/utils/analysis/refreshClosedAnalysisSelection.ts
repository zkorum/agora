import type { QueryClient } from "@tanstack/vue-query";
export async function refreshClosedAnalysisSelection({
  queryClient,
  conversationSlugId,
  includeLatest = true,
  closingCheckpointIds = [],
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  includeLatest?: boolean;
  closingCheckpointIds?: readonly number[];
}): Promise<void> {
  const matchesScope = (queryKey: readonly unknown[]) =>
    queryKey[1] === conversationSlugId &&
    (queryKey[3] === undefined
      ? includeLatest
      : typeof queryKey[3] === "number" &&
        closingCheckpointIds.includes(queryKey[3]));
  const manifests = {
    predicate: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      queryKey[0] === "analysisFrameManifest" && matchesScope(queryKey),
  };
  const sections = {
    predicate: ({ queryKey }) =>
      (queryKey[0] === "analysis" ||
        queryKey[0] === "survey-results-aggregated") &&
      matchesScope(queryKey),
  } satisfies Parameters<QueryClient["invalidateQueries"]>[0];
  await Promise.all([
    queryClient.cancelQueries(manifests),
    queryClient.cancelQueries(sections),
  ]);
  await queryClient.invalidateQueries({
    ...manifests,
    refetchType: "none",
  });
  await queryClient.invalidateQueries(sections);
}
