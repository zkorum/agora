import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { cpus, totalmem, platform, arch } from "node:os";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseSolidagoConfig } from "../../src/utils/solidagoWorkload.ts";
import { evaluateRanking } from "../../src/utils/rankingStrategies.ts";
import {
    command,
    createDatabaseReader,
    emit,
    latestConfiguration,
    readEventWindow,
    waitForCapture,
    writeJson,
    root,
} from "./io.ts";
import {
    databaseSampleSchema,
    errorMessage,
    historySchema,
    itemManifestSchema,
    loggingConfigSchema,
    parseJson,
    querySnapshotSchema,
    rankingResponseSchema,
    revisionsSchema,
    scoresSchema,
    settingsSchema,
    summarySchema,
    type Revision,
} from "./protocol.ts";
import {
    queryDeltas,
    sameRevisions,
    scoresMatch,
    summarizeEvents,
    verifyEventCounts,
} from "./report.ts";
import {
    createObserver,
    nativeProcesses,
    runWorkload,
    startSampler,
    waitForFreshness,
    watchInterruption,
    type Observer,
    type WorkloadExit,
    type FreshnessObservation,
} from "./collector.ts";
import { databaseSampleSql, settingsSql } from "./sql.ts";
import {
    startApplicationReader,
    type ApplicationReader,
} from "./applicationReader.ts";
import { containerInfoSchema, createContainerSampler } from "./containers.ts";

const monitoringConfigSchema = z.object({
    PERF_POSTGRES_CONTAINER: z.string().min(1).default("postgres_container"),
    PERF_REPLICA_CONTAINER: z
        .string()
        .min(1)
        .default("postgres_replica_container"),
    PERF_VALKEY_CONTAINER: z.string().min(1).default("valkey_container"),
    PERF_DATABASE: z.string().min(1).default("agora"),
    PERF_DATABASE_USER: z.string().min(1).default("postgres"),
    PERF_DRAIN_TIMEOUT_SECONDS: z.coerce.number().min(0).max(3600).default(300),
    PERF_MAX_EVENTS: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000000)
        .default(200000),
    PERF_EXPLAIN: z
        .enum(["true", "false"])
        .default("true")
        .transform((value) => value === "true"),
});
type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;
const pathsSchema = z.object({
    AGORA_LOG_RUN_DIR: z.string(),
    AGORA_LOG_LATEST_DIR: z.string(),
    AGORA_LOG_SUMMARY_FILE: z.string(),
    AGORA_LOG_EVENT_FILE: z.string(),
    AGORA_LOG_RUN_ID: z.string(),
});

async function preflight({
    monitor,
    application,
}: {
    monitor: MonitoringConfig;
    application: ApplicationReader;
}) {
    const paths = pathsSchema.parse(process.env);
    const config = parseSolidagoConfig(process.env);
    const apiOrigin = new URL(config.apiBaseUrl);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(apiOrigin.hostname))
        throw new Error("The performance observer requires a local API origin");
    const sql = createDatabaseReader({
        database: monitor.PERF_DATABASE,
        user: monitor.PERF_DATABASE_USER,
    });
    const primary = monitor.PERF_POSTGRES_CONTAINER;
    const replica = monitor.PERF_REPLICA_CONTAINER;
    const primarySettings = await sql({
        container: primary,
        query: settingsSql,
        schema: settingsSchema,
    });
    const replicaSettings = await sql({
        container: replica,
        query: settingsSql,
        schema: settingsSchema,
    });
    if (
        [primarySettings, replicaSettings].some(
            (settings) =>
                !settings.extensionInstalled ||
                settings.settings.track_io_timing !== "on" ||
                settings.settings.track_wal_io_timing !== "on",
        )
    )
        throw new Error("Run make prepare-ranking-monitoring first");
    const readRevisions = (role: "primary" | "replica") =>
        application.query({
            request: {
                operation: "revisions",
                role,
                slugs: config.conversations,
            },
            schema: revisionsSchema,
        });
    const initialRevisions = await readRevisions("primary");
    if (initialRevisions.length !== config.conversations.length)
        throw new Error(
            "Create the requested local ranking fixtures before running performance tests",
        );
    async function serviceConfiguration(name: string) {
        const path = await realpath(
            resolve(paths.AGORA_LOG_LATEST_DIR, `${name}.events.jsonl`),
        );
        const event = await latestConfiguration(path);
        if (!event)
            throw new Error(
                `Restart ${name} with performance instrumentation enabled`,
            );
        const configuration = loggingConfigSchema.parse(event.metadata);
        if (!configuration.performanceEnabled)
            throw new Error(
                `Restart ${name} with performance instrumentation enabled`,
            );
        process.kill(configuration.pid, 0);
        return { path, configuration };
    }
    const api = await serviceConfiguration("api");
    const worker = await serviceConfiguration("scoring-worker");
    emit({ action: "preflight_stage", metadata: { stage: "build_load_test" } });
    await command({
        program: "node",
        args: [
            "--input-type=module",
            "-e",
            "import { build } from 'vite'; await build();",
        ],
        cwd: resolve(root, "services/load-testing"),
        timeoutMs: 120000,
    });
    emit({
        action: "preflight_stage",
        metadata: { stage: "container_resources" },
    });
    const runtime = {
        commit: await command({ program: "git", args: ["rev-parse", "HEAD"] }),
        dirty: Boolean(
            await command({ program: "git", args: ["status", "--porcelain"] }),
        ),
        node: process.version,
        k6: await command({ program: "k6", args: ["version"] }),
        platform: platform(),
        arch: arch(),
        hostCpuCount: cpus().length,
        hostMemoryBytes: totalmem(),
        dockerResources: parseJson({
            text: await command({
                program: "docker",
                args: ["info", "--format", "{{json .}}"],
            }),
            schema: containerInfoSchema,
            label: "container engine info",
        }),
    };
    return {
        paths,
        config,
        monitor,
        apiOrigin,
        sql,
        primary,
        replica,
        primarySettings,
        replicaSettings,
        readRevisions,
        initialRevisions,
        api,
        worker,
        application,
        runtime,
        readContainers: createContainerSampler([
            primary,
            replica,
            monitor.PERF_VALKEY_CONTAINER,
        ]),
    };
}
type Context = Awaited<ReturnType<typeof preflight>>;

