import type { AnalysisData } from "src/utils/api/comment/comment";
import { describe, expect, it } from "vitest";

import {
  buildAnalysisFreshnessRequest,
  getExpectedDescriptionLocalesFromEvent,
  getPendingDescriptionLocales,
  isAnalysisFreshEnough,
  shouldRetryDescriptionReadiness,
} from "./analysisFreshness";

function analysis(overrides: Partial<AnalysisData> = {}): AnalysisData {
  return {
    consensusAgree: [],
    consensusDisagree: [],
    controversial: [],
    polisClusters: {},
    conversationViewSnapshotId: 10,
    ...overrides,
  };
}

const analysisViewState: NonNullable<AnalysisData["analysisViewState"]> = {
  requestedView: "auto",
  canonicalView: "auto",
  resolvedGroupCount: 2,
  resolvedCandidateId: 1,
  resolvedBy: "auto",
  variantsEnabled: false,
  options: [],
};

function analysisWithLabels(overrides: Partial<AnalysisData> = {}): AnalysisData {
  return analysis({
    manifest: {
      analysisViewResolution: analysisViewState,
      aiLabelsExpected: true,
    },
    groupDescriptionDisplay: {
      displayedLocale: "en",
    },
    ...overrides,
  });
}

describe("analysis freshness", () => {
  it("extracts only pending expected description locales", () => {
    expect(
      getPendingDescriptionLocales({
        analysis: analysisWithLabels(),
        expectedDescriptionLocales: ["en", "fr"],
      })
    ).toEqual(["fr"]);
  });

  it("treats displayed requested-locale labels as settled", () => {
    expect(
      getPendingDescriptionLocales({
        analysis: analysisWithLabels({
          groupDescriptionDisplay: {
            displayedLocale: "fr",
          },
        }),
        expectedDescriptionLocales: ["fr"],
      })
    ).toEqual([]);
  });

  it("treats snapshot and locale freshness independently", () => {
    const data = analysis({
      conversationViewSnapshotId: 12,
      manifest: {
        analysisViewResolution: analysisViewState,
        aiLabelsExpected: true,
      },
      groupDescriptionDisplay: {
        displayedLocale: "en",
      },
    });

    expect(
      isAnalysisFreshEnough({
        analysis: data,
        expectedSnapshotId: 11,
        expectedDescriptionLocales: ["en"],
      })
    ).toBe(true);
    expect(
      isAnalysisFreshEnough({
        analysis: data,
        expectedSnapshotId: 11,
        expectedDescriptionLocales: ["fr"],
      })
    ).toBe(false);
  });

  it("builds explicit freshness requests from event and pending state", () => {
    const request = buildAnalysisFreshnessRequest({
      previousAnalysis: analysisWithLabels(),
      expectedSnapshotId: 15,
      expectedDescriptionLocales: ["fr"],
      enablePrimaryFallback: true,
    });

    expect(request).toEqual({
      enablePrimaryFallback: true,
      minimumConversationViewSnapshotId: 15,
      expectedDescriptionLocales: ["fr"],
    });
  });

  it("does not build a freshness request without expectations", () => {
    expect(
      buildAnalysisFreshnessRequest({
        previousAnalysis: analysis(),
        expectedSnapshotId: null,
        expectedDescriptionLocales: [],
        enablePrimaryFallback: true,
      })
    ).toBeNull();
  });

  it("derives expected locales only for description events", () => {
    expect(
      getExpectedDescriptionLocalesFromEvent({
        displayLanguage: "fr",
        event: {
          conversationSlugId: "abc",
          conversationViewSnapshotId: 1,
          analysisSnapshotId: 2,
          changeKind: "descriptions",
          checkpointChanged: false,
          displayableGroupCounts: [2],
          locales: ["en", "fr", "es"],
          timestamp: 1,
        },
      })
    ).toEqual(["en", "fr"]);
  });

  it("does not retry from readiness state", () => {
    expect(shouldRetryDescriptionReadiness(analysisWithLabels())).toBe(false);
    expect(shouldRetryDescriptionReadiness(analysis())).toBe(false);
  });
});
