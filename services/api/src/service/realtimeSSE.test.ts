import type { FastifyReply, FastifyRequest } from "fastify";
import { EventEmitter } from "node:events";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app.js", () => ({
    log: {
        error: vi.fn(),
    },
}));

import {
    createRealtimeRequestClosePromise,
    getRealtimeStreamAccess,
    RealtimeSSEManager,
    type RealtimeStreamAccess,
} from "./realtimeSSE.js";

const zodEvent = z.object({ event: z.string() }).loose();
const zodFastifyReply = z.custom<FastifyReply>(
    (value) => typeof value === "object" && value !== null && "sse" in value,
);
const zodFastifyRequestRaw = z.custom<FastifyRequest["raw"]>(
    (value) => value instanceof EventEmitter,
);
const credentials = { email: null, phone: null, rarimo: null };

function registeredAccess({
    userId,
    sessionExpiry,
}: {
    userId: string;
    sessionExpiry: Date;
}): Extract<RealtimeStreamAccess, { kind: "registered" }> {
    return { kind: "registered", userId, sessionExpiry };
}

function createReply({
    failAtSend,
    hangAtSend,
}: {
    failAtSend: number | undefined;
    hangAtSend: number | undefined;
}): {
    reply: FastifyReply;
    close: ReturnType<typeof vi.fn>;
    events: string[];
    triggerPeerClose: () => void;
} {
    const events: string[] = [];
    const close = vi.fn();
    let peerCloseHandler: (() => void) | undefined;
    let sendCount = 0;
    const reply = zodFastifyReply.parse({
        sse: {
            close,
            onClose: (handler: () => void): void => {
                peerCloseHandler = handler;
            },
            send: (source: unknown): Promise<void> => {
                sendCount += 1;
                events.push(zodEvent.parse(source).event);
                if (sendCount === failAtSend) {
                    return Promise.reject(new Error("send failed"));
                }
                if (sendCount === hangAtSend) {
                    return new Promise<void>(() => undefined);
                }
                return Promise.resolve();
            },
        },
    });

    return {
        reply,
        close,
        events,
        triggerPeerClose: (): void => {
            peerCloseHandler?.();
        },
    };
}

