import { type Logger } from "drizzle-orm";
import pino from "pino";

export class DrizzleFastifyLogger implements Logger {
    logger: pino.Logger;
    constructor(fastifyLogger: pino.Logger) {
        this.logger = fastifyLogger;
    }
    logQuery(query: string, params: unknown[]): void {
        this.logger.info("%s -- %s", query, params);
    }
}