async function databaseSnapshots(context: Context) {
    const { config } = context;
    return {
        primary: await context.application.query({
            request: { operation: "query-stats", role: "primary" },
            schema: querySnapshotSchema,
        }),
        replica: await context.application.query({
            request: { operation: "query-stats", role: "replica" },
            schema: querySnapshotSchema,
        }),
        history: await context.application.query({
            request: {
                operation: "history",
                role: "primary",
                slugs: config.conversations,
            },
            schema: historySchema,
        }),
    };
}
async function resourceSample({
    context,
    k6Pid,
}: {
    context: Context;
    k6Pid: number | undefined;
}): Promise<void> {
    const { sql, primary, monitor } = context;
    const started = performance.now();
    const [revisions, database, queue, processes, containers] =
        await Promise.all([
            context.readRevisions("primary"),
            sql({
                container: primary,
                query: databaseSampleSql,
                schema: databaseSampleSchema,
            }),
            command({
                program: "docker",
                args: [
                    "exec",
                    monitor.PERF_VALKEY_CONTAINER,
                    "valkey-cli",
                    "ZCARD",
                    "scoring:dirty:solidago",
                ],
            }),
            nativeProcesses({
                k6Pid,
                apiPid: context.api.configuration.pid,
                workerPid: context.worker.configuration.pid,
                observerPid: process.pid,
                probePid: context.application.pid,
            }),
            context.readContainers(),
        ]);
    emit({
        action: "resource_sample",
        metadata: {
            revisions,
            database,
            processes,
            queueDepth: z.coerce.number().int().nonnegative().parse(queue),
            containers,
            sampleDurationMs: performance.now() - started,
        },
    });
}

