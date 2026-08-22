import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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

    it("recovers stale locks without letting the old owner delete the new lock", async () => {
        const directory = await temporaryDirectory();
        const oldOwner = await acquireExerciseArtifactLock({
            namespace: "stale-namespace",
            directory,
            staleAfterMs: 5,
            heartbeatIntervalMs: 60_000,
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        const newOwner = await acquireExerciseArtifactLock({
            namespace: "stale-namespace",
            directory,
            staleAfterMs: 5,
            heartbeatIntervalMs: 60_000,
        });

        await oldOwner.release();
        await expect(
            acquireExerciseArtifactLock({
                namespace: "stale-namespace",
                directory,
            }),
        ).rejects.toThrow("is locked");
        await newOwner.release();
    });
});
