import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
    mkdtemp,
    readFile,
    rename,
    rm,
    stat,
    utimes,
    writeFile,
} from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { acquireExerciseArtifactLock } from "./artifactLock.js";

const directories: string[] = [];

afterEach(async () => {
    await Promise.all(
        directories.splice(0).map(async (directory) => {
            await rm(directory, { recursive: true, force: true });
        }),
    );
});

async function temporaryDirectory(): Promise<string> {
    const directory = await mkdtemp(`${tmpdir()}/email-exercise-lock-`);
    directories.push(directory);
    return directory;
}

describe("development exercise artifact lock", () => {
    it("serializes the same namespace", async () => {
        const directory = await temporaryDirectory();
        const first = await acquireExerciseArtifactLock({
            namespace: "same-namespace",
            directory,
        });
        await expect(
            acquireExerciseArtifactLock({
                namespace: "same-namespace",
                directory,
            }),
        ).rejects.toThrow("is locked");
        await first.release();

        const second = await acquireExerciseArtifactLock({
            namespace: "same-namespace",
            directory,
        });
        await second.release();
    });

    it("keeps the ownership record immutable while heartbeating", async () => {
        const directory = await temporaryDirectory();
        const namespace = "heartbeat";
        const lockPath = `${directory}/${namespace}.lock`;
        const lock = await acquireExerciseArtifactLock({
            namespace,
            directory,
            heartbeatIntervalMs: 5,
        });
        const initialRecord = await readFile(lockPath, "utf8");
        const initialMtime = (await stat(lockPath)).mtimeMs;

        await new Promise((resolve) => setTimeout(resolve, 30));

        expect(await readFile(lockPath, "utf8")).toBe(initialRecord);
        expect((await stat(lockPath)).mtimeMs).toBeGreaterThan(initialMtime);
        await lock.release();
    });

    it("does not remove a replacement owner's lock during release", async () => {
        const directory = await temporaryDirectory();
        const namespace = "replacement-owner";
        const lockPath = `${directory}/${namespace}.lock`;
        const movedPath = `${lockPath}.moved`;
        const lock = await acquireExerciseArtifactLock({
            namespace,
            directory,
            heartbeatIntervalMs: 5,
        });
        await rename(lockPath, movedPath);
        const replacementRecord = `${JSON.stringify({
            ownerToken: randomUUID(),
            pid: process.pid,
            hostname: hostname(),
            acquiredAt: new Date().toISOString(),
        })}\n`;
        await writeFile(lockPath, replacementRecord);

        await lock.release();

        expect(await readFile(lockPath, "utf8")).toBe(replacementRecord);
    });

    it("refuses to recover a stale lock from a live same-host owner", async () => {
        const directory = await temporaryDirectory();
        const oldOwner = await acquireExerciseArtifactLock({
            namespace: "stale-namespace",
            directory,
            staleAfterMs: 5,
            heartbeatIntervalMs: 60_000,
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        await expect(
            acquireExerciseArtifactLock({
                namespace: "stale-namespace",
                directory,
                staleAfterMs: 5,
            }),
        ).rejects.toThrow("live process");
        await oldOwner.release();
    });

    it("recovers a stale lock only after proving its same-host owner is dead", async () => {
        const directory = await temporaryDirectory();
        const namespace = "dead-owner";
        const exitedProcess = spawnSync(process.execPath, ["-e", ""]);
        const lockPath = `${directory}/${namespace}.lock`;
        const oldTime = new Date(Date.now() - 60_000);
        await writeFile(
            lockPath,
            `${JSON.stringify({
                ownerToken: randomUUID(),
                pid: exitedProcess.pid,
                hostname: hostname(),
                acquiredAt: oldTime.toISOString(),
            })}\n`,
        );
        await utimes(lockPath, oldTime, oldTime);

        const recovered = await acquireExerciseArtifactLock({
            namespace,
            directory,
            staleAfterMs: 5,
        });
        await recovered.release();
    });

    it("refuses automatic recovery for a stale lock from another host", async () => {
        const directory = await temporaryDirectory();
        const namespace = "other-host";
        const lockPath = `${directory}/${namespace}.lock`;
        const oldTime = new Date(Date.now() - 60_000);
        await writeFile(
            lockPath,
            `${JSON.stringify({
                ownerToken: randomUUID(),
                pid: process.pid,
                hostname: "another-host.invalid",
                acquiredAt: oldTime.toISOString(),
            })}\n`,
        );
        await utimes(lockPath, oldTime, oldTime);

        await expect(
            acquireExerciseArtifactLock({
                namespace,
                directory,
                staleAfterMs: 5,
            }),
        ).rejects.toThrow("another-host.invalid");
    });
});