async function evaluatePublished({
    context,
    revisions,
    events,
    before,
    observer,
    signal,
}: {
    context: Context;
    revisions: Revision[];
    events: Awaited<ReturnType<typeof readEventWindow>>["events"];
    before: Awaited<ReturnType<typeof databaseSnapshots>>;
    observer: Observer;
    signal: AbortSignal;
}) {
    const { config, apiOrigin } = context;
    const results = [];
    for (const revision of revisions) {
        if (signal.aborted) break;
        const result = await observer.observe({
            stage: `evaluate:${revision.slug_id}`,
            run: async () => {
                const event = events.find(
                    (e) =>
                        e.phase === "setup" &&
                        e.action === "item_manifest" &&
                        e.conversationSlugId === revision.slug_id,
                );
                const manifest = itemManifestSchema.parse(event?.metadata);
                if (
                    manifest.strategy !== config.strategy ||
                    manifest.seed !== config.seed
                )
                    throw new Error(
                        "Item manifest does not match the configured voting strategy",
                    );
                if (revision.snapshot_id === null)
                    throw new Error("No published snapshot to verify");
                const writerScores = await context.application.query({
                    request: {
                        operation: "scores",
                        role: "primary",
                        snapshotId: revision.snapshot_id,
                    },
                    schema: scoresSchema,
                });
                const response = await fetch(
                    new URL("/api/v1/ranking/bws/results", apiOrigin),
                    {
                        method: "POST",
                        redirect: "error",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            conversationSlugId: revision.slug_id,
                            lifecycleFilter: "active",
                            requestedRankingStatsSnapshotId:
                                revision.snapshot_id,
                        }),
                        signal: AbortSignal.any([
                            signal,
                            AbortSignal.timeout(30000),
                        ]),
                    },
                );
                if (!response.ok)
                    throw new Error(
                        `Final ranking fetch failed: HTTP ${String(response.status)}`,
                    );
                const data = parseJson({
                    text: await response.text(),
                    schema: rankingResponseSchema,
                    label: "ranking results",
                });
                const preexistingComparisons =
                    before.history.find(
                        (row) => row.slug_id === revision.slug_id,
                    )?.active_comparisons ?? 0;
                return {
                    conversationSlugId: revision.slug_id,
                    snapshotId: revision.snapshot_id,
                    strategy: manifest.strategy,
                    ...evaluateRanking({
                        itemOrder: manifest.itemOrder,
                        rankings: data.rankings,
                    }),
                    referenceIsGroundTruth:
                        preexistingComparisons === 0 &&
                        ["unanimous", "noisy", "sparse"].includes(
                            manifest.strategy,
                        ),
                    preexistingComparisons,
                    apiMatchesPublishedSnapshot: scoresMatch({
                        expected: writerScores,
                        observed: data.rankings,
                    }),
                    rankings: data.rankings,
                };
            },
        });
        if (result) results.push(result);
    }
    const final = await observer.observe({
        stage: "final_freshness",
        run: async () => ({
            primary: await context.readRevisions("primary"),
            replica: await context.readRevisions("replica"),
        }),
    });
    const stable =
        final !== undefined &&
        sameRevisions({ expected: revisions, observed: final.primary }) &&
        sameRevisions({ expected: revisions, observed: final.replica });
    return {
        verified:
            stable &&
            results.length === config.conversations.length &&
            results.every((result) => result.apiMatchesPublishedSnapshot),
        finalRevisions: final?.primary,
        evaluations: results.map((result) => ({
            ...result,
            writerCaughtUp: stable,
            replicaFreshnessVerified: stable,
        })),
    };
}

