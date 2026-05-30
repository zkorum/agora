import type { FastifyReply } from "fastify";
import type { NotificationItem } from "@/shared/types/zod.js";
import { zodSlugId } from "@/shared/types/zod.js";
import type {
    SSEConnectedData,
    SSENotificationData,
    SSEShutdownData,
    SSEEventDataByType,
    SSEEventType,
} from "@/shared/types/dto.js";
import { log } from "@/app.js";
import { z } from "zod";

const zodRealtimeStreamQuery = z
    .object({
        conversationSlugId: zodSlugId.min(1).optional(),
    })
    .loose();

export function parseRealtimeSubscribedConversationSlugId(
    rawQuery: unknown,
): string | undefined {
    const query = zodRealtimeStreamQuery.parse(rawQuery);
    return query.conversationSlugId;
}

type ConversationSubscriptionEvent =
    | {
          id: number | undefined;
          event: "conversation_analysis_updated";
          data: SSEEventDataByType["conversation_analysis_updated"];
      }
    | {
          id: number | undefined;
          event: "conversation_settings_updated";
          data: SSEEventDataByType["conversation_settings_updated"];
      }
    | {
          id: number | undefined;
          event: "new_opinion";
          data: SSEEventDataByType["new_opinion"];
      };

interface RealtimeConnectionOptions {
    subscribedConversationSlugId: string | undefined;
}

/**
 * Server-Sent Events (SSE) Connection Manager for real-time events.
 * Manages both authenticated (by userId) and anonymous SSE connections.
 * Broadcasts personal notifications to specific users, and global events
 * (e.g. new_conversation) to all connected clients.
 */
export class RealtimeSSEManager {
    // Authenticated connections: userId → Set of reply streams
    private connections: Map<string, Set<FastifyReply>>;
    // Anonymous connections (no userId)
    private anonymousConnections: Set<FastifyReply>;
    private connectionTimestamps: Map<FastifyReply, number>;
    private connectionConversationSubscriptions: Map<FastifyReply, string>;
    private cleanupInterval: NodeJS.Timeout | null;
    private isShuttingDown: boolean;
    private readonly CONNECTION_TIMEOUT_MS = 3600000; // 1 hour

    constructor() {
        this.connections = new Map();
        this.anonymousConnections = new Set();
        this.connectionTimestamps = new Map();
        this.connectionConversationSubscriptions = new Map();
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
    public connect({
        userId,
        reply,
        subscribedConversationSlugId,
    }: {
        userId: string;
        reply: FastifyReply;
    } & RealtimeConnectionOptions): void {
        if (this.isShuttingDown) {
            reply.code(503).send({ error: "Server is shutting down" });
            return;
        }

        // Get or create connection set for this user
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        const userConnections = this.connections.get(userId);
        if (!userConnections) {
            log.error(`Failed to get realtime connections for user ${userId}`);
            return;
        }
        userConnections.add(reply);
        this.connectionTimestamps.set(reply, Date.now());
        this.setConnectionConversationSubscriptions({
            reply,
            subscribedConversationSlugId,
        });

        // Setup cleanup on connection close using @fastify/sse plugin's onClose method
        reply.sse.onClose(() => {
            this.disconnect({ userId, reply });
        });

        // Send initial connection confirmation using plugin
        const connectedData: SSEConnectedData = {
            userId,
            timestamp: Date.now(),
        };
        void reply.sse
            .send({
                event: "connected",
                data: connectedData,
            })
            .catch((error: unknown) => {
                log.error(
                    error,
                    `Failed to send realtime connection event to user ${userId}`,
                );
            });
    }

    /**
     * Register a new anonymous SSE connection (no userId)
     */
    public connectAnonymous({
        reply,
        subscribedConversationSlugId,
    }: {
        reply: FastifyReply;
    } & RealtimeConnectionOptions): void {
        if (this.isShuttingDown) {
            reply.code(503).send({ error: "Server is shutting down" });
            return;
        }

        this.anonymousConnections.add(reply);
        this.connectionTimestamps.set(reply, Date.now());
        this.setConnectionConversationSubscriptions({
            reply,
            subscribedConversationSlugId,
        });

        reply.sse.onClose(() => {
            this.disconnectAnonymous(reply);
        });

        void reply.sse
            .send({
                event: "connected",
                data: { timestamp: Date.now() },
            })
            .catch((error: unknown) => {
                log.error(
                    error,
                    "Failed to send realtime connection event to anonymous client",
                );
            });
    }

    /**
     * Unregister an authenticated SSE connection for a user
     */
    public disconnect({
        userId,
        reply,
    }: {
        userId: string;
        reply: FastifyReply;
    }): void {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(reply);

            // Clean up empty connection sets
            if (userConnections.size === 0) {
                this.connections.delete(userId);
            }
        }
        this.connectionTimestamps.delete(reply);
        this.connectionConversationSubscriptions.delete(reply);
    }

