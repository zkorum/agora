import type { ConversationEmailUpdatePreferenceFocus } from "src/shared/types/dto";
import type { ContentAction } from "src/utils/actions/core/types";

export interface EmailUpdateSettingsDestination {
  path: "/settings/account/email-updates/";
  query: { projectSlug: string } | { conversationSlugId: string };
}

export function getEmailUpdateSettingsDestination(
  focus: ConversationEmailUpdatePreferenceFocus
): EmailUpdateSettingsDestination {
  return {
    path: "/settings/account/email-updates/",
    query:
      focus.kind === "project"
        ? { projectSlug: focus.projectSlug }
        : { conversationSlugId: focus.conversationSlugId },
  };
}

export function getEmailUpdateSettingsHref(
  focus: ConversationEmailUpdatePreferenceFocus
): string {
  const destination = getEmailUpdateSettingsDestination(focus);
  const query = new URLSearchParams();
  if ("projectSlug" in destination.query) {
    query.set("projectSlug", destination.query.projectSlug);
  } else {
    query.set("conversationSlugId", destination.query.conversationSlugId);
  }
  return `${destination.path}?${query.toString()}`;
}

export function arrangeConversationEmailUpdateActions({
  actions,
  ownerAction,
  personalActions,
}: {
  actions: readonly ContentAction[];
  ownerAction: ContentAction | undefined;
  personalActions: readonly ContentAction[];
}): ContentAction[] {
  let arrangedActions = actions.filter(
    (action) =>
      action.id !== "conversationEmailUpdates" &&
      action.id !== "manageConversationEmailUpdates" &&
      action.id !== "manageMyConversationEmailUpdates"
  );

  if (ownerAction !== undefined) {
    const exportIndex = arrangedActions.findIndex(
      (action) => action.id === "exportConversation"
    );
    const moderationIndex = arrangedActions.findIndex(
      (action) => action.id === "moderationHistory"
    );
    const ownerActionIndex =
      exportIndex >= 0
        ? exportIndex + 1
        : moderationIndex >= 0
          ? moderationIndex
          : arrangedActions.length;
    arrangedActions = [
      ...arrangedActions.slice(0, ownerActionIndex),
      ownerAction,
      ...arrangedActions.slice(ownerActionIndex),
    ];
  }

  if (personalActions.length === 0) {
    return arrangedActions;
  }

  const reportIndex = arrangedActions.findIndex(
    (action) => action.id === "report"
  );
  const warningIndex = arrangedActions.findIndex(
    (action) => action.variant === "warning" || action.variant === "destructive"
  );
  const personalActionIndex =
    reportIndex >= 0
      ? reportIndex + 1
      : warningIndex >= 0
        ? warningIndex
        : arrangedActions.length;
  return [
    ...arrangedActions.slice(0, personalActionIndex),
    ...personalActions,
    ...arrangedActions.slice(personalActionIndex),
  ];
}
