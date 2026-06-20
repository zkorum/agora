import { type Logger } from "drizzle-orm";
import type { BaseLogger } from "pino";

export class DrizzleFastifyLogger implements Logger {
    logger: Pick<BaseLogger, "info" | "error">;
    constructor(fastifyLogger: Pick<BaseLogger, "info" | "error">) {
        this.logger = fastifyLogger;
    }
    logQuery(query: string, params: unknown[]): void {
        this.logger.info("%s -- %s", query, params);
    }
}
