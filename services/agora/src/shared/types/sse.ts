/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import {
    type SupportedDisplayLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "../languages.js";
import {
    zodEventSlug,
    zodNotificationItem,
    zodParticipationMode,
    zodPreferredOpinionGroupCount,
    zodProjectSlug,
    zodSlugId,
} from "./zod.js";

/**
 * Server-Sent Events (SSE) type definitions
 * Defines the structure of all SSE events sent from backend to frontend
 */

// Event-specific data schemas and types

export function buildRealtimeConversationTopic({
    conversationSlugId,
}: {
    conversationSlugId: string;
}): string {
    return `conversation:${conversationSlugId}`;
}

export function buildContentTranslationTopic({
    conversationSlugId,
    targetLanguageCode,
}: {
    conversationSlugId: string;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): string {
    return `translation:conversation:${conversationSlugId}:target:${targetLanguageCode}`;
}

export function buildProjectContentTranslationTopic({
    projectSlug,
    targetLanguageCode,
}: {
    projectSlug: string;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): string {
    return `translation:project:${projectSlug}:target:${targetLanguageCode}`;
}

/**
 * Data sent when a client successfully connects to the SSE stream
 */
export const zodSSEConnectedData = z
    .object({
        userId: z.string().optional(),
        timestamp: z.number(),
    })
    .strict();
export type SSEConnectedData = z.infer<typeof zodSSEConnectedData>;

/**
 * Data sent when a new notification is created
 */
export const zodSSENotificationData = z
    .object({
        notification: zodNotificationItem,
    })
    .strict();
export type SSENotificationData = z.infer<typeof zodSSENotificationData>;

/**
 * Data sent when a new conversation should appear in feeds.
 */
export const zodSSENewConversationData = z
    .object({
        timestamp: z.number(),
    })
    .strict();
export type SSENewConversationData = z.infer<typeof zodSSENewConversationData>;

/**
 * Data sent when a new opinion should appear in a conversation.
 */
export const zodSSENewOpinionData = z
    .object({
        conversationSlugId: zodSlugId,
        opinionSlugId: zodSlugId,
        timestamp: z.number(),
    })
    .strict();
export type SSENewOpinionData = z.infer<typeof zodSSENewOpinionData>;

/**
 * Data sent when engagement rankings change on the "Following" feed
 */
export const zodSSEPopularConversationData = z
    .object({
        topConversationSlugIdList: z.array(zodSlugId),
    })
    .strict();
export type SSEPopularConversationData = z.infer<
    typeof zodSSEPopularConversationData
>;

/**
 * Data sent when a conversation has a newer analysis snapshot available.
 */
const zodSSEConversationAnalysisUpdatedBaseData = z
    .object({
        conversationSlugId: zodSlugId,
        conversationViewSnapshotId: z.number().int().positive(),
        analysisSnapshotId: z.number().int().positive(),
        checkpointChanged: z.boolean(),
        displayableGroupCounts: z.array(z.number().int().min(2).max(6)),
        opinionCount: z.number().int().nonnegative().optional(),
        voteCount: z.number().int().nonnegative().optional(),
        participantCount: z.number().int().nonnegative().optional(),
        totalOpinionCount: z.number().int().nonnegative().optional(),
        totalVoteCount: z.number().int().nonnegative().optional(),
        totalParticipantCount: z.number().int().nonnegative().optional(),
        moderatedOpinionCount: z.number().int().nonnegative().optional(),
        hiddenOpinionCount: z.number().int().nonnegative().optional(),
        isClosed: z.boolean().optional(),
        timestamp: z.number(),
    })
    .strict();

export const zodSSEConversationAnalysisUpdatedData = z.discriminatedUnion(
    "changeKind",
    [
        zodSSEConversationAnalysisUpdatedBaseData.extend({
            changeKind: z.literal("snapshot"),
        }),
        zodSSEConversationAnalysisUpdatedBaseData.extend({
            changeKind: z.literal("latest_state"),
        }),
        zodSSEConversationAnalysisUpdatedBaseData.extend({
            changeKind: z.literal("descriptions"),
            locales: z.array(ZodSupportedDisplayLanguageCodes).min(1),
            candidateIds: z.array(z.number().int().positive()).min(1),
        }),
    ],
);
export type SSEConversationAnalysisUpdatedData = z.infer<
    typeof zodSSEConversationAnalysisUpdatedData
>;

/**
 * Data sent when the comment tab's current server-side counters changed.
 */
export const zodSSEConversationCommentStatsUpdatedData = z
    .object({
        conversationSlugId: zodSlugId,
        conversationViewSnapshotId: z.number().int().positive(),
        opinionCount: z.number().int().nonnegative(),
        voteCount: z.number().int().nonnegative(),
        participantCount: z.number().int().nonnegative(),
        totalOpinionCount: z.number().int().nonnegative(),
        totalVoteCount: z.number().int().nonnegative(),
        totalParticipantCount: z.number().int().nonnegative(),
        moderatedOpinionCount: z.number().int().nonnegative(),
        hiddenOpinionCount: z.number().int().nonnegative(),
        isClosed: z.boolean(),
        opinionVoteCounts: z.array(
            z
                .object({
                    opinionSlugId: zodSlugId,
                    numParticipants: z.number().int().nonnegative(),
                    numAgrees: z.number().int().nonnegative(),
                    numDisagrees: z.number().int().nonnegative(),
                    numPasses: z.number().int().nonnegative(),
                })
                .strict(),
        ).default([]),
        timestamp: z.number(),
    })
    .strict();
export type SSEConversationCommentStatsUpdatedData = z.infer<
    typeof zodSSEConversationCommentStatsUpdatedData
>;

/**
 * Data sent when conversation settings that affect live views change.
 */
export const zodSSEConversationSettingsData = z
    .object({
        isIndexed: z.boolean(),
        participationMode: zodParticipationMode,
        requiresEventTicket: zodEventSlug.nullable(),
        aiLabelingEnabled: z.boolean(),
        preferredOpinionGroupCount: zodPreferredOpinionGroupCount,
        isClosed: z.boolean(),
    })
    .strict();
export type SSEConversationSettingsData = z.infer<
    typeof zodSSEConversationSettingsData
>;

export const zodSSEConversationSettingsUpdatedData = z
    .object({
        conversationSlugId: zodSlugId,
        settings: zodSSEConversationSettingsData,
        timestamp: z.number(),
    })
    .strict();
export type SSEConversationSettingsUpdatedData = z.infer<
    typeof zodSSEConversationSettingsUpdatedData
>;

const zodSSEContentTranslationSubject = z.discriminatedUnion("kind", [
    z
        .object({
            kind: z.literal("conversation"),
            conversationSlugId: zodSlugId,
            sourceVersion: z.uuid(),
        })
        .strict(),
    z
        .object({
            kind: z.literal("opinion"),
            conversationSlugId: zodSlugId,
            opinionSlugId: zodSlugId,
            sourceVersion: z.uuid(),
        })
        .strict(),
    z
        .object({
            kind: z.literal("survey_question"),
            conversationSlugId: zodSlugId,
            questionSlugId: zodSlugId,
            sourceVersion: z.uuid(),
        })
        .strict(),
    z
        .object({
            kind: z.literal("project"),
            projectSlug: zodProjectSlug,
            sourceVersion: z.uuid(),
        })
        .strict(),
    z
        .object({
            kind: z.literal("ranking_item"),
            conversationSlugId: zodSlugId,
            itemSlugId: zodSlugId,
            sourceVersion: z.uuid(),
        })
        .strict(),
]);

export const zodSSEContentTranslationUpdatedData = z
    .object({
        subject: zodSSEContentTranslationSubject,
        targetLanguageCode: ZodSupportedDisplayLanguageCodes,
        status: z.enum(["completed", "failed"]),
        timestamp: z.number(),
    })
    .strict();
export type SSEContentTranslationUpdatedData = z.infer<
    typeof zodSSEContentTranslationUpdatedData
>;

export const zodSSESubscriptionReadyData = z
    .object({
        topics: z.array(z.string().min(1)),
        timestamp: z.number(),
    })
    .strict();
export type SSESubscriptionReadyData = z.infer<
    typeof zodSSESubscriptionReadyData
>;

/**
 * Data sent when the server is shutting down
 */
export const zodSSEShutdownData = z
    .object({
        message: z.string(),
    })
    .strict();
export type SSEShutdownData = z.infer<typeof zodSSEShutdownData>;

export const zodSSEEventDataByType = {
    connected: zodSSEConnectedData,
    notification: zodSSENotificationData,
    new_conversation: zodSSENewConversationData,
    new_opinion: zodSSENewOpinionData,
    popular_conversation: zodSSEPopularConversationData,
    conversation_analysis_updated: zodSSEConversationAnalysisUpdatedData,
    conversation_comment_stats_updated:
        zodSSEConversationCommentStatsUpdatedData,
    conversation_settings_updated: zodSSEConversationSettingsUpdatedData,
    content_translation_updated: zodSSEContentTranslationUpdatedData,
    subscription_ready: zodSSESubscriptionReadyData,
    shutdown: zodSSEShutdownData,
} as const;

export type SSEEventDataByType = {
    [TEvent in keyof typeof zodSSEEventDataByType]: z.infer<
        (typeof zodSSEEventDataByType)[TEvent]
    >;
};

// SSE Event Types
export type SSEEventType = keyof typeof zodSSEEventDataByType;

// Base SSE Event structure
export interface SSEEvent<TEvent extends SSEEventType = SSEEventType> {
    event: TEvent;
    data: SSEEventDataByType[TEvent];
}

// Typed event unions for each event type

export type SSEConnectedEvent = SSEEvent<"connected">;
export type SSENotificationEvent = SSEEvent<"notification">;
export type SSENewConversationEvent = SSEEvent<"new_conversation">;
export type SSENewOpinionEvent = SSEEvent<"new_opinion">;
export type SSEPopularConversationEvent = SSEEvent<"popular_conversation">;
export type SSEConversationAnalysisUpdatedEvent =
    SSEEvent<"conversation_analysis_updated">;
export type SSEConversationCommentStatsUpdatedEvent =
    SSEEvent<"conversation_comment_stats_updated">;
export type SSEConversationSettingsUpdatedEvent =
    SSEEvent<"conversation_settings_updated">;
export type SSEContentTranslationUpdatedEvent =
    SSEEvent<"content_translation_updated">;
export type SSESubscriptionReadyEvent = SSEEvent<"subscription_ready">;
export type SSEShutdownEvent = SSEEvent<"shutdown">;

/**
 * Union of all possible SSE events
 */
export type AnySSEEvent =
    | SSEConnectedEvent
    | SSENotificationEvent
    | SSENewConversationEvent
    | SSENewOpinionEvent
    | SSEPopularConversationEvent
    | SSEConversationAnalysisUpdatedEvent
    | SSEConversationCommentStatsUpdatedEvent
    | SSEConversationSettingsUpdatedEvent
    | SSEContentTranslationUpdatedEvent
    | SSESubscriptionReadyEvent
    | SSEShutdownEvent;
