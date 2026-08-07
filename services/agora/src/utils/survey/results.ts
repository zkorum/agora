import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type {
  SurveyAggregateRow,
  SurveyAggregateSuppressionReason,
  SurveyQuestionContentVariant,
  SurveyQuestionDisplayedContent,
  SurveyQuestionResultDisplayContent,
  SurveyQuestionType,
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
  questionType: SurveyQuestionType;
  question: string;
  options: SurveyQuestionOptionGroup[];
  isSuppressed: boolean;
  suppressionReason: SurveyAggregateSuppressionReason | undefined;
}

export interface SurveyQuestionResultCard {
  question: SurveyQuestionGroup;
  displayContent: SurveyQuestionDisplayedContent | undefined;
}

export function doesSurveyQuestionSourceMatch({
  question,
  questionSlugId,
  sourceContent,
}: {
  question: SurveyQuestionGroup;
  questionSlugId: string;
  sourceContent: SurveyQuestionContentVariant;
}): boolean {
  if (
    questionSlugId !== question.id ||
    sourceContent.questionText !== question.question
  ) {
    return false;
  }
  if (question.questionType === "free_text") {
    return true;
  }

  const sourceOptionsById = new Map(
    sourceContent.options.map((option) => [
      option.optionSlugId,
      option.optionText,
    ])
  );
  return (
    sourceOptionsById.size === question.options.length &&
    question.options.every(
      (option) => sourceOptionsById.get(option.id) === option.label
    )
  );
}

export function getSurveyQuestionResultCards({
  questions,
  displayContents,
}: {
  questions: SurveyQuestionGroup[];
  displayContents: SurveyQuestionResultDisplayContent[];
}): SurveyQuestionResultCard[] {
  const displayContentsByQuestionSlugId = new Map(
    displayContents.map((content) => [content.questionSlugId, content])
  );
  return questions.map((question) => {
    const content = displayContentsByQuestionSlugId.get(question.id);
    return {
      question,
      displayContent:
        content !== undefined &&
        doesSurveyQuestionSourceMatch({
          question,
          questionSlugId: content.questionSlugId,
          sourceContent: content.sourceContent,
        })
          ? content.displayContent
          : undefined,
    };
  });
}

export function canViewFullSurveyResults({
  surveyResults,
}: {
  surveyResults: SurveyResultsAggregatedResponse | undefined;
}): boolean {
  return (
    surveyResults?.accessLevel === "owner" &&
    surveyResults.fullRows !== undefined &&
    surveyResults.suppressedRows.some(
      (row) => row.isPublicAggregateSuppressionEnabled
    )
  );
}

function getSurveyAggregateRowKey({ row }: { row: SurveyAggregateRow }): string {
  return [row.scope, row.clusterId, row.questionId, row.optionId].join("|");
}

export function getDisplayedSurveyRows({
  surveyResults,
  displayMode,
}: {
  surveyResults: SurveyResultsAggregatedResponse | undefined;
  displayMode: SurveyResultsDisplayMode;
}): SurveyAggregateRow[] {
  if (displayMode === "full" && canViewFullSurveyResults({ surveyResults })) {
    const fullRowsByKey = new Map(
      (surveyResults?.fullRows ?? []).map((row) => [
        getSurveyAggregateRowKey({ row }),
        row,
      ])
    );

    return (surveyResults?.suppressedRows ?? []).map((row) => {
      if (!row.isPublicAggregateSuppressionEnabled) {
        return row;
      }

      return fullRowsByKey.get(getSurveyAggregateRowKey({ row })) ?? row;
    });
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
        questionType: row.questionType,
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
