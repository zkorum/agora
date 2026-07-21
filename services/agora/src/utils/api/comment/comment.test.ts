import type {
  AnalysisFrameGroupLabels,
  AnalysisFrameGroups,
  AnalysisFrameKey,
  AnalysisFrameManifest,
  AnalysisFrameOpinionList,
} from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  ConversationMetadata,
} from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  buildAnalysisDataFromFrame,
  buildEmptyAnalysisDataFromManifest,
  mergeLiveAnalysisSnapshotMetadata,
} from "./analysisData";

const frameKey: AnalysisFrameKey = {
  conversationViewSnapshotId: 12,
  analysisSnapshotId: 34,
  candidateId: 56,
};

const analysisViewResolution: AnalysisFrameManifest["analysisViewResolution"] = {
  requestedView: "auto",
  canonicalView: "auto",
  resolvedGroupCount: 2,
  resolvedCandidateId: 56,
  resolvedBy: "auto",
  variantsEnabled: true,
  options: [],
};

type AnalysisFrameManifestWithFrame = AnalysisFrameManifest & {
  frameKey: AnalysisFrameKey;
  conversationViewSnapshot: NonNullable<AnalysisFrameManifest["conversationViewSnapshot"]>;
};

type ConversationViewSnapshot = NonNullable<
  AnalysisFrameManifest["conversationViewSnapshot"]
>;
type PolisConversationMetadata = Extract<
  ConversationMetadata,
  { conversationType: "polis" }
>;

