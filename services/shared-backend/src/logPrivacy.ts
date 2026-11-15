import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import type { LoggerOptions } from "pino";
import { z } from "zod";

export interface LogMessageTemplate {
    readonly parts: readonly [string, ...string[]];
}

export interface LogRequestMetadata {
    method: string;
    route: string;
}

const errorCodeSchema = z.enum([
    "EADDRINUSE",
    "EADDRNOTAVAIL",
    "EACCES",
    "EPERM",
    "ENOENT",
    "EMFILE",
    "ENOSPC",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EPIPE",
    "ETIMEDOUT",
    "ECONNABORTED",
    "ERR_NETWORK",
    "ERR_BAD_RESPONSE",
    "ERR_BAD_REQUEST",
    "ERR_CANCELED",
    "ERR_INVALID_URL",
    "CONNECT_TIMEOUT",
    "CONNECTION_CLOSED",
    "CONNECTION_DESTROYED",
    "CONNECTION_ENDED",
    "23505",
    "23503",
    "23502",
    "23514",
    "40001",
    "40P01",
    "53300",
    "57P01",
    "ThrottlingException",
    "TooManyRequestsException",
    "MessageRejected",
]);
const errorCodeMessages: Record<z.infer<typeof errorCodeSchema>, string> = {
    EADDRINUSE: "Address is already in use",
    EADDRNOTAVAIL: "Requested address is not available",
    EACCES: "Permission denied",
    EPERM: "Operation not permitted",
    ENOENT: "File or directory does not exist",
    EMFILE: "Too many open files",
    ENOSPC: "No space left on device",
    ECONNREFUSED: "Connection refused",
    ECONNRESET: "Connection reset by peer",
    ENOTFOUND: "Host could not be resolved",
    EAI_AGAIN: "Temporary name resolution failure",
    EPIPE: "Broken pipe",
    ETIMEDOUT: "Operation timed out",
    ECONNABORTED: "Connection aborted",
    ERR_NETWORK: "Network request failed",
    ERR_BAD_RESPONSE: "Provider returned an unsuccessful response",
    ERR_BAD_REQUEST: "Provider rejected the request",
    ERR_CANCELED: "Request cancelled",
    ERR_INVALID_URL: "Invalid URL",
    CONNECT_TIMEOUT: "Connection timed out",
    CONNECTION_CLOSED: "Connection closed",
    CONNECTION_DESTROYED: "Connection destroyed",
    CONNECTION_ENDED: "Connection ended",
    "23505": "Unique constraint violated",
    "23503": "Foreign key constraint violated",
    "23502": "Not-null constraint violated",
    "23514": "Check constraint violated",
    "40001": "Transaction serialization failure",
    "40P01": "Database deadlock detected",
    "53300": "Too many database connections",
    "57P01": "Database shutting down",
    ThrottlingException: "Provider throttled the request",
    TooManyRequestsException: "Provider request limit exceeded",
    MessageRejected: "Email provider rejected the message",
};
const errorTypeSchema = z.enum([
    "Error",
    "TypeError",
    "RangeError",
    "SyntaxError",
    "ReferenceError",
    "URIError",
    "EvalError",
    "AggregateError",
    "AxiosError",
    "AbortError",
    "TimeoutError",
    "ZodError",
    "DrizzleQueryError",
    "AccessDeniedException",
    "ValidationException",
    "ResourceNotFoundException",
    "ThrottlingException",
    "ModelNotReadyException",
    "ModelTimeoutException",
    "ModelErrorException",
    "InternalServerException",
    "ServiceUnavailableException",
    "CredentialsProviderError",
    "PostgresError",
]);
const frameSchema = z.object({
    file: z
        .string()
        .max(200)
        .regex(
            /^(?:node:[A-Za-z0-9_/-]+|(?:[A-Za-z0-9_@.-]+\/)*[A-Za-z0-9_.-]+\.(?:[cm]?[jt]s|vue))$/,
        ),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
});
const errorSummarySchema = z.object({
    type: errorTypeSchema,
    message: z.string().max(1024),
    code: errorCodeSchema.optional(),
    statusCode: z.number().int().min(100).max(599).optional(),
    frames: z.array(frameSchema).max(12),
});
const logErrorSchema = errorSummarySchema.extend({
    causes: z.array(errorSummarySchema).max(4),
});
export type LogError = z.infer<typeof logErrorSchema> & { stack: string };

