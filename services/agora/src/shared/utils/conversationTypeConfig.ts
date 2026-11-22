/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type {
    ConversationMetadata,
    ConversationTypeConfig,
} from "../types/zod.js";

export function areConversationTypeConfigsEqual({
    left,
    right,
}: {
    left: Readonly<ConversationTypeConfig>;
    right: Readonly<ConversationTypeConfig>;
}): boolean {
    if (left.conversationType === "gathering")
        return right.conversationType === "gathering";
    if (right.conversationType === "gathering") return false;
    if (left.conversationType === "polis")
        return (
            right.conversationType === "polis" &&
            left.votingPresentation === right.votingPresentation
        );
    if (right.conversationType === "polis") return false;
    if (left.prioritizationType === "comparisons")
        return (
            right.prioritizationType === "comparisons" &&
            left.comparisonMethod === right.comparisonMethod
        );
    return (
        right.prioritizationType === "qv" &&
        left.allowOpposition === right.allowOpposition
    );
}

/** Publication fixes the method and QV rules; Polis presentation remains editable. */
export function canEditPublishedConversationTypeConfig({
    current,
    requested,
}: {
    current: Readonly<ConversationTypeConfig>;
    requested: Readonly<ConversationTypeConfig>;
}): boolean {
    if (current.conversationType === "polis")
        return requested.conversationType === "polis";
    return areConversationTypeConfigsEqual({ left: current, right: requested });
}

export function applyConversationTypeConfig({
    metadata,
    config,
}: {
    metadata: ConversationMetadata;
    config: Readonly<ConversationTypeConfig>;
}): ConversationMetadata {
    // Published metadata cannot change family or method; only Polis presentation is mutable.
    if (
        metadata.conversationType === "polis" &&
        config.conversationType === "polis"
    )
        return { ...metadata, votingPresentation: config.votingPresentation };
    return metadata;
}

export function projectConversationTypeConfig(
    config: Readonly<ConversationTypeConfig>,
): ConversationTypeConfig {
    if (config.conversationType === "gathering")
        return { conversationType: "gathering" };
    if (config.conversationType === "polis") {
        return {
            conversationType: "polis",
            votingPresentation: config.votingPresentation,
        };
    }
    if (config.prioritizationType === "qv") {
        return {
            conversationType: "prioritizing",
            prioritizationType: "qv",
            creditPricing: config.creditPricing,
            allowOpposition: config.allowOpposition,
        };
    }
    return {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: config.comparisonMethod,
    };
}
