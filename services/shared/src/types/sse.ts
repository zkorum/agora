import type { NotificationItem } from "./zod.js";

/**
 * Server-Sent Events (SSE) type definitions
 * Defines the structure of all SSE events sent from backend to frontend
 */

// Event-specific data types

/**
 * Data sent when a client successfully connects to the SSE stream
 */
export interface SSEConnectedData {
    userId?: string;
    timestamp: number;
}

/**
 * Data sent when a new notification is created
 */
export interface SSENotificationData {
    notification: NotificationItem;
}

/**
 * Data sent when a new conversation should appear in feeds.
 */
export interface SSENewConversationData {
    timestamp: number;
}

/**
 * Data sent when a new opinion should appear in a conversation.
 */
export interface SSENewOpinionData {
    conversationSlugId: string;
    opinionSlugId: string;
    timestamp: number;
}

/**
 * Data sent periodically to keep the connection alive
 */
export interface SSEHeartbeatData {
    timestamp: number;
}

/**
 * Data sent when engagement rankings change on the "Following" feed
 */
export interface SSEPopularConversationData {
    topConversationSlugIdList: string[];
}

/**
 * Data sent when a conversation has a newer analysis snapshot available.
 */
export interface SSEConversationAnalysisUpdatedData {
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    analysisSnapshotId: number;
    checkpointChanged: boolean;
    opinionCount?: number;
    voteCount?: number;
    participantCount?: number;
    totalOpinionCount?: number;
    totalVoteCount?: number;
    totalParticipantCount?: number;
    moderatedOpinionCount?: number;
    hiddenOpinionCount?: number;
    isClosed?: boolean;
    timestamp: number;
}

/**
 * Data sent when the server is shutting down
 */
export interface SSEShutdownData {
    message: string;
}

export interface SSEEventDataByType {
    connected: SSEConnectedData;
    notification: SSENotificationData;
    new_conversation: SSENewConversationData;
    new_opinion: SSENewOpinionData;
    popular_conversation: SSEPopularConversationData;
    conversation_analysis_updated: SSEConversationAnalysisUpdatedData;
    heartbeat: SSEHeartbeatData;
    shutdown: SSEShutdownData;
}

// SSE Event Types
export type SSEEventType = keyof SSEEventDataByType;

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
export type SSEHeartbeatEvent = SSEEvent<"heartbeat">;
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
    | SSEHeartbeatEvent
    | SSEShutdownEvent;
