import type {
  AnalysisFrameGroupLabels,
  AnalysisFrameGroups,
  AnalysisFrameKey,
  AnalysisFrameManifest,
  AnalysisFrameOpinionList,
  GroupDescriptionDisplay,
} from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  ConversationMetadata,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { shouldHideGroupAnalysis } from "src/utils/component/opinion";

const POLIS_KEYS = ["0", "1", "2", "3", "4", "5"] satisfies PolisKey[];

type AnalysisFrameManifestWithFrame = AnalysisFrameManifest & {
  frameKey: AnalysisFrameKey;
  conversationViewSnapshot: NonNullable<AnalysisFrameManifest["conversationViewSnapshot"]>;
};

interface CompleteAnalysisFrameSections {
  manifest: AnalysisFrameManifestWithFrame;
  groups: AnalysisFrameGroups;
  groupLabels: AnalysisFrameGroupLabels;
  agreements: AnalysisFrameOpinionList;
  disagreements: AnalysisFrameOpinionList;
  divisive: AnalysisFrameOpinionList;
}

type ConversationViewSnapshot = NonNullable<
  AnalysisFrameManifest["conversationViewSnapshot"]
>;

export interface AnalysisData {
  consensusAgree: AnalysisOpinionItem[];
  consensusDisagree: AnalysisOpinionItem[];
  controversial: AnalysisOpinionItem[];
  polisClusters: Partial<PolisClusters>;
  frameKey?: AnalysisFrameKey;
  manifest?: AnalysisFrameManifest;
  groups?: AnalysisFrameGroups;
  groupLabels?: AnalysisFrameGroupLabels;
  agreements?: AnalysisFrameOpinionList;
  disagreements?: AnalysisFrameOpinionList;
  divisive?: AnalysisFrameOpinionList;
  groupDescriptionDisplay?: GroupDescriptionDisplay;
  conversationViewSnapshotId?: number;
  analysisSnapshotId?: number;
  conversationViewSnapshot?: AnalysisFrameManifest["conversationViewSnapshot"];
  emptyReason?: string;
  analysisViewState?: AnalysisFrameManifest["analysisViewResolution"];
  displayableGroupCounts?: number[];
  hasVotedOnAllAvailableOpinions?: boolean;
}

export function mergeLiveAnalysisSnapshotMetadata({
  metadata,
  snapshot,
}: {
  metadata: ConversationMetadata;
  snapshot: ConversationViewSnapshot;
}): ConversationMetadata {
  const previousSnapshotId = metadata.conversationViewSnapshotId;
  if (
    previousSnapshotId !== undefined &&
    snapshot.conversationViewSnapshotId < previousSnapshotId
  ) {
    return metadata;
  }

  return {
    ...metadata,
    conversationViewSnapshotId: snapshot.conversationViewSnapshotId,
    opinionCount: snapshot.opinionCount,
    voteCount: snapshot.voteCount,
    participantCount: snapshot.participantCount,
    totalOpinionCount: snapshot.totalOpinionCount,
    totalVoteCount: snapshot.totalVoteCount,
    totalParticipantCount: snapshot.totalParticipantCount,
    moderatedOpinionCount: snapshot.moderatedOpinionCount,
    hiddenOpinionCount: snapshot.hiddenOpinionCount,
  };
}

function isAnalysisFrameKeyEqual({
  left,
  right,
}: {
  left: AnalysisFrameKey;
  right: AnalysisFrameKey;
}): boolean {
  return (
    left.conversationViewSnapshotId === right.conversationViewSnapshotId &&
    left.analysisSnapshotId === right.analysisSnapshotId &&
    left.candidateId === right.candidateId
  );
}

function assertMatchingFrameKey({
  expected,
  actual,
  section,
}: {
  expected: AnalysisFrameKey;
  actual: AnalysisFrameKey;
  section: string;
}): void {
  if (!isAnalysisFrameKeyEqual({ left: expected, right: actual })) {
    throw new Error(`Mismatched analysis frame section: ${section}`);
  }
}