    /**
     * Unregister an anonymous SSE connection
     */
    public disconnectAnonymous(reply: FastifyReply): void {
        this.anonymousConnections.delete(reply);
        this.connectionTimestamps.delete(reply);
        this.connectionConversationSubscriptions.delete(reply);
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
        const deadAuthenticated: { userId: string; reply: FastifyReply }[] = [];
        const deadAnonymous: FastifyReply[] = [];

        for (const [userId, userConnections] of this.connections) {
            for (const reply of userConnections) {
                if (
                    !this.isSubscribedToConversation({
                        reply,
                        conversationSlugId,
                    })
                ) {
                    continue;
                }
                reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                    deadAuthenticated.push({ userId, reply });
                });
            }
        }

        for (const reply of this.anonymousConnections) {
            if (
                !this.isSubscribedToConversation({
                    reply,
                    conversationSlugId,
                })
            ) {
                continue;
            }
            reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                deadAnonymous.push(reply);
            });
        }

        for (const { userId, reply } of deadAuthenticated) {
            this.disconnect({ userId, reply });
        }
        for (const deadReply of deadAnonymous) {
            this.disconnectAnonymous(deadReply);
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
        const deadAuthenticated: { userId: string; reply: FastifyReply }[] = [];
        const deadAnonymous: FastifyReply[] = [];

        for (const [userId, userConnections] of this.connections) {
            if (userId === excludeUserId) {
                continue;
            }
            for (const reply of userConnections) {
                if (
                    !this.isSubscribedToConversation({
                        reply,
                        conversationSlugId,
                    })
                ) {
                    continue;
                }
                reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                    deadAuthenticated.push({ userId, reply });
                });
            }
        }

        for (const reply of this.anonymousConnections) {
            if (
                !this.isSubscribedToConversation({
                    reply,
                    conversationSlugId,
                })
            ) {
                continue;
            }
            reply.sse.send({ id: id?.toString(), event, data }).catch(() => {
                deadAnonymous.push(reply);
            });
        }

        for (const { userId, reply } of deadAuthenticated) {
            this.disconnect({ userId, reply });
        }
        for (const deadReply of deadAnonymous) {
            this.disconnectAnonymous(deadReply);
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

        const deadConnections: FastifyReply[] = [];

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
                    deadConnections.push(reply);
                });
        }

        // Clean up dead connections
        for (const deadReply of deadConnections) {
            this.disconnect({ userId, reply: deadReply });
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
        const deadAuthenticated: { userId: string; reply: FastifyReply }[] = [];
        const deadAnonymous: FastifyReply[] = [];

        // Send to all authenticated connections
        for (const [userId, userConnections] of this.connections) {
            for (const reply of userConnections) {
                reply.sse.send({ event, data }).catch(() => {
                    deadAuthenticated.push({ userId, reply });
                });
            }
        }

        // Send to all anonymous connections
        for (const reply of this.anonymousConnections) {
            reply.sse.send({ event, data }).catch(() => {
                deadAnonymous.push(reply);
            });
        }

        // Clean up dead connections
        for (const { userId, reply } of deadAuthenticated) {
            this.disconnect({ userId, reply });
        }
        for (const deadReply of deadAnonymous) {
            this.disconnectAnonymous(deadReply);
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
        const deadAuthenticated: { userId: string; reply: FastifyReply }[] = [];
        const deadAnonymous: FastifyReply[] = [];

        // Send to all authenticated connections except the excluded user
        for (const [userId, userConnections] of this.connections) {
            if (userId === excludeUserId) {
                continue;
            }
            for (const reply of userConnections) {
                reply.sse.send({ event, data }).catch(() => {
                    deadAuthenticated.push({ userId, reply });
                });
            }
        }

        // Send to all anonymous connections
        for (const reply of this.anonymousConnections) {
            reply.sse.send({ event, data }).catch(() => {
                deadAnonymous.push(reply);
            });
        }

        // Clean up dead connections
        for (const { userId, reply } of deadAuthenticated) {
            this.disconnect({ userId, reply });
        }
        for (const deadReply of deadAnonymous) {
            this.disconnectAnonymous(deadReply);
        }
    }

    /**
     * Cleanup stale connections that exceed timeout
     */
    private cleanupStaleConnections(): void {
        const now = Date.now();
        const staleAuthenticated: { userId: string; reply: FastifyReply }[] =
            [];
        const staleAnonymous: FastifyReply[] = [];

        for (const [userId, userConnections] of this.connections.entries()) {
            for (const reply of userConnections) {
                const timestamp = this.connectionTimestamps.get(reply);
                if (timestamp && now - timestamp > this.CONNECTION_TIMEOUT_MS) {
                    staleAuthenticated.push({ userId, reply });
                }
            }
        }

        for (const reply of this.anonymousConnections) {
            const timestamp = this.connectionTimestamps.get(reply);
            if (timestamp && now - timestamp > this.CONNECTION_TIMEOUT_MS) {
                staleAnonymous.push(reply);
            }
        }

        for (const { userId, reply } of staleAuthenticated) {
            this.disconnect({ userId, reply });
            try {
                reply.sse.close();
            } catch (error: unknown) {
                log.error(
                    error,
                    `Error closing stale realtime connection for user ${userId}`,
                );
            }
        }

        for (const reply of staleAnonymous) {
            this.disconnectAnonymous(reply);
            try {
                reply.sse.close();
            } catch (error: unknown) {
                log.error(
                    error,
                    "Error closing stale anonymous realtime connection",
                );
            }
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

        // Close all connections
        const allConnections: FastifyReply[] = [];
        for (const userConnections of this.connections.values()) {
            allConnections.push(...userConnections);
        }
        allConnections.push(...this.anonymousConnections);

        for (const reply of allConnections) {
            try {
                const shutdownData: SSEShutdownData = {
                    message: "Server is shutting down",
                };
                await reply.sse.send({
                    event: "shutdown",
                    data: shutdownData,
                });
                // Close the SSE stream using plugin's close method
                reply.sse.close();
            } catch (_error) {
                // Ignore errors during shutdown
            }
        }

        this.connections.clear();
        this.anonymousConnections.clear();
        this.connectionTimestamps.clear();
        this.connectionConversationSubscriptions.clear();
    }

    private setConnectionConversationSubscriptions({
        reply,
        subscribedConversationSlugId,
    }: {
        reply: FastifyReply;
        subscribedConversationSlugId: string | undefined;
    }): void {
        if (subscribedConversationSlugId === undefined) {
            this.connectionConversationSubscriptions.delete(reply);
            return;
        }

        this.connectionConversationSubscriptions.set(reply, subscribedConversationSlugId);
    }

    private isSubscribedToConversation({
        reply,
        conversationSlugId,
    }: {
        reply: FastifyReply;
        conversationSlugId: string;
    }): boolean {
        return (
            this.connectionConversationSubscriptions.get(reply) ===
            conversationSlugId
        );
    }
}
