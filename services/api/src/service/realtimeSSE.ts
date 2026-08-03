import type { FastifyReply, FastifyRequest } from "fastify";
import type { DeviceLoginStatusInternal } from "@/service/authUtil.js";
import type { NotificationItem } from "@/shared/types/zod.js";
import { zodSlugId } from "@/shared/types/zod.js";
import type {
    SSEConnectedData,
    SSENotificationData,
    SSEShutdownData,
    SSEEventDataByType,
    SSEEventType,
} from "@/shared/types/dto.js";
import {
    buildContentTranslationTopic,
    buildProjectContentTranslationTopic,
    buildRealtimeConversationTopic,
} from "@/shared/types/dto.js";
import { log } from "@/app.js";
import { z } from "zod";

export {
    buildContentTranslationTopic,
    buildProjectContentTranslationTopic,
    buildRealtimeConversationTopic,
};

const zodRealtimeStreamQuery = z
    .object({
        conversationSlugId: zodSlugId.min(1).optional(),
        topic: z
            .union([z.string().min(1), z.array(z.string().min(1))])
            .optional(),
    })
    .loose();

export interface RealtimeSubscriptionRequest {
    conversationSlugId: string | undefined;
    topics: string[];
}

export type RealtimeStreamAccess =
    | { kind: "anonymous" }
    | { kind: "guest"; userId: string }
    | { kind: "registered"; userId: string; sessionExpiry: Date }
    | { kind: "retired_registered" };

type AuthenticatedRealtimeStreamAccess = Extract<
    RealtimeStreamAccess,
    { kind: "guest" | "registered" }
>;

export function getRealtimeStreamAccess(
    deviceStatus: DeviceLoginStatusInternal,
): RealtimeStreamAccess {
    if (!deviceStatus.isKnown) {
        return { kind: "anonymous" };
    }
    if (!deviceStatus.isRegistered) {
        return { kind: "guest", userId: deviceStatus.userId };
    }
    if (!deviceStatus.isLoggedIn) {
        return { kind: "retired_registered" };
    }
    return {
        kind: "registered",
        userId: deviceStatus.userId,
        sessionExpiry: deviceStatus.sessionExpiry,
    };
}

export function createRealtimeRequestClosePromise({
    requestRaw,
}: {
    requestRaw: FastifyRequest["raw"];
}): Promise<void> {
    return new Promise<void>((resolve) => {
        const handleClose = (): void => {
            resolve();
        };

        requestRaw.once("close", handleClose);
        if (requestRaw.closed || requestRaw.destroyed) {
            requestRaw.removeListener("close", handleClose);
            resolve();
        }
    });
}

export function parseRealtimeSubscriptionRequest(
    rawQuery: unknown,
): RealtimeSubscriptionRequest {
    const query = zodRealtimeStreamQuery.parse(rawQuery);
    const explicitTopics =
        query.topic === undefined
            ? []
            : Array.isArray(query.topic)
              ? query.topic
              : [query.topic];
    const topics = new Set(explicitTopics);
    if (query.conversationSlugId !== undefined) {
        topics.add(
            buildRealtimeConversationTopic({
                conversationSlugId: query.conversationSlugId,
            }),
        );
    }

    return {
        conversationSlugId: query.conversationSlugId,
        topics: Array.from(topics),
    };
}

type ConversationSubscriptionEvent =
    | {
          id: number | undefined;
          event: "conversation_analysis_updated";
          data: SSEEventDataByType["conversation_analysis_updated"];
      }
    | {
          id: number | undefined;
          event: "conversation_comment_stats_updated";
          data: SSEEventDataByType["conversation_comment_stats_updated"];
      }
    | {
          id: number | undefined;
          event: "conversation_ranking_stats_updated";
          data: SSEEventDataByType["conversation_ranking_stats_updated"];
      }
    | {
          id: number | undefined;
          event: "conversation_settings_updated";
          data: SSEEventDataByType["conversation_settings_updated"];
      }
    | {
          id: number | undefined;
          event: "conversation_survey_updated";
          data: SSEEventDataByType["conversation_survey_updated"];
      }
    | {
          id: number | undefined;
          event: "new_opinion";
          data: SSEEventDataByType["new_opinion"];
      };

