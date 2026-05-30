import type {
  AnalysisDescriptionReadiness,
  ConversationAnalysis,
  ConversationAnalysisContent,
  ConversationAnalysisMetadata,
} from "src/shared/types/dto";
import type { AnalysisOpinionItem, PolisClusters } from "src/shared/types/zod";
import { shouldHideGroupAnalysis } from "src/utils/component/opinion";

export interface AnalysisData {
  consensusAgree: AnalysisOpinionItem[];
  consensusDisagree: AnalysisOpinionItem[];
  controversial: AnalysisOpinionItem[];
  polisClusters: Partial<PolisClusters>;
  conversationViewSnapshotId?: number;
  analysisSnapshotId?: number;
  conversationViewSnapshot?: ConversationAnalysis["conversationViewSnapshot"];
  emptyReason?: string;
  analysisViewState?: ConversationAnalysis["analysisViewState"];
  displayableGroupCounts?: number[];
  hasVotedOnAllAvailableOpinions?: boolean;
  descriptionReadiness: AnalysisDescriptionReadiness | null;
  contentStatus: "available" | "not_available" | "not_applicable";
}

export function buildAnalysisData({
  metadata,
  content,
}: {
  metadata: ConversationAnalysisMetadata;
  content?: ConversationAnalysisContent | null;
}): AnalysisData {
  const polisClusters = content?.clusters ?? {};
  const hideGroupAnalysis = shouldHideGroupAnalysis(polisClusters);
  const contentStatus =
    content === null
      ? "not_available"
      : content === undefined
        ? "not_applicable"
        : "available";

  return {
    consensusAgree: hideGroupAnalysis ? [] : (content?.consensusAgree ?? []),
    consensusDisagree: hideGroupAnalysis
      ? []
      : (content?.consensusDisagree ?? []),
    controversial: hideGroupAnalysis ? [] : (content?.controversial ?? []),
    polisClusters: hideGroupAnalysis ? {} : polisClusters,
    conversationViewSnapshotId: metadata.conversationViewSnapshotId,
    analysisSnapshotId: metadata.analysisSnapshotId,
    conversationViewSnapshot: metadata.conversationViewSnapshot,
    descriptionReadiness:
      content?.descriptionReadiness ?? metadata.descriptionReadiness,
    emptyReason: metadata.emptyReason,
    analysisViewState: metadata.analysisViewState,
    displayableGroupCounts: metadata.displayableGroupCounts,
    hasVotedOnAllAvailableOpinions: metadata.hasVotedOnAllAvailableOpinions,
    contentStatus,
  };
}
