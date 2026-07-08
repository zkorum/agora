import type { RankingItemDisplayedContent } from "src/shared/types/zod";

export interface MaxDiffCandidateDisplayItem {
  slugId: string;
  title: string;
  body: string | null;
  displayContent: RankingItemDisplayedContent;
  externalUrl: string | null;
}

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
