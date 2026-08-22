import { writeFileSync } from "node:fs";
import { z } from "zod";
import { withExerciseArtifactLock } from "./artifactLock.js";
import {
    assertExerciseDatabaseMarker,
    initializeExerciseDatabaseMarker,
} from "./databaseGuard.js";
import { createExistingConversationFixtureStore } from "./fixtureStore.js";
import type { DevExerciseEnvironment } from "./guard.js";
import {
    createExerciseArtifactStore,
    getExerciseArtifactDirectory,
} from "./manifestStore.js";
import { createExercisePlan, exerciseReportSchema } from "./schemas.js";

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
            `Created ${manifest.state} exercise ${manifest.plan.namespace} in ${getExerciseArtifactDirectory()}`,
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
            if (command === "cleanup" && manifest.state === "cleaned") {
                return;
            }
            const { createExerciseDatabase } = await import(
                "./workerRuntime.js"
            );
            const database = await createExerciseDatabase({ environment });
            try {
                if (command === "initialize-database") {
                    await initializeExerciseDatabaseMarker({
                        db: database.db,
                        expectedDatabaseName: plan.expectedDatabaseName,
                        markerValue: plan.databaseMarker,
                    });
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
            const fixture = await fixtureStore.prepare(plan);
            await artifacts.transitionManifest({
                namespace: plan.namespace,
                to: "fixture_prepared",
                fixture,
            });
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
            await fixtureStore.attach({ manifest, fixture: manifest.fixture });
            await artifacts.transitionManifest({
                namespace: plan.namespace,
                to: "fixture_attached",
            });
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
            const { runExerciseWorker } = await import("./workerRuntime.js");
            await runExerciseWorker({
                environment,
                manifest: runningManifest,
                artifacts,
                db: database.db,
            });
            return;
        }
        if (command === "observe") {
            if (manifest.state !== "awaiting_ui_action") {
                throw new Error(
                    "Exercise must finish its worker run before observation",
                );
            }
            const providerReport = await artifacts.readReport(plan.namespace);
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
            return;
        }
        if (command === "verify") {
            if (manifest.state !== "observing") {
                throw new Error(
                    "Exercise must be observed before verification",
                );
            }
            const report = await artifacts.readReport(plan.namespace);
            const failures = await fixtureStore.verify({ manifest, report });
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
            return;
        }

        const report = [
            "awaiting_ui_action",
            "observing",
            "verified",
            "failed",
        ].includes(manifest.state)
            ? await artifacts.readReport(plan.namespace)
            : undefined;
        await fixtureStore.cleanup({ manifest, report });
        await artifacts.transitionManifest({
            namespace: plan.namespace,
            to: "cleaned",
        });
            } finally {
                await database.close();
            }
        },
    });
}
