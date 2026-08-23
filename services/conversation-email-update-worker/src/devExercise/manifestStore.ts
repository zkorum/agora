import { randomUUID } from "node:crypto";
import {
    chmod,
    link,
    mkdir,
    open,
    readFile,
    rename,
    rm,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
    exerciseManifestSchema,
    exerciseReportSchema,
    type ExerciseLifecycleState,
    type ExerciseManifest,
    type ExercisePlan,
    type ExerciseReport,
} from "./schemas.js";

const storageDirectory = fileURLToPath(
    new URL(
        "../../../../.local/conversation-email-update-fixtures/",
        import.meta.url,
    ),
);

const nodeErrorSchema = z.object({ code: z.string() }).loose();

export interface ExerciseArtifactStore {
    createManifest: (plan: ExercisePlan) => Promise<ExerciseManifest>;
    readManifest: (namespace: string) => Promise<ExerciseManifest>;
    transitionManifest: (params: {
        namespace: string;
        to: ExerciseLifecycleState;
        fixture?: ExerciseManifest["fixture"];
        lastError?: string;
    }) => Promise<ExerciseManifest>;
    writeReport: (report: ExerciseReport) => Promise<string>;
    readReport: (namespace: string) => Promise<ExerciseReport>;
    readReportIfExists: (
        namespace: string,
    ) => Promise<ExerciseReport | undefined>;
    writeCapturedMessage: (params: {
        namespace: string;
        sequence: number;
        message: unknown;
    }) => Promise<string>;
}

function manifestPath(namespace: string): string {
    return `${storageDirectory}/${namespace}.manifest.json`;
}

function reportPath(namespace: string): string {
    return `${storageDirectory}/${namespace}.report.json`;
}

async function writeJsonAtomic({
    path,
    value,
}: {
    path: string;
    value: unknown;
}): Promise<void> {
    await mkdir(storageDirectory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
        await handle.writeFile(
            `${JSON.stringify(value, undefined, 2)}\n`,
            "utf8",
        );
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await rename(temporaryPath, path);
        await chmod(path, 0o600);
    } finally {
        await rm(temporaryPath, { force: true });
    }
}

function isAllowedTransition({
    from,
    to,
}: {
    from: ExerciseLifecycleState;
    to: ExerciseLifecycleState;
}): boolean {
    switch (from) {
        case "planned":
            return ["fixture_prepared", "failed", "cleaned"].includes(to);
        case "fixture_prepared":
            return ["fixture_attached", "failed", "cleaned"].includes(to);
        case "fixture_attached":
            return ["worker_running", "failed", "cleaned"].includes(to);
        case "worker_running":
            return [
                "awaiting_ui_action",
                "observing",
                "failed",
                "cleaned",
            ].includes(to);
        case "awaiting_ui_action":
            return ["observing", "failed", "cleaned"].includes(to);
        case "observing":
            return ["verified", "failed", "cleaned"].includes(to);
        case "verified":
        case "failed":
            return to === "cleaned";
        case "cleaned":
            return false;
    }
}

export function createExerciseArtifactStore(): ExerciseArtifactStore {
    const readManifest = async (
        namespace: string,
    ): Promise<ExerciseManifest> => {
        const raw = await readFile(manifestPath(namespace), "utf8");
        return exerciseManifestSchema.parse(JSON.parse(raw));
    };

    return {
        createManifest: async (plan) => {
            const path = manifestPath(plan.namespace);
            const timestamp = new Date().toISOString();
            const manifest = exerciseManifestSchema.parse({
                schemaVersion: 2,
                kind: "conversation_email_update_dev_exercise",
                plan,
                state: "planned",
                revision: 0,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            await mkdir(storageDirectory, { recursive: true, mode: 0o700 });
            const temporaryPath = `${path}.${randomUUID()}.tmp`;
            const handle = await open(temporaryPath, "wx", 0o600);
            try {
                await handle.writeFile(
                    `${JSON.stringify(manifest, undefined, 2)}\n`,
                    "utf8",
                );
                await handle.sync();
            } finally {
                await handle.close();
            }
            try {
                await link(temporaryPath, path);
                await chmod(path, 0o600);
            } catch (error: unknown) {
                const parsed = nodeErrorSchema.safeParse(error);
                if (parsed.success && parsed.data.code === "EEXIST") {
                    throw new Error(
                        `Exercise manifest already exists for ${plan.namespace}`,
                    );
                }
                throw error;
            } finally {
                await rm(temporaryPath, { force: true });
            }
            return manifest;
        },
        readManifest,
        transitionManifest: async ({ namespace, to, fixture, lastError }) => {
            const current = await readManifest(namespace);
            if (!isAllowedTransition({ from: current.state, to })) {
                throw new Error(
                    `Invalid exercise lifecycle transition: ${current.state} -> ${to}`,
                );
            }
            const manifest = exerciseManifestSchema.parse({
                ...current,
                state: to,
                revision: current.revision + 1,
                updatedAt: new Date().toISOString(),
                fixture: fixture ?? current.fixture,
                lastError,
            });
            await writeJsonAtomic({
                path: manifestPath(namespace),
                value: manifest,
            });
            return manifest;
        },
        writeReport: async (report) => {
            const parsed = exerciseReportSchema.parse(report);
            const path = reportPath(parsed.namespace);
            await writeJsonAtomic({ path, value: parsed });
            return path;
        },
        readReport: async (namespace) => {
            const raw = await readFile(reportPath(namespace), "utf8");
            return exerciseReportSchema.parse(JSON.parse(raw));
        },
        readReportIfExists: async (namespace) => {
            try {
                const raw = await readFile(reportPath(namespace), "utf8");
                return exerciseReportSchema.parse(JSON.parse(raw));
            } catch (error: unknown) {
                const parsed = nodeErrorSchema.safeParse(error);
                if (parsed.success && parsed.data.code === "ENOENT") {
                    return undefined;
                }
                throw error;
            }
        },
        writeCapturedMessage: async ({ namespace, sequence, message }) => {
            const path = `${storageDirectory}/${namespace}.message-${sequence.toString().padStart(4, "0")}.json`;
            await writeJsonAtomic({ path, value: message });
            return path;
        },
    };
}

export function getExerciseArtifactDirectory(): string {
    return storageDirectory;
}
