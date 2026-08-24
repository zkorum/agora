import type { ContentActionContext } from "src/utils/actions/core/types";
import { describe, expect, it, vi } from "vitest";

import { postMetadataTranslations } from "../post/display/PostMetadata.i18n";
import { projectEmailUpdatesMenuTranslations } from "../project/ProjectEmailUpdatesMenu.i18n";
import {
  createConversationUpdatePreferenceAction,
  resolveConversationUpdatePreferenceEnabled,
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
  it("uses a switch for the saved preference", () => {
    const enabledAction = createConversationUpdatePreferenceAction({
      id: "conversationEmailUpdates",
      label: "Receive email updates for this conversation",
      enabled: true,
      onToggle: vi.fn(),
    });
    const disabledAction = createConversationUpdatePreferenceAction({
      id: "conversationEmailUpdates",
      label: "Receive email updates for this conversation",
      enabled: false,
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
    expect(enabledAction.description).toBeUndefined();
  });

  it("disables the switch while the preference is saving", () => {
    const action = createConversationUpdatePreferenceAction({
      id: "conversationEmailUpdates",
      label: "Receive email updates for this conversation",
      enabled: false,
      disabled: true,
      onToggle: vi.fn(),
    });

    expect(action.disabled).toBe(true);
  });

  it("runs the supplied toggle handler", async () => {
    const onToggle = vi.fn();
    const action = createConversationUpdatePreferenceAction({
      id: "conversationEmailUpdates",
      label: "Receive email updates for this conversation",
      enabled: false,
      onToggle,
    });

    await action.handler(context);

    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe("resolveConversationUpdatePreferenceEnabled", () => {
  it("uses the inherited result only for an undisclosed preference", () => {
    expect(
      resolveConversationUpdatePreferenceEnabled({
        state: "undisclosed",
        resolvedEnabled: true,
      })
    ).toBe(true);
    expect(
      resolveConversationUpdatePreferenceEnabled({
        state: "enabled",
        resolvedEnabled: false,
      })
    ).toBe(true);
    expect(
      resolveConversationUpdatePreferenceEnabled({
        state: "disabled",
        resolvedEnabled: true,
      })
    ).toBe(false);
  });
});

describe("email update action labels", () => {
  it("uses the requested English project and conversation labels", () => {
    expect(projectEmailUpdatesMenuTranslations.en.receiveUpdates).toBe(
      "Receive email updates for this project"
    );
    expect(projectEmailUpdatesMenuTranslations.en.manageUpdates).toBe(
      "Manage email updates for this project"
    );
    expect(projectEmailUpdatesMenuTranslations.en.viewHistory).toBe(
      "View email update history for this project"
    );
    expect(postMetadataTranslations.en.receiveEmailUpdatesLabel).toBe(
      "Receive email updates for this conversation"
    );
    expect(postMetadataTranslations.en.manageEmailUpdatesLabel).toBe(
      "Manage email updates for this conversation"
    );
    expect(postMetadataTranslations.en.viewEmailUpdateHistoryLabel).toBe(
      "View email update history for this conversation"
    );
    expect(projectEmailUpdatesMenuTranslations.en.saveEnabled).toBe(
      "Email updates are on for this project."
    );
    expect(projectEmailUpdatesMenuTranslations.en.saveDisabled).toBe(
      "Email updates are off for this project."
    );
    expect(projectEmailUpdatesMenuTranslations.en.saveError).toBe(
      "Couldn’t save your email update preference."
    );
    expect(postMetadataTranslations.en.emailUpdatesPreferenceSaveError).toBe(
      "Couldn’t save your email update preference."
    );
  });

  it("provides every action label in every supported language", () => {
    for (const translations of Object.values(
      projectEmailUpdatesMenuTranslations
    )) {
      expect(translations.receiveUpdates.trim()).not.toBe("");
      expect(translations.manageUpdates.trim()).not.toBe("");
      expect(translations.viewHistory.trim()).not.toBe("");
      expect(translations.saveEnabled.trim()).not.toBe("");
      expect(translations.saveDisabled.trim()).not.toBe("");
      expect(translations.saveError.trim()).not.toBe("");
    }
    for (const translations of Object.values(postMetadataTranslations)) {
      expect(translations.receiveEmailUpdatesLabel.trim()).not.toBe("");
      expect(translations.manageEmailUpdatesLabel.trim()).not.toBe("");
      expect(translations.viewEmailUpdateHistoryLabel.trim()).not.toBe("");
      expect(translations.emailUpdatesPreferenceSaveEnabled.trim()).not.toBe("");
      expect(translations.emailUpdatesPreferenceSaveDisabled.trim()).not.toBe("");
      expect(translations.emailUpdatesPreferenceSaveError.trim()).not.toBe("");
    }
  });
});
