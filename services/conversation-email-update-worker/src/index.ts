import { createManagedPostgresDatabase } from "@/shared-backend/db.js";
import { databaseConfig, runtimeConfig, workerConfig } from "./config.js";
import { log } from "./logger.js";
import { writeStructuredLog } from "./observability.js";
import {
    createConversationEmailProvider,
    type ConversationEmailProvider,
} from "./provider.js";
import { createSimulatedConversationEmailProvider } from "./simulatedProvider.js";
import {
    CONVERSATION_EMAIL_UPDATE_WORK_CHANNEL,
    createConversationEmailUpdateWorker,
    parseConversationEmailUpdateWorkWake,
} from "./worker.js";

const FORCE_SHUTDOWN_AFTER_MS = 150_000;

const database = await createManagedPostgresDatabase({
    config: databaseConfig,
    log,
});
const createProvider = (): ConversationEmailProvider | undefined => {
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
                provider: "simulated",
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
};

const provider = createProvider();
const worker = createConversationEmailUpdateWorker({
    db: database.db,
    provider,
    config: workerConfig,
    environment: runtimeConfig.environment,
    log,
});

let shutdownPromise: Promise<void> | undefined;
let forceShutdownTimer: NodeJS.Timeout | undefined;

const shutdown = (signal: "SIGINT" | "SIGTERM"): void => {
    if (shutdownPromise !== undefined) {
        log.error("Second shutdown signal received; forcing process exit");
        process.exit(1);
    }
    writeStructuredLog({
        log,
        level: "info",
        event: { event: "signal_received", outcome: "received", signal },
    });
    forceShutdownTimer = setTimeout(() => {
        log.error("Graceful shutdown deadline exceeded; forcing process exit");
        process.exit(1);
    }, FORCE_SHUTDOWN_AFTER_MS);
    forceShutdownTimer.unref();
    shutdownPromise = worker.shutdown();
};

const handleSigint = (): void => {
    shutdown("SIGINT");
};
const handleSigterm = (): void => {
    shutdown("SIGTERM");
};

process.on("SIGINT", handleSigint);
process.on("SIGTERM", handleSigterm);

try {
    await database.listen({
        channel: CONVERSATION_EMAIL_UPDATE_WORK_CHANNEL,
        onNotification: (payload) => {
            worker.wake(parseConversationEmailUpdateWorkWake(payload));
        },
        onListen: worker.wake,
    });
    await worker.run();
    if (shutdownPromise !== undefined) await shutdownPromise;
} finally {
    process.removeListener("SIGINT", handleSigint);
    process.removeListener("SIGTERM", handleSigterm);
    if (forceShutdownTimer !== undefined) clearTimeout(forceShutdownTimer);
    try {
        await provider?.close?.();
    } finally {
        await database.close();
    }
}
