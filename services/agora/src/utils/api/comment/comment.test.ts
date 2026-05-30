import type {
  ConversationAnalysisContent,
  ConversationAnalysisMetadata,
} from "src/shared/types/dto";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { buildAnalysisData } from "./analysisData";

function createMetadata(
  overrides: Partial<ConversationAnalysisMetadata> = {}
): ConversationAnalysisMetadata {
  return {
    conversationViewSnapshotId: 12,
    analysisSnapshotId: 34,
    conversationViewSnapshot: {
      conversationViewSnapshotId: 12,
      analysisSnapshotId: 34,
      opinionCount: 5,
      voteCount: 42,
      participantCount: 7,
      totalOpinionCount: 6,
      totalVoteCount: 45,
      totalParticipantCount: 8,
      moderatedOpinionCount: 1,
      hiddenOpinionCount: 0,
      isClosed: false,
    },
    descriptionReadiness: null,
    analysisViewState: {
      requestedView: "auto",
      canonicalView: "auto",
      resolvedGroupCount: null,
      resolvedCandidateId: null,
      resolvedBy: "no_analysis",
      variantsEnabled: true,
      options: [],
    },
    displayableGroupCounts: [],
    ...overrides,
  };
}

function createCluster({
  key,
  numUsers,
}: {
  key: PolisKey;
  numUsers: number;
}): NonNullable<PolisClusters[PolisKey]> {
  return {
    key,
    numUsers,
    isUserInCluster: false,
    representative: [],
  };
}

describe("buildAnalysisData", () => {
  it("preserves snapshot metadata when content is unavailable", () => {
    const data = buildAnalysisData({ metadata: createMetadata() });

    expect(data.conversationViewSnapshotId).toBe(12);
    expect(data.analysisSnapshotId).toBe(34);
    expect(data.contentStatus).toBe("not_applicable");
    expect(data.consensusAgree).toEqual([]);
    expect(data.polisClusters).toEqual({});
  });

  it("marks recoverable missing content as unavailable", () => {
    const data = buildAnalysisData({ metadata: createMetadata(), content: null });

    expect(data.contentStatus).toBe("not_available");
    expect(data.descriptionReadiness).toBeNull();
    expect(data.consensusAgree).toEqual([]);
    expect(data.polisClusters).toEqual({});
  });

  it("hides two-group singleton content", () => {
    const content: ConversationAnalysisContent = {
      conversationViewSnapshotId: 12,
      analysisSnapshotId: 34,
      candidateId: 56,
      descriptionReadiness: {
        requestedLocale: "en",
        english: { expected: true, status: "ready" },
        requested: { expected: false, status: "ready" },
        state: "ready",
        shouldRetry: false,
      },
      consensusAgree: [],
      consensusDisagree: [],
      controversial: [],
      clusters: {
        "0": createCluster({ key: "0", numUsers: 12 }),
        "1": createCluster({ key: "1", numUsers: 1 }),
      },
    };

    const data = buildAnalysisData({ metadata: createMetadata(), content });

    expect(data.contentStatus).toBe("available");
    expect(data.polisClusters).toEqual({});
  });
});
