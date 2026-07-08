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
  return candidateSlugIds.map((slugId) => {
    const item = itemBySlugId.get(slugId);
    if (item !== undefined) {
      return {
        ...item,
        displayContent: cloneRankingItemDisplayedContent(item.displayContent),
      };
    }

    return {
      slugId,
      title: slugId,
      body: null,
      displayContent: {
        sourceVersion: "00000000-0000-4000-8000-000000000000",
        status: "available",
        mode: "original",
        content: { title: slugId },
        translationControl: null,
      },
      externalUrl: null,
    };
  });
}
