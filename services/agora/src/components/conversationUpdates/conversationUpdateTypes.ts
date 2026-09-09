export type ConversationUpdateStatus =
  | "completed"
  | "completed_with_failures"
  | "failed"
  | "preparing"
  | "queued"
  | "sending"
  | "stopping"
  | "stopped";

export type ConversationUpdateAutomaticStopReason =
  | "emergency_global_kill_switch"
  | "emergency_legal_or_abuse_block";

export type ConversationUpdateFailureReason =
  | "all_participant_attempts_failed"
  | "audience_materialization_failed"
  | "no_eligible_participants"
  | "provider_configuration_error"
  | "required_owner_copy_not_accepted";

// Project slugs cannot contain underscores. Append a conversation slug for each scope.
export const CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID = "__no-project";

export interface ConversationUpdateConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly eligibleParticipantCount: number;
  readonly participationMode: ParticipationMode;
}

export interface ConversationUpdateScopeSummary {
  readonly id: string;
  readonly kind: "no-project" | "project";
  readonly unsubscribeScope: "project" | "conversation";
  readonly label: string;
  readonly contactEmail: string;
  readonly conversations: readonly ConversationUpdateConversationSummary[];
}

export type ConversationUpdateAudienceEstimateState =
  | { readonly kind: "error" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly eligibleParticipantCount: number;
      readonly ownerCopyCount: number;
    };

export interface ConversationUpdateHistoryConversation {
  readonly title: string;
  readonly href: string;
}

interface ConversationUpdateHistoryRecordBase {
  readonly id: string;
  readonly subject: string;
  readonly scopeLabel: string;
  readonly conversations: readonly ConversationUpdateHistoryConversation[];
  readonly audienceEstimate: number;
  readonly ownerCopyCount: number;
  readonly acceptedAt: Date;
}

export type ConversationUpdateHistoryRecord =
  ConversationUpdateHistoryRecordBase &
    (
      | {
          readonly status:
            | "completed"
            | "completed_with_failures"
            | "preparing"
            | "queued"
            | "sending";
          readonly reason: undefined;
        }
      | {
          readonly status: "stopped" | "stopping";
          readonly reason: ConversationUpdateAutomaticStopReason;
        }
      | {
          readonly status: "failed";
          readonly reason: ConversationUpdateFailureReason;
        }
    );
import type { ParticipationMode } from "src/shared/types/zod";
