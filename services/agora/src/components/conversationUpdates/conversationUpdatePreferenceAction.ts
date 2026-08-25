import type { HandlerContentAction } from "src/utils/actions/core/types";

export function resolveEmailUpdatePreferenceChoiceEnabled({
  state,
  resolvedEnabled,
}: {
  state: "disabled" | "enabled" | "undisclosed";
  resolvedEnabled: boolean;
}): boolean {
  return state === "undisclosed" ? resolvedEnabled : state === "enabled";
}

export function createConversationUpdatePreferenceAction({
  id,
  label,
  enabled,
  disabled = false,
  onToggle,
}: {
  id: string;
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}): HandlerContentAction {
  return {
    id,
    label,
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