interface RealtimeConnectionOptions {
    subscribedTopics: readonly string[];
}

type InitialConnection =
    | {
          kind: "authenticated";
          reply: FastifyReply;
          subscribedTopics: readonly string[];
          userId: string;
      }
    | {
          kind: "anonymous";
          reply: FastifyReply;
          subscribedTopics: readonly string[];
      };

/**
 * Server-Sent Events (SSE) Connection Manager for real-time events.
 * Manages both authenticated (by userId) and anonymous SSE connections.
 * Broadcasts personal notifications to specific users, and global events
 * (e.g. new_conversation) to all connected clients.
 */
export class RealtimeSSEManager {
    // Authenticated connections: userId → Set of reply streams
    private connections: Map<string, Set<FastifyReply>>;
    private authenticatedConnectionUserIds: Map<FastifyReply, string>;
    // Anonymous connections (no userId)
    private anonymousConnections: Set<FastifyReply>;
    private connectionTimestamps: Map<FastifyReply, number>;
    private authenticatedConnectionExpiryTimers: Map<
        FastifyReply,
        NodeJS.Timeout
    >;
    private connectionTopicSubscriptions: Map<FastifyReply, Set<string>>;
    private cleanupInterval: NodeJS.Timeout | null;
    private isShuttingDown: boolean;
    private readonly CONNECTION_TIMEOUT_MS = 3600000; // 1 hour
    private readonly SHUTDOWN_SEND_TIMEOUT_MS = 1000;

    constructor() {
        this.connections = new Map();
        this.authenticatedConnectionUserIds = new Map();
        this.anonymousConnections = new Set();
        this.connectionTimestamps = new Map();
        this.authenticatedConnectionExpiryTimers = new Map();
        this.connectionTopicSubscriptions = new Map();
        this.cleanupInterval = null;
        this.isShuttingDown = false;
    }

    /**
     * Initialize periodic realtime connection cleanup.
     */
    public initialize(): void {
        // Cleanup stale connections every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, 300000);

        // Prevent intervals from keeping process alive during shutdown
        this.cleanupInterval.unref();
    }

    /**
     * Register a new authenticated SSE connection for a user
     */
    public async connect({
        access,
        reply,
        subscribedTopics,
    }: {
        access: AuthenticatedRealtimeStreamAccess;
        reply: FastifyReply;
    } & RealtimeConnectionOptions): Promise<void> {
        if (this.isShuttingDown) {
            reply.code(503).send({ error: "Server is shutting down" });
            return;
        }

        const userConnections =
            this.connections.get(access.userId) ?? new Set();
        userConnections.add(reply);
        this.connections.set(access.userId, userConnections);
        this.authenticatedConnectionUserIds.set(reply, access.userId);
        this.connectionTimestamps.set(reply, Date.now());
        if (access.kind === "registered") {
            const expiryTimer = setTimeout(
                () => {
                    this.closeAuthenticatedConnection(reply);
                },
                Math.max(
                    0,
                    Math.min(
                        access.sessionExpiry.getTime() - Date.now(),
                        this.CONNECTION_TIMEOUT_MS,
                    ),
                ),
            );
            expiryTimer.unref();
            this.authenticatedConnectionExpiryTimers.set(reply, expiryTimer);
        }
        this.setConnectionTopicSubscriptions({
            reply,
            subscribedTopics,
        });

        // Setup cleanup on connection close using @fastify/sse plugin's onClose method
        reply.sse.onClose(() => {
            this.disconnect(reply);
        });

        await this.sendInitialConnectionEvents({
            kind: "authenticated",
            reply,
            subscribedTopics,
            userId: access.userId,
        });
    }

    /**
     * Register a new anonymous SSE connection (no userId)
     */
    public async connectAnonymous({
        reply,
        subscribedTopics,
    }: {
        reply: FastifyReply;
    } & RealtimeConnectionOptions): Promise<void> {
        if (this.isShuttingDown) {
            reply.code(503).send({ error: "Server is shutting down" });
            return;
        }

        this.anonymousConnections.add(reply);
        this.connectionTimestamps.set(reply, Date.now());
        this.setConnectionTopicSubscriptions({
            reply,
            subscribedTopics,
        });

        reply.sse.onClose(() => {
            this.disconnectAnonymous(reply);
        });

        await this.sendInitialConnectionEvents({
            kind: "anonymous",
            reply,
            subscribedTopics,
        });
    }