const nativeErrorKinds: readonly {
    type: LogError["type"];
    matches: (value: unknown) => boolean;
}[] = [
    { type: "TypeError", matches: (value) => value instanceof TypeError },
    { type: "SyntaxError", matches: (value) => value instanceof SyntaxError },
    { type: "RangeError", matches: (value) => value instanceof RangeError },
    {
        type: "ReferenceError",
        matches: (value) => value instanceof ReferenceError,
    },
    { type: "URIError", matches: (value) => value instanceof URIError },
    { type: "EvalError", matches: (value) => value instanceof EvalError },
    {
        type: "AggregateError",
        matches: (value) => value instanceof AggregateError,
    },
];

const counter = z.number().nonnegative();
const requestId = z.union([z.uuid(), z.string().regex(/^req-[a-z0-9]{1,32}$/)]);
const uuid = z.uuid();
const slug = z.string().regex(/^[A-Za-z0-9_-]{8}$/);

// Every admitted string has a defined domain. Unknown fields and arbitrary text
// are omitted instead of guessing whether their contents contain personal data.
export const logContextSchema = z.object({
    reqId: requestId.optional(),
    requestId: requestId.optional(),
    userId: uuid.optional(),
    guestUserId: uuid.optional(),
    verifiedUserId: uuid.optional(),
    conversationId: counter.optional(),
    conversationSlugId: slug.optional(),
    opinionId: counter.optional(),
    opinionSlugId: slug.optional(),
    exportSlugId: slug.optional(),
    importSlugId: slug.optional(),
    projectId: counter.optional(),
    organizationId: counter.optional(),
    count: counter.optional(),
    participantCount: counter.optional(),
    opinionCount: counter.optional(),
    voteCount: counter.optional(),
    dataGeneration: counter.optional(),
    specCount: counter.optional(),
    queueStrategy: z
        .enum(["caller_will_enqueue", "db_reconciliation_only"])
        .optional(),
    transactionIndex: counter.optional(),
    transactionCount: counter.optional(),
    newVoteCount: counter.optional(),
    updatedVoteCount: counter.optional(),
    valkeyAvailable: z.boolean().optional(),
    voteBufferOperation: z
        .enum(["enqueue", "fetch", "flush", "notify", "cleanup"])
        .optional(),
    voteBufferFlushId: uuid.optional(),
    voteBufferStage: z
        .enum([
            "fetch_votes",
            "begin_transaction",
            "lock_conversations",
            "recheck_votes",
            "read_existing_votes",
            "persist_votes",
            "commit_transaction",
            "rollback_transaction",
            "notify",
            "cleanup",
        ])
        .optional(),
    parameterCount: counter.optional(),
    durationMs: counter.optional(),
    responseTime: counter.optional(),
    attemptCount: counter.optional(),
    retryDelayMs: counter.optional(),
    statusCode: z.number().int().min(100).max(599).optional(),
    retrying: z.boolean().optional(),
    errorCode: errorCodeSchema.optional(),
    errorType: errorTypeSchema.optional(),
    role: z.enum(["primary", "read_replica"]).optional(),
    provider: z.enum(["reacher", "twilio", "ses", "simulated"]).optional(),
    environment: z
        .enum(["development", "production", "staging", "test"])
        .optional(),
    service: z.enum(["api", "conversation-email-update-worker"]).optional(),
    event: z
        .enum([
            "email_deliverability_check_failed",
            "application_error",
            "application_event",
            "server_start_failed",
            "server_ready",
            "seed_suggestion",
            "seed_suggestion_failed",
            "database_query",
            "vote_buffer",
            "analysis_schedule",
            "math_queue",
            "survey_scoring_queue_failed",
            "log_sanitization_failed",
        ])
        .optional(),
    seedSuggestion: z
        .object({
            event: z.enum(["generated", "failed", "added"]),
            userId: uuid,
            draftId: uuid,
            generationId: uuid.optional(),
            suggestionId: uuid.optional(),
            suggestionIds: z.array(uuid).max(3).optional(),
            confident: z.boolean().optional(),
            conversationType: z.enum(["polis", "prioritizing"]).optional(),
            source: z.enum(["bedrock", "simulated"]).optional(),
            durationMs: counter.optional(),
            reason: z
                .enum([
                    "model_failure",
                    "invalid_answer",
                    "timeout",
                    "cancelled",
                    "description_too_long",
                ])
                .optional(),
        })
        .optional(),
});

