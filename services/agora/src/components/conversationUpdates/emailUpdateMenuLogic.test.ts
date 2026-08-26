import type { ContentAction } from "src/utils/actions/core/types";
import { describe, expect, it } from "vitest";

import {
  arrangeConversationEmailUpdateActions,
  getEmailUpdateSettingsDestination,
  getEmailUpdateSettingsHref,
} from "./emailUpdateMenuLogic";

describe("emailUpdateMenuLogic", () => {
  it("builds exact project and conversation settings destinations", () => {
    expect(
      getEmailUpdateSettingsDestination({
        kind: "conversation",
        conversationSlugId: "public01",
      })
    ).toEqual({
      path: "/settings/account/email-updates/",
      query: { conversationSlugId: "public01" },
    });
    expect(
      getEmailUpdateSettingsHref({
        kind: "project",
        projectSlug: "public-project",
      })
    ).toBe("/settings/account/email-updates/?projectSlug=public-project");
  });

  it("places owner and personal actions in their corresponding sections", () => {
    const ownerAction = action({
      id: "manageConversationEmailUpdates",
      variant: "default",
    });
    const personalActions = [
      action({ id: "conversationEmailUpdates", variant: "default" }),
      action({
        id: "manageMyConversationEmailUpdates",
        variant: "default",
      }),
    ];
    const arranged = arrangeConversationEmailUpdateActions({
      actions: [
        action({ id: "exportConversation", variant: "default" }),
        action({ id: "moderationHistory", variant: "default" }),
        action({ id: "report", variant: "default" }),
        action({ id: "muteUser", variant: "warning" }),
        action({ id: "delete", variant: "destructive" }),
      ],
      ownerAction,
      personalActions,
    });

    expect(arranged.map(({ id }) => id)).toEqual([
      "exportConversation",
      "manageConversationEmailUpdates",
      "moderationHistory",
      "report",
      "conversationEmailUpdates",
      "manageMyConversationEmailUpdates",
      "muteUser",
      "delete",
    ]);

    const rearranged = arrangeConversationEmailUpdateActions({
      actions: arranged,
      ownerAction,
      personalActions,
    });
    expect(rearranged.map(({ id }) => id)).toEqual(
      arranged.map(({ id }) => id)
    );
  });
});

function action({
  id,
  variant,
}: {
  id: string;
  variant: "default" | "destructive" | "warning" | "positive";
}): ContentAction {
  return {
    id,
    label: id,
    icon: "mdi-circle-outline",
    variant,
    handler: () => {},
    isVisible: () => true,
  };
}
