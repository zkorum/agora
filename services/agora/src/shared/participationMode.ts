/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const participationModeValues = [
    "account_required",
    "strong_verification",
    "email_verification",
    "guest",
] as const;
export type ParticipationMode = (typeof participationModeValues)[number];

export const participationModeSettingsSourceValues = [
    "project_inherited",
    "conversation_override",
] as const;
export const zodParticipationModeSettingsSource = z.enum(
    participationModeSettingsSourceValues,
);
export type ParticipationModeSettingsSource = z.infer<
    typeof zodParticipationModeSettingsSource
>;

export function resolveConversationParticipationMode({
    projectParticipationMode,
    participationMode,
    source,
}: {
    projectParticipationMode: ParticipationMode;
    participationMode: ParticipationMode;
    source: ParticipationModeSettingsSource;
}): ParticipationMode {
    return source === "project_inherited"
        ? projectParticipationMode
        : participationMode;
}

export function resolveEditedParticipationModeSettingsSource({
    requestedSource,
    requestedMode,
    currentSource,
    currentEffectiveMode,
}: {
    requestedSource: ParticipationModeSettingsSource | undefined;
    requestedMode: ParticipationMode;
    currentSource: ParticipationModeSettingsSource;
    currentEffectiveMode: ParticipationMode;
}): ParticipationModeSettingsSource {
    // Legacy Vue resubmits the displayed mode. Without an explicit source, a
    // stale project default is indistinguishable from an intentional override.
    return (
        requestedSource ??
        (requestedMode === currentEffectiveMode
            ? currentSource
            : "conversation_override")
    );
}
