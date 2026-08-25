/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
export type ConversationEmailUpdatePreferenceScope = "project" | "conversation";

export function resolveConversationEmailPreferenceChoice({
    projectEnabled,
    conversationEnabled,
    scopeKind,
}: {
    projectEnabled: boolean | null | undefined;
    conversationEnabled: boolean | null | undefined;
    scopeKind: "project" | "no_project" | "unavailable";
}): boolean | undefined {
    if (scopeKind === "no_project") return conversationEnabled ?? undefined;
    return conversationEnabled ?? projectEnabled ?? undefined;
}

export function resolveConversationEmailPreference({
    globalPaused,
    projectEnabled,
    conversationEnabled,
    scopeKind,
}: {
    globalPaused: boolean;
    projectEnabled: boolean | undefined;
    conversationEnabled: boolean | undefined;
    scopeKind: "project" | "no_project";
}): boolean {
    if (globalPaused) return false;
    return (
        resolveConversationEmailPreferenceChoice({
            projectEnabled,
            conversationEnabled,
            scopeKind,
        }) === true
    );
}
