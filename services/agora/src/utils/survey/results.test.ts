import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type { SurveyQuestionDisplayedContent } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  canViewFullSurveyResults,
  doesSurveyQuestionSourceMatch,
  getDisplayedSurveyRows,
  getSurveyQuestionResultCards,
  groupSurveyRowsByQuestion,
} from "./results";

const baseSurveyResults: SurveyResultsAggregatedResponse = {
  hasSurvey: true,
  accessLevel: "owner",
  suppressionThreshold: 5,
  questionDisplayContents: [],
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

  it("matches current survey source text to aggregate results", () => {
    const question = groupSurveyRowsByQuestion({
      rows: baseSurveyResults.suppressedRows,
    })[0];

    expect(question).toBeDefined();
    if (question === undefined) {
      return;
    }

    expect(
      doesSurveyQuestionSourceMatch({
        question,
        questionSlugId: "qEnabled",
        sourceContent: {
          questionText: "Enabled?",
          options: [{ optionSlugId: "yes", optionText: "Yes" }],
        },
      })
    ).toBe(true);
  });

  it("rejects current translations for historical aggregate text", () => {
    const question = groupSurveyRowsByQuestion({
      rows: baseSurveyResults.suppressedRows,
    })[0];

    expect(question).toBeDefined();
    if (question === undefined) {
      return;
    }

    expect(
      doesSurveyQuestionSourceMatch({
        question,
        questionSlugId: "qEnabled",
        sourceContent: {
          questionText: "Is this enabled now?",
          options: [{ optionSlugId: "yes", optionText: "Yes" }],
        },
      })
    ).toBe(false);
    expect(
      doesSurveyQuestionSourceMatch({
        question,
        questionSlugId: "qEnabled",
        sourceContent: {
          questionText: "Enabled?",
          options: [{ optionSlugId: "yes", optionText: "Absolutely" }],
        },
      })
    ).toBe(false);
  });

  it("attaches display content only to matching aggregate source text", () => {
    const questions = groupSurveyRowsByQuestion({
      rows: baseSurveyResults.suppressedRows,
    });
    const matchingSource = {
      questionText: "Enabled?",
      options: [{ optionSlugId: "yes", optionText: "Yes" }],
    };
    const displayContent: SurveyQuestionDisplayedContent = {
      sourceVersion: "2d826a50-5f21-49e6-bf07-9ad86b17f9bb",
      status: "available",
      mode: "translated",
      content: {
        questionText: "Active ?",
        options: [{ optionSlugId: "yes", optionText: "Oui" }],
      },
      translationControl: null,
    };

    expect(
      getSurveyQuestionResultCards({
        questions,
        displayContents: [
          {
            questionSlugId: "qEnabled",
            sourceContent: matchingSource,
            displayContent,
          },
        ],
      })[0]?.displayContent
    ).toEqual(displayContent);
    expect(
      getSurveyQuestionResultCards({
        questions,
        displayContents: [
          {
            questionSlugId: "qEnabled",
            sourceContent: {
              ...matchingSource,
              questionText: "Previously enabled?",
            },
            displayContent,
          },
        ],
      })[0]?.displayContent
    ).toBeUndefined();
  });
});
