import pino, { type Logger, type DestinationStream } from "pino";
import { z } from "zod";
import {
    createLogFieldProjector,
    sanitizeLogOutput,
} from "./shared-backend/logPrivacy.js";
import { runtimeConfig } from "./config.js";
import {
    normalizeError,
    OBSERVABILITY_SERVICE,
    structuredEventSchema,
    type StructuredEvent,
} from "./observability.js";

const LOAD_EVENT_PREFIX = "AGORA_LOAD_EVENT ";
const bindingSchema = z.object({
    service: z.literal(OBSERVABILITY_SERVICE).optional(),
    environment: z
        .enum(["development", "production", "staging", "test"])
        .optional(),
    workerId: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
        .optional(),
    deliveryId: z.number().int().positive().optional(),
    attemptId: z.uuid().optional(),
});
const loadEventSchema = z.object({
    service: z.literal(OBSERVABILITY_SERVICE),
    event: z.literal("simulator_started"),
    provider: z.literal("simulated"),
    mode: z.enum([
        "success",
        "retryable_rejected",
        "retryable_rejected_then_success",
        "permanent_rejected",
        "unknown",
    ]),
});

const projectBindings = createLogFieldProjector(bindingSchema);
const projectMessage = createLogFieldProjector(z.object({ msg: z.string() }));
const projectErrorArgument = createLogFieldProjector(
    z.object({
        err: z.unknown().optional(),
        error: z.unknown().optional(),
    }),
);
const projectDiscriminator = createLogFieldProjector(
    z.object({ event: z.string().max(100) }),
);
const eventProjectors = new Map<
    string,
    (value: unknown) => Record<string, unknown>
>();
for (const schema of structuredEventSchema.options) {
    eventProjectors.set(
        schema.shape.event.value,
        createLogFieldProjector(schema),
    );
}

function projectStructuredEvent(value: unknown): StructuredEvent | undefined {
    const name = projectDiscriminator(value).event;
    if (typeof name !== "string") return undefined;
    const project = eventProjectors.get(name);
    if (project === undefined) return undefined;
    const result = structuredEventSchema.safeParse(project(value));
    return result.success ? result.data : undefined;
}

function safeLoadEvent(value: string): string | undefined {
    try {
        const parsed: unknown = JSON.parse(
            value.slice(LOAD_EVENT_PREFIX.length),
        );
        const event = loadEventSchema.safeParse(parsed);
        return event.success
            ? `${LOAD_EVENT_PREFIX}${JSON.stringify(event.data)}`
            : undefined;
    } catch {
        return undefined;
    }
}

function dependencyRole(value: string): "primary" | "read_replica" {
    return value === "primary" ? "primary" : "read_replica";
}

function knownDependencyEvent({
    args,
    error,
}: {
    args: readonly unknown[];
    error: unknown;
}): StructuredEvent | undefined {
    const message = args.find(
        (argument): argument is string => typeof argument === "string",
    );
    if (message === undefined) return undefined;

    const verified =
        /^\[DB\] PostgreSQL (primary|read replica) connection verified$/.exec(
            message,
        );
    if (verified !== null) {
        const role = verified.at(1);
        if (role === undefined) return undefined;
        return {
            event: "dependency_status",
            outcome: "success",
            dependency: "postgresql",
            operation: "connect",
            role: dependencyRole(role),
            retrying: false,
        };
    }

    const unavailable =
        /^\[DB\] PostgreSQL (primary|read replica) unavailable; retrying in [0-9]+ms$/.exec(
            message,
        );
    if (unavailable !== null) {
        const role = unavailable.at(1);
        if (role === undefined) return undefined;
        return {
            event: "dependency_failed",
            outcome: "failure",
            dependency: "postgresql",
            operation: "connect",
            role: dependencyRole(role),
            retrying: true,
            ...(error === undefined ? {} : { error: normalizeError(error) }),
        };
    }

    if (
        message ===
        "Connected to read replica - explicit reads use replica, writes use primary"
    ) {
        return {
            event: "dependency_status",
            outcome: "success",
            dependency: "postgresql",
            operation: "route_reads",
            role: "read_replica",
            retrying: false,
        };
    }
    if (
        message ===
        "No read replica configured, using primary for all operations"
    ) {
        return {
            event: "dependency_status",
            outcome: "success",
            dependency: "postgresql",
            operation: "route_reads",
            role: "primary",
            retrying: false,
        };
    }

    const unableToConnect =
        /^Unable to connect to the database \((primary|read replica)\)$/.exec(
            message,
        );
    if (unableToConnect !== null) {
        const role = unableToConnect.at(1);
        if (role === undefined) return undefined;
        return {
            event: "dependency_failed",
            outcome: "failure",
            dependency: "postgresql",
            operation: "connect",
            role: dependencyRole(role),
            retrying: false,
            ...(error === undefined ? {} : { error: normalizeError(error) }),
        };
    }
    if (message === "Failed to close unavailable PostgreSQL client") {
        return {
            event: "dependency_failed",
            outcome: "failure",
            dependency: "postgresql",
            operation: "close_connection",
            retrying: false,
            ...(error === undefined ? {} : { error: normalizeError(error) }),
        };
    }
    if (
        message ===
        "CONNECTION_STRING cannot be undefined in any mode except production"
    ) {
        return {
            event: "dependency_failed",
            outcome: "failure",
            dependency: "postgresql",
            operation: "configure",
            retrying: false,
        };
    }

    const secretsOperation =
        message === "Unexpected binary format for the secret" ||
        message === "No secret found" ||
        message === "Unable to receive response from AWS Secrets Manager"
            ? "load_credentials"
            : message ===
                    "Field 'username' is not in the secrets or is not a string" ||
                message ===
                    "Field 'password' is not in the secrets or is not a string" ||
                message ===
                    "Unable to parse received SecretString in JSON or connect to DB"
              ? "parse_credentials"
              : undefined;
    if (secretsOperation !== undefined) {
        return {
            event: "dependency_failed",
            outcome: "failure",
            dependency: "aws_secrets_manager",
            operation: secretsOperation,
            retrying: false,
            ...(error === undefined ? {} : { error: normalizeError(error) }),
        };
    }
    return undefined;
}

