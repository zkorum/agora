import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { command, emit, root } from "./io.ts";
import { errorMessage, type Revision } from "./protocol.ts";
import { replicaCaughtUp } from "./report.ts";

export interface Diagnostic {
    stage: string;
    message: string;
}
export function createObserver() {
    const diagnostics: Diagnostic[] = [];
    return {
        diagnostics,
        async observe<T>({
            stage,
            run,
        }: {
            stage: string;
            run: () => Promise<T>;
        }): Promise<T | undefined> {
            try {
                return await run();
            } catch (error) {
                const diagnostic = { stage, message: errorMessage(error) };
                diagnostics.push(diagnostic);
                emit({
                    action: "observation_failed",
                    outcome: "failure",
                    metadata: diagnostic,
                });
                return undefined;
            }
        },
    };
}
export type Observer = ReturnType<typeof createObserver>;

export function watchInterruption() {
    const controller = new AbortController();
    const onSignal = () => {
        controller.abort();
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    return {
        signal: controller.signal,
        close() {
            process.off("SIGINT", onSignal);
            process.off("SIGTERM", onSignal);
        },
    };
}

export function startSampler({
    collect,
    observer,
}: {
    collect: () => Promise<void>;
    observer: Observer;
}) {
    const stop = new AbortController();
    const done = (async () => {
        while (!stop.signal.aborted) {
            const started = performance.now();
            await observer.observe({ stage: "resource_sample", run: collect });
            try {
                await delay(
                    Math.max(50, 5000 - (performance.now() - started)),
                    undefined,
                    { signal: stop.signal },
                );
            } catch (error) {
                if (!(error instanceof Error && error.name === "AbortError"))
                    throw error;
            }
        }
    })();
    return async () => {
        stop.abort();
        await done;
    };
}

export interface WorkloadExit {
    exitCode: number;
    signal: NodeJS.Signals | null;
    finishedAt: string;
}
export async function runWorkload({
    summaryFile,
    signal,
    onSpawn,
}: {
    summaryFile: string;
    signal: AbortSignal;
    onSpawn: (pid: number | undefined) => void;
}): Promise<WorkloadExit> {
    signal.throwIfAborted();
    const child = spawn(
        "k6",
        [
            "run",
            "--summary-export",
            summaryFile,
            "services/load-testing/dist/scenario2-solidago-ranking.cjs",
        ],
        { cwd: root, env: process.env, stdio: "inherit" },
    );
    // Attach listeners before starting asynchronous sampling: even an immediate
    // startup failure or exit must settle the workload promise.
    const exit = new Promise<WorkloadExit>((resolve, reject) => {
        child.once("error", () => {
            reject(new Error("Unable to start k6"));
        });
        child.once("exit", (exitCode, exitSignal) => {
            resolve({
                exitCode: exitCode ?? 1,
                signal: exitSignal,
                finishedAt: new Date().toISOString(),
            });
        });
    });
    let escalation: ReturnType<typeof setTimeout> | undefined;
    const terminate = () => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        child.kill("SIGTERM");
        escalation ??= setTimeout(() => child.kill("SIGKILL"), 10000);
        escalation.unref();
    };
    signal.addEventListener("abort", terminate, { once: true });
    try {
        onSpawn(child.pid);
        if (signal.aborted) terminate();
        return await exit;
    } finally {
        if (
            child.pid !== undefined &&
            child.exitCode === null &&
            child.signalCode === null
        ) {
            terminate();
            try {
                await exit;
            } catch {
                /* Preserve the original startup/observer failure. */
            }
        }
        if (escalation !== undefined) clearTimeout(escalation);
        signal.removeEventListener("abort", terminate);
    }
}

export type FreshnessObservation =
    | { status: "caught_up"; observedAt: string; revisions: Revision[] }
    | { status: "timeout" | "interrupted"; revisions: Revision[] };
export async function waitForFreshness({
    readPrimary,
    readReplica,
    signal,
    timeoutSeconds,
    expectedCount,
}: {
    readPrimary: () => Promise<Revision[]>;
    readReplica: () => Promise<Revision[]>;
    signal: AbortSignal;
    timeoutSeconds: number;
    expectedCount: number;
}): Promise<FreshnessObservation> {
    const deadline = performance.now() + timeoutSeconds * 1000;
    let revisions: Revision[] = [];
    while (!signal.aborted) {
        revisions = await readPrimary();
        const replica = await readReplica();
        if (
            revisions.length === expectedCount &&
            replicaCaughtUp({ primary: revisions, replica })
        ) {
            return {
                status: "caught_up",
                observedAt: new Date().toISOString(),
                revisions,
            };
        }
        if (performance.now() >= deadline)
            return { status: "timeout", revisions };
        try {
            await delay(1000, undefined, { signal });
        } catch (error) {
            if (!(error instanceof Error && error.name === "AbortError"))
                throw error;
        }
    }
    return { status: "interrupted", revisions };
}

export async function nativeProcesses({
    k6Pid,
    apiPid,
    workerPid,
    observerPid,
    probePid,
}: {
    k6Pid: number | undefined;
    apiPid: number;
    workerPid: number;
    observerPid: number;
    probePid: number;
}) {
    const roles = new Map([
        [apiPid, "api"],
        [workerPid, "scoring-worker"],
    ]);
    if (k6Pid !== undefined) roles.set(k6Pid, "k6");
    roles.set(observerPid, "observer");
    roles.set(probePid, "database-probe");
    const text = await command({
        program: "ps",
        args: ["-axo", "pid=,pcpu=,rss="],
    });
    const processes: {
        role: string;
        pid: number;
        cpuPercentApprox: number;
        rssBytes: number;
    }[] = [];
    for (const line of text.split("\n")) {
        const match = /^(\d+)\s+([\d.]+)\s+(\d+)$/.exec(line.trim());
        if (!match) continue;
        const pid = Number(match[1]);
        const role = roles.get(pid);
        if (role)
            processes.push({
                role,
                pid,
                cpuPercentApprox: z
                    .number()
                    .nonnegative()
                    .parse(Number(match[2])),
                rssBytes: Number(match[3]) * 1024,
            });
    }
    if (
        ![apiPid, workerPid].every((pid) =>
            processes.some((row) => row.pid === pid),
        )
    )
        throw new Error(
            "Monitored service process missing from native resource sample",
        );
    return processes;
}
