import type { ContentActionContext } from "src/utils/actions/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  createConversationUpdatePreferenceAction,
  getConversationUpdatePreferenceDisplay,
} from "./conversationUpdatePreferenceAction";

const context: ContentActionContext = {
  isOwner: false,
  isSiteModerator: false,
  isConversationOwner: false,
  isOrgMember: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
  targetType: "post",
  targetId: "conversation",
  targetAuthor: "author",
};

describe("createConversationUpdatePreferenceAction", () => {
  it("uses explicit saved state instead of resolved delivery state", () => {
    expect(getConversationUpdatePreferenceDisplay("enabled")).toEqual({
      enabled: true,
      description: "On for this conversation",
    });
    expect(getConversationUpdatePreferenceDisplay("disabled")).toEqual({
      enabled: false,
      description: "Off for this conversation",
    });
    expect(getConversationUpdatePreferenceDisplay("undisclosed")).toEqual({
      enabled: false,
      description: "No conversation preference saved",
    });
  });

  it("uses a switch for the saved preference", () => {
    const enabledAction = createConversationUpdatePreferenceAction({
      label: "Receive email updates for this conversation",
      enabled: true,
      description: undefined,
      onToggle: vi.fn(),
    });
    const disabledAction = createConversationUpdatePreferenceAction({
      label: "Receive email updates for this conversation",
      enabled: false,
      description: undefined,
      onToggle: vi.fn(),
    });

    expect(enabledAction.trailingControl).toEqual({
      type: "switch",
      checked: true,
    });
    expect(disabledAction.trailingControl).toEqual({
      type: "switch",
      checked: false,
    });
    expect(enabledAction.closeOnSelect).toBe(false);
  });

  it("describes a conversation-only opt-in", () => {
    const action = createConversationUpdatePreferenceAction({
      label: "Receive email updates for this conversation",
      enabled: false,
      description: "Turn on updates for this conversation only",
      onToggle: vi.fn(),
    });

    expect(action.disabled).toBeUndefined();
    expect(action.description).toBe(
      "Turn on updates for this conversation only"
    );
  });

  it("runs the supplied toggle handler", async () => {
    const onToggle = vi.fn();
    const action = createConversationUpdatePreferenceAction({
      label: "Receive email updates for this conversation",
      enabled: false,
      description: undefined,
      onToggle,
    });

    await action.handler(context);

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