    /**
     * Unregister an authenticated SSE connection for a user
     */
    public disconnect(reply: FastifyReply): void {
        const userId = this.authenticatedConnectionUserIds.get(reply);
        if (userId !== undefined) {
            const userConnections = this.connections.get(userId);
            if (userConnections !== undefined) {
                userConnections.delete(reply);
                if (userConnections.size === 0) {
                    this.connections.delete(userId);
                }
            }
        }
        this.authenticatedConnectionUserIds.delete(reply);
        const expiryTimer = this.authenticatedConnectionExpiryTimers.get(reply);
        if (expiryTimer !== undefined) {
            clearTimeout(expiryTimer);
            this.authenticatedConnectionExpiryTimers.delete(reply);
        }
        this.connectionTimestamps.delete(reply);
        this.connectionTopicSubscriptions.delete(reply);
    }

    public closeUsers({ userIds }: { userIds: readonly string[] }): void {
        const replies = new Set<FastifyReply>();
        for (const userId of userIds) {
            for (const reply of this.connections.get(userId) ?? []) {
                replies.add(reply);
            }
        }
        for (const reply of replies) {
            this.closeAuthenticatedConnection(reply);
        }
    }

    public close(reply: FastifyReply): void {
        if (this.authenticatedConnectionUserIds.has(reply)) {
            this.closeAuthenticatedConnection(reply);
            return;
        }
        if (this.anonymousConnections.has(reply)) {
            this.closeAnonymousConnection(reply);
        }
    }

    /**
     * Unregister an anonymous SSE connection
     */
    public disconnectAnonymous(reply: FastifyReply): void {
        this.anonymousConnections.delete(reply);
        this.connectionTimestamps.delete(reply);
        this.connectionTopicSubscriptions.delete(reply);
    }

    public async sendToConnection<TEvent extends SSEEventType>({
        reply,
        id,
        event,
        data,
    }: {
        reply: FastifyReply;
        id: number | undefined;
        event: TEvent;
        data: SSEEventDataByType[TEvent];
    }): Promise<void> {
        await reply.sse.send({ id: id?.toString(), event, data });
    }

    public broadcastToConversationSubscribers({
        conversationSlugId,
        id,
        event,
        data,
    }: ConversationSubscriptionEvent & {
        conversationSlugId: string;
    }): void {
        this.broadcastToTopicSubscribers({
            topic: buildRealtimeConversationTopic({ conversationSlugId }),
            id,
            event,
            data,
        });
    }