export type LogContext = z.infer<typeof logContextSchema>;

function ownValue({ value, key }: { value: unknown; key: string }): unknown {
    if (typeof value !== "object" || value === null) return undefined;
    // Reading data descriptors avoids executing third-party getters/toJSON.
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return undefined;
    const result: unknown = descriptor.value;
    return result;
}

export function createLogFieldProjector(schema: {
    readonly shape: Readonly<Record<string, z.ZodType>>;
}): (value: unknown) => Record<string, unknown> {
    const fields = Object.entries(schema.shape);
    return (value) => {
        const output: Record<string, unknown> = {};
        try {
            for (const [key, field] of fields) {
                const source = ownValue({ value, key });
                if (source === undefined) continue;
                const parsed = field.safeParse(source);
                if (parsed.success && parsed.data !== undefined)
                    output[key] = parsed.data;
            }
            return output;
        } catch {
            return { event: "log_sanitization_failed" };
        }
    };
}

const projectContext = createLogFieldProjector(logContextSchema);
const projectError = createLogFieldProjector(logErrorSchema);
const statusCodeSchema = z.number().int().min(100).max(599);
const projectRequest = createLogFieldProjector(
    z.object({ method: z.string(), route: z.string() }),
);
const projectResponse = createLogFieldProjector(
    z.object({ statusCode: statusCodeSchema }),
);

const envelopeSchema = z.object({
    level: z.union([
        z.literal(10),
        z.literal(20),
        z.literal(30),
        z.literal(40),
        z.literal(50),
        z.literal(60),
    ]),
    time: z.number().nonnegative(),
});

export function sanitizeLogOutput({
    line,
    project,
}: {
    line: string;
    project: (value: unknown) => Record<string, unknown>;
}): string {
    try {
        if (line.length > 262_144) throw new Error("Oversized log record");
        const value: unknown = JSON.parse(line);
        const envelope = envelopeSchema.safeParse(value);
        if (!envelope.success) throw new Error("Invalid log envelope");
        return `${JSON.stringify({ ...envelope.data, ...project(value) })}\n`;
    } catch {
        return `${JSON.stringify({ level: 50, time: Date.now(), event: "log_sanitization_failed", msg: "Log details omitted" })}\n`;
    }
}

// Node 24 represents even assigned Error.stack values using its native accessor.
// Recognize that accessor without calling arbitrary user-defined getters.
const nativeStackDescriptor = Object.getOwnPropertyDescriptor(
    new Error(),
    "stack",
);

function hasPlainErrorText({
    value,
    key,
}: {
    value: object;
    key: "name" | "message";
}): boolean {
    let current: unknown = value;
    for (let depth = 0; depth < 8; depth++) {
        if (typeof current !== "object" || current === null) return true;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor !== undefined) {
            return (
                "value" in descriptor && typeof descriptor.value === "string"
            );
        }
        current = Object.getPrototypeOf(current);
    }
    return false;
}

function errorStack(value: unknown): unknown {
    if (typeof value !== "object" || value === null) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(value, "stack");
    if (descriptor === undefined) return undefined;
    if ("value" in descriptor) {
        const stack: unknown = descriptor.value;
        return stack;
    }
    if (
        nativeStackDescriptor?.get !== undefined &&
        descriptor.get === nativeStackDescriptor.get &&
        value instanceof Error &&
        hasPlainErrorText({ value, key: "name" }) &&
        hasPlainErrorText({ value, key: "message" })
    ) {
        const stack: unknown = Reflect.get(value, "stack");
        return stack;
    }
    return undefined;
}

