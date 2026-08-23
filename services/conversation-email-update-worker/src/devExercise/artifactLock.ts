import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { hostname } from "node:os";
import { z } from "zod";
import { getExerciseArtifactDirectory } from "./manifestStore.js";

const lockRecordSchema = z
    .object({
        ownerToken: z.uuid(),
        pid: z.number().int().positive(),
        hostname: z.string().min(1),
        acquiredAt: z.iso.datetime(),
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

function processIsAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error: unknown) {
        if (isNodeErrorCode({ error, code: "ESRCH" })) return false;
        if (isNodeErrorCode({ error, code: "EPERM" })) return true;
        throw error;
    }
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
            let observedRaw: string;
            let lockStats: Awaited<ReturnType<typeof stat>>;
            try {
                observedRaw = await readFile(lockPath, "utf8");
                lockStats = await stat(lockPath);
            } catch (readError: unknown) {
                if (isNodeErrorCode({ error: readError, code: "ENOENT" })) {
                    continue;
                }
                throw readError;
            }
            const observed = lockRecordSchema.parse(JSON.parse(observedRaw));
            if (Date.now() - lockStats.mtimeMs <= staleAfterMs) {
                throw new Error(
                    `Exercise namespace ${namespace} is locked by process ${String(observed.pid)}`,
                );
            }
            const currentHostname = hostname();
            if (observed.hostname !== currentHostname) {
                throw new Error(
                    `Exercise namespace ${namespace} has a stale lock from host ${observed.hostname}; refusing automatic recovery`,
                );
            }
            if (processIsAlive(observed.pid)) {
                throw new Error(
                    `Exercise namespace ${namespace} has a stale lock owned by live process ${String(observed.pid)}; refusing automatic recovery`,
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
            hostname: hostname(),
            acquiredAt,
        },
    });
    if (stalePath !== undefined) await rm(stalePath, { force: true });

    let released = false;
    let heartbeatError: unknown;
    let heartbeatPromise = Promise.resolve();
    const heartbeat = setInterval(() => {
        heartbeatPromise = heartbeatPromise
            .then(async () => {
                if (heartbeatError !== undefined) return;
                const now = new Date();
                // Updating the owned inode keeps the lock record immutable and
                // cannot refresh a replacement owner's path.
                await handle.utimes(now, now);
            })
            .catch((error: unknown) => {
                heartbeatError = error;
            });
    }, heartbeatIntervalMs);
    heartbeat.unref();

    return {
        release: async () => {
            if (released) return;
            released = true;
            clearInterval(heartbeat);
            await heartbeatPromise;
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
            if (heartbeatError !== undefined) {
                throw new Error("Exercise namespace lock heartbeat failed", {
                    cause: heartbeatError,
                });
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
