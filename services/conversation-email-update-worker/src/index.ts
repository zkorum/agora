import { createDb, getPrimaryDatabase } from "@/shared-backend/db.js";
import { databaseConfig, runtimeConfig, workerConfig } from "./config.js";
import { log } from "./logger.js";
import { writeStructuredLog } from "./observability.js";
import { createConversationEmailProvider } from "./provider.js";
import { createSimulatedConversationEmailProvider } from "./simulatedProvider.js";
import { createConversationEmailUpdateWorker } from "./worker.js";

const database = getPrimaryDatabase(await createDb(databaseConfig, log));
const provider = (() => {
    if (!workerConfig.enabled) return undefined;
    if (workerConfig.provider === "simulated") {
        writeStructuredLog({
            log,
            level: "warn",
            event: {
                event: "simulator_started",
                outcome: "started",
                provider: "simulated",
                mode: workerConfig.simulatorMode,
            },
        });
        log.info(
            `AGORA_LOAD_EVENT ${JSON.stringify({
                service: "conversation-email-update-worker",
                event: "simulator_started",
                provider: "ses",
                mode: workerConfig.simulatorMode,
            })}`,
        );
        return createSimulatedConversationEmailProvider({
            mode: workerConfig.simulatorMode,
            retryableFailures: workerConfig.simulatorRetryableFailures,
        });
    }
    if (
        workerConfig.fromAddress === undefined ||
        workerConfig.configurationSetName === undefined
    ) {
        return undefined;
    }
    return createConversationEmailProvider({
        region: workerConfig.sesRegion,
        fromAddress: workerConfig.fromAddress,
        configurationSetName: workerConfig.configurationSetName,
        requestTimeoutMs: workerConfig.requestTimeoutMs,
    });
})();
const worker = createConversationEmailUpdateWorker({
    db: database,
    provider,
    config: workerConfig,
    environment: runtimeConfig.environment,
    log,
});

let shutdownStarted = false;
const shutdown = async (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    writeStructuredLog({
        log,
        level: "info",
        event: { event: "signal_received", outcome: "received", signal },
    });
    await worker.shutdown();
};

process.once("SIGINT", () => {
    void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
});

await worker.run();
