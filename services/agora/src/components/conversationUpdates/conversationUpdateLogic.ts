import {
  CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
  type ConversationUpdateHistoryRecord,
  type ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateScope,
  ConversationEmailUpdateSelection,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";

export function mapConversationEmailUpdateScopes(
  scopes: readonly ConversationEmailUpdateScope[]
): readonly ConversationUpdateScopeSummary[] {
  return scopes.map((scope) => ({
    id:
      scope.kind === "project"
        ? scope.projectSlug
        : `${CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID}:${scope.conversations[0].conversationSlugId}`,
    kind: scope.kind === "project" ? "project" : "no-project",
    unsubscribeScope: scope.unsubscribeScope,
    label: scope.title,
    contactEmail:
      scope.kind === "project"
        ? scope.participantContactEmail
        : (scope.conversations.at(0)?.participantContactEmail ?? ""),
    conversations: scope.conversations.map((conversation) => ({
      id: conversation.conversationSlugId,
      title: conversation.title,
      href: `/conversation/${conversation.conversationSlugId}`,
      eligibleParticipantCount: conversation.estimatedEligibleRecipientCount,
      participationMode: conversation.participationMode,
    })),
  }));
}

export function createConversationEmailUpdateSelection({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary;
  selectedConversationIds: readonly string[];
}): ConversationEmailUpdateSelection | undefined {
  if (scope.kind === "project") {
    const [firstConversationSlugId, ...remainingConversationSlugIds] =
      selectedConversationIds;
    if (firstConversationSlugId === undefined) {
      return undefined;
    }
    const parsedSelection = Dto.conversationEmailUpdateSelection.safeParse({
      kind: "project",
      projectSlug: scope.id,
      conversationSlugIds: [
        firstConversationSlugId,
        ...remainingConversationSlugIds,
      ],
    });
    return parsedSelection.success ? parsedSelection.data : undefined;
  }

  const conversationSlugId = selectedConversationIds.at(0);
  if (
    selectedConversationIds.length !== 1 ||
    conversationSlugId === undefined
  ) {
    return undefined;
  }
  const parsedSelection = Dto.conversationEmailUpdateSelection.safeParse({
    kind: "no_project",
    conversationSlugId,
  });
  return parsedSelection.success ? parsedSelection.data : undefined;
}

export function mapConversationEmailUpdateHistoryRecord(
  record: ConversationEmailUpdateHistoryRecord
): ConversationUpdateHistoryRecord {
  const base = {
    id: record.updateId,
    subject: record.subject,
    scopeLabel: record.scope.title,
    conversations: record.conversations.map((conversation) => ({
      title: conversation.title,
      href: `/conversation/${conversation.conversationSlugId}`,
    })),
    audienceEstimate: record.audienceEstimate,
    ownerCopyCount: record.ownerCopyCount,
    acceptedAt: new Date(record.acceptedAt),
  };

  if (record.status === "failed") {
    if (record.reason === "materialization_failed") {
      return {
        ...base,
        status: record.status,
        reason: "audience_materialization_failed",
      };
    }
    if (record.reason === "no_participant_provider_accepted") {
      return {
        ...base,
        status: record.status,
        reason: "all_participant_attempts_failed",
      };
    }
    return { ...base, status: record.status, reason: record.reason };
  }
  if (record.status === "stopped" || record.status === "stopping") {
    return {
      ...base,
      status: record.status,
      reason:
        record.reason === "global_kill_switch"
          ? "emergency_global_kill_switch"
          : "emergency_legal_or_abuse_block",
    };
  }
  return { ...base, status: record.status, reason: undefined };
}

export function getInitialConversationIds(
  scope: ConversationUpdateScopeSummary | undefined
): readonly string[] {
  const firstConversation = scope?.conversations.at(0);
  return firstConversation === undefined ? [] : [firstConversation.id];
}
