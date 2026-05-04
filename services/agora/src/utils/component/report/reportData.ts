import type { AnalysisOpinionItem } from "src/shared/types/zod";

export const REPORT_MAX_ITEMS = 10;
export const SUMMARY_MAX_ITEMS = 3;
export const REPORT_MAX_REPRESENTATIVE_ITEMS = 5;
export const REPORT_ITEMS_PER_CAPTURE_PAGE = 5;
export const REPORT_ITEMS_PER_PDF_PAGE = 8;
export type ReportAllStatementsOrder =
  | "newest"
  | "agreement"
  | "disagreement"
  | "divisive";
const MIN_SCORE = 0.6;

export function getReportOpinions({
  items,
  getScore,
  maxItems = REPORT_MAX_ITEMS,
}: {
  items: AnalysisOpinionItem[];
  getScore: (item: AnalysisOpinionItem) => number;
  maxItems?: number;
}): AnalysisOpinionItem[] {
  return items
    .filter((item) => getScore(item) >= MIN_SCORE)
    .slice(0, maxItems);
}

export function getReportAllOpinions({
  items,
  order,
}: {
  items: AnalysisOpinionItem[];
  order: ReportAllStatementsOrder;
}): AnalysisOpinionItem[] {
  const itemsBySlugId = new Map<string, AnalysisOpinionItem>();
  for (const item of items) {
    itemsBySlugId.set(item.opinionSlugId, item);
  }

  switch (order) {
    case "newest":
      return Array.from(itemsBySlugId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "agreement":
      return Array.from(itemsBySlugId.values()).sort(
        (a, b) => b.groupAwareConsensusAgree - a.groupAwareConsensusAgree
      );
    case "disagreement":
      return Array.from(itemsBySlugId.values()).sort(
        (a, b) => b.groupAwareConsensusDisagree - a.groupAwareConsensusDisagree
      );
    case "divisive":
      return Array.from(itemsBySlugId.values()).sort(
        (a, b) => b.divisiveScore - a.divisiveScore
      );
  }
}
