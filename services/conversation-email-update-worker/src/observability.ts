import type { BaseLogger } from "pino";
import { z } from "zod";

export const OBSERVABILITY_SERVICE = "conversation-email-update-worker";

const safeErrorNameSchema = z.enum([
    "AbortError",
    "ApplicationError",
    "DatabaseError",
    "ProviderError",
    "RangeError",
    "SyntaxError",
    "TimeoutError",
    "TypeError",
    "ValidationError",
]);

const safeErrorCodeSchema = z.enum([
    "AbortError",
    "AccountSuspendedException",
    "BadRequestException",
    "ECONNREFUSED",
    "ECONNRESET",
    "EPIPE",
    "ETIMEDOUT",
    "InvalidSubject",
    "LeaseExpired",
    "LimitExceededException",
    "MailFromDomainNotVerifiedException",
    "MessageRejected",
    "MissingMessageId",
    "NotFoundException",
    "ProviderError",
    "PostgresSqlState",
    "SendingPausedException",
    "ThrottlingException",
    "TimeoutError",
    "TooManyRequestsException",
    "UnknownError",
    "UnknownProviderError",
    "ValidationError",
]);

const errorCategorySchema = z.enum([
    "ambiguous",
    "application",
    "database",
    "permanent",
    "retryable",
    "validation",
]);

export const safeErrorSchema = z.object({
    name: safeErrorNameSchema,
    code: safeErrorCodeSchema,
    category: errorCategorySchema,
});

export type SafeError = z.infer<typeof safeErrorSchema>;

const errorCodeSourceSchema = z.object({ code: z.string() }).loose();

function safeErrorCode(error: unknown): z.infer<typeof safeErrorCodeSchema> {
    const parsed = errorCodeSourceSchema.safeParse(error);
    if (!parsed.success) return "UnknownError";
    const code = safeErrorCodeSchema.safeParse(parsed.data.code);
    return code.success ? code.data : "UnknownError";
}

function isPostgresSqlState(error: unknown): boolean {
    const parsed = errorCodeSourceSchema.safeParse(error);
    return parsed.success && /^[0-9A-Z]{5}$/.test(parsed.data.code);
}

export function normalizeError(error: unknown): SafeError {
    const code = safeErrorCode(error);
    if (error instanceof TypeError) {
        return { name: "TypeError", code, category: "application" };
    }
    if (error instanceof RangeError) {
        return { name: "RangeError", code, category: "application" };
    }
    if (error instanceof SyntaxError) {
        return { name: "SyntaxError", code, category: "validation" };
    }
    if (error instanceof Error) {
        if (error.name === "AbortError") {
            return {
                name: "AbortError",
                code: "AbortError",
                category: "ambiguous",
            };
        }
        if (error.name === "TimeoutError") {
            return {
                name: "TimeoutError",
                code: "TimeoutError",
                category: "ambiguous",
            };
        }
        if (error.name === "ZodError") {
            return {
                name: "ValidationError",
                code: "ValidationError",
                category: "validation",
            };
        }
        if (isPostgresSqlState(error)) {
            return {
                name: "DatabaseError",
                code: "PostgresSqlState",
                category: "database",
            };
        }
        if (
            code === "ECONNREFUSED" ||
            code === "ECONNRESET" ||
            code === "EPIPE"
        ) {
            return { name: "DatabaseError", code, category: "retryable" };
        }
        if (code === "ETIMEDOUT") {
            return { name: "DatabaseError", code, category: "ambiguous" };
        }
    }
    return { name: "ApplicationError", code, category: "application" };
}

export function normalizeProviderError({
    code,
    outcome,
}: {
    code: string;
    outcome: "retryable_rejected" | "permanent_rejected" | "unknown";
}): SafeError {
    const parsedCode = safeErrorCodeSchema.safeParse(code);
    return {
        name: "ProviderError",
        code: parsedCode.success ? parsedCode.data : "ProviderError",
        category:
            outcome === "retryable_rejected"
                ? "retryable"
                : outcome === "permanent_rejected"
                  ? "permanent"
                  : "ambiguous",
    };
}

const eventCountsSchema = z
    .object({
        deliveriesStopped: z.number().int().nonnegative().optional(),
        frequencyCapped: z.number().int().nonnegative().optional(),
        ineligible: z.number().int().nonnegative().optional(),
        inserted: z.number().int().nonnegative().optional(),
        materializationFailed: z.number().int().nonnegative().optional(),
        materializationStopped: z.number().int().nonnegative().optional(),
        materializedParticipants: z.number().int().nonnegative().optional(),
        pageCandidates: z.number().int().nonnegative().optional(),
        recipientClaimLeasesRecovered: z
            .number()
            .int()
            .nonnegative()
            .optional(),
        recipientProviderAccepted: z.number().int().nonnegative().optional(),
        recipientSendLeasesRecovered: z.number().int().nonnegative().optional(),
        recipientsClaimed: z.number().int().nonnegative().optional(),
        snsApplied: z.number().int().nonnegative().optional(),
        snsClaimed: z.number().int().nonnegative().optional(),
        snsDeadLetter: z.number().int().nonnegative().optional(),
        snsLeaseLost: z.number().int().nonnegative().optional(),
        snsProcessingErrors: z.number().int().nonnegative().optional(),
        snsRetryWait: z.number().int().nonnegative().optional(),
        testClaimLeasesRecovered: z.number().int().nonnegative().optional(),
        testProviderAccepted: z.number().int().nonnegative().optional(),
        testSendLeasesRecovered: z.number().int().nonnegative().optional(),
        testAttemptsClaimed: z.number().int().nonnegative().optional(),
    })
    .strict();