function stackFrames({
    stack,
    sourceRoot,
}: {
    stack: unknown;
    sourceRoot: URL;
}): z.infer<typeof frameSchema>[] {
    if (typeof stack !== "string") return [];
    const root = fileURLToPath(sourceRoot);
    const frames: z.infer<typeof frameSchema>[] = [];
    // Never include the message line, cause messages, absolute paths, or function arguments.
    for (const line of stack.slice(0, 16_384).split("\n").slice(1, 33)) {
        const match =
            /(?:\(|\s)((?:node:|file:\/\/\/|\/)[^\n)]+):(\d+):(\d+)\)?$/.exec(
                line,
            );
        const location = match?.at(1);
        if (location === undefined) continue;
        try {
            const localPath = stackFramePath({ location, root });
            if (localPath === undefined) continue;
            const parsed = frameSchema.safeParse({
                file: localPath,
                line: Number(match?.at(2)),
                column: Number(match?.at(3)),
            });
            if (parsed.success) frames.push(parsed.data);
            if (frames.length === 12) break;
        } catch {
            // Malformed/foreign frame locations carry no useful first-party context.
        }
    }
    return frames;
}

function stackFramePath({
    location,
    root,
}: {
    location: string;
    root: string;
}): string | undefined {
    if (location.startsWith("node:")) return location;
    const file = location.startsWith("file:")
        ? fileURLToPath(new URL(location))
        : location;
    const localPath = relative(root, file);
    if (!isAbsolute(localPath) && !localPath.startsWith("..")) return localPath;

    const dependencyPath = relative(resolve(root, "..", "node_modules"), file);
    if (isAbsolute(dependencyPath) || dependencyPath.startsWith(".."))
        return undefined;
    // pnpm paths contain an inner node_modules segment. Keep package-relative
    // locations rather than machine-specific install paths or usernames.
    const packagePath = dependencyPath.slice(
        dependencyPath.lastIndexOf("node_modules/") + "node_modules/".length,
    );
    return `node_modules/${dependencyPath.includes("node_modules/") ? packagePath : dependencyPath}`;
}

function withErrorStack(error: z.infer<typeof logErrorSchema>): LogError {
    const summaries = [error, ...error.causes];
    const stack = summaries
        .map((summary, index) => {
            const code = summary.code === undefined ? "" : ` [${summary.code}]`;
            const prefix = index === 0 ? "" : "Caused by: ";
            const frames = summary.frames.map(
                ({ file, line, column }) =>
                    `    at ${file}:${line.toString()}:${column.toString()}`,
            );
            return [
                `${prefix}${summary.type}${code}: ${summary.message}`,
                ...frames,
            ].join("\n");
        })
        .join("\n");
    return { ...error, stack };
}

export function toLogError({
    error,
    sourceRoot,
    formatMessage = () => "Error details omitted",
}: {
    error: unknown;
    sourceRoot: URL;
    formatMessage?: (message: unknown) => string;
}): LogError {
    const empty = withErrorStack({
        type: "Error",
        message: "Error details omitted",
        frames: [],
        causes: [],
    });
    try {
        const summarize = (
            value: unknown,
        ): z.infer<typeof errorSummarySchema> => {
            const name = ownValue({ value, key: "name" });
            const codeValue = ownValue({ value, key: "code" });
            const statusValue =
                ownValue({ value, key: "status" }) ??
                ownValue({ value, key: "statusCode" }) ??
                ownValue({
                    value: ownValue({ value, key: "$metadata" }),
                    key: "httpStatusCode",
                });
            const type =
                name === undefined
                    ? undefined
                    : errorTypeSchema.safeParse(name);
            const code =
                codeValue === undefined
                    ? undefined
                    : errorCodeSchema.safeParse(codeValue);
            const status =
                statusValue === undefined
                    ? undefined
                    : statusCodeSchema.safeParse(statusValue);
            return {
                type: type?.success
                    ? type.data
                    : (nativeErrorKinds.find(({ matches }) => matches(value))
                          ?.type ?? "Error"),
                message:
                    (code?.success
                        ? errorCodeMessages[code.data]
                        : undefined) ??
                    formatMessage(ownValue({ value, key: "message" })),
                code: code?.success ? code.data : undefined,
                statusCode: status?.success ? status.data : undefined,
                frames: stackFrames({
                    stack: errorStack(value),
                    sourceRoot,
                }),
            };
        };
        const summary = summarize(error);
        const causes: LogError["causes"] = [];
        const seen = new Set<unknown>([error]);
        let current = error;
        while (causes.length < 4) {
            const cause = ownValue({ value: current, key: "cause" });
            if (cause === undefined || cause === null || seen.has(cause)) break;
            seen.add(cause);
            causes.push(summarize(cause));
            current = cause;
        }
        return withErrorStack({ ...summary, causes });
    } catch {
        return empty;
    }
}

