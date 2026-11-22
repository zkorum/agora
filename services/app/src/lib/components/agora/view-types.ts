import type { QvAllocationRow } from "$logic/agora/qv-allocation.js";
import type { AuthorView, OpinionVoteBreakdown } from "$ui/agora/view-types.js";

export interface AccountSettingsPreview {
  username: string;
  email: string;
  subscriptions: {
    projectSlug: string;
    projectTitle: string;
    enabled: boolean;
    activities: { id: string; title: string; enabled: boolean }[];
  }[];
}

export interface ParticipationResponse {
  id: string;
  title: string;
  description: string;
}

interface ParticipationConversation {
  projectTitle: string;
  title: string;
  description: string;
  status: "open" | "closed";
  author: AuthorView;
}

export type ParticipationViewData = ParticipationConversation &
  (
    | { kind: "polis"; opinions: readonly string[] }
    | { kind: "gathering"; responses: readonly ParticipationResponse[] }
    | {
        kind: "comparisons";
        comparisonMethod: "pairwise" | "bws";
        items: readonly string[];
      }
    | {
        kind: "qv";
        allocations: readonly QvAllocationRow[];
        totalCredits: number;
        voteLimit: number;
      }
  );

export interface PolisAnalysisViewData {
  conversationTitle: string;
  participantCount: string;
  voteCount: string;
  opinions: readonly {
    id: string;
    text: string;
    author: AuthorView;
    voteBreakdown: readonly OpinionVoteBreakdown[] | undefined;
    visibilityNotice: "pending" | "hidden" | undefined;
    outcome: "approved" | "divisive" | undefined;
  }[];
  opinionGroups: readonly {
    id: string;
    name: string;
    participantCount: string;
    description: string;
  }[];
}

export interface QvAllocationEditorProps {
  rows: readonly QvAllocationRow[];
  totalCredits?: number;
  voteLimit?: number;
  disabled?: boolean;
  onread: (id: string) => void;
}
