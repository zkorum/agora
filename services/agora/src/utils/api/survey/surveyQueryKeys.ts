export function isLiveSurveyResultsQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    queryKey[0] === "survey-results-aggregated" &&
    queryKey[1] === conversationSlugId &&
    queryKey[3] === undefined
  );
}
