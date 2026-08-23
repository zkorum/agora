import pino from "pino";
import { setTimeout as sleep } from "node:timers/promises";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ConversationEmailWorkerConfig } from "../config.js";
import {
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateDeliveryStatusEnum,
} from "../shared-backend/schema.js";
import { createConversationEmailUpdateWorker } from "../worker.js";
import type { DevExerciseEnvironment } from "./guard.js";
import { createInstrumentedSimulatedProvider } from "./instrumentedProvider.js";
import type { ExerciseArtifactStore } from "./manifestStore.js";
import { exerciseReportSchema, type ExerciseManifest } from "./schemas.js";

export type ConversationEmailUpdateDeliveryStatus =
    (typeof conversationEmailUpdateDeliveryStatusEnum.enumValues)[number];

const terminalDeliveryStatuses = [
    "stopped",
    "completed",
    "completed_with_failures",
    "failed",
] satisfies readonly ConversationEmailUpdateDeliveryStatus[];

export type TerminalExerciseDeliveryStatus =
    (typeof terminalDeliveryStatuses)[number];

const terminalDeliveryStatusSet: ReadonlySet<ConversationEmailUpdateDeliveryStatus> =
    new Set(terminalDeliveryStatuses);

export interface ExerciseDelivery {
    id: number;
    status: ConversationEmailUpdateDeliveryStatus;
}

interface TerminalExerciseDelivery {
    id: number;
    status: TerminalExerciseDeliveryStatus;
}

interface MonitorExerciseDeliveryParams {
    signal: AbortSignal;
    readDelivery: () => Promise<ExerciseDelivery | undefined>;
    onStatusChange: (delivery: ExerciseDelivery) => void;
    waitForNextPoll: () => Promise<void>;
}

export function isTerminalExerciseDeliveryStatus(
    status: ConversationEmailUpdateDeliveryStatus,
): status is TerminalExerciseDeliveryStatus {
    return terminalDeliveryStatusSet.has(status);
}

export async function monitorExerciseDelivery({
    signal,
    readDelivery,
    onStatusChange,
    waitForNextPoll,
}: MonitorExerciseDeliveryParams): Promise<
    TerminalExerciseDelivery | undefined
> {
    let previousStatus: ConversationEmailUpdateDeliveryStatus | undefined;
    while (!signal.aborted) {
        const delivery = await readDelivery();
        if (delivery !== undefined && delivery.status !== previousStatus) {
            previousStatus = delivery.status;
            onStatusChange(delivery);
        }
        if (
            delivery !== undefined &&
            isTerminalExerciseDeliveryStatus(delivery.status)
        ) {
            return { id: delivery.id, status: delivery.status };
        }
        await waitForNextPoll();
    }
    return undefined;
}

async function getExerciseDelivery({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<ExerciseDelivery | undefined> {
    const deliveries = await db
        .select({
            id: conversationEmailUpdateDeliveryTable.id,
            status: conversationEmailUpdateDeliveryTable.status,
        })
        .from(conversationEmailUpdateDeliveryTable)
        .innerJoin(
            conversationEmailUpdateConversationTable,
            eq(
                conversationEmailUpdateConversationTable.updateId,
                conversationEmailUpdateDeliveryTable.updateId,
            ),
        )
        .where(
            eq(
                conversationEmailUpdateConversationTable.conversationId,
                conversationId,
            ),
        )
        .limit(2);
    if (deliveries.length > 1) {
        throw new Error(
            "Exercise conversation has multiple Email Update deliveries",
        );
    }
    return deliveries.at(0);
}

export type ExerciseWorkerResult =
    | {
          outcome: "terminal";
          deliveryStatus: TerminalExerciseDeliveryStatus;
      }
    | { outcome: "incomplete" };

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
}): Promise<ExerciseWorkerResult> {
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

    const monitorAbortController = new AbortController();
    let shutdownPromise: Promise<void> | undefined;
    let terminalDeliveryStatus: TerminalExerciseDeliveryStatus | undefined;
    const shutdown = async (): Promise<void> => {
        if (shutdownPromise === undefined) {
            monitorAbortController.abort();
            shutdownPromise = worker.shutdown();
        }
        await shutdownPromise;
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
        const monitorPromise = (async (): Promise<void> => {
            const terminalDelivery = await monitorExerciseDelivery({
                signal: monitorAbortController.signal,
                readDelivery: async () =>
                    await getExerciseDelivery({
                        db,
                        conversationId: fixture.conversationId,
                    }),
                onStatusChange: (delivery) => {
                    log.info(
                        {
                            event: "exercise_delivery_status",
                            namespace: manifest.plan.namespace,
                            deliveryId: delivery.id,
                            deliveryStatus: delivery.status,
                        },
                        `Development exercise delivery is ${delivery.status}`,
                    );
                },
                waitForNextPoll: async () => {
                    await sleep(250);
                },
            });
            if (terminalDelivery === undefined) {
                return;
            }
            terminalDeliveryStatus = terminalDelivery.status;
            log.info(
                {
                    event: "exercise_delivery_terminal",
                    namespace: manifest.plan.namespace,
                    deliveryId: terminalDelivery.id,
                    deliveryStatus: terminalDelivery.status,
                },
                "Development exercise reached a terminal delivery state; stopping the worker",
            );
            await shutdown();
        })();
        await Promise.all([worker.run(), monitorPromise]);
    } finally {
        process.removeListener("SIGINT", handleSignal);
        process.removeListener("SIGTERM", handleSignal);
        await shutdown();
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
    return terminalDeliveryStatus === undefined
        ? { outcome: "incomplete" }
        : { outcome: "terminal", deliveryStatus: terminalDeliveryStatus };
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
