import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateHistoryRecord,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateScope,
  ConversationEmailUpdateSelection,
} from "src/shared/types/dto";

export function mapConversationEmailUpdateScopes(
  scopes: readonly ConversationEmailUpdateScope[]
): readonly ConversationUpdateScopeSummary[] {
  return scopes.map((scope) => ({
    id: scope.kind === "project" ? scope.projectSlug : "no-project",
    kind: scope.kind === "project" ? "project" : "no-project",
    label: scope.title,
    href:
      scope.kind === "project" ? `/project/${scope.projectSlug}` : undefined,
    contactEmail:
      scope.kind === "project"
        ? scope.participantContactEmail
        : (scope.conversations.at(0)?.participantContactEmail ?? ""),
    eligibleParticipantCap: scope.conversations.reduce(
      (total, conversation) =>
        total + conversation.estimatedEligibleRecipientCount,
      0
    ),
    conversations: scope.conversations.map((conversation) => ({
      id: conversation.conversationSlugId,
      title: conversation.title,
      href: `/conversation/${conversation.conversationSlugId}`,
      eligibleParticipantCount: conversation.estimatedEligibleRecipientCount,
      participationMode: conversation.participationMode,
      ownerIds: [],
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
    if (selectedConversationIds.length === 0) {
      return undefined;
    }
    return {
      kind: "project",
      projectSlug: scope.id,
      conversationSlugIds: [...selectedConversationIds],
    };
  }

  const conversationSlugId = selectedConversationIds.at(0);
  return conversationSlugId === undefined
    ? undefined
    : { kind: "no_project", conversationSlugId };
}

export function mapConversationEmailUpdateHistoryRecord(
  record: ConversationEmailUpdateHistoryRecord
): ConversationUpdateHistoryRecord {
  const scopeKind: ConversationUpdateScopeSummary["kind"] =
    record.scope.kind === "project" ? "project" : "no-project";
  const base = {
    id: record.updateId,
    subject: record.subject,
    bodyHtml: record.bodyHtml,
    scopeId:
      record.scope.kind === "project" ? record.scope.projectSlug : "no-project",
    scopeKind,
    scopeLabel: record.scope.title,
    scopeHref:
      record.scope.kind === "project"
        ? `/project/${record.scope.projectSlug}`
        : undefined,
    conversations: record.conversations.map((conversation) => ({
      id: conversation.conversationSlugId,
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

export function getSelectedConversations({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): readonly ConversationUpdateConversationSummary[] {
  if (scope === undefined) {
    return [];
  }

  const selectedIds = new Set(selectedConversationIds);
  return scope.conversations.filter((conversation) =>
    selectedIds.has(conversation.id)
  );
}

export function getConversationUpdateUnsubscribeScopeName({
  scopeKind,
  scopeLabel,
  conversations,
}: {
  scopeKind: ConversationUpdateScopeSummary["kind"];
  scopeLabel: string;
  conversations: readonly ConversationUpdateConversationSummary[];
}): string | undefined {
  if (scopeKind === "project") {
    return scopeLabel;
  }
  return conversations.at(0)?.title;
}

export function estimateConversationUpdateAudience({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): number {
  const selectedConversations = getSelectedConversations({
    scope,
    selectedConversationIds,
  });
  if (scope === undefined || selectedConversations.length === 0) {
    return 0;
  }

  const summedParticipants = selectedConversations.reduce(
    (total, conversation) => total + conversation.eligibleParticipantCount,
    0
  );
  const overlapFactor = 1 - (selectedConversations.length - 1) * 0.12;
  return Math.min(
    scope.eligibleParticipantCap,
    Math.round(summedParticipants * Math.max(overlapFactor, 0.6))
  );
}

export function countRelatedConversationOwners({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): number {
  const ownerIds = getSelectedConversations({
    scope,
    selectedConversationIds,
  }).flatMap((conversation) => conversation.ownerIds);
  return new Set(ownerIds).size;
}

export function createTestedDraftKey({
  scopeId,
  contactEmail,
  selectedConversationIds,
  subject,
  bodyHtml,
}: {
  scopeId: string;
  contactEmail: string;
  selectedConversationIds: readonly string[];
  subject: string;
  bodyHtml: string;
}): string {
  return JSON.stringify({
    templateVersion: "conversation-update-mock-v1",
    scopeId,
    contactEmail,
    selectedConversationIds,
    subject,
    bodyHtml,
  });
}
