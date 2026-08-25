export function canDeleteConversationEmailUpdateContact({
    defaultEnabled,
    hasExplicitlyEnabledConversation,
}: {
    defaultEnabled: boolean;
    hasExplicitlyEnabledConversation: boolean;
}): boolean {
    return !defaultEnabled && !hasExplicitlyEnabledConversation;
}
