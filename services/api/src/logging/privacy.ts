import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { z } from "zod";
import {
    createLogPrivacy,
    logContextSchema,
    type LogContext,
} from "../shared-backend/logPrivacy.js";
import { logMessageTemplates, errorMessageTemplates } from "./messages.js";
import type { SeedSuggestionEvent } from "../service/seedSuggestion.js";

const count = z.number().nonnegative().optional();
const loadEventSchema = z.object({
    schemaVersion: z.literal(1),
    timestamp: z.iso.datetime(),
    scenario: z.literal("solidago-ranking"),
    phase: z.literal("api"),
    action: z.enum([
        "logging_configured",
        "resource_sample",
        "request_completed",
    ]),
    outcome: z.enum(["info", "success", "failure", "blocked"]),
    conversationSlugId: logContextSchema.shape.conversationSlugId,
    responseTimeMs: count,
    metadata: z.object({
        requestId: logContextSchema.shape.requestId,
        operation: z.enum(["save", "load"]).optional(),
        logLevel: z
            .enum([
                "fatal",
                "error",
                "warn",
                "info",
                "debug",
                "trace",
                "silent",
            ])
            .optional(),
        sqlQueries: z.boolean().optional(),
        performanceEnabled: z.boolean().optional(),
        pid: count,
        historyLength: count,
        authentication: count,
        participation: count,
        transaction: count,
        uncertainty: count,
        routing: count,
        load: count,
        elapsedMs: count,
        cpuPercent: count,
        rssBytes: count,
        heapUsedBytes: count,
        eventLoopP99Ms: count,
        eventLoopMaxMs: count,
    }),
});

const requestMetadataSource = z.object({
    method: z.enum([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "HEAD",
        "OPTIONS",
        "CONNECT",
        "TRACE",
        "UNKNOWN",
    ]),
    routeOptions: z.object({ url: z.string().optional() }).optional(),
    route: z.string().optional(),
});

export function createApiLogPrivacy(sourceRoot: URL) {
    const routeTemplates = new Set<string>();
    const privacy = createLogPrivacy({
        sourceRoot,
        messageTemplates: logMessageTemplates,
        errorMessageTemplates,
        loadEventSchema,
        serializeRequest(value) {
            try {
                const parsed = requestMetadataSource.safeParse(value);
                if (!parsed.success)
                    return { method: "UNKNOWN", route: "[unmatched]" };
                const route =
                    parsed.data.routeOptions?.url ?? parsed.data.route;
                return {
                    method: parsed.data.method,
                    route:
                        route !== undefined && routeTemplates.has(route)
                            ? route
                            : "[unmatched]",
                };
            } catch {
                return { method: "UNKNOWN", route: "[unmatched]" };
            }
        },
    });
    const registerRoutes = (server: FastifyInstance): void => {
        server.addHook("onRoute", (route) => {
            routeTemplates.add(route.url);
        });
    };
    return { options: privacy.options, registerRoutes };
}

type ApiErrorEvent =
    | {
          event: "survey_scoring_queue_failed";
          conversationId: number;
          conversationSlugId: string;
      }
    | { event: "email_deliverability_check_failed"; provider: "reacher" }
    | { event: "application_error" }
    | ({
          event: "vote_buffer";
          voteBufferOperation: NonNullable<LogContext["voteBufferOperation"]>;
      } & Pick<
          LogContext,
          "voteBufferFlushId" | "voteBufferStage" | "durationMs"
      >)
    | { event: "server_start_failed" }
    | {
          event: "seed_suggestion_failed";
          seedSuggestion: Extract<SeedSuggestionEvent, { event: "failed" }>;
      };

const apiErrorMessages = {
    survey_scoring_queue_failed:
        "[Survey] Failed to queue ranking recomputation",
    email_deliverability_check_failed: "Email deliverability check failed",
    application_error: "Application event",
    vote_buffer: "Vote buffer operation failed",
    server_start_failed: "API server failed to start",
    seed_suggestion_failed: "AGORA_AI_SUGGESTION_EVENT",
} satisfies Record<ApiErrorEvent["event"], string>;

export function logApiError({
    logger,
    event,
    error,
    level,
}: {
    logger: Pick<FastifyBaseLogger, "error" | "warn">;
    event: ApiErrorEvent;
    error: unknown;
    level: "error" | "warn";
}): void {
    logger[level](
        { ...event, err: error } satisfies LogContext & { err: unknown },
        apiErrorMessages[event.event],
    );
}
