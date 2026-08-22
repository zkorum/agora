import type { ContentAction } from "src/utils/actions/core/types";

export type ConversationUpdatePreferenceState =
  | "disabled"
  | "enabled"
  | "undisclosed";

export function getConversationUpdatePreferenceDisplay(
  state: ConversationUpdatePreferenceState
): { enabled: boolean; description: string } {
  if (state === "enabled") {
    return { enabled: true, description: "On for this conversation" };
  }
  if (state === "disabled") {
    return { enabled: false, description: "Off for this conversation" };
  }
  return { enabled: false, description: "No conversation preference saved" };
}

export function createConversationUpdatePreferenceAction({
  label,
  enabled,
  description,
  disabled = false,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  description: string | undefined;
  disabled?: boolean;
  onToggle: () => void;
}): ContentAction {
  return {
    id: "conversationEmailUpdates",
    label,
    description,
    ...(disabled ? { disabled: true } : {}),
    icon: "mdi-email-outline",
    closeOnSelect: false,
    trailingControl: {
      type: "switch",
      checked: enabled,
    },
    handler: onToggle,
    isVisible: () => true,
  };
}
