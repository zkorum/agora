import { describe, expect, it } from "vitest";

import { isLiveSurveyResultsQueryKey } from "./surveyQueryKeys";

describe("isLiveSurveyResultsQueryKey", () => {
  it("matches every live analysis view for the conversation", () => {
    expect(
      isLiveSurveyResultsQueryKey({
        queryKey: ["survey-results-aggregated", "conv1234", "auto", undefined],
        conversationSlugId: "conv1234",
      })
    ).toBe(true);
  });

  it("does not match immutable checkpoints or other conversations", () => {
    expect(
      isLiveSurveyResultsQueryKey({
        queryKey: ["survey-results-aggregated", "conv1234", "auto", 42],
        conversationSlugId: "conv1234",
      })
    ).toBe(false);
    expect(
      isLiveSurveyResultsQueryKey({
        queryKey: ["survey-results-aggregated", "different", "auto", undefined],
        conversationSlugId: "conv1234",
      })
    ).toBe(false);
  });
});