async function collect(context: Context): Promise<number> {
    const { paths, config, monitor } = context;
    const artifactDir = resolve(
        paths.AGORA_LOG_RUN_DIR,
        `ranking-performance-${String(Date.now())}-${String(process.pid)}`,
    );
    await mkdir(artifactDir);
    const observer = createObserver();
    const interruption = watchInterruption();
    const started = Date.now();
    try {
        const manifest = {
            startedAt: new Date(started).toISOString(),
            runId: paths.AGORA_LOG_RUN_ID,
            ...context.runtime,
            workload: {
                ...config,
                itemOrders: Object.fromEntries(config.itemOrders),
            },
            configurations: [
                context.api.configuration,
                context.worker.configuration,
            ],
            diagnosticsProcessPid: context.application.pid,
            postgres: context.primarySettings,
            replica: context.replicaSettings,
            initialRevisions: context.initialRevisions,
            sources: {
                apiEvents: context.api.path,
                workerEvents: context.worker.path,
                eventFile: paths.AGORA_LOG_EVENT_FILE,
            },
        };
        await writeJson({
            path: resolve(artifactDir, "manifest.json"),
            data: manifest,
        });
        const before = await observer.observe({
            stage: "before",
            run: () => databaseSnapshots(context),
        });
        if (before)
            await writeJson({
                path: resolve(artifactDir, "before.json"),
                data: before,
            });
        emit({
            action: "run_started",
            metadata: {
                artifactDir,
                conversations: config.conversations.join(","),
                sampleIntervalMs: 5000,
            },
        });
        let workload: WorkloadExit | undefined;
        let freshness: FreshnessObservation | undefined;
        let stopSampling: (() => Promise<void>) | undefined;
        try {
            if (before && !interruption.signal.aborted) {
                workload = await observer.observe({
                    stage: "workload",
                    run: () =>
                        runWorkload({
                            summaryFile: paths.AGORA_LOG_SUMMARY_FILE,
                            signal: interruption.signal,
                            onSpawn(k6Pid) {
                                stopSampling = startSampler({
                                    observer,
                                    collect: () =>
                                        resourceSample({ context, k6Pid }),
                                });
                            },
                        }),
                });
            }
            freshness = workload
                ? await observer.observe({
                      stage: "drain",
                      run: () =>
                          waitForFreshness({
                              readPrimary: () =>
                                  context.readRevisions("primary"),
                              readReplica: () =>
                                  context.readRevisions("replica"),
                              signal: interruption.signal,
                              timeoutSeconds:
                                  monitor.PERF_DRAIN_TIMEOUT_SECONDS,
                              expectedCount: config.conversations.length,
                          }),
                  })
                : undefined;
        } finally {
            await stopSampling?.();
        }
        const after = await observer.observe({
            stage: "after",
            run: () => databaseSnapshots(context),
        });
        if (after)
            await writeJson({
                path: resolve(artifactDir, "after.json"),
                data: after,
            });
        await observer.observe({
            stage: "capture",
            run: () =>
                waitForCapture({
                    path: paths.AGORA_LOG_EVENT_FILE,
                    markerId: randomUUID(),
                }),
        });
        const captured = await observer.observe({
            stage: "events",
            run: () =>
                readEventWindow({
                    paths: [
                        paths.AGORA_LOG_EVENT_FILE,
                        context.api.path,
                        context.worker.path,
                    ],
                    since: started,
                    until: Date.now(),
                    maximum: monitor.PERF_MAX_EVENTS,
                }),
        });
        const events = captured?.events ?? [];
        const summary = workload
            ? await observer.observe({
                  stage: "summary",
                  run: async () =>
                      parseJson({
                          text: await readFile(
                              paths.AGORA_LOG_SUMMARY_FILE,
                              "utf8",
                          ),
                          schema: summarySchema,
                          label: "k6 summary",
                      }),
              })
            : undefined;
        const evaluation =
            before && freshness?.status === "caught_up"
                ? await evaluatePublished({
                      context,
                      revisions: freshness.revisions,
                      events,
                      before,
                      observer,
                      signal: interruption.signal,
                  })
                : undefined;
        const measured = summarizeEvents({
            events,
            slugs: config.conversations,
        });
        const completeParticipantEventCapture =
            summary !== undefined && verifyEventCounts({ summary, measured });
        const serviceInstrumentationObserved = config.conversations.every(
            (slug) =>
                events.some(
                    (e) =>
                        e.phase === "api" &&
                        e.action === "request_completed" &&
                        e.conversationSlugId === slug,
                ) &&
                events.some(
                    (e) =>
                        e.phase === "scoring-worker" &&
                        e.action === "publication_completed" &&
                        e.conversationSlugId === slug,
                ),
        );
        await observer.observe({
            stage: "service_identity",
            run: () => {
                process.kill(context.api.configuration.pid, 0);
                process.kill(context.worker.configuration.pid, 0);
                if (
                    events.some(
                        (e) =>
                            ["api", "scoring-worker"].includes(e.phase) &&
                            e.action === "logging_configured",
                    )
                )
                    throw new Error(
                        "Service configuration changed during the run",
                    );
                return Promise.resolve();
            },
        });
        const plans: { name: string; available: boolean }[] = [];
        const heaviest = freshness?.revisions
            .toSorted((a, b) => b.vote_count - a.vote_count)
            .at(0);
        if (monitor.PERF_EXPLAIN && heaviest && !interruption.signal.aborted) {
            for (const name of ["uncertainty", "comparisons"] as const) {
                const plan = await observer.observe({
                    stage: `plan:${name}`,
                    run: () =>
                        context.application.query({
                            request: {
                                operation: "plan",
                                role: "primary",
                                conversationId: heaviest.id,
                                kind: name,
                            },
                            schema: z.array(z.record(z.string(), z.json())),
                        }),
                });
                plans.push({ name, available: plan !== undefined });
                if (plan)
                    await writeJson({
                        path: resolve(artifactDir, `${name}-plan.json`),
                        data: plan,
                    });
            }
        }
        const queries =
            before && after
                ? {
                      primary: queryDeltas({
                          before: before.primary,
                          after: after.primary,
                      }),
                      replica: queryDeltas({
                          before: before.replica,
                          after: after.replica,
                      }),
                  }
                : undefined;
        const verified = evaluation?.verified === true;
        const drainedAt =
            verified && freshness?.status === "caught_up"
                ? freshness.observedAt
                : null;
        const report = {
            manifest,
            exitCode: workload?.exitCode ?? null,
            workloadStarted: workload !== undefined,
            interrupted: interruption.signal.aborted,
            loadFinishedAt: workload?.finishedAt ?? null,
            freshness,
            drainedAt,
            drainSeconds:
                drainedAt && workload
                    ? Math.max(
                          0,
                          (Date.parse(drainedAt) -
                              Date.parse(workload.finishedAt)) /
                              1000,
                      )
                    : null,
            finalFreshnessVerified: verified,
            finalRevisions: evaluation?.finalRevisions ?? freshness?.revisions,
            diagnostics: observer.diagnostics,
            eventReadIssues: captured?.issues ?? [],
            sampleFailures: observer.diagnostics.filter(
                (item) => item.stage === "resource_sample",
            ).length,
            completeParticipantEventCapture,
            serviceInstrumentationObserved,
            workloadSummary: summary,
            measurements: measured,
            evaluations: evaluation?.evaluations ?? [],
            queries,
            plans,
            history: { before: before?.history, after: after?.history },
        };
        await writeJson({
            path: resolve(artifactDir, "report.json"),
            data: report,
        });
        await writeFile(
            resolve(artifactDir, "report.md"),
            `# Ranking performance run

- Commit: ${manifest.commit}
- Workload exit: ${String(report.exitCode)}
- Final freshness verified: ${String(verified)}
- Scoring drain: ${String(report.drainSeconds ?? "unverified")} seconds
- Batches with publications: ${String(measured.publishedBatches)}
- Batches with invalidations: ${String(measured.rejectedBatches)}
- Batches without publications: ${String(measured.skippedBatches)}
- Diagnostics: ${String(observer.diagnostics.length)}
- Participant events complete: ${String(completeParticipantEventCapture)}

See report.json for per-conversation timings, query deltas, revisions, diagnostics and ranking evaluations. A partially published batch can also contain invalidations. Overlapping phase durations must not be summed.
`,
        );
        emit({
            action: "performance_report_written",
            metadata: {
                reportPath: resolve(artifactDir, "report.json"),
                drainSeconds: report.drainSeconds,
            },
        });
        if (workload && workload.exitCode !== 0) return workload.exitCode;
        return interruption.signal.aborted ||
            !workload ||
            !verified ||
            observer.diagnostics.length > 0 ||
            (captured?.issues.length ?? 1) > 0 ||
            !completeParticipantEventCapture ||
            !serviceInstrumentationObserved ||
            !queries?.primary.comparable ||
            !queries.replica.comparable
            ? 1
            : 0;
    } finally {
        interruption.close();
    }
}

