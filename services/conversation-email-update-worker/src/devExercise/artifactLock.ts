import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { z } from "zod";
import { getExerciseArtifactDirectory } from "./manifestStore.js";

const lockRecordSchema = z
    .object({
        ownerToken: z.uuid(),
        pid: z.number().int().positive(),
        acquiredAt: z.iso.datetime(),
        heartbeatAt: z.iso.datetime(),
    })
    .strict();
const nodeErrorSchema = z.object({ code: z.string() }).loose();

export interface ExerciseArtifactLock {
    release: () => Promise<void>;
}

function isNodeErrorCode({ error, code }: { error: unknown; code: string }) {
    const parsed = nodeErrorSchema.safeParse(error);
    return parsed.success && parsed.data.code === code;
}

async function writeLockRecord({
    handle,
    record,
}: {
    handle: Awaited<ReturnType<typeof open>>;
    record: z.infer<typeof lockRecordSchema>;
}): Promise<void> {
    await handle.truncate(0);
    await handle.write(`${JSON.stringify(record)}\n`, 0, "utf8");
    await handle.sync();
}

export async function acquireExerciseArtifactLock({
    namespace,
    directory = getExerciseArtifactDirectory(),
    staleAfterMs = 30_000,
    heartbeatIntervalMs = 5_000,
}: {
    namespace: string;
    directory?: string;
    staleAfterMs?: number;
    heartbeatIntervalMs?: number;
}): Promise<ExerciseArtifactLock> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const lockPath = `${directory}/${namespace}.lock`;
    const ownerToken = randomUUID();
    let stalePath: string | undefined;
    let handle: Awaited<ReturnType<typeof open>> | undefined;

    while (handle === undefined) {
        try {
            handle = await open(lockPath, "wx", 0o600);
        } catch (error: unknown) {
            if (!isNodeErrorCode({ error, code: "EEXIST" })) throw error;
            const observedRaw = await readFile(lockPath, "utf8");
            const observed = lockRecordSchema.parse(JSON.parse(observedRaw));
            const lockStats = await stat(lockPath);
            if (Date.now() - lockStats.mtimeMs <= staleAfterMs) {
                throw new Error(
                    `Exercise namespace ${namespace} is locked by process ${String(observed.pid)}`,
                );
            }
            const candidateStalePath = `${lockPath}.${observed.ownerToken}.stale`;
            try {
                await rename(lockPath, candidateStalePath);
            } catch (renameError: unknown) {
                if (isNodeErrorCode({ error: renameError, code: "ENOENT" })) {
                    continue;
                }
                throw renameError;
            }
            const moved = lockRecordSchema.parse(
                JSON.parse(await readFile(candidateStalePath, "utf8")),
            );
            if (moved.ownerToken !== observed.ownerToken) {
                try {
                    await rename(candidateStalePath, lockPath);
                } catch {
                    // Leave both files intact rather than risk removing another owner.
                }
                throw new Error(
                    `Exercise namespace ${namespace} lock changed during stale recovery`,
                );
            }
            stalePath = candidateStalePath;
        }
    }

    const acquiredAt = new Date().toISOString();
    await writeLockRecord({
        handle,
        record: {
            ownerToken,
            pid: process.pid,
            acquiredAt,
            heartbeatAt: acquiredAt,
        },
    });
    if (stalePath !== undefined) await rm(stalePath, { force: true });

    let released = false;
    const heartbeat = setInterval(() => {
        void writeLockRecord({
            handle,
            record: {
                ownerToken,
                pid: process.pid,
                acquiredAt,
                heartbeatAt: new Date().toISOString(),
            },
        }).catch(() => undefined);
    }, heartbeatIntervalMs);
    heartbeat.unref();

    return {
        release: async () => {
            if (released) return;
            released = true;
            clearInterval(heartbeat);
            const ownedStats = await handle.stat();
            try {
                const currentStats = await stat(lockPath);
                const current = lockRecordSchema.parse(
                    JSON.parse(await readFile(lockPath, "utf8")),
                );
                if (
                    current.ownerToken === ownerToken &&
                    currentStats.dev === ownedStats.dev &&
                    currentStats.ino === ownedStats.ino
                ) {
                    await rm(lockPath);
                }
            } catch (error: unknown) {
                if (!isNodeErrorCode({ error, code: "ENOENT" })) throw error;
            } finally {
                await handle.close();
            }
        },
    };
}

export async function withExerciseArtifactLock<T>({
    namespace,
    operation,
}: {
    namespace: string;
    operation: () => Promise<T>;
}): Promise<T> {
    const lock = await acquireExerciseArtifactLock({ namespace });
    try {
        return await operation();
    } finally {
        await lock.release();
    }
}
