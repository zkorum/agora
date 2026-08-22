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

export interface ConversationUpdateConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly eligibleParticipantCount: number;
  readonly participationMode: ParticipationMode;
  readonly ownerIds: readonly string[];
}

export interface ConversationUpdateScopeSummary {
  readonly id: string;
  readonly kind: "no-project" | "project";
  readonly label: string;
  readonly href: string | undefined;
  readonly contactEmail: string;
  readonly eligibleParticipantCap: number;
  readonly conversations: readonly ConversationUpdateConversationSummary[];
}

export interface ConversationUpdateHistoryConversation {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}

interface ConversationUpdateHistoryRecordBase {
  readonly id: string;
  readonly subject: string;
  readonly bodyHtml: string;
  readonly scopeId: string;
  readonly scopeKind: ConversationUpdateScopeSummary["kind"];
  readonly scopeLabel: string;
  readonly scopeHref: string | undefined;
  readonly conversations: readonly ConversationUpdateHistoryConversation[];
  readonly audienceEstimate: number;
  readonly ownerCopyCount: number;
  readonly createdAtLabel: string;
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
