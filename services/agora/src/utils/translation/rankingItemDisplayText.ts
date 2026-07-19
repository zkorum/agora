import type { RankingItemDisplayedContent } from "src/shared/types/zod";

import type { RankingItemContentTranslationPreview } from "./useContentTranslationPreview";

export interface RankingItemDisplayedText {
  title: string;
  body: string | null;
}

export function getRankingItemDisplayText({
  displayContent,
}: {
  displayContent: RankingItemDisplayedContent;
}): RankingItemDisplayedText {
  if (displayContent.status !== "available") {
    return { title: "", body: null };
  }

  return {
    title: displayContent.content.title,
    body: displayContent.content.bodyHtml ?? null,
  };
}

export function resolveRankingItemDisplayText({
  displayContent,
  translationPreview,
}: {
  displayContent: RankingItemDisplayedContent | undefined;
  translationPreview: RankingItemContentTranslationPreview | undefined;
}): RankingItemDisplayedText {
  if (translationPreview?.mode === "translated") {
    return {
      title: translationPreview.translatedContent?.title ?? "",
      body: translationPreview.translatedContent?.bodyHtml ?? null,
    };
  }
  if (translationPreview !== undefined) {
    if (
      translationPreview.originalContent === undefined &&
      displayContent?.status === "available" &&
      displayContent.mode === "original"
    ) {
      return getRankingItemDisplayText({ displayContent });
    }
    return {
      title: translationPreview.originalContent?.title ?? "",
      body: translationPreview.originalContent?.bodyHtml ?? null,
    };
  }
  if (displayContent === undefined) {
    return { title: "", body: null };
  }
  return getRankingItemDisplayText({ displayContent });
}
