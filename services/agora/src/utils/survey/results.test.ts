import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import { canViewFullSurveyResults, getDisplayedSurveyRows } from "./results";

const baseSurveyResults: SurveyResultsAggregatedResponse = {
  hasSurvey: true,
  accessLevel: "owner",
  suppressionThreshold: 5,
  suppressedRows: [
    {
      scope: "overall",
      clusterId: "",
      clusterLabel: "",
      questionId: "qEnabled",
      questionType: "choice",
      question: "Enabled?",
      optionId: "yes",
      option: "Yes",
      isSuppressed: true,
      isPublicAggregateSuppressionEnabled: true,
      suppressionReason: "count_below_threshold",
    },
    {
      scope: "overall",
      clusterId: "",
      clusterLabel: "",
      questionId: "qDisabled",
      questionType: "choice",
      question: "Disabled?",
      optionId: "no",
      option: "No",
      count: 2,
      percentage: 100,
      isSuppressed: false,
      isPublicAggregateSuppressionEnabled: false,
    },
  ],
  fullRows: [
    {
      scope: "overall",
      clusterId: "",
      clusterLabel: "",
      questionId: "qEnabled",
      questionType: "choice",
      question: "Enabled?",
      optionId: "yes",
      option: "Yes",
      count: 3,
      percentage: 100,
      isSuppressed: false,
      isPublicAggregateSuppressionEnabled: true,
    },
    {
      scope: "overall",
      clusterId: "",
      clusterLabel: "",
      questionId: "qDisabled",
      questionType: "choice",
      question: "Disabled?",
      optionId: "no",
      option: "No",
      count: 99,
      percentage: 100,
      isSuppressed: false,
      isPublicAggregateSuppressionEnabled: false,
    },
  ],
};

describe("survey result display helpers", () => {
  it("uses full rows only for public-suppression-enabled questions", () => {
    const rows = getDisplayedSurveyRows({
      surveyResults: baseSurveyResults,
      displayMode: "full",
    });

    expect(rows.map((row) => row.count)).toEqual([3, 2]);
  });

  it("hides full mode when no question has public aggregate suppression enabled", () => {
    const surveyResults: SurveyResultsAggregatedResponse = {
      ...baseSurveyResults,
      suppressedRows: baseSurveyResults.suppressedRows.map((row) => ({
        ...row,
        isSuppressed: false,
        isPublicAggregateSuppressionEnabled: false,
      })),
    };

    expect(canViewFullSurveyResults({ surveyResults })).toBe(false);
  });
});
