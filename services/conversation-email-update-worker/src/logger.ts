import pino, { type BaseLogger, type DestinationStream } from "pino";
import { z } from "zod";
import { runtimeConfig } from "./config.js";
import {
    normalizeError,
    OBSERVABILITY_SERVICE,
    structuredEventSchema,
    type StructuredEvent,
} from "./observability.js";

const LOAD_EVENT_PREFIX = "AGORA_LOAD_EVENT ";
const DRIZZLE_QUERY_FORMAT = "%s --";
const loadEventSchema = z.object({
    service: z.literal(OBSERVABILITY_SERVICE),
    event: z.literal("simulator_started"),
    provider: z.literal("ses"),
    mode: z.enum([
        "success",
        "retryable_rejected",
        "retryable_rejected_then_success",
        "permanent_rejected",
        "unknown",
    ]),
});

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
    error: Error | undefined;
}): StructuredEvent | undefined {
    const messages = args.filter(
        (argument): argument is string => typeof argument === "string",
    );
    const message = messages.at(0);
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
        "Connected to read replica - SELECTs will use replica, writes use primary"
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
}): BaseLogger {
    const options: pino.LoggerOptions = {
        base: {
            service: OBSERVABILITY_SERVICE,
            environment,
            workerId,
        },
        level,
        hooks: {
            logMethod(args, method, numericLevel) {
                const first = args.at(0);
                if (
                    typeof first === "string" &&
                    first.startsWith(DRIZZLE_QUERY_FORMAT)
                ) {
                    return;
                }
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
                const errorSource = args.find(
                    (argument): argument is Error => argument instanceof Error,
                );
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
