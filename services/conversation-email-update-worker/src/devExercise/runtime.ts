import { writeFileSync } from "node:fs";
import { z } from "zod";
import { withExerciseArtifactLock } from "./artifactLock.js";
import {
    assertExerciseDatabaseMarker,
    initializeExerciseDatabaseMarker,
} from "./databaseGuard.js";
import {
    createExistingConversationFixtureStore,
    type FixtureStore,
} from "./fixtureStore.js";
import type { DevExerciseEnvironment } from "./guard.js";
import {
    createExerciseArtifactStore,
    getExerciseArtifactDirectory,
    type ExerciseArtifactStore,
} from "./manifestStore.js";
import {
    createExercisePlan,
    exerciseReportSchema,
    type ExerciseManifest,
    type ExercisePlan,
} from "./schemas.js";

const runtimeImportMarker =
    process.env.AGORA_DEV_EXERCISE_RUNTIME_IMPORT_MARKER_FILE;
if (runtimeImportMarker !== undefined) {
    writeFileSync(runtimeImportMarker, "runtime imported\n", {
        encoding: "utf8",
        mode: 0o600,
    });
}

const commandSchema = z.enum([
    "plan",
    "initialize-database",
    "prepare",
    "attach",
    "run",
    "observe",
    "verify",
    "cleanup",
]);

export async function prepareExerciseTransition({
    plan,
    manifest,
    fixtureStore,
    artifacts,
}: {
    plan: ExercisePlan;
    manifest: ExerciseManifest;
    fixtureStore: Pick<FixtureStore, "prepare">;
    artifacts: Pick<ExerciseArtifactStore, "transitionManifest">;
}): Promise<void> {
    const fixture = await fixtureStore.prepare(plan);
    if (manifest.state === "fixture_prepared") {
        if (
            manifest.fixture === undefined ||
            JSON.stringify(manifest.fixture) !== JSON.stringify(fixture)
        ) {
            throw new Error(
                "Prepared manifest fixture does not match the persisted reservation",
            );
        }
        return;
    }
    if (manifest.state !== "planned") {
        throw new Error(
            `Exercise cannot be prepared from lifecycle state ${manifest.state}`,
        );
    }
    await artifacts.transitionManifest({
        namespace: plan.namespace,
        to: "fixture_prepared",
        fixture,
    });
}

export async function cleanupExerciseTransition({
    manifest,
    fixtureStore,
    artifacts,
}: {
    manifest: ExerciseManifest;
    fixtureStore: Pick<FixtureStore, "cleanup" | "finalizeCleanup">;
    artifacts: Pick<
        ExerciseArtifactStore,
        "readReportIfExists" | "transitionManifest"
    >;
}): Promise<void> {
    if (manifest.state === "cleaned") {
        await fixtureStore.finalizeCleanup(manifest);
        return;
    }
    const report = await artifacts.readReportIfExists(manifest.plan.namespace);
    await fixtureStore.cleanup({ manifest, report });
    const cleanedManifest = await artifacts.transitionManifest({
        namespace: manifest.plan.namespace,
        to: "cleaned",
    });
    await fixtureStore.finalizeCleanup(cleanedManifest);
}