interface CompiledMessageTemplate {
    prefix: string;
    suffix: string;
    middle: readonly string[];
    output: string;
}

function matchesTemplate({
    message,
    template,
}: {
    message: string;
    template: CompiledMessageTemplate;
}): boolean {
    if (!message.startsWith(template.prefix)) return false;
    let position = template.prefix.length;
    for (const part of template.middle) {
        const next = message.indexOf(part, position);
        if (next === -1) return false;
        position = next + part.length;
    }
    return (
        message.endsWith(template.suffix) &&
        position <= message.length - template.suffix.length
    );
}

function createMessageFormatter({
    messageTemplates,
    fallback,
}: {
    messageTemplates: readonly LogMessageTemplate[];
    fallback: string;
}): (value: unknown) => string {
    const approvedMessages = new Set([fallback]);
    const templates: CompiledMessageTemplate[] = [];
    for (const { parts } of messageTemplates) {
        if (parts.length === 1) {
            approvedMessages.add(parts[0]);
            continue;
        }
        const suffix = parts.at(-1);
        if (
            suffix === undefined ||
            !parts.some((part) => part.trim().length >= 8)
        )
            continue;
        const output = parts.join("[value]");
        approvedMessages.add(output);
        templates.push({
            prefix: parts[0],
            suffix,
            middle: parts.slice(1, -1),
            output,
        });
    }
    return (value) => {
        if (typeof value !== "string" || value.length > 8192) return fallback;
        if (approvedMessages.has(value)) return value;
        return (
            templates.find((template) =>
                matchesTemplate({ message: value, template }),
            )?.output ?? fallback
        );
    };
}

export function createLogErrorProjector({
    sourceRoot,
    errorMessageTemplates = [],
}: {
    sourceRoot: URL;
    errorMessageTemplates?: readonly LogMessageTemplate[];
}): (error: unknown) => LogError {
    const formatErrorMessage = createMessageFormatter({
        messageTemplates: errorMessageTemplates,
        fallback: "Error details omitted",
    });
    return (error) => {
        const parsed = logErrorSchema.safeParse(projectError(error));
        if (parsed.success) {
            const sanitizeSummary = (
                summary: z.infer<typeof errorSummarySchema>,
            ) => ({
                ...summary,
                message:
                    (summary.code === undefined
                        ? undefined
                        : errorCodeMessages[summary.code]) ??
                    formatErrorMessage(summary.message),
            });
            return withErrorStack({
                ...sanitizeSummary(parsed.data),
                causes: parsed.data.causes.map(sanitizeSummary),
            });
        }
        return toLogError({
            error,
            sourceRoot,
            formatMessage: formatErrorMessage,
        });
    };
}

