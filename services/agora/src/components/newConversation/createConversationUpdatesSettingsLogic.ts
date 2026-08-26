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

export function hasConversationUpdatesSettingChanged({
  currentOverride,
  originalOverride,
}: {
  currentOverride: boolean | undefined;
  originalOverride: boolean | undefined;
}): boolean {
  return currentOverride !== originalOverride;
}

export function getConversationUpdatesOverrideUpdate({
  currentOverride,
  originalOverride,
}: {
  currentOverride: boolean | undefined;
  originalOverride: boolean | undefined;
}): boolean | null | undefined {
  if (currentOverride === originalOverride) {
    return undefined;
  }
  return currentOverride ?? null;
}
