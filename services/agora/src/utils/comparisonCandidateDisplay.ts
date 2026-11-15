import type { RankingItemDisplayedContent } from "src/shared/types/zod";

export interface ComparisonCandidateDisplayItem {
  slugId: string;
  title: string;
  body: string | null;
  displayContent: RankingItemDisplayedContent;
  externalUrl: string | null;
}

export type ComparisonCandidateRetryResult =
  | "refetch_failed"
  | "resolution_failed"
  | "resolved";

function cloneRankingItemDisplayedContent(
  displayContent: RankingItemDisplayedContent
): RankingItemDisplayedContent {
  const translationControl =
    displayContent.translationControl === null
      ? null
      : { ...displayContent.translationControl };

  if (displayContent.status !== "available") {
    return {
      ...displayContent,
      translationControl,
    };
  }

  return {
    ...displayContent,
    content: { ...displayContent.content },
    translationControl,
  };
}

export function createComparisonCandidateDisplaySnapshot({
  candidateSlugIds,
  itemBySlugId,
}: {
  candidateSlugIds: readonly string[];
  itemBySlugId: ReadonlyMap<string, ComparisonCandidateDisplayItem>;
}): ComparisonCandidateDisplayItem[] {
  const snapshot: ComparisonCandidateDisplayItem[] = [];
  for (const slugId of candidateSlugIds) {
    const item = itemBySlugId.get(slugId);
    if (item === undefined) {
      continue;
    }

    snapshot.push({
      ...item,
      displayContent: cloneRankingItemDisplayedContent(item.displayContent),
    });
  }
  return snapshot;
}

export async function retryComparisonCandidateResolution({
  refetchItems,
  refetchLoad,
  resolve,
}: {
  refetchItems: () => Promise<{ isError: boolean }>;
  refetchLoad: () => Promise<{ isError: boolean }>;
  resolve: () => boolean;
}): Promise<ComparisonCandidateRetryResult> {
  let itemsResult: { isError: boolean };
  let loadResult: { isError: boolean };
  try {
    [itemsResult, loadResult] = await Promise.all([
      refetchItems(),
      refetchLoad(),
    ]);
  } catch {
    return "refetch_failed";
  }
  if (itemsResult.isError || loadResult.isError) {
    return "refetch_failed";
  }

  return resolve() ? "resolved" : "resolution_failed";
}
