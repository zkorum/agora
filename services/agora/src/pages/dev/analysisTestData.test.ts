import { describe, expect, it } from "vitest";

import { buildMockSurveyResults } from "./analysisTestData";

describe("buildMockSurveyResults", () => {
  it("scales visible survey counts with the response multiplier", () => {
    const rows = buildMockSurveyResults({
      clusterCount: 1,
      aiLabelMode: "long",
      surveyViewerAccess: "owner",
      surveyScenario: "visible",
      responseScaleMultiplier: 600,
    }).fullRows;

    expect(rows).toBeDefined();
    expect(
      rows?.find(
        (row) =>
          row.scope === "overall" &&
          row.questionId === "survey-q-1" &&
          row.option === "Neighborhood assemblies",
      )?.count,
    ).toBe(4800);
    expect(
      rows?.find(
        (row) =>
          row.scope === "overall" &&
          row.questionId === "survey-q-1" &&
          row.option === "Online platform",
      )?.count,
    ).toBe(3000);
  });

  it("keeps suppressed survey counts intentionally low", () => {
    const rows = buildMockSurveyResults({
      clusterCount: 1,
      aiLabelMode: "long",
      surveyViewerAccess: "owner",
      surveyScenario: "suppressed",
      responseScaleMultiplier: 600,
    }).fullRows;

    expect(rows).toBeDefined();
    expect(
      rows?.find(
        (row) =>
          row.scope === "overall" &&
          row.questionId === "survey-q-1" &&
          row.option === "Neighborhood assemblies",
      )?.count,
    ).toBe(4);
    expect(
      rows?.find(
        (row) =>
          row.scope === "overall" &&
          row.questionId === "survey-q-1" &&
          row.option === "Online platform",
      )?.count,
    ).toBe(1);
  });

  it("mixes scaled visible counts and fixed suppressed counts", () => {
    const rows = buildMockSurveyResults({
      clusterCount: 2,
      aiLabelMode: "long",
      surveyViewerAccess: "owner",
      surveyScenario: "mixed",
      responseScaleMultiplier: 600,
    }).fullRows;

    expect(rows).toBeDefined();
    expect(
      rows?.find(
        (row) =>
          row.scope === "cluster" &&
          row.clusterId === "0" &&
          row.questionId === "survey-q-1" &&
          row.option === "Neighborhood assemblies",
      )?.count,
    ).toBe(4800);
    expect(
      rows?.find(
        (row) =>
          row.scope === "cluster" &&
          row.clusterId === "1" &&
          row.questionId === "survey-q-1" &&
          row.option === "Neighborhood assemblies",
      )?.count,
    ).toBe(4);
  });
});
