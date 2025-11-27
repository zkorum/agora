import type { FastifyReply } from "fastify";
import type { NotificationItem } from "@/shared/types/zod.js";
import { log } from "@/app.js";

/**
 * Server-Sent Events (SSE) Connection Manager for real-time notifications
 * Manages active SSE connections and broadcasts notifications to connected clients
 * Uses @fastify/sse plugin for SSE handling
 */
export class NotificationSSEManager {
    // Map of userId to Set of active reply streams
    private connections: Map<string, Set<FastifyReply>>;
    private heartbeatInterval: NodeJS.Timeout | null;
    private isShuttingDown: boolean;

    constructor() {
        this.connections = new Map();
        this.heartbeatInterval = null;
        this.isShuttingDown = false;
    }

    /**
     * Initialize the SSE manager and start heartbeat
     */
    public initialize(): void {
        // Send heartbeat every 30 seconds to keep connections alive
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);
        log.info("[SSE] Notification SSE Manager initialized");
    }

    /**
     * Register a new SSE connection for a user
     */
    public connect(userId: string, reply: FastifyReply): void {
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
            log.error(`[SSE] Failed to get connections for user ${userId}`);
            return;
        }
        userConnections.add(reply);

        log.info(
            `[SSE] User ${userId} connected (total connections: ${String(userConnections.size)})`,
        );

        // Setup cleanup on connection close using @fastify/sse plugin's onClose method
        reply.sse.onClose(() => {
            this.disconnect(userId, reply);
        });

        // Send initial connection confirmation using plugin
        void reply.sse
            .send({
                event: "connected",
                data: { userId, timestamp: Date.now() },
            })
            .catch((error: unknown) => {
                log.error(
                    error,
                    `[SSE] Failed to send connection event to user ${userId}`,
                );
            });
    }

    /**
     * Unregister an SSE connection for a user
     */
    public disconnect(userId: string, reply: FastifyReply): void {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(reply);
            log.info(
                `[SSE] User ${userId} disconnected (remaining connections: ${String(userConnections.size)})`,
            );

            // Clean up empty connection sets
            if (userConnections.size === 0) {
                this.connections.delete(userId);
            }
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

        log.info(
            `[SSE] Broadcasting notification to user ${userId} (${String(userConnections.size)} connections)`,
        );

        const deadConnections: FastifyReply[] = [];

        for (const reply of userConnections) {
            reply.sse
                .send({
                    event: "notification",
                    data: notification,
                })
                .catch((error: unknown) => {
                    log.error(
                        error,
                        `[SSE] Failed to send notification to user ${userId}`,
                    );
                    deadConnections.push(reply);
                });
        }

        // Clean up dead connections
        for (const deadReply of deadConnections) {
            this.disconnect(userId, deadReply);
        }
    }

    /**
     * Send a heartbeat comment to all connected clients
     */
    private sendHeartbeat(): void {
        const totalConnections = Array.from(this.connections.values()).reduce(
            (sum, set) => sum + set.size,
            0,
        );

        if (totalConnections === 0) {
            return;
        }

        log.debug(
            `[SSE] Sending heartbeat to ${String(totalConnections)} connections`,
        );

        for (const [userId, userConnections] of this.connections.entries()) {
            const deadConnections: FastifyReply[] = [];

            for (const reply of userConnections) {
                reply.sse
                    .send({
                        event: "heartbeat",
                        data: { timestamp: Date.now() },
                    })
                    .catch(() => {
                        log.warn(
                            `[SSE] Heartbeat failed for user ${userId}, marking connection as dead`,
                        );
                        deadConnections.push(reply);
                    });
            }

            // Clean up dead connections
            for (const deadReply of deadConnections) {
                this.disconnect(userId, deadReply);
            }
        }
    }

    /**
     * Get connection statistics
     */
    public getStats(): {
        totalUsers: number;
        totalConnections: number;
        userConnections: Record<string, number>;
    } {
        const userConnections: Record<string, number> = {};
        let totalConnections = 0;

        for (const [userId, connections] of this.connections.entries()) {
            userConnections[userId] = connections.size;
            totalConnections += connections.size;
        }

        return {
            totalUsers: this.connections.size,
            totalConnections,
            userConnections,
        };
    }

    /**
     * Gracefully shutdown the SSE manager
     */
    public async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        log.info("[SSE] Shutting down Notification SSE Manager...");

        // Stop heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Close all connections
        const allConnections: FastifyReply[] = [];
        for (const userConnections of this.connections.values()) {
            allConnections.push(...userConnections);
        }

        log.info(
            `[SSE] Closing ${String(allConnections.length)} active connections`,
        );

        for (const reply of allConnections) {
            try {
                await reply.sse.send({
                    event: "shutdown",
                    data: { message: "Server is shutting down" },
                });
                // Close the SSE stream using plugin's close method
                reply.sse.close();
            } catch (_error) {
                // Ignore errors during shutdown
            }
        }

        this.connections.clear();
        log.info("[SSE] Notification SSE Manager shutdown complete");
    }
}