const dependencySchema = z.enum(["aws_secrets_manager", "postgresql"]);
const dependencyOperationSchema = z.enum([
    "close_connection",
    "configure",
    "connect",
    "load_credentials",
    "parse_credentials",
    "route_reads",
]);
const providerSchema = z.enum(["ses", "simulated"]);
const recipientKindSchema = z.enum(["owner", "participant"]);
const durationSchema = z.number().int().nonnegative();
const finalizationAttemptSchema = z.number().int().min(1).max(5);
const heartbeatIntervalSchema = z.number().int().min(60_000).max(3_600_000);
const modeSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);
const roleSchema = z.enum(["primary", "read_replica"]);
const snsInboxIdSchema = z.string().regex(/^\d+$/);
const materializationReasonSchema = z.enum([
    "incomplete_owner_copy_scope",
    "legal_or_abuse_block",
    "materialization_retry_exhausted",
    "no_eligible_participants",
]);

export const structuredEventSchema = z.discriminatedUnion("event", [
    z
        .object({
            event: z.literal("dependency_failed"),
            outcome: z.literal("failure"),
            dependency: dependencySchema,
            operation: dependencyOperationSchema,
            retrying: z.boolean(),
            role: roleSchema.optional(),
            error: safeErrorSchema.optional(),
        })
        .strict(),
    z
        .object({
            event: z.literal("dependency_status"),
            outcome: z.literal("success"),
            dependency: dependencySchema,
            operation: dependencyOperationSchema,
            retrying: z.boolean(),
            role: roleSchema.optional(),
        })
        .strict(),
    z
        .object({
            event: z.literal("iteration_failed"),
            outcome: z.literal("failure"),
            durationMs: durationSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("kill_switch_applied"),
            outcome: z.literal("applied"),
            counts: eventCountsSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("lease_recovery"),
            outcome: z.literal("success"),
            counts: eventCountsSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("materialization_page"),
            outcome: z.literal("success"),
            deliveryId: z.number().int().positive(),
            exhausted: z.boolean(),
            counts: eventCountsSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("materialization_failed"),
            outcome: z.literal("failure"),
            deliveryId: z.number().int().positive(),
            materializationReason: materializationReasonSchema.exclude([
                "legal_or_abuse_block",
            ]),
            counts: eventCountsSchema.optional(),
        })
        .strict(),
    z
        .object({
            event: z.literal("materialization_stopped"),
            outcome: z.literal("stopped"),
            deliveryId: z.number().int().positive(),
            materializationReason: z.literal("legal_or_abuse_block"),
        })
        .strict(),
    z
        .object({
            event: z.literal("recipient_finalization_failed"),
            outcome: z.enum(["failure", "retry"]),
            attemptId: z.uuid(),
            recipientKind: recipientKindSchema,
            finalizationAttempt: finalizationAttemptSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("recipient_provider_outcome"),
            outcome: z.enum([
                "permanent_rejected",
                "retryable_rejected",
                "unknown",
            ]),
            attemptId: z.uuid(),
            recipientKind: recipientKindSchema,
            provider: providerSchema,
            durationMs: durationSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("signal_received"),
            outcome: z.literal("received"),
            signal: z.enum(["SIGINT", "SIGTERM"]),
        })
        .strict(),
    z
        .object({
            event: z.literal("simulator_started"),
            outcome: z.literal("started"),
            provider: z.literal("simulated"),
            mode: modeSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("sns_batch"),
            outcome: z.enum(["failure", "lease_lost", "retry", "success"]),
            counts: eventCountsSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("sns_item_failed"),
            outcome: z.literal("failure"),
            snsInboxId: snsInboxIdSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("test_finalization_failed"),
            outcome: z.enum(["failure", "retry"]),
            testAttemptId: z.uuid(),
            finalizationAttempt: finalizationAttemptSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("test_provider_outcome"),
            outcome: z.enum([
                "permanent_rejected",
                "retryable_rejected",
                "unknown",
            ]),
            testAttemptId: z.uuid(),
            provider: providerSchema,
            durationMs: durationSchema,
            error: safeErrorSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("tick_summary"),
            outcome: z.enum(["failure", "success"]),
            durationMs: durationSchema,
            counts: eventCountsSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("unclassified_log"),
            outcome: z.enum(["failure", "info", "warning"]),
            severity: z.enum(["error", "info", "warning"]),
            error: safeErrorSchema.optional(),
        })
        .strict(),
    z
        .object({
            event: z.literal("worker_heartbeat"),
            outcome: z.literal("idle"),
            durationMs: durationSchema,
            heartbeatIntervalMs: heartbeatIntervalSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("worker_started"),
            outcome: z.enum(["disabled", "started"]),
            sendingEnabled: z.boolean(),
            killSwitch: z.boolean(),
            provider: providerSchema,
            heartbeatIntervalMs: heartbeatIntervalSchema,
        })
        .strict(),
    z
        .object({
            event: z.literal("worker_stopped"),
            outcome: z.literal("stopped"),
        })
        .strict(),
]);

export type StructuredEvent = z.infer<typeof structuredEventSchema>;

export function writeStructuredLog({
    log,
    level,
    event,
}: {
    log: Pick<BaseLogger, "error" | "info" | "warn">;
    level: "error" | "info" | "warn";
    event: StructuredEvent;
}): void {
    log[level](event);
}
