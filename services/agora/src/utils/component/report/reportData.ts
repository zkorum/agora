import type { AnalysisOpinionItem } from "src/shared/types/zod";

export const REPORT_MAX_ITEMS = 10;
export const SUMMARY_MAX_ITEMS = 3;
export const REPORT_MAX_REPRESENTATIVE_ITEMS = 5;
export const REPORT_ITEMS_PER_CAPTURE_PAGE = 5;
export const REPORT_ITEMS_PER_PDF_PAGE = 8;
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