    public broadcastToTopicSubscribers<TEvent extends SSEEventType>({
        topic,
        id,
        event,
        data,
    }: {
        topic: string;
        id: number | undefined;
        event: TEvent;
        data: SSEEventDataByType[TEvent];
    }): void {
        for (const userConnections of this.connections.values()) {
            for (const reply of userConnections) {
                if (!this.isSubscribedToTopic({ reply, topic })) {
                    continue;
                }
                reply.sse
                    .send({ id: id?.toString(), event, data })
                    .catch(() => {
                        this.closeAuthenticatedConnection(reply);
                    });
            }
        }

        for (const reply of this.anonymousConnections) {
            if (!this.isSubscribedToTopic({ reply, topic })) {
                continue;
            }
            reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                this.closeAnonymousConnection(reply);
            });
        }
    }

    public broadcastToConversationSubscribersExcept({
        conversationSlugId,
        id,
        event,
        data,
        excludeUserId,
    }: ConversationSubscriptionEvent & {
        conversationSlugId: string;
        excludeUserId: string;
    }): void {
        for (const [userId, userConnections] of this.connections) {
            if (userId === excludeUserId) {
                continue;
            }
            for (const reply of userConnections) {
                if (
                    !this.isSubscribedToTopic({
                        reply,
                        topic: buildRealtimeConversationTopic({
                            conversationSlugId,
                        }),
                    })
                ) {
                    continue;
                }
                reply.sse
                    .send({ id: id?.toString(), event, data })
                    .catch(() => {
                        this.closeAuthenticatedConnection(reply);
                    });
            }
        }

        for (const reply of this.anonymousConnections) {
            if (
                !this.isSubscribedToTopic({
                    reply,
                    topic: buildRealtimeConversationTopic({
                        conversationSlugId,
                    }),
                })
            ) {
                continue;
            }
            reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                this.closeAnonymousConnection(reply);
            });
        }
    }

    /**
     * Broadcast a notification to a specific user's active connections
     */
    public broadcastToUser(
        userId: string,
        notification: NotificationItem,
    ): void {
        const userConnections = this.connections.get(userId);
        if (!userConnections || userConnections.size === 0) {
            // User not connected, notification will be fetched via polling fallback
            return;
        }

        const notificationData: SSENotificationData = {
            notification: notification,
        };

        for (const reply of userConnections) {
            reply.sse
                .send({
                    event: "notification",
                    data: notificationData,
                })
                .catch((error: unknown) => {
                    log.error(
                        error,
                        `Failed to send realtime notification to user ${userId}`,
                    );
                    this.closeAuthenticatedConnection(reply);
                });
        }
    }

    /**
     * Broadcast a global event to ALL connected clients (both authenticated and anonymous)
     */
    public broadcastToAll<TEvent extends SSEEventType>({
        event,
        data,
    }: {
        event: TEvent;
        data: SSEEventDataByType[TEvent];
    }): void {
        // Send to all authenticated connections
        for (const userConnections of this.connections.values()) {
            for (const reply of userConnections) {
                reply.sse.send({ event, data }).catch(() => {
                    this.closeAuthenticatedConnection(reply);
                });
            }
        }

        // Send to all anonymous connections
        for (const reply of this.anonymousConnections) {
            reply.sse.send({ event, data }).catch(() => {
                this.closeAnonymousConnection(reply);
            });
        }
    }

    /**
     * Broadcast a global event to all connected clients except the specified user
     */
    public broadcastToAllExcept<TEvent extends SSEEventType>({
        event,
        data,
        excludeUserId,
    }: {
        event: TEvent;
        data: SSEEventDataByType[TEvent];
        excludeUserId: string;
    }): void {
        // Send to all authenticated connections except the excluded user
        for (const [userId, userConnections] of this.connections) {
            if (userId === excludeUserId) {
                continue;
            }
            for (const reply of userConnections) {
                reply.sse.send({ event, data }).catch(() => {
                    this.closeAuthenticatedConnection(reply);
                });
            }
        }

        // Send to all anonymous connections
        for (const reply of this.anonymousConnections) {
            reply.sse.send({ event, data }).catch(() => {
                this.closeAnonymousConnection(reply);
            });
        }
    }

    /**
     * Cleanup stale connections that exceed timeout
     */
    private cleanupStaleConnections(): void {
        const now = Date.now();
        const staleAuthenticated: FastifyReply[] = [];
        const staleAnonymous: FastifyReply[] = [];

        for (const userConnections of this.connections.values()) {
            for (const reply of userConnections) {
                const timestamp = this.connectionTimestamps.get(reply);
                if (
                    timestamp !== undefined &&
                    now - timestamp > this.CONNECTION_TIMEOUT_MS
                ) {
                    staleAuthenticated.push(reply);
                }
            }
        }

        for (const reply of this.anonymousConnections) {
            const timestamp = this.connectionTimestamps.get(reply);
            if (
                timestamp !== undefined &&
                now - timestamp > this.CONNECTION_TIMEOUT_MS
            ) {
                staleAnonymous.push(reply);
            }
        }

        for (const reply of staleAuthenticated) {
            this.closeAuthenticatedConnection(reply);
        }

        for (const reply of staleAnonymous) {
            this.closeAnonymousConnection(reply);
        }
    }

    /**
     * Get connection statistics
     */
    public getStats(): {
        totalUsers: number;
        totalConnections: number;
        anonymousConnections: number;
        userConnections: Record<string, number>;
    } {
        const userConnections: Record<string, number> = {};
        let totalConnections = 0;

        for (const [userId, connections] of this.connections.entries()) {
            userConnections[userId] = connections.size;
            totalConnections += connections.size;
        }

        totalConnections += this.anonymousConnections.size;

        return {
            totalUsers: this.connections.size,
            totalConnections,
            anonymousConnections: this.anonymousConnections.size,
            userConnections,
        };
    }

    /**
     * Gracefully shutdown the SSE manager
     */
    public async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        const allConnections = new Set<FastifyReply>();
        for (const userConnections of this.connections.values()) {
            for (const reply of userConnections) {
                allConnections.add(reply);
            }
        }
        for (const reply of this.anonymousConnections) {
            allConnections.add(reply);
        }

        this.connections.clear();
        this.authenticatedConnectionUserIds.clear();
        for (const expiryTimer of this.authenticatedConnectionExpiryTimers.values()) {
            clearTimeout(expiryTimer);
        }
        this.authenticatedConnectionExpiryTimers.clear();
        this.anonymousConnections.clear();
        this.connectionTimestamps.clear();
        this.connectionTopicSubscriptions.clear();

        await Promise.allSettled(
            Array.from(allConnections, async (reply) => {
                await this.sendShutdownAndClose(reply);
            }),
        );
    }

    private async sendInitialConnectionEvents(
        connection: InitialConnection,
    ): Promise<void> {
        const connectedData: SSEConnectedData = {
            timestamp: Date.now(),
            ...(connection.kind === "authenticated"
                ? { userId: connection.userId }
                : {}),
        };

        try {
            await connection.reply.sse.send({
                event: "connected",
                data: connectedData,
            });
            await this.sendSubscriptionReady(connection);
        } catch (error: unknown) {
            if (connection.kind === "authenticated") {
                log.error(
                    error,
                    `Failed to initialize realtime connection for user ${connection.userId}`,
                );
                this.closeAuthenticatedConnection(connection.reply);
            } else {
                log.error(
                    error,
                    "Failed to initialize anonymous realtime connection",
                );
                this.closeAnonymousConnection(connection.reply);
            }
            throw error;
        }
    }

    private async sendShutdownAndClose(reply: FastifyReply): Promise<void> {
        let timeout: NodeJS.Timeout | undefined;
        const shutdownData: SSEShutdownData = {
            message: "Server is shutting down",
        };

        try {
            await Promise.race([
                reply.sse.send({
                    event: "shutdown",
                    data: shutdownData,
                }),
                new Promise<void>((resolve) => {
                    timeout = setTimeout(
                        resolve,
                        this.SHUTDOWN_SEND_TIMEOUT_MS,
                    );
                    timeout.unref();
                }),
            ]);
        } catch (_error: unknown) {
            // Closing the stream is the required shutdown fallback.
        } finally {
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
            try {
                reply.sse.close();
            } catch (_error: unknown) {
                // The peer may already have closed the stream.
            }
        }
    }

    private async sendSubscriptionReady({
        reply,
        subscribedTopics,
    }: {
        reply: FastifyReply;
        subscribedTopics: readonly string[];
    }): Promise<void> {
        await reply.sse.send({
            event: "subscription_ready",
            data: { topics: [...subscribedTopics], timestamp: Date.now() },
        });
    }

    private setConnectionTopicSubscriptions({
        reply,
        subscribedTopics,
    }: {
        reply: FastifyReply;
        subscribedTopics: readonly string[];
    }): void {
        if (subscribedTopics.length === 0) {
            this.connectionTopicSubscriptions.delete(reply);
            return;
        }

        this.connectionTopicSubscriptions.set(reply, new Set(subscribedTopics));
    }

    private isSubscribedToTopic({
        reply,
        topic,
    }: {
        reply: FastifyReply;
        topic: string;
    }): boolean {
        return (
            this.connectionTopicSubscriptions.get(reply)?.has(topic) ?? false
        );
    }

    private closeAuthenticatedConnection(reply: FastifyReply): void {
        const userId = this.authenticatedConnectionUserIds.get(reply);
        this.disconnect(reply);
        try {
            reply.sse.close();
        } catch (error: unknown) {
            log.error(
                error,
                userId === undefined
                    ? "Error closing authenticated realtime connection"
                    : `Error closing realtime connection for user ${userId}`,
            );
        }
    }

    private closeAnonymousConnection(reply: FastifyReply): void {
        this.disconnectAnonymous(reply);
        try {
            reply.sse.close();
        } catch (error: unknown) {
            log.error(error, "Error closing anonymous realtime connection");
        }
    }
}
