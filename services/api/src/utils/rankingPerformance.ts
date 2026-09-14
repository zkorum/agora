import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import type { FastifyBaseLogger } from "fastify";

type Phase =
    | "authentication"
    | "participation"
    | "transaction"
    | "uncertainty"
    | "routing"
    | "load";

export interface RankingPerformance {
    measure: <T>(params: { phase: Phase; run: () => Promise<T> }) => Promise<T>;
    measureSync: <T>(params: { phase: Phase; run: () => T }) => T;
    finish: (outcome: "success" | "failure" | "blocked") => void;
}

export function createRankingPerformance({
    enabled,
    logger,
    requestId,
    conversationSlugId,
    operation,
    historyLength,
}: {
    enabled: boolean;
    logger: Pick<FastifyBaseLogger, "info">;
    requestId: string;
    conversationSlugId: string;
    operation: "save" | "load";
    historyLength: number | undefined;
}): RankingPerformance {
    const started = performance.now();
    const durations: Partial<Record<Phase, number>> = {};
    function record({ phase, since }: { phase: Phase; since: number }): void {
        durations[phase] = (durations[phase] ?? 0) + performance.now() - since;
    }
    return {
        async measure({ phase, run }) {
            if (!enabled) return await run();
            const since = performance.now();
            try {
                return await run();
            } finally {
                record({ phase, since });
            }
        },
        measureSync({ phase, run }) {
            if (!enabled) return run();
            const since = performance.now();
            try {
                return run();
            } finally {
                record({ phase, since });
            }
        },
        finish(outcome) {
            if (!enabled) return;
            logger.info(
                "AGORA_LOAD_EVENT %s",
                JSON.stringify({
                    schemaVersion: 1,
                    timestamp: new Date().toISOString(),
                    scenario: "solidago-ranking",
                    phase: "api",
                    action: "request_completed",
                    outcome,
                    conversationSlugId,
                    responseTimeMs: performance.now() - started,
                    metadata: {
                        requestId,
                        operation,
                        historyLength,
                        ...durations,
                    },
                }),
            );
        },
    };
}

export function startRankingResourceLogging(
    logger: Pick<FastifyBaseLogger, "info">,
): () => void {
    const delay = monitorEventLoopDelay({ resolution: 20 });
    delay.enable();
    let cpu = process.cpuUsage();
    let since = performance.now();
    const timer = setInterval(() => {
        const now = performance.now();
        const usage = process.cpuUsage();
        const elapsedMs = now - since;
        const memory = process.memoryUsage();
        logger.info(
            "AGORA_LOAD_EVENT %s",
            JSON.stringify({
                schemaVersion: 1,
                timestamp: new Date().toISOString(),
                scenario: "solidago-ranking",
                phase: "api",
                action: "resource_sample",
                outcome: "info",
                metadata: {
                    pid: process.pid,
                    elapsedMs,
                    cpuPercent:
                        ((usage.user - cpu.user + usage.system - cpu.system) /
                            (elapsedMs * 1000)) *
                        100,
                    rssBytes: memory.rss,
                    heapUsedBytes: memory.heapUsed,
                    eventLoopP99Ms: delay.percentile(99) / 1e6,
                    eventLoopMaxMs: delay.max / 1e6,
                },
            }),
        );
        cpu = usage;
        since = now;
        delay.reset();
    }, 5000);
    timer.unref();
    return () => {
        clearInterval(timer);
        delay.disable();
    };
}
