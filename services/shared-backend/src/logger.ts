import { type Logger } from "drizzle-orm";
import type { BaseLogger } from "pino";

const safeErrorIdentifier = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const postgresSqlState = /^[0-9A-Z]{5}$/;
const safeDependencyErrorCodes = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "EPIPE",
    "ETIMEDOUT",
]);

export function safeDependencyError(error: unknown): {
    errorType: string;
    errorCode?: string;
} {
    const errorType =
        error instanceof Error && safeErrorIdentifier.test(error.name)
            ? error.name
            : "UnknownError";
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return { errorType };
    }
    const code = error.code;
    if (typeof code !== "string") return { errorType };
    if (postgresSqlState.test(code)) {
        return { errorType, errorCode: "PostgresSqlState" };
    }
    return safeDependencyErrorCodes.has(code)
        ? { errorType, errorCode: code }
        : { errorType };
}

export class DrizzleFastifyLogger implements Logger {
    private readonly logger: Pick<BaseLogger, "info">;

    constructor({
        fastifyLogger,
    }: {
        fastifyLogger: Pick<BaseLogger, "info">;
    }) {
        this.logger = fastifyLogger;
    }
    logQuery(query: string, params: unknown[]): void {
        this.logger.info("%s -- parameterCount=%d", query, params.length);
    }
}