export function createLogPrivacy({
    messageTemplates,
    sourceRoot,
    serializeRequest,
    loadEventSchema,
    errorMessageTemplates = [],
}: {
    messageTemplates: readonly LogMessageTemplate[];
    sourceRoot: URL;
    serializeRequest?: (value: unknown) => LogRequestMetadata;
    loadEventSchema?: z.ZodType;
    errorMessageTemplates?: readonly LogMessageTemplate[];
}) {
    const formatMessage = createMessageFormatter({
        messageTemplates: [
            ...messageTemplates,
            { parts: ["Log details omitted"] },
        ],
        fallback: "Application event",
    });
    const safeError = createLogErrorProjector({
        sourceRoot,
        errorMessageTemplates,
    });
    const loadPrefix = "AGORA_LOAD_EVENT ";
    const safeLoadMessage = (value: unknown): string | undefined => {
        if (
            typeof value !== "string" ||
            value.length > 8192 ||
            loadEventSchema === undefined
        )
            return undefined;
        try {
            const parsed: unknown = JSON.parse(value);
            const result = loadEventSchema.safeParse(parsed);
            return result.success
                ? `${loadPrefix}${JSON.stringify(result.data)}`
                : undefined;
        } catch {
            return undefined;
        }
    };
    const safeMessage = (value: unknown): string => {
        if (typeof value !== "string" || value.length > 8192)
            return "Application event";
        if (value.startsWith(loadPrefix)) {
            return (
                safeLoadMessage(value.slice(loadPrefix.length)) ??
                "Application event"
            );
        }
        return formatMessage(value);
    };
    const fields = (value: unknown): Record<string, unknown> => {
        try {
            const output = projectContext(value);
            const request = ownValue({ value, key: "req" });
            if (request !== undefined && serializeRequest !== undefined) {
                output.req = serializeRequest(request);
            }
            const response = ownValue({ value, key: "res" });
            if (
                typeof response === "object" &&
                response !== null &&
                "statusCode" in response
            ) {
                const status = statusCodeSchema.safeParse(response.statusCode);
                if (status.success) output.res = { statusCode: status.data };
            }
            for (const key of ["err", "error"]) {
                const error = ownValue({ value, key });
                if (error !== undefined) output.err = safeError(error);
            }
            return output;
        } catch {
            return { event: "log_sanitization_failed" };
        }
    };
    const options = {
        hooks: {
            // Pino resets the bindings formatter on child loggers. Project the
            // complete record at its supported write boundary as a final guard.
            streamWrite(line) {
                return sanitizeLogOutput({
                    line,
                    project(value) {
                        const output = fields(value);
                        output.msg = safeMessage(
                            ownValue({ value, key: "msg" }),
                        );
                        return output;
                    },
                });
            },
            logMethod(args, method) {
                try {
                    const first: unknown = args.at(0);
                    if (first === "AGORA_LOAD_EVENT %s") {
                        method.call(
                            this,
                            {},
                            safeLoadMessage(args.at(1)) ?? "Application event",
                        );
                        return;
                    }
                    const message: unknown =
                        typeof first === "string" ? first : args.at(1);
                    const output =
                        first instanceof Error
                            ? { err: safeError(first) }
                            : fields(first);
                    // Never pass interpolation arguments through: they can bypass
                    // field redaction and be embedded directly in Pino's `msg`.
                    method.call(this, output, safeMessage(message));
                } catch {
                    method.call(
                        this,
                        { event: "log_sanitization_failed" },
                        "Log details omitted",
                    );
                }
            },
        },
        formatters: { bindings: fields },
        serializers: {
            // hooks and bindings project errors before Pino invokes serializers.
            // Avoid reinterpreting an already-projected error as a raw exception.
            err(error: unknown) {
                try {
                    return safeError(error);
                } catch {
                    return toLogError({ error: undefined, sourceRoot });
                }
            },
            req: projectRequest,
            res: projectResponse,
        },
        redact: {
            paths: [
                "authorization",
                "cookie",
                "password",
                "token",
                "code",
                "email",
                "phoneNumber",
                "body",
                "headers",
                "config",
                "response",
                "request",
                "connectionString",
                "req.headers",
                "req.body",
                "req.remoteAddress",
                "req.remotePort",
                "err.config",
                "err.request",
                "err.response",
            ],
            remove: true,
        },
    } satisfies LoggerOptions;
    return { options };
}
