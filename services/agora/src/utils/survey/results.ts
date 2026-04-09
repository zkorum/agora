import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type {
  SurveyAggregateRow,
  SurveyAggregateSuppressionReason,
} from "src/shared/types/zod";

export type SurveyResultsDisplayMode = "suppressed" | "full";

export interface SurveyQuestionOptionGroup {
  id: string;
  label: string;
  count?: number;
  percentage?: number;
  isSuppressed: boolean;
}

export interface SurveyQuestionGroup {
  id: string;
  question: string;
  options: SurveyQuestionOptionGroup[];
  isSuppressed: boolean;
  suppressionReason: SurveyAggregateSuppressionReason | undefined;
}

export function canViewFullSurveyResults({
  surveyResults,
}: {
  surveyResults: SurveyResultsAggregatedResponse | undefined;
}): boolean {
  return (
    surveyResults?.accessLevel === "owner" &&
    surveyResults.fullRows !== undefined
  );
}

export function getDisplayedSurveyRows({
  surveyResults,
  displayMode,
}: {
  surveyResults: SurveyResultsAggregatedResponse | undefined;
  displayMode: SurveyResultsDisplayMode;
}): SurveyAggregateRow[] {
  if (displayMode === "full" && canViewFullSurveyResults({ surveyResults })) {
    return surveyResults?.fullRows ?? [];
  }

  return surveyResults?.suppressedRows ?? [];
}

export function groupSurveyRowsByQuestion({
  rows,
}: {
  rows: SurveyAggregateRow[];
}): SurveyQuestionGroup[] {
  const groups = new Map<string, SurveyQuestionGroup>();

  for (const row of rows) {
    const existingGroup = groups.get(row.questionId);
    const nextOption: SurveyQuestionOptionGroup = {
      id: row.optionId,
      label: row.option,
      count: row.count,
      percentage: row.percentage,
      isSuppressed: row.isSuppressed,
    };

    if (existingGroup === undefined) {
      groups.set(row.questionId, {
        id: row.questionId,
        question: row.question,
        options: [nextOption],
        isSuppressed: row.isSuppressed,
        suppressionReason: row.suppressionReason,
      });
      continue;
    }

    existingGroup.options.push(nextOption);
    existingGroup.isSuppressed = existingGroup.isSuppressed && row.isSuppressed;
    existingGroup.suppressionReason ??= row.suppressionReason;
  }

  return Array.from(groups.values());
}
