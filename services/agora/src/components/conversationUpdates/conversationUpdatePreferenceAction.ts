import type { ContentAction } from "src/utils/actions/core/types";

export function createConversationUpdatePreferenceAction({
  label,
  enabled,
  description,
  onToggle,
}: {
  label: "Email updates for this conversation" | "Email updates for this project";
  enabled: boolean;
  description: string | undefined;
  onToggle: () => void;
}): ContentAction {
  return {
    id: "conversationEmailUpdates",
    label,
    description,
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
