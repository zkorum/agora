import { type Logger } from "drizzle-orm";
import type { BaseLogger } from "pino";

export class DrizzleFastifyLogger implements Logger {
    private readonly logger: Pick<BaseLogger, "info" | "error">;
    private readonly includeParams: boolean;

    constructor({
        fastifyLogger,
        includeParams,
    }: {
        fastifyLogger: Pick<BaseLogger, "info" | "error">;
        includeParams: boolean;
    }) {
        this.logger = fastifyLogger;
        this.includeParams = includeParams;
    }
    logQuery(query: string, params: unknown[]): void {
        if (this.includeParams) {
            this.logger.info("%s -- %s", query, params);
            return;
        }
        this.logger.info("%s -- parameterCount=%d", query, params.length);
    }
}
