/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type {
    ConversationTypeConfig,
    ParticipantStatements,
    ConversationStatementSettings,
    ConversationMetadata,
} from "../types/zod.js";

export function defaultConversationStatementSettings(
    config: Readonly<ConversationTypeConfig>,
): ConversationStatementSettings {
    if (config.conversationType === "polis")
        return {
            ...config,
            participantStatements: { supported: true, enabled: true },
        };
    if (config.prioritizationType === "comparisons")
        return {
            ...config,
            participantStatements: { supported: true, enabled: false },
        };
    return { ...config, participantStatements: { supported: false } };
}

/** Keep the published family/capability correlation without reparsing an entire cached conversation. */
export function applyParticipantStatements({
    metadata,
    participantStatements,
}: {
    metadata: ConversationMetadata;
    participantStatements: ParticipantStatements | undefined;
}): ConversationMetadata {
    if (participantStatements === undefined) return metadata;
    if (
        metadata.conversationType === "polis" &&
        participantStatements.supported
    )
        return { ...metadata, participantStatements };
    if (
        metadata.conversationType === "prioritizing" &&
        metadata.prioritizationType === "comparisons" &&
        participantStatements.supported
    )
        return { ...metadata, participantStatements };
    return metadata;
}

export function changeConversationStatementSettings({
    current,
    config,
}: {
    current: ConversationStatementSettings;
    config: Readonly<ConversationTypeConfig>;
}): ConversationStatementSettings {
    if (
        config.conversationType === "polis" &&
        current.conversationType === "polis"
    )
        return {
            ...config,
            participantStatements: { ...current.participantStatements },
        };
    if (
        config.conversationType === "prioritizing" &&
        config.prioritizationType === "comparisons" &&
        current.conversationType === "prioritizing" &&
        current.prioritizationType === "comparisons"
    )
        return {
            ...config,
            participantStatements: { ...current.participantStatements },
        };
    return defaultConversationStatementSettings(config);
}
