/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { type Logger } from "drizzle-orm";
import { type FastifyBaseLogger } from "fastify";
import pino from "pino";

export class DrizzleFastifyLogger implements Logger {
    logger: pino.Logger | FastifyBaseLogger;
    constructor(fastifyLogger: pino.Logger | FastifyBaseLogger) {
        this.logger = fastifyLogger;
    }
    logQuery(query: string, params: unknown[]): void {
        this.logger.info("%s -- %s", query, params);
    }
}
