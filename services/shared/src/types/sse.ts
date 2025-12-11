import type { NotificationItem } from "./zod.js";

/**
 * Server-Sent Events (SSE) type definitions
 * Defines the structure of all SSE events sent from backend to frontend
 */

// SSE Event Types
export type SSEEventType =
    | "connected"
    | "notification"
    | "heartbeat"
    | "shutdown";

// Base SSE Event structure
export interface SSEEvent<T = unknown> {
    event: SSEEventType;
    data: T;
}

// Event-specific data types

/**
 * Data sent when a client successfully connects to the SSE stream
 */
export interface SSEConnectedData {
    userId: string;
    timestamp: number;
}

/**
 * Data sent when a new notification is created
 */
export interface SSENotificationData {
    notification: NotificationItem;
}

/**
 * Data sent periodically to keep the connection alive
 */
export interface SSEHeartbeatData {
    timestamp: number;
}

/**
 * Data sent when the server is shutting down
 */
export interface SSEShutdownData {
    message: string;
}

// Typed event unions for each event type

export type SSEConnectedEvent = SSEEvent<SSEConnectedData>;
export type SSENotificationEvent = SSEEvent<SSENotificationData>;
export type SSEHeartbeatEvent = SSEEvent<SSEHeartbeatData>;
export type SSEShutdownEvent = SSEEvent<SSEShutdownData>;

/**
 * Union of all possible SSE events
 */
export type AnySSEEvent =
    | SSEConnectedEvent
    | SSENotificationEvent
    | SSEHeartbeatEvent
    | SSEShutdownEvent;