async function prepare(monitor: MonitoringConfig): Promise<void> {
    const primary = monitor.PERF_POSTGRES_CONTAINER;
    const runStatement = async ({
        container,
        statement,
    }: {
        container: string;
        statement: string;
    }) =>
        await command({
            program: "docker",
            args: [
                "exec",
                container,
                "psql",
                "-X",
                "-U",
                monitor.PERF_DATABASE_USER,
                "-d",
                monitor.PERF_DATABASE,
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                statement,
            ],
        });
    await runStatement({
        container: primary,
        statement: "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;",
    });
    const sql = createDatabaseReader({
        user: monitor.PERF_DATABASE_USER,
        database: monitor.PERF_DATABASE,
    });
    for (const container of [primary, monitor.PERF_REPLICA_CONTAINER]) {
        for (const statement of [
            "ALTER SYSTEM SET track_io_timing = 'on';",
            "ALTER SYSTEM SET track_wal_io_timing = 'on';",
            "SELECT pg_reload_conf();",
        ])
            await runStatement({ container, statement });
        console.log(
            JSON.stringify(
                {
                    container,
                    ...(await sql({
                        container,
                        query: settingsSql,
                        schema: settingsSchema,
                    })),
                },
                null,
                2,
            ),
        );
    }
}
export async function main(): Promise<void> {
    try {
        const monitor = monitoringConfigSchema.parse(process.env);
        if (process.argv[2] === "prepare") await prepare(monitor);
        else if (process.argv[2] === "run" || process.argv[2] === "check") {
            const application = await startApplicationReader({
                primaryContainer: monitor.PERF_POSTGRES_CONTAINER,
                replicaContainer: monitor.PERF_REPLICA_CONTAINER,
                database: monitor.PERF_DATABASE,
            });
            try {
                const context = await preflight({ monitor, application });
                await resourceSample({ context, k6Pid: undefined });
                emit({
                    action: "preflight_complete",
                    outcome: "success",
                    metadata: {
                        conversations: context.config.conversations.join(","),
                    },
                });
                if (process.argv[2] === "run")
                    process.exitCode = await collect(context);
            } finally {
                await application.close();
            }
        } else
            throw new Error("Usage: ranking-performance.mjs prepare|check|run");
    } catch (error) {
        emit({
            action: "monitor_failed",
            metadata: { message: errorMessage(error) },
            outcome: "failure",
        });
        process.exitCode = 1;
    }
}