export async function runDevExercise({
    environment,
    arguments: commandArguments,
}: {
    environment: DevExerciseEnvironment;
    arguments: string[];
}): Promise<void> {
    if (commandArguments.length !== 1) {
        throw new Error(
            "Usage: dev:exercise <plan|initialize-database|prepare|attach|run|observe|verify|cleanup>",
        );
    }
    const command = commandSchema.parse(commandArguments[0]);
    const plan = createExercisePlan(environment);
    const artifacts = createExerciseArtifactStore();

    if (command === "plan") {
        const manifest = await artifacts.createManifest(plan);
        console.info(
            [
                `Planned exercise "${manifest.plan.namespace}" (${manifest.plan.scenario}) with ${manifest.plan.participantCount.toString()} deterministic participants.`,
                `Manifest: ${getExerciseArtifactDirectory()}/${manifest.plan.namespace}.manifest.json`,
                "No database data was changed. Next: pnpm dev:exercise initialize-database",
            ].join("\n"),
        );
        return;
    }

    await withExerciseArtifactLock({
        namespace: plan.namespace,
        operation: async () => {
            const manifest = await artifacts.readManifest(plan.namespace);
            if (JSON.stringify(manifest.plan) !== JSON.stringify(plan)) {
                throw new Error(
                    "Stored manifest does not match the guarded exercise plan",
                );
            }
            const { createExerciseDatabase } =
                await import("./workerRuntime.js");
            const database = await createExerciseDatabase({ environment });
            try {
                if (command === "initialize-database") {
                    await initializeExerciseDatabaseMarker({
                        db: database.db,
                        expectedDatabaseName: plan.expectedDatabaseName,
                        markerValue: plan.databaseMarker,
                    });
                    console.info(
                        [
                            `Initialized safety markers in ${plan.expectedDatabaseName}.`,
                            "This only marks the dedicated exercise database; it does not apply application migrations.",
                            "Next: pnpm dev:exercise prepare",
                        ].join("\n"),
                    );
                    return;
                }
                await assertExerciseDatabaseMarker({
                    db: database.db,
                    expectedDatabaseName: plan.expectedDatabaseName,
                    markerValue: plan.databaseMarker,
                });
                const fixtureStore = createExistingConversationFixtureStore({
                    db: database.db,
                });
                if (command === "prepare") {
                    await prepareExerciseTransition({
                        plan,
                        manifest,
                        fixtureStore,
                        artifacts,
                    });
                    console.info(
                        [
                            `Prepared ${plan.participantCount.toString()} deterministic participants for conversation ${plan.conversationSlugId}.`,
                            "The fixture added participant emails, preferences, and votes. Do not modify participation for this conversation.",
                            "Next: pnpm dev:exercise attach",
                        ].join("\n"),
                    );
                    return;
                }
                if (command === "attach") {
                    if (
                        manifest.state !== "fixture_prepared" ||
                        manifest.fixture === undefined
                    ) {
                        throw new Error(
                            "Exercise fixture must be prepared before attachment",
                        );
                    }
                    await fixtureStore.attach({
                        manifest,
                        fixture: manifest.fixture,
                    });
                    await artifacts.transitionManifest({
                        namespace: plan.namespace,
                        to: "fixture_attached",
                    });
                    console.info(
                        [
                            "Attached and verified the frozen fixture. The target and seeded relationships still match the plan.",
                            "Next: pnpm dev:exercise run, then send the test and final update from the normal UI.",
                        ].join("\n"),
                    );
                    return;
                }
                if (command === "run") {
                    if (
                        manifest.state !== "fixture_attached" ||
                        manifest.fixture === undefined
                    ) {
                        throw new Error(
                            "Exercise fixture must be attached before running",
                        );
                    }
                    await fixtureStore.attach({
                        manifest,
                        fixture: manifest.fixture,
                    });
                    await artifacts.transitionManifest({
                        namespace: plan.namespace,
                        to: "worker_running",
                    });
                    const runningManifest = await artifacts.transitionManifest({
                        namespace: plan.namespace,
                        to: "awaiting_ui_action",
                    });
                    const { runExerciseWorker } =
                        await import("./workerRuntime.js");
                    let workerResult: Awaited<
                        ReturnType<typeof runExerciseWorker>
                    >;
                    try {
                        workerResult = await runExerciseWorker({
                            environment,
                            manifest: runningManifest,
                            artifacts,
                            db: database.db,
                        });
                    } catch (error: unknown) {
                        await artifacts.transitionManifest({
                            namespace: plan.namespace,
                            to: "failed",
                            lastError:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown exercise worker failure",
                        });
                        throw error;
                    }
                    if (workerResult.outcome === "incomplete") {
                        const message =
                            "Exercise worker stopped before a terminal delivery was observed";
                        await artifacts.transitionManifest({
                            namespace: plan.namespace,
                            to: "failed",
                            lastError: message,
                        });
                        throw new Error(message);
                    }
                    console.info(
                        [
                            `Exercise delivery reached terminal status: ${workerResult.deliveryStatus}.`,
                            `Provider report: ${getExerciseArtifactDirectory()}/${plan.namespace}.report.json`,
                            "Next: pnpm dev:exercise observe",
                        ].join("\n"),
                    );
                    return;
                }
                if (command === "observe") {
                    if (manifest.state !== "awaiting_ui_action") {
                        throw new Error(
                            "Exercise must finish its worker run before observation",
                        );
                    }
                    const providerReport = await artifacts.readReport(
                        plan.namespace,
                    );
                    const databaseObservation = await fixtureStore.observe({
                        manifest,
                        report: providerReport,
                    });
                    await artifacts.writeReport(
                        exerciseReportSchema.parse({
                            ...providerReport,
                            observedAt: new Date().toISOString(),
                            database: databaseObservation,
                        }),
                    );
                    await artifacts.transitionManifest({
                        namespace: plan.namespace,
                        to: "observing",
                    });
                    console.info(
                        [
                            `Observed delivery ${databaseObservation.deliveryId.toString()} with status ${databaseObservation.deliveryStatus}.`,
                            `Materialized participants: ${databaseObservation.materializedParticipantCount.toString()}; required owner copies: ${databaseObservation.requiredOwnerCopyCount.toString()}.`,
                            "Next: pnpm dev:exercise verify",
                        ].join("\n"),
                    );
                    return;
                }
                if (command === "verify") {
                    if (manifest.state !== "observing") {
                        throw new Error(
                            "Exercise must be observed before verification",
                        );
                    }
                    const report = await artifacts.readReport(plan.namespace);
                    const failures = await fixtureStore.verify({
                        manifest,
                        report,
                    });
                    const passed = failures.length === 0;
                    await artifacts.writeReport(
                        exerciseReportSchema.parse({
                            ...report,
                            status: passed ? "passed" : "failed",
                            observedAt: new Date().toISOString(),
                            failures,
                        }),
                    );
                    await artifacts.transitionManifest({
                        namespace: plan.namespace,
                        to: passed ? "verified" : "failed",
                        lastError: failures.join("; ") || undefined,
                    });
                    if (!passed) {
                        throw new Error(
                            `Exercise verification failed: ${failures.join("; ")}`,
                        );
                    }
                    console.info(
                        [
                            `Verification passed for exercise "${plan.namespace}".`,
                            `Delivery status: ${report.database?.deliveryStatus ?? "unavailable"}; provider calls: ${report.provider.aggregate.sendCalls.toString()}.`,
                            `Report: ${getExerciseArtifactDirectory()}/${plan.namespace}.report.json`,
                            "Next: pnpm dev:exercise cleanup",
                        ].join("\n"),
                    );
                    return;
                }

                await cleanupExerciseTransition({
                    manifest,
                    fixtureStore,
                    artifacts,
                });
                console.info(
                    [
                        `Cleaned exercise-owned database rows for "${plan.namespace}".`,
                        "The project, conversation, facilitator, entitlement, capability, database marker, and local report artifacts were preserved.",
                    ].join("\n"),
                );
            } finally {
                await database.close();
            }
        },
    });
}
