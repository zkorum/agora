import type { RankingItemDisplayedContent } from "src/shared/types/zod";

export interface ComparisonItemListDisplayState {
  itemSlugId: string;
  sourceVersion: string;
  title: string;
  body: string | null;
  displayContent: RankingItemDisplayedContent | undefined;
}