export function buildEmptyAnalysisDataFromManifest({
  manifest,
}: {
  manifest: AnalysisFrameManifest;
}): AnalysisData {
  return {
    consensusAgree: [],
    consensusDisagree: [],
    controversial: [],
    polisClusters: {},
    manifest,
    conversationViewSnapshotId: manifest.frameKey?.conversationViewSnapshotId,
    analysisSnapshotId: manifest.frameKey?.analysisSnapshotId,
    conversationViewSnapshot: manifest.conversationViewSnapshot,
    emptyReason: manifest.emptyReason,
    analysisViewState: manifest.analysisViewResolution,
    displayableGroupCounts: manifest.analysisViewResolution.options
      .map((option) => ("candidate" in option ? option.candidate.groupCount : undefined))
      .filter((groupCount) => groupCount !== undefined),
    hasVotedOnAllAvailableOpinions: manifest.hasVotedOnAllAvailableOpinions,
  };
}

function buildPolisClustersFromFrame({
  groups,
  groupLabels,
}: {
  groups: AnalysisFrameGroups;
  groupLabels: AnalysisFrameGroupLabels;
}): Partial<PolisClusters> {
  const polisClusters: Partial<PolisClusters> = {};

  for (const key of POLIS_KEYS) {
    const group = groups.clusters[key];
    if (group === undefined) {
      continue;
    }

    const label = groupLabels.labels[key];
    polisClusters[key] = {
      ...group,
      aiLabel: label?.aiLabel,
      aiSummary: label?.aiSummary,
    };
  }

  return polisClusters;
}

export function buildAnalysisDataFromFrame({
  manifest,
  groups,
  groupLabels,
  agreements,
  disagreements,
  divisive,
}: CompleteAnalysisFrameSections): AnalysisData {
  const frameKey = manifest.frameKey;
  assertMatchingFrameKey({
    expected: frameKey,
    actual: groups.frameKey,
    section: "groups",
  });
  assertMatchingFrameKey({
    expected: frameKey,
    actual: groupLabels.frameKey,
    section: "groupLabels",
  });
  assertMatchingFrameKey({
    expected: frameKey,
    actual: agreements.frameKey,
    section: "agreements",
  });
  assertMatchingFrameKey({
    expected: frameKey,
    actual: disagreements.frameKey,
    section: "disagreements",
  });
  assertMatchingFrameKey({
    expected: frameKey,
    actual: divisive.frameKey,
    section: "divisive",
  });

  const polisClusters = buildPolisClustersFromFrame({ groups, groupLabels });
  const hideGroupAnalysis = shouldHideGroupAnalysis(polisClusters);

  return {
    consensusAgree: hideGroupAnalysis ? [] : agreements.items,
    consensusDisagree: hideGroupAnalysis ? [] : disagreements.items,
    controversial: hideGroupAnalysis ? [] : divisive.items,
    polisClusters: hideGroupAnalysis ? {} : polisClusters,
    frameKey,
    manifest,
    groups,
    groupLabels,
    agreements,
    disagreements,
    divisive,
    groupDescriptionDisplay: groupLabels.groupDescriptionDisplay,
    conversationViewSnapshotId: frameKey.conversationViewSnapshotId,
    analysisSnapshotId: frameKey.analysisSnapshotId,
    conversationViewSnapshot: manifest.conversationViewSnapshot,
    emptyReason: manifest.emptyReason,
    analysisViewState: manifest.analysisViewResolution,
    displayableGroupCounts: manifest.analysisViewResolution.options
      .map((option) => ("candidate" in option ? option.candidate.groupCount : undefined))
      .filter((groupCount) => groupCount !== undefined),
    hasVotedOnAllAvailableOpinions: manifest.hasVotedOnAllAvailableOpinions,
  };
}

export function hasManifestFrame(
  manifest: AnalysisFrameManifest
): manifest is AnalysisFrameManifestWithFrame {
  return (
    manifest.frameKey !== undefined &&
    manifest.conversationViewSnapshot !== undefined
  );
}
