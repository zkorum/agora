import { describe, expect, it, vi } from "vitest";

import type { ContentActionContext } from "../core/types";
import { getPostActions } from "./posts";

const context: ContentActionContext = {
  targetType: "post",
  targetId: "conversation",
  targetAuthor: "another-owner",
  isOwner: false,
  isSiteModerator: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
};

function visibleActionIds({
  conversationCapabilities,
  actionContext = context,
}: {
  conversationCapabilities: Parameters<
    typeof getPostActions
  >[0]["conversationCapabilities"];
  actionContext?: ContentActionContext;
}): string[] {
  const handler = vi.fn();
  return getPostActions({
    conversationCapabilities,
    reportPostCallback: handler,
    openUserReportsCallback: handler,
    muteUserCallback: handler,
    moderatePostCallback: handler,
    moderationHistoryCallback: handler,
    copyEmbedLinkCallback: handler,
    deletePostCallback: handler,
    editConversationCallback: handler,
    exportConversationCallback: handler,
    openInAgoraCallback: null,
    shareCallback: handler,
    syncGitHubCallback: handler,
    openConversationCallback: handler,
    closeConversationCallback: handler,
    isConversationClosed: false,
    isConversationExportAvailable: false,
    translations: {
      report: "Report",
      muteUser: "Mute",
      delete: "Delete",
      edit: "Edit",
      share: "Share",
      moderationHistory: "History",
      embedLink: "Embed",
      moderate: "Moderate",
      userReports: "Reports",
      exportConversation: "Export",
      openInAgora: "Open",
      syncGitHub: "Sync",
      openConversation: "Reopen",
      closeConversation: "Close",
    },
  })
    .filter((action) => action.isVisible(actionContext))
    .map((action) => action.id);
}

describe("conversation action capabilities", () => {
  it("shows edit, close and delete for a project owner without matching displayed attribution", () => {
    const actions = visibleActionIds({
      conversationCapabilities: {
        canEdit: true,
        canDelete: true,
        canManageIntegrations: true,
      },
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        "edit",
        "closeConversation",
        "delete",
        "syncGitHub",
      ])
    );
  });

  it("keeps edit, delete and integrations permissions independent", () => {
    const actions = visibleActionIds({
      conversationCapabilities: {
        canEdit: true,
        canDelete: false,
        canManageIntegrations: false,
      },
    });

    expect(actions).toContain("edit");
    expect(actions).toContain("closeConversation");
    expect(actions).not.toContain("delete");
    expect(actions).not.toContain("syncGitHub");
  });

  it("does not infer management rights from authorship", () => {
    const actions = visibleActionIds({
      conversationCapabilities: {
        canEdit: false,
        canDelete: false,
        canManageIntegrations: false,
      },
      actionContext: { ...context, isOwner: true },
    });

    expect(actions).not.toContain("edit");
    expect(actions).not.toContain("closeConversation");
    expect(actions).not.toContain("delete");
  });
});
