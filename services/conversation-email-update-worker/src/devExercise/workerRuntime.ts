import pino from "pino";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ConversationEmailWorkerConfig } from "../config.js";
import { createConversationEmailUpdateWorker } from "../worker.js";
import type { DevExerciseEnvironment } from "./guard.js";
import { createInstrumentedSimulatedProvider } from "./instrumentedProvider.js";
import type { ExerciseArtifactStore } from "./manifestStore.js";
import { exerciseReportSchema, type ExerciseManifest } from "./schemas.js";

export async function runExerciseWorker({
    environment,
    manifest,
    artifacts,
    db,
}: {
    environment: DevExerciseEnvironment;
    manifest: ExerciseManifest;
    artifacts: ExerciseArtifactStore;
    db: PostgresJsDatabase;
}): Promise<void> {
    const fixture = manifest.fixture;
    if (fixture === undefined) {
        throw new Error("Exercise worker requires a prepared fixture");
    }
    const log = pino({
        name: "conversation-email-update-dev-exercise",
        level: "info",
    });
    const workerConfig = {
        enabled: environment.CONVERSATION_EMAIL_UPDATES_ENABLED,
        // The kill-switch scenario first accepts the normal UI test and starts
        // the final delivery, then arms the guarded switch before participants send.
        killSwitch:
            environment.CONVERSATION_EMAIL_UPDATES_KILL_SWITCH &&
            environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO !==
                "kill_switch",
        sesRegion: "unused-simulated-provider",
        fromAddress: undefined,
        configurationSetName: undefined,
        provider: "simulated",
        simulatorMode: "success",
        simulatorRetryableFailures: 1,
        workerId: `dev-exercise-${manifest.plan.fixtureId}`,
        pollIntervalMs: 250,
        heartbeatIntervalMs: 60_000,
        batchSize: 500,
        concurrency: 1,
        sendsPerSecond: 500,
        leaseSeconds: 120,
        requestTimeoutMs: 20_000,
        siteBaseUrl: environment.CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL,
    } satisfies ConversationEmailWorkerConfig;
    const instrumentedProvider = createInstrumentedSimulatedProvider({
        plan: manifest.plan,
        captureBodies:
            environment.CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES,
        artifacts,
        onDeliveryMessage:
            manifest.plan.scenario === "kill_switch"
                ? () => {
                      workerConfig.killSwitch = true;
                  }
                : undefined,
    });
    const worker = createConversationEmailUpdateWorker({
        db,
        provider: instrumentedProvider.provider,
        config: workerConfig,
        environment: "development",
        log,
        conversationId: fixture.conversationId,
    });

    let shutdownStarted = false;
    const shutdown = async (): Promise<void> => {
        if (shutdownStarted) return;
        shutdownStarted = true;
        await worker.shutdown();
    };
    const handleSignal = (): void => {
        void shutdown();
    };
    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);
    try {
        log.info(
            {
                namespace: manifest.plan.namespace,
                scenario: manifest.plan.scenario,
                identityCount: manifest.plan.identities.length,
            },
            "Development exercise worker awaiting normal UI test/final-send actions",
        );
        await worker.run();
    } finally {
        process.removeListener("SIGINT", handleSignal);
        process.removeListener("SIGTERM", handleSignal);
        const provider = instrumentedProvider.snapshot();
        await artifacts.writeReport(
            exerciseReportSchema.parse({
                schemaVersion: 2,
                namespace: manifest.plan.namespace,
                fixtureId: manifest.plan.fixtureId,
                status: "incomplete",
                observedAt: new Date().toISOString(),
                provider,
                failures: ["Database observation and verification are pending"],
            }),
        );
        log.info(
            { namespace: manifest.plan.namespace, ...provider.aggregate },
            "Development exercise provider report written",
        );
    }
}

export async function createExerciseDatabase({
    environment,
}: {
    environment: DevExerciseEnvironment;
}): Promise<{
    db: PostgresJsDatabase;
    close: () => Promise<void>;
}> {
    const client = postgres(environment.CONNECTION_STRING, {
        connect_timeout: 10,
        max: 10,
    });
    await client`select 1`;
    return {
        db: drizzle(client),
        close: async () => {
            await client.end({ timeout: 5 });
        },
    };
}