describe("realtime SSE connection lifecycle", () => {
    it("observes a request close registered before SSE setup", async () => {
        const requestRaw = zodFastifyRequestRaw.parse(
            Object.assign(new EventEmitter(), {
                closed: false,
                destroyed: false,
            }),
        );
        const closePromise = createRealtimeRequestClosePromise({ requestRaw });

        expect(requestRaw.listenerCount("close")).toBe(1);
        requestRaw.emit("close");
        await closePromise;

        expect(requestRaw.listenerCount("close")).toBe(0);
    });

    it("resolves immediately without retaining a listener when already closed", async () => {
        const requestRaw = zodFastifyRequestRaw.parse(
            Object.assign(new EventEmitter(), {
                closed: true,
                destroyed: false,
            }),
        );

        await expect(
            createRealtimeRequestClosePromise({ requestRaw }),
        ).resolves.toBeUndefined();
        expect(requestRaw.listenerCount("close")).toBe(0);
    });

    it.each([
        { connectionKind: "authenticated", failAtSend: 1 },
        { connectionKind: "authenticated", failAtSend: 2 },
        { connectionKind: "anonymous", failAtSend: 1 },
        { connectionKind: "anonymous", failAtSend: 2 },
    ])(
        "cleans a $connectionKind connection when initial send $failAtSend fails",
        async ({ connectionKind, failAtSend }) => {
            const manager = new RealtimeSSEManager();
            const { reply, close } = createReply({
                failAtSend,
                hangAtSend: undefined,
            });

            if (connectionKind === "authenticated") {
                await expect(
                    manager.connect({
                        access: registeredAccess({
                            userId: "user-a",
                            sessionExpiry: new Date(Date.now() + 60_000),
                        }),
                        reply,
                        subscribedTopics: ["topic-a"],
                    }),
                ).rejects.toBeDefined();
            } else {
                await expect(
                    manager.connectAnonymous({
                        reply,
                        subscribedTopics: ["topic-a"],
                    }),
                ).rejects.toBeDefined();
            }

            await vi.waitFor(() => {
                expect(close).toHaveBeenCalledOnce();
            });
            expect(manager.getStats()).toEqual({
                totalUsers: 0,
                totalConnections: 0,
                anonymousConnections: 0,
                userConnections: {},
            });

            manager.closeUsers({ userIds: ["user-a"] });
            manager.broadcastToTopicSubscribers({
                topic: "topic-a",
                id: 1,
                event: "content_translation_updated",
                data: {
                    subject: {
                        kind: "conversation",
                        conversationSlugId: "conversation-a",
                        sourceVersion: "00000000-0000-4000-8000-000000000000",
                    },
                    targetLanguageCode: "en",
                    status: "completed",
                    timestamp: 1,
                },
            });
            expect(close).toHaveBeenCalledOnce();
        },
    );

    it("removes all authenticated indexes when the peer disconnects", async () => {
        const manager = new RealtimeSSEManager();
        const { reply, close, events, triggerPeerClose } = createReply({
            failAtSend: undefined,
            hangAtSend: undefined,
        });
        await manager.connect({
            access: registeredAccess({
                userId: "user-a",
                sessionExpiry: new Date(Date.now() + 60_000),
            }),
            reply,
            subscribedTopics: ["topic-a"],
        });
        await vi.waitFor(() => {
            expect(events).toEqual(["connected", "subscription_ready"]);
        });

        triggerPeerClose();
        manager.closeUsers({ userIds: ["user-a"] });
        manager.broadcastToTopicSubscribers({
            topic: "topic-a",
            id: undefined,
            event: "conversation_survey_updated",
            data: {
                conversationSlugId: "conversation-a",
                configChanged: true,
                timestamp: 1,
            },
        });

        expect(manager.getStats().totalConnections).toBe(0);
        expect(events).toEqual(["connected", "subscription_ready"]);
        expect(close).not.toHaveBeenCalled();
    });

    it("closes an authenticated stream when its observed session expires", async () => {
        vi.useFakeTimers();
        try {
            const manager = new RealtimeSSEManager();
            const connection = createReply({
                failAtSend: undefined,
                hangAtSend: undefined,
            });
            await manager.connect({
                access: registeredAccess({
                    userId: "user-a",
                    sessionExpiry: new Date(Date.now() + 1000),
                }),
                reply: connection.reply,
                subscribedTopics: [],
            });

            await vi.advanceTimersByTimeAsync(1000);

            expect(connection.close).toHaveBeenCalledOnce();
            expect(manager.getStats().totalConnections).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });

    it("does not retire an authenticated guest connection", async () => {
        vi.useFakeTimers();
        try {
            const manager = new RealtimeSSEManager();
            const connection = createReply({
                failAtSend: undefined,
                hangAtSend: undefined,
            });
            await manager.connect({
                access: { kind: "guest", userId: "guest-a" },
                reply: connection.reply,
                subscribedTopics: [],
            });

            await vi.advanceTimersByTimeAsync(60_000);

            expect(connection.close).not.toHaveBeenCalled();
            expect(manager.getStats().userConnections).toEqual({
                "guest-a": 1,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    it("shuts clients down concurrently and bounds a backpressured send", async () => {
        vi.useFakeTimers();
        try {
            const manager = new RealtimeSSEManager();
            const backpressured = createReply({
                failAtSend: undefined,
                hangAtSend: 3,
            });
            const responsive = createReply({
                failAtSend: undefined,
                hangAtSend: undefined,
            });
            await manager.connect({
                access: registeredAccess({
                    userId: "user-a",
                    sessionExpiry: new Date(Date.now() + 60_000),
                }),
                reply: backpressured.reply,
                subscribedTopics: ["topic-a"],
            });
            await manager.connectAnonymous({
                reply: responsive.reply,
                subscribedTopics: ["topic-a"],
            });
            await vi.advanceTimersByTimeAsync(0);

            const shutdown = manager.shutdown();
            await vi.advanceTimersByTimeAsync(0);

            expect(responsive.close).toHaveBeenCalledOnce();
            expect(backpressured.close).not.toHaveBeenCalled();
            expect(manager.getStats().totalConnections).toBe(0);

            await vi.advanceTimersByTimeAsync(1000);
            await shutdown;

            expect(backpressured.close).toHaveBeenCalledOnce();
            manager.closeUsers({ userIds: ["user-a"] });
            expect(backpressured.close).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });

    it("closes every connection for affected users only", async () => {
        const manager = new RealtimeSSEManager();
        const affected = createReply({
            failAtSend: undefined,
            hangAtSend: undefined,
        });
        const unaffected = createReply({
            failAtSend: undefined,
            hangAtSend: undefined,
        });
        await manager.connect({
            access: registeredAccess({
                userId: "user-a",
                sessionExpiry: new Date(Date.now() + 60_000),
            }),
            reply: affected.reply,
            subscribedTopics: [],
        });
        await manager.connect({
            access: registeredAccess({
                userId: "user-b",
                sessionExpiry: new Date(Date.now() + 60_000),
            }),
            reply: unaffected.reply,
            subscribedTopics: [],
        });

        manager.closeUsers({ userIds: ["user-a"] });
        expect(affected.close).toHaveBeenCalledOnce();
        expect(unaffected.close).not.toHaveBeenCalled();
        expect(manager.getStats().userConnections).toEqual({ "user-b": 1 });
    });

    it("closes multiple connections for one affected user", async () => {
        const manager = new RealtimeSSEManager();
        const first = createReply({
            failAtSend: undefined,
            hangAtSend: undefined,
        });
        const second = createReply({
            failAtSend: undefined,
            hangAtSend: undefined,
        });
        await manager.connect({
            access: registeredAccess({
                userId: "user-a",
                sessionExpiry: new Date(Date.now() + 60_000),
            }),
            reply: first.reply,
            subscribedTopics: [],
        });
        await manager.connect({
            access: registeredAccess({
                userId: "user-a",
                sessionExpiry: new Date(Date.now() + 60_000),
            }),
            reply: second.reply,
            subscribedTopics: [],
        });

        manager.closeUsers({ userIds: ["user-a", "user-a"] });

        expect(first.close).toHaveBeenCalledOnce();
        expect(second.close).toHaveBeenCalledOnce();
        expect(manager.getStats().totalConnections).toBe(0);
    });
});

describe("realtime stream access", () => {
    it("keeps known guests authenticated regardless of historical expiry", () => {
        expect(
            getRealtimeStreamAccess({
                isKnown: true,
                isRegistered: false,
                isLoggedIn: false,
                userId: "guest-a",
                credentials,
                sessionExpiry: new Date("2020-01-01T00:00:00.000Z"),
            }),
        ).toEqual({ kind: "guest", userId: "guest-a" });
    });

    it("preserves registered session retirement", () => {
        const sessionExpiry = new Date("2026-09-01T00:00:00.000Z");
        expect(
            getRealtimeStreamAccess({
                isKnown: true,
                isRegistered: true,
                isLoggedIn: true,
                userId: "user-a",
                credentials,
                sessionExpiry,
            }),
        ).toEqual({ kind: "registered", userId: "user-a", sessionExpiry });
        expect(
            getRealtimeStreamAccess({
                isKnown: true,
                isRegistered: true,
                isLoggedIn: false,
                userId: "user-a",
                credentials,
                sessionExpiry: new Date("2020-01-01T00:00:00.000Z"),
            }),
        ).toEqual({ kind: "retired_registered" });
    });

    it("keeps unknown devices anonymous", () => {
        expect(
            getRealtimeStreamAccess({
                isKnown: false,
                isRegistered: false,
                isLoggedIn: false,
                credentials,
            }),
        ).toEqual({ kind: "anonymous" });
    });
});
