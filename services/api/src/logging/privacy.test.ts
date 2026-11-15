import Fastify from "fastify";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiLogPrivacy, logApiError } from "./privacy.js";
import { logSeedSuggestionEvent } from "../service/seedSuggestion.js";
import { enqueueConversationForMathWork } from "../shared-backend/analysisScheduler.js";
import type { Valkey } from "../shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "../shared-backend/valkeyQueues.js";

function captureServer() {
    const lines: string[] = [];
    const privacy = createApiLogPrivacy(new URL("../", import.meta.url));
    const server = Fastify({
        logger: {
            level: "info",
            ...privacy.options,
            stream: {
                write(line) {
                    lines.push(line);
                },
            },
        },
        trustProxy: ["loopback", "uniquelocal"],
    });
    privacy.registerRoutes(server);
    return {
        server,
        lines,
        records: () =>
            lines.map((line) => {
                const parsed: unknown = JSON.parse(line);
                return z.record(z.string(), z.unknown()).parse(parsed);
            }),
    };
}

describe("API logging privacy", () => {
    it("preserves the registered explicit replica-routing message", async () => {
        const capture = captureServer();
        try {
            capture.server.log.info(
                "Connected to read replica - explicit reads use replica, writes use primary",
            );
            expect(capture.records()).toHaveLength(1);
            expect(capture.records()[0]?.msg).toBe(
                "Connected to read replica - explicit reads use replica, writes use primary",
            );
        } finally {
            await capture.server.close();
        }
    });
    it("drops obsolete provider events without exposing proof details", async () => {
        const capture = captureServer();
        try {
            capture.server.log.info(
                {
                    event: "event_ticket_verified",
                    userId: "00000000-0000-4000-8000-000000000001",
                    nullifier: "private-nullifier",
                    proof: "private-proof",
                },
                "[Zupass] Event ticket verified",
            );
            expect(capture.records()[0]).not.toHaveProperty("event");
            expect(capture.records()[0]?.msg).not.toContain("Zupass");
            expect(capture.lines.join("")).not.toContain("private-");
        } finally {
            await capture.server.close();
        }
    });

    it("labels unexpected failures without exposing provider messages", async () => {
        const capture = captureServer();
        try {
            logApiError({
                logger: capture.server.log,
                level: "error",
                event: { event: "application_error" },
                error: new Error("private-proof-provider-error"),
            });
            expect(capture.records()[0]).toMatchObject({
                level: 50,
                event: "application_error",
            });
            expect(capture.lines.join("")).not.toContain("private-");
        } finally {
            await capture.server.close();
        }
    });
    it("emits an actionable survey queue failure without provider details", async () => {
        const capture = captureServer();
        try {
            logApiError({
                logger: capture.server.log,
                level: "error",
                event: {
                    event: "survey_scoring_queue_failed",
                    conversationId: 42,
                    conversationSlugId: "abcd1234",
                },
                error: new Error("private-provider-response"),
            });
            expect(capture.records()).toHaveLength(1);
            expect(capture.records()[0]).toMatchObject({
                level: 50,
                event: "survey_scoring_queue_failed",
                conversationId: 42,
                conversationSlugId: "abcd1234",
                msg: "[Survey] Failed to queue ranking recomputation",
            });
            expect(capture.lines.join("")).not.toContain(
                "private-provider-response",
            );
        } finally {
            await capture.server.close();
        }
    });
    it.each([false, true])(
        "retains actual math queue completion diagnostics (failure=%s)",
        async (fails) => {
            const capture = captureServer();
            const queueCalls: Parameters<Valkey["zadd"]>[] = [];
            const valkey = {
                zadd(...args: Parameters<Valkey["zadd"]>) {
                    queueCalls.push(args);
                    if (fails)
                        return Promise.reject(
                            new Error("private-valkey-provider-response"),
                        );
                    return Promise.resolve(0);
                },
            } satisfies Pick<Valkey, "zadd">;
            try {
                enqueueConversationForMathWork({
                    valkey,
                    log: capture.server.log,
                    schedule: {
                        conversationId: 459,
                        conversationSlugId: "abcd1234",
                    },
                });
                await vi.waitFor(() => {
                    expect(capture.records()).toHaveLength(2);
                });
                expect(queueCalls).toHaveLength(1);
                expect(queueCalls.at(0)?.[0]).toBe(
                    VALKEY_QUEUE_KEYS.ANALYSIS_DIRTY,
                );
                z.object({ "459": z.number().nonnegative() })
                    .strict()
                    .parse(queueCalls.at(0)?.[1]);
                expect(capture.records().at(0)).toMatchObject({
                    event: "math_queue",
                    conversationId: 459,
                    conversationSlugId: "abcd1234",
                    msg: "[AnalysisScheduler] Queueing conversation for math work",
                });
                expect(capture.records().at(1)).toMatchObject(
                    fails
                        ? {
                              level: 50,
                              event: "math_queue",
                              conversationId: 459,
                              msg: "[AnalysisScheduler] Failed to queue conversation for math work",
                              err: { type: "Error" },
                          }
                        : {
                              event: "math_queue",
                              conversationId: 459,
                              count: 0,
                              msg: "[AnalysisScheduler] Queued conversation for math work",
                          },
                );
                expect(capture.lines.join("")).not.toContain("private-");
            } finally {
                await capture.server.close();
            }
        },
    );

    it("rejects invalid new diagnostic fields from child loggers", async () => {
        const capture = captureServer();
        try {
            const child = capture.server.log.child({
                event: "vote_buffer",
                voteBufferOperation: "private-operation",
                dataGeneration: "private-generation",
                specCount: -1,
                transactionIndex: Number.POSITIVE_INFINITY,
                voteCount: 8,
            });
            child.info("[VoteBuffer] Flushing votes");
            expect(capture.records().at(0)).toMatchObject({
                event: "vote_buffer",
                voteCount: 8,
                msg: "[VoteBuffer] Flushing votes",
            });
            for (const key of [
                "voteBufferOperation",
                "dataGeneration",
                "specCount",
                "transactionIndex",
            ])
                expect(capture.records().at(0)).not.toHaveProperty(key);
            expect(capture.lines.join("")).not.toContain("private-");
        } finally {
            await capture.server.close();
        }
    });

    it("retains vote flush and math scheduling diagnostics at the emitted boundary", async () => {
        const capture = captureServer();
        try {
            capture.server.log.info(
                {
                    event: "vote_buffer",
                    voteCount: 8,
                    transactionIndex: 1,
                    transactionCount: 2,
                    durationMs: 42,
                    vote: "private-vote-choice",
                    body: "private-statement-text",
                },
                "[VoteBuffer] Transaction completed",
            );
            capture.server.log.info(
                {
                    event: "analysis_schedule",
                    conversationId: 459,
                    dataGeneration: 12,
                    specCount: 1,
                },
                "[AnalysisScheduler] Scheduling analysis complete",
            );
            enqueueConversationForMathWork({
                valkey: undefined,
                log: capture.server.log,
                schedule: {
                    conversationId: 459,
                    conversationSlugId: "abcd1234",
                },
            });
            logApiError({
                logger: capture.server.log,
                level: "error",
                event: { event: "vote_buffer", voteBufferOperation: "flush" },
                error: new Error("private-provider-message"),
            });
            expect(capture.records()).toEqual([
                expect.objectContaining({
                    msg: "[VoteBuffer] Transaction completed",
                    event: "vote_buffer",
                    voteCount: 8,
                    transactionIndex: 1,
                    transactionCount: 2,
                    durationMs: 42,
                }),
                expect.objectContaining({
                    msg: "[AnalysisScheduler] Scheduling analysis complete",
                    conversationId: 459,
                    dataGeneration: 12,
                    specCount: 1,
                }),
                expect.objectContaining({
                    msg: "[AnalysisScheduler] Skipped math queueing because Valkey is unavailable",
                    event: "math_queue",
                    conversationId: 459,
                    valkeyAvailable: false,
                }),
                expect.objectContaining({
                    msg: "Vote buffer operation failed",
                    event: "vote_buffer",
                    voteBufferOperation: "flush",
                }),
            ]);
            expect(capture.records().at(3)).toMatchObject({
                err: { type: "Error" },
            });
            expect(capture.lines.join("")).not.toContain("private-");
        } finally {
            await capture.server.close();
        }
    });
    it("emits actionable startup failures with redacted Node stack traces", async () => {
        const capture = captureServer();
        const error = Object.assign(
            new Error(
                "listen EADDRINUSE: address already in use 192.0.2.1:8084",
            ),
            { code: "EADDRINUSE" },
        );
        error.stack = `${error.message}\n    at Server.setupListenHandle (node:net:1940:16)\n    at listenInCluster (node:net:1997:12)`;
        try {
            logApiError({
                logger: capture.server.log,
                level: "error",
                event: { event: "server_start_failed" },
                error,
            });
            expect(capture.records().at(0)).toMatchObject({
                event: "server_start_failed",
                msg: "API server failed to start",
                err: {
                    code: "EADDRINUSE",
                    message: "Address is already in use",
                    stack: "Error [EADDRINUSE]: Address is already in use\n    at node:net:1940:16\n    at node:net:1997:12",
                },
            });
            expect(capture.lines.join("")).not.toContain("192.0.2.1");
        } finally {
            await capture.server.close();
        }
    });
    it("preserves bounded vote-flush stage diagnostics without raw payloads", async () => {
        const capture = captureServer();
        const voteBufferFlushId = crypto.randomUUID();
        try {
            for (const message of [
                "[VoteBuffer] Stage started",
                "[VoteBuffer] Stage completed",
                "[VoteBuffer] Stage is still pending",
            ]) {
                capture.server.log.warn(
                    {
                        event: "vote_buffer",
                        voteBufferFlushId,
                        voteBufferStage: "recheck_votes",
                        durationMs: 30000,
                        payload: "private-vote-choice",
                    },
                    message,
                );
            }
            logApiError({
                logger: capture.server.log,
                level: "error",
                event: {
                    event: "vote_buffer",
                    voteBufferOperation: "flush",
                    voteBufferFlushId,
                    voteBufferStage: "recheck_votes",
                    durationMs: 10000,
                },
                error: new Error("private-provider-error"),
            });
            expect(capture.records()).toHaveLength(4);
            for (const record of capture.records()) {
                expect(record).toMatchObject({
                    event: "vote_buffer",
                    voteBufferFlushId,
                    voteBufferStage: "recheck_votes",
                });
            }
            expect(capture.lines.join("")).not.toContain("private-vote-choice");
            expect(capture.lines.join("")).not.toContain(
                "private-provider-error",
            );
        } finally {
            await capture.server.close();
        }
    });
    it("keeps approved Bedrock diagnostics while omitting provider text and metadata", async () => {
        const capture = captureServer();
        const error = new Error("private-provider-message private-credential");
        error.name = "AccessDeniedException";
        Object.assign(error, {
            $metadata: {
                httpStatusCode: 403,
                requestId: "private-provider-request-id",
            },
        });
        try {
            logApiError({
                logger: capture.server.log,
                level: "warn",
                event: { event: "application_error" },
                error,
            });
            expect(capture.records().at(0)).toMatchObject({
                err: {
                    type: "AccessDeniedException",
                    statusCode: 403,
                    message: "Error details omitted",
                },
            });
            for (const secret of [
                "private-provider-message",
                "private-credential",
                "private-provider-request-id",
            ])
                expect(capture.lines.join("")).not.toContain(secret);
        } finally {
            await capture.server.close();
        }
    });
    it("retains seed-suggestion analytics without provider messages or draft text", async () => {
        const capture = captureServer();
        const userId = crypto.randomUUID();
        const draftId = crypto.randomUUID();
        try {
            logSeedSuggestionEvent({
                logger: capture.server.log,
                event: {
                    event: "failed",
                    userId,
                    draftId,
                    conversationType: "polis",
                    source: "bedrock",
                    durationMs: 15,
                    reason: "model_failure",
                },
            });
            capture.server.log.info(
                {
                    event: "seed_suggestion",
                    seedSuggestion: {
                        event: "added",
                        userId,
                        draftId,
                        generationId: crypto.randomUUID(),
                        suggestionId: crypto.randomUUID(),
                        detail: "private-provider-error",
                        title: "private-draft-title",
                        model: "private-model-text",
                    },
                },
                "AGORA_AI_SUGGESTION_EVENT",
            );
            expect(capture.records().at(0)).toMatchObject({
                msg: "AGORA_AI_SUGGESTION_EVENT",
                event: "seed_suggestion_failed",
                seedSuggestion: { draftId, reason: "model_failure" },
            });
            expect(capture.records().at(1)).toMatchObject({
                event: "seed_suggestion",
                seedSuggestion: { event: "added", userId },
            });
            for (const secret of [
                "private-provider-error",
                "private-draft-title",
                "private-model-text",
            ])
                expect(capture.lines.join("")).not.toContain(secret);
        } finally {
            await capture.server.close();
        }
    });
    it("logs route templates and status without URL capabilities, headers, body or IP", async () => {
        const capture = captureServer();
        const secrets = [
            "private-action-token",
            "private-query-token",
            "private-cookie",
            "person@example.invalid",
            "203.0.113.7",
        ];
        capture.server.post("/action/:token", () =>
            Promise.resolve({ ok: true }),
        );
        try {
            const result = await capture.server.inject({
                method: "POST",
                url: "/action/private-action-token?code=private-query-token",
                remoteAddress: "127.0.0.1",
                headers: {
                    "x-forwarded-for": "203.0.113.7",
                    cookie: "session=private-cookie",
                },
                payload: { email: "person@example.invalid" },
            });
            expect(result.statusCode).toBe(200);
            for (const secret of secrets)
                expect(capture.lines.join("")).not.toContain(secret);
            expect(capture.records()).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: "incoming request",
                        req: { method: "POST", route: "/action/:token" },
                    }),
                    expect.objectContaining({
                        msg: "request completed",
                        res: { statusCode: 200 },
                    }),
                ]),
            );
        } finally {
            await capture.server.close();
        }
    });

    it("does not fall back to raw URLs on unmatched requests or forged request objects", async () => {
        const capture = captureServer();
        try {
            await capture.server.inject({
                method: "GET",
                url: "/private-action-token?secret=private-query-token",
            });
            capture.server.log.info({
                req: {
                    method: "GET",
                    routeOptions: { url: "/private-query-token" },
                },
            });
            expect(capture.lines.join("")).not.toContain(
                "private-action-token",
            );
            expect(capture.lines.join("")).not.toContain("private-query-token");
            expect(capture.records().at(0)).toMatchObject({
                req: { route: "[unmatched]" },
            });
        } finally {
            await capture.server.close();
        }
    });

    it("sanitizes Fastify automatic errors and typed application events", async () => {
        const capture = captureServer();
        capture.server.post("/failure", () => {
            throw new Error("Private statement person@example.invalid");
        });
        try {
            await capture.server.inject({ method: "POST", url: "/failure" });
            const providerError = new AxiosError(
                "private-provider-body",
                "ERR_BAD_RESPONSE",
                {
                    data: JSON.stringify({ email: "person@example.invalid" }),
                    headers: new AxiosHeaders({
                        authorization: "Bearer private-provider-body",
                    }),
                },
            );
            logApiError({
                logger: capture.server.log,
                level: "warn",
                event: {
                    event: "email_deliverability_check_failed",
                    provider: "reacher",
                },
                error: providerError,
            });
            expect(capture.lines.join("")).not.toContain(
                "person@example.invalid",
            );
            expect(capture.lines.join("")).not.toContain("Private statement");
            expect(capture.lines.join("")).not.toContain(
                "private-provider-body",
            );
            expect(capture.records()).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        event: "email_deliverability_check_failed",
                        provider: "reacher",
                        msg: "Email deliverability check failed",
                    }),
                ]),
            );
        } finally {
            await capture.server.close();
        }
    });

    it("preserves schema-projected load-test events and removes extra metadata", async () => {
        const capture = captureServer();
        try {
            capture.server.log.info(
                "AGORA_LOAD_EVENT %s",
                JSON.stringify({
                    schemaVersion: 1,
                    timestamp: "2026-10-09T00:00:00.000Z",
                    scenario: "solidago-ranking",
                    phase: "api",
                    action: "request_completed",
                    outcome: "success",
                    conversationSlugId: "convo001",
                    responseTimeMs: 42,
                    metadata: {
                        requestId: "req-1",
                        operation: "save",
                        transaction: 20,
                        email: "person@example.invalid",
                        token: "private-token",
                    },
                }),
            );
            expect(capture.lines.join("")).toContain("AGORA_LOAD_EVENT");
            expect(capture.lines.join("")).toContain("request_completed");
            expect(capture.lines.join("")).not.toContain(
                "person@example.invalid",
            );
            expect(capture.lines.join("")).not.toContain("private-token");
            capture.server.log.info(
                "AGORA_LOAD_EVENT %s",
                "{broken private-token",
            );
            expect(capture.records().at(1)).toMatchObject({
                msg: "Application event",
            });
        } finally {
            await capture.server.close();
        }
    });
});