const manifest: AnalysisFrameManifestWithFrame = {
  frameKey,
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
  counters: {
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
  analysisViewResolution,
  aiLabelsExpected: true,
};

function conversationMetadata(
  overrides: Partial<PolisConversationMetadata> = {}
): PolisConversationMetadata {
  const { contentLanguageMetadata, ...restOverrides } = overrides;
  return {
    conversationSlugId: "conversation-1",
    conversationViewSnapshotId: 12,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastReactedAt: new Date("2026-01-01T00:00:00.000Z"),
    opinionCount: 5,
    voteCount: 42,
    participantCount: 7,
    totalOpinionCount: 6,
    totalVoteCount: 45,
    totalParticipantCount: 8,
    moderatedOpinionCount: 1,
    hiddenOpinionCount: 0,
    authorUsername: "alice",
    participationMode: "guest",
    conversationType: "polis",
    isIndexed: true,
    aiLabelingEnabled: false,
    preferredOpinionGroupCount: null,
    isClosed: false,
    isEdited: false,
    moderation: { status: "unmoderated" },
    contentLanguageMetadata: contentLanguageMetadata ?? {
      detectedDisplayLanguageCode: null,
      detectedSourceLanguageCode: null,
      detectedRawLanguageCode: null,
      detectionConfidence: null,
      autoDetectionStatus: "not_attempted",
    },
    languageSetting: {
      mode: "auto",
      languageCode: null,
      detectedLanguageCode: null,
      detectedSourceLanguageCode: null,
      detectedRawLanguageCode: null,
      detectionConfidence: null,
      autoDetectionStatus: "not_attempted",
    },
    multilingualSetting: {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    externalSourceConfig: null,
    ...restOverrides,
  };
}

function conversationViewSnapshot(
  overrides: Partial<ConversationViewSnapshot> = {}
): ConversationViewSnapshot {
  return {
    conversationViewSnapshotId: 13,
    analysisSnapshotId: 35,
    opinionCount: 8,
    voteCount: 99,
    participantCount: 14,
    totalOpinionCount: 9,
    totalVoteCount: 101,
    totalParticipantCount: 15,
    moderatedOpinionCount: 2,
    hiddenOpinionCount: 1,
    isClosed: true,
    ...overrides,
  };
}

function opinion(overrides: Partial<AnalysisOpinionItem> = {}): AnalysisOpinionItem {
  return {
    opinionSlugId: "opinion-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    opinion: "Statement",
    sourceLanguageCode: null,
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { content: "Statement" },
      translationControl: null,
    },
    numParticipants: 7,
    numAgrees: 5,
    numDisagrees: 1,
    numPasses: 1,
    username: "alice",
    moderation: { status: "unmoderated" },
    isSeed: false,
    clustersStats: [],
    groupAwareConsensusAgree: 0.8,
    groupAwareConsensusDisagree: 0.1,
    divisiveScore: 0.2,
    ...overrides,
  };
}

function groups(numUsersByKey: { "0": number; "1": number }): AnalysisFrameGroups {
  return {
    frameKey,
    clusters: {
      "0": {
        key: "0",
        numUsers: numUsersByKey["0"],
        isUserInCluster: true,
        representative: [opinion()],
      },
      "1": {
        key: "1",
        numUsers: numUsersByKey["1"],
        isUserInCluster: false,
        representative: [],
      },
    },
  };
}

const groupLabels: AnalysisFrameGroupLabels = {
  frameKey,
  groupDescriptionDisplay: {
    displayedLocale: "en",
  },
  labels: {
    "0": { key: "0", aiLabel: "Builders", aiSummary: "Build things" },
    "1": { key: "1", aiLabel: "Critics", aiSummary: "Question things" },
  },
};

function opinionList(kind: AnalysisFrameOpinionList["kind"]): AnalysisFrameOpinionList {
  return {
    frameKey,
    kind,
    items: [opinion({ opinionSlugId: `${kind}-1` })],
  };
}

describe("analysis frame data", () => {
  it("preserves manifest metadata when no frame is available", () => {
    const data = buildEmptyAnalysisDataFromManifest({
      manifest: {
        analysisViewResolution,
        aiLabelsExpected: true,
        emptyReason: "No analysis is available yet.",
      },
    });

    expect(data.conversationViewSnapshotId).toBeUndefined();
    expect(data.emptyReason).toBe("No analysis is available yet.");
    expect(data.consensusAgree).toEqual([]);
    expect(data.polisClusters).toEqual({});
  });

  it("builds a complete displayed frame", () => {
    const data = buildAnalysisDataFromFrame({
      manifest,
      groups: groups({ "0": 12, "1": 9 }),
      groupLabels,
      agreements: opinionList("agreements"),
      disagreements: opinionList("disagreements"),
      divisive: opinionList("divisive"),
    });

    expect(data.frameKey).toEqual(frameKey);
    expect(data.conversationViewSnapshotId).toBe(12);
    expect(data.polisClusters["0"]?.aiLabel).toBe("Builders");
    expect(data.consensusAgree).toHaveLength(1);
  });

  it("hides two-group singleton content", () => {
    const data = buildAnalysisDataFromFrame({
      manifest,
      groups: groups({ "0": 12, "1": 1 }),
      groupLabels,
      agreements: opinionList("agreements"),
      disagreements: opinionList("disagreements"),
      divisive: opinionList("divisive"),
    });

    expect(data.polisClusters).toEqual({});
    expect(data.consensusAgree).toEqual([]);
  });

  it("rejects mismatched frame sections", () => {
    expect(() =>
      buildAnalysisDataFromFrame({
        manifest,
        groups: {
          ...groups({ "0": 12, "1": 9 }),
          frameKey: { ...frameKey, candidateId: 99 },
        },
        groupLabels,
        agreements: opinionList("agreements"),
        disagreements: opinionList("disagreements"),
        divisive: opinionList("divisive"),
      })
    ).toThrow("Mismatched analysis frame section: groups");
  });

  it("keeps current closed state when merging live analysis snapshot counts", () => {
    const metadata = conversationMetadata({ isClosed: false });

    const merged = mergeLiveAnalysisSnapshotMetadata({
      metadata,
      snapshot: conversationViewSnapshot({ isClosed: true }),
    });

    expect(merged.conversationViewSnapshotId).toBe(13);
    expect(merged.voteCount).toBe(99);
    expect(merged.isClosed).toBe(false);
  });

  it("ignores analysis snapshot metadata older than the current conversation snapshot", () => {
    const metadata = conversationMetadata({
      conversationViewSnapshotId: 20,
      voteCount: 42,
      isClosed: false,
    });

    const merged = mergeLiveAnalysisSnapshotMetadata({
      metadata,
      snapshot: conversationViewSnapshot({
        conversationViewSnapshotId: 19,
        voteCount: 99,
        isClosed: true,
      }),
    });

    expect(merged).toBe(metadata);
  });
});