export function createStructuredLogger({
    environment,
    workerId,
    level,
    destination,
}: {
    environment: "development" | "production" | "staging" | "test";
    workerId: string;
    level: string;
    destination?: DestinationStream;
}): Logger {
    const options: pino.LoggerOptions = {
        base: {
            service: OBSERVABILITY_SERVICE,
            environment,
            workerId,
        },
        level,
        formatters: {
            bindings: projectBindings,
        },
        hooks: {
            streamWrite(line) {
                return sanitizeLogOutput({
                    line,
                    project(value) {
                        const bindings = projectBindings(value);
                        const event = projectStructuredEvent(value);
                        if (event !== undefined)
                            return { ...bindings, ...event };
                        const message = projectMessage(value).msg;
                        const marker =
                            typeof message === "string" &&
                            message.startsWith(LOAD_EVENT_PREFIX)
                                ? safeLoadEvent(message)
                                : undefined;
                        return marker === undefined
                            ? {
                                  ...bindings,
                                  event: "unclassified_log",
                                  outcome: "failure",
                                  severity: "error",
                              }
                            : { ...bindings, msg: marker };
                    },
                });
            },
            logMethod(args, method, numericLevel) {
                try {
                    const first = args.at(0);
                    if (projectDiscriminator(first).event === "database_query")
                        return;
                    if (
                        typeof first === "string" &&
                        first.startsWith(LOAD_EVENT_PREFIX)
                    ) {
                        const loadEvent = safeLoadEvent(first);
                        method.call(
                            this,
                            loadEvent ?? {
                                event: "unclassified_log",
                                outcome: "failure",
                                severity: "error",
                                error: normalizeError(undefined),
                            },
                        );
                        return;
                    }
                    const event = structuredEventSchema.safeParse(first);
                    if (event.success) {
                        method.call(this, event.data);
                        return;
                    }
                    const errorFields = projectErrorArgument(first);
                    const errorSource =
                        args.find(
                            (argument): argument is Error =>
                                argument instanceof Error,
                        ) ??
                        errorFields.err ??
                        errorFields.error;
                    const dependencyEvent = knownDependencyEvent({
                        args,
                        error: errorSource,
                    });
                    if (dependencyEvent !== undefined) {
                        method.call(this, dependencyEvent);
                        return;
                    }
                    const severity =
                        numericLevel >= 50
                            ? "error"
                            : numericLevel >= 40
                              ? "warning"
                              : "info";
                    method.call(this, {
                        event: "unclassified_log",
                        outcome:
                            severity === "error"
                                ? "failure"
                                : severity === "warning"
                                  ? "warning"
                                  : "info",
                        severity,
                        ...(errorSource === undefined
                            ? {}
                            : { error: normalizeError(errorSource) }),
                    });
                } catch {
                    method.call(this, {
                        event: "unclassified_log",
                        outcome: "failure",
                        severity: "error",
                    });
                }
            },
        },
        redact: {
            paths: [
                "authorization",
                "body",
                "connectionString",
                "destinationEmail",
                "email",
                "html",
                "message",
                "password",
                "subject",
                "text",
                "token",
                "url",
                "username",
            ],
            remove: true,
        },
    };
    return destination === undefined
        ? pino(options)
        : pino(options, destination);
}

export const log = createStructuredLogger({
    environment: runtimeConfig.environment,
    workerId: runtimeConfig.workerId,
    level: runtimeConfig.logLevel,
});
