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
    descriptionReadiness: null,
    contentStatus: "available",
    ...overrides,
  };
}

describe("analysis freshness", () => {
  it("extracts only pending expected description locales", () => {
    expect(
      getPendingDescriptionLocales({
        requestedLocale: "fr",
        english: { expected: true, status: "ready" },
        requested: { expected: true, status: "pending" },
        state: "requested_pending",
        shouldRetry: true,
      })
    ).toEqual(["fr"]);
  });

  it("treats fallback descriptions as displayable but not fresh", () => {
    expect(
      getPendingDescriptionLocales({
        requestedLocale: "fr",
        english: { expected: true, status: "ready" },
        requested: { expected: true, status: "fallback" },
        state: "fallback",
        shouldRetry: true,
      })
    ).toEqual(["fr"]);
  });

  it("treats snapshot and locale freshness independently", () => {
    const data = analysis({
      conversationViewSnapshotId: 12,
      descriptionReadiness: {
        requestedLocale: "fr",
        english: { expected: true, status: "ready" },
        requested: { expected: true, status: "pending" },
        state: "requested_pending",
        shouldRetry: true,
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
      previousAnalysis: analysis({
        descriptionReadiness: {
          requestedLocale: "fr",
          english: { expected: true, status: "pending" },
          requested: { expected: true, status: "pending" },
          state: "english_pending",
          shouldRetry: true,
        },
      }),
      expectedSnapshotId: 15,
      expectedDescriptionLocales: ["fr"],
      enablePrimaryFallback: true,
    });

    expect(request).toEqual({
      enablePrimaryFallback: true,
      minimumConversationViewSnapshotId: 15,
      expectedDescriptionLocales: ["fr", "en"],
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

  it("retries only when readiness explicitly says to retry", () => {
    expect(
      shouldRetryDescriptionReadiness(
        analysis({
          descriptionReadiness: {
            requestedLocale: "fr",
            english: { expected: true, status: "ready" },
            requested: { expected: true, status: "pending" },
            state: "requested_pending",
            shouldRetry: true,
          },
        })
      )
    ).toBe(true);
    expect(shouldRetryDescriptionReadiness(analysis())).toBe(false);
  });
});
