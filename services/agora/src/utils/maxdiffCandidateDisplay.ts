import type { RankingItemDisplayedContent } from "src/shared/types/zod";

export interface MaxDiffCandidateDisplayItem {
  slugId: string;
  title: string;
  body: string | null;
  displayContent: RankingItemDisplayedContent;
  externalUrl: string | null;
}

export type MaxDiffCandidateRetryResult =
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

export function createMaxDiffCandidateDisplaySnapshot({
  candidateSlugIds,
  itemBySlugId,
}: {
  candidateSlugIds: readonly string[];
  itemBySlugId: ReadonlyMap<string, MaxDiffCandidateDisplayItem>;
}): MaxDiffCandidateDisplayItem[] {
  const snapshot: MaxDiffCandidateDisplayItem[] = [];
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

export async function retryMaxDiffCandidateResolution({
  refetchItems,
  refetchLoad,
  resolve,
}: {
  refetchItems: () => Promise<{ isError: boolean }>;
  refetchLoad: () => Promise<{ isError: boolean }>;
  resolve: () => boolean;
}): Promise<MaxDiffCandidateRetryResult> {
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
