import type { ManageOptOutItem } from "src/components/conversationUpdates/authFreePreferenceManager";
import type {
  ConversationEmailUpdateActionReportRequest,
  ConversationEmailUpdateActionResolveResponse,
} from "src/shared/types/dto";
import { onActivated, onDeactivated, onMounted, onUnmounted } from "vue";

type ResolveSuccess = Extract<
  ConversationEmailUpdateActionResolveResponse,
  { success: true }
>;
export type UnsubscribeResolution = Extract<
  ResolveSuccess,
  { action: "unsubscribe_project" | "unsubscribe_conversation" }
>;
export type PreferencesResolution = Extract<
  ResolveSuccess,
  { action: "manage_preferences" }
>;
export type ReportResolution = Extract<ResolveSuccess, { action: "report" }>;
export type ReportReason = ConversationEmailUpdateActionReportRequest["reason"];

export const reportReasons: readonly ReportReason[] = [
  "spam",
  "abuse",
  "unrelated_content",
  "other",
];

export function getUnsubscribeResolution(
  response: ConversationEmailUpdateActionResolveResponse
): UnsubscribeResolution | undefined {
  if (
    response.success &&
    (response.action === "unsubscribe_project" ||
      response.action === "unsubscribe_conversation")
  ) {
    return response;
  }
  return undefined;
}

export function getPreferencesResolution(
  response: ConversationEmailUpdateActionResolveResponse
): PreferencesResolution | undefined {
  return response.success && response.action === "manage_preferences"
    ? response
    : undefined;
}

export function getReportResolution(
  response: ConversationEmailUpdateActionResolveResponse
): ReportResolution | undefined {
  return response.success && response.action === "report"
    ? response
    : undefined;
}

export function getManageOptOutItems(
  resolution: PreferencesResolution
): readonly ManageOptOutItem[] {
  const conversationItems = resolution.scope.conversations.map(
    (conversation): ManageOptOutItem => ({
      key: `conversation:${conversation.conversationSlugId}`,
      title: conversation.title,
      target: {
        kind: "conversation",
        conversationSlugId: conversation.conversationSlugId,
      },
      type: "conversation",
    })
  );

  if (resolution.scope.kind === "no_project") {
    return conversationItems;
  }

  return [
    {
      key: `project:${resolution.scope.projectSlug}`,
      title: resolution.scope.title,
      target: {
        kind: "project",
        projectSlug: resolution.scope.projectSlug,
      },
      type: "project",
    },
    ...conversationItems,
  ];
}

export function optionalReportDetails(details: string): string | undefined {
  const trimmedDetails = details.trim();
  return trimmedDetails.length > 0 ? trimmedDetails : undefined;
}

function getOrCreateMeta(name: string): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  if (existing !== null) {
    return existing;
  }

  const meta = document.createElement("meta");
  meta.name = name;
  document.head.append(meta);
  return meta;
}

export function useEmailUpdateActionPageMetadata(title: string): void {
  const previousTitle = document.title;
  let robotsMeta: HTMLMetaElement | undefined;
  let referrerMeta: HTMLMetaElement | undefined;
  let previousRobots: string | undefined;
  let previousReferrer: string | undefined;

  function applyMetadata(): void {
    document.title = `${title} | Agora`;
    robotsMeta = getOrCreateMeta("robots");
    referrerMeta = getOrCreateMeta("referrer");
    previousRobots ??= robotsMeta.content;
    previousReferrer ??= referrerMeta.content;
    robotsMeta.content = "noindex, nofollow";
    referrerMeta.content = "no-referrer";
  }

  function restoreMetadata(): void {
    document.title = previousTitle;
    if (robotsMeta !== undefined && previousRobots !== undefined) {
      robotsMeta.content = previousRobots;
    }
    if (referrerMeta !== undefined && previousReferrer !== undefined) {
      referrerMeta.content = previousReferrer;
    }
  }

  onMounted(applyMetadata);
  onActivated(applyMetadata);
  onDeactivated(restoreMetadata);
  onUnmounted(restoreMetadata);
}
