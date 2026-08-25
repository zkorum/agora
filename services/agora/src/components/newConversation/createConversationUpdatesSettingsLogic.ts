export function shouldShowConversationUpdatesSettings({
  canConfigure,
  hasParticipantContactEmail,
  mode,
}: {
  canConfigure: boolean;
  hasParticipantContactEmail: boolean;
  mode: "create" | "edit";
}): boolean {
  return canConfigure && (mode === "edit" || hasParticipantContactEmail);
}

export function canSelectConversationUpdatesSetting({
  hasParticipantContactEmail,
  scopeDefaultEnabled,
  value,
}: {
  hasParticipantContactEmail: boolean;
  scopeDefaultEnabled: boolean;
  value: boolean | undefined;
}): boolean {
  return (
    hasParticipantContactEmail ||
    value === false ||
    (value === undefined && !scopeDefaultEnabled)
  );
}
