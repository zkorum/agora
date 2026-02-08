import { log } from "./app.js";
import { config } from "./config.js";
import PgBoss from "pg-boss";
import {
    scanConversationsJob,
    ScanConversationsJobData,
    SCAN_CONVERSATIONS_SINGLETON_KEY,
} from "./jobs/scanConversations.js";
import {
    UpdateConversationMathData,
    updateConversationMathHandler,
} from "./jobs/updateConversationMath.js";
import axios, { AxiosInstance } from "axios";
import { createDb } from "./shared-backend/db.js";
import {
    initializeGoogleCloudCredentials,
    type GoogleCloudCredentials,
} from "./shared-backend/googleCloudAuth.js";
import pLimit from "p-limit";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

/**
 * Creates a reusable worker handler for processing math update jobs.
 * Extracted to avoid code duplication between main registration and watchdog restart.
 */
function createMathWorkerHandler({
    db,
    axiosPolis,
    googleCloudCredentials,
    onWorkerCalled,
}: {
    db: PostgresJsDatabase;
    axiosPolis: AxiosInstance;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    onWorkerCalled: () => void;
}) {
    return async (jobs: PgBoss.Job<UpdateConversationMathData>[]) => {
        log.info(`[Math Updater] Worker called with ${jobs.length} job(s)`);
        onWorkerCalled();

        // Filter out test jobs (conversationId = -1)
        const realJobs = jobs.filter((j) => j.data.conversationId !== -1);
        const testJobs = jobs.filter((j) => j.data.conversationId === -1);

        if (testJobs.length > 0) {
            log.info(
                `[Math Updater] Processed ${testJobs.length} test job(s) - worker is healthy`,
            );
        }

        if (realJobs.length > 0) {
            log.info(
                `[Math Updater] Processing ${realJobs.length} job(s)...`,
            );
            const limit = pLimit(config.MATH_UPDATER_JOB_CONCURRENCY);

            try {
                await Promise.all(
                    realJobs.map((job) =>
                        limit(() =>
                            updateConversationMathHandler(
                                job,
                                db,
                                axiosPolis,
                                googleCloudCredentials,
                            ),
                        ),
                    ),
                );
                log.info(
                    `[Math Updater] Completed ${realJobs.length} job(s)`,
                );
            } catch (error) {
                log.error({ error }, "[Math Updater] Error processing jobs");
            }
        }
    };
}

/**
 * Clean up stuck jobs from previous runs.
 * Only clears pg-boss jobs - the scan logic will re-enqueue conversations
 * that still need updates based on requested_at > last_math_update_at.
 */
async function cleanupStuckJobs({
    db,
}: {
    db: PostgresJsDatabase;
}): Promise<void> {
    log.info("[Math Updater] Cleaning up stuck jobs from previous runs...");

    const mathJobsResult = await db.execute(sql`
        DELETE FROM pgboss.job
        WHERE name = 'update-conversation-math'
        RETURNING id
    `);
    log.info(
        `[Math Updater] Deleted ${mathJobsResult.length} stuck update-conversation-math jobs`,
    );

    const scanJobsResult = await db.execute(sql`
        DELETE FROM pgboss.job
        WHERE name = 'scan-conversations'
        RETURNING id
    `);
    log.info(
        `[Math Updater] Deleted ${scanJobsResult.length} stuck scan-conversations jobs`,
    );
}

async function main() {
    log.info(
        `[Math Updater] Starting math-updater service (AI: ${config.AWS_AI_LABEL_SUMMARY_ENABLE ? "enabled" : "disabled"})...`,
    );

    const axiosPolis: AxiosInstance = axios.create({
        baseURL: config.POLIS_BASE_URL,
        timeout: 600000, // 10 minutes
    });
    log.info("[Math Updater] Polis-bridge axios initialized");

    // Initialize database connection
    const db = await createDb(config, log);
    log.info("[Math Updater] Database connection established");

    // Initialize Google Cloud Translation credentials (optional)
    let googleCloudCredentials: GoogleCloudCredentials | undefined = undefined;
    if (
        config.GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY !== undefined ||
        config.GOOGLE_APPLICATION_CREDENTIALS !== undefined
    ) {
        try {
            googleCloudCredentials = await initializeGoogleCloudCredentials({
                googleCloudServiceAccountAwsSecretKey:
                    config.GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY,
                awsSecretRegion: config.AWS_SECRET_REGION,
                googleApplicationCredentialsPath:
                    config.GOOGLE_APPLICATION_CREDENTIALS,
                googleCloudTranslationLocation:
                    config.GOOGLE_CLOUD_TRANSLATION_LOCATION,
                googleCloudTranslationEndpoint:
                    config.GOOGLE_CLOUD_TRANSLATION_ENDPOINT,
                log,
            });
            log.info(
                "[Math Updater] Google Cloud Translation initialized successfully",
            );
        } catch (error) {
            log.error(
                error,
                "[Math Updater] Failed to initialize Google Cloud Translation - translations will be disabled",
            );
            // Continue without translations - this is not a fatal error
        }
    } else {
        log.info(
            "[Math Updater] Google Cloud Translation not configured - translations disabled",
        );
    }

    // Initialize pg-boss with AWS Secrets support
    const pgBossCommonConfig = {
        application_name: "agora-math-updater",
        max: config.MATH_UPDATER_BATCH_SIZE + 5, // Batch size + overhead for pg-boss operations
    };

    let pgBossConfig;
    if (
        config.NODE_ENV === "production" &&
        config.AWS_SECRET_ID !== undefined &&
        config.AWS_SECRET_REGION !== undefined &&
        config.DB_HOST !== undefined
    ) {
        // Fetch credentials from AWS Secrets Manager
        const { SecretsManagerClient, GetSecretValueCommand } = await import(
            "@aws-sdk/client-secrets-manager"
        );
        const awsSecretsManagerClient = new SecretsManagerClient({
            region: config.AWS_SECRET_REGION,
        });

        const response = await awsSecretsManagerClient.send(
            new GetSecretValueCommand({
                SecretId: config.AWS_SECRET_ID,
            }),
        );

        if (!response.SecretString) {
            log.error("[Math Updater] No secret found in AWS Secrets Manager");
            process.exit(1);
        }

        const credentials = JSON.parse(response.SecretString) as {
            username: string;
            password: string;
        };

        pgBossConfig = {
            ...pgBossCommonConfig,
            host: config.DB_HOST,
            port: config.DB_PORT,
            database: config.DB_NAME,
            user: credentials.username,
            password: credentials.password,
            ssl: { rejectUnauthorized: false },
        };
    } else {
        const sslConfig =
            config.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : undefined;
        pgBossConfig = {
            ...pgBossCommonConfig,
            connectionString: config.CONNECTION_STRING,
            ssl: sslConfig,
        };
    }

    const boss = new PgBoss(pgBossConfig);

    boss.on("error", (error) => {
        log.error(error, "[Math Updater] pg-boss error");
    });

    await boss.start();
    log.info("[Math Updater] pg-boss started");

    // Clean up stuck jobs from previous runs
    await cleanupStuckJobs({ db });

    // Create queues with proper policies
    // 'singleton' policy: only allows 1 job per singletonKey (created OR active)
    // This prevents concurrent execution and duplicate jobs for the same conversation
    // Combined with singletonKey per conversation, this ensures only 1 job per conversation at a time
    // Multiple different conversations can still be processed in parallel
    await boss.createQueue("update-conversation-math", { policy: "singleton" });
    log.info(
        "[Math Updater] Created update-conversation-math queue (singleton policy)",
    );

    await boss.createQueue("scan-conversations");
    log.info("[Math Updater] Created/verified scan-conversations queue");

    // Track last time worker was called for watchdog
    let lastWorkerCallTime = Date.now();
    let workerId: string;

    // Create reusable worker handler
    const workerHandler = createMathWorkerHandler({
        db,
        axiosPolis,
        googleCloudCredentials,
        onWorkerCalled: () => {
            lastWorkerCallTime = Date.now();
        },
    });

    // Register worker
    workerId = await boss.work(
        "update-conversation-math",
        { batchSize: config.MATH_UPDATER_BATCH_SIZE },
        workerHandler,
    );

    log.info(
        `[Math Updater] Registered update-conversation-math worker (id: ${workerId}, batch: ${config.MATH_UPDATER_BATCH_SIZE}, concurrency: ${config.MATH_UPDATER_JOB_CONCURRENCY})`,
    );

    // Register scan-conversations worker
    await boss.work(
        "scan-conversations",
        { includeMetadata: true },
        async (jobs: PgBoss.JobWithMetadata<ScanConversationsJobData>[]) => {
            for (const job of jobs) {
                await scanConversationsJob(job, db, boss);
            }
        },
    );
    log.info("[Math Updater] Registered scan-conversations worker");

    // Kick off the self-scheduling scan loop
    // The job will reschedule itself after each run
    await boss.send(
        "scan-conversations",
        {
            minTimeBetweenUpdatesMs:
                config.MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS,
            scanIntervalMs: config.MATH_UPDATER_SCAN_INTERVAL_MS,
        },
        {
            singletonKey: SCAN_CONVERSATIONS_SINGLETON_KEY, // Prevent duplicate loops
        },
    );
    log.info(
        `[Math Updater] Started scan-conversations loop (scan interval: ${config.MATH_UPDATER_SCAN_INTERVAL_MS}ms, min time between updates: ${config.MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS}ms)`,
    );

    // Send a test job to verify worker picks up jobs
    // This helps detect if worker registration failed
    const testJobId = await boss.send(
        "update-conversation-math",
        {
            conversationId: -1, // Special test ID
            conversationSlugId: "startup-test",
            requestedAt: new Date(),
        },
        {
            singletonKey: "startup-test",
            singletonSeconds: 10,
        },
    );

    if (testJobId) {
        log.info(
            `[Math Updater] Sent startup test job (${testJobId}) - worker should process within 5s`,
        );
    } else {
        log.error(
            "[Math Updater] Failed to send startup test job - queue may have issues!",
        );
    }

    log.info("[Math Updater] Service is ready and running");

    // Watchdog: Monitor worker health and detect polling stalls
    // If worker hasn't been called in 30s AND there are pending jobs, something is wrong
    const WATCHDOG_INTERVAL_MS = 15000; // Check every 15 seconds
    const WATCHDOG_TIMEOUT_MS = 30000; // Worker should be called at least every 30s if jobs exist

    const watchdogIntervalId = setInterval(async () => {
        try {
            const queues = await boss.getQueues();
            const ourQueue = queues.find(
                (q) => q.name === "update-conversation-math",
            );
            if (!ourQueue) {
                log.error("[Math Updater] Watchdog: queue not found!");
                return;
            }

            // Auto-correct: detect and delete jobs stuck in 'created' state for >10s
            const stuckJobs = await db.execute<{ id: string; singleton_key: string }>(sql`
                SELECT id, singleton_key
                FROM pgboss.job
                WHERE name = 'update-conversation-math'
                AND state = 'created'
                AND created_on < NOW() - INTERVAL '10 seconds'
            `);
            if (stuckJobs.length > 0) {
                log.warn(
                    `[Math Updater] Watchdog: Found ${stuckJobs.length} jobs stuck in 'created' state >10s, deleting...`,
                );
                for (const job of stuckJobs) {
                    await db.execute(sql`DELETE FROM pgboss.job WHERE id = ${job.id}`);
                    log.warn(
                        `[Math Updater] Watchdog: Deleted stuck job ${job.id.slice(0, 8)}... (key: ${job.singleton_key})`,
                    );
                }
            }

            // Auto-correct: detect and delete jobs stuck in 'active' state for >5 minutes (handler should have logged by now)
            const stuckActiveJobs = await db.execute<{ id: string; singleton_key: string; started_on: string }>(sql`
                SELECT id, singleton_key, started_on
                FROM pgboss.job
                WHERE name = 'update-conversation-math'
                AND state = 'active'
                AND started_on < NOW() - INTERVAL '5 minutes'
            `);
            if (stuckActiveJobs.length > 0) {
                log.warn(
                    `[Math Updater] Watchdog: Found ${stuckActiveJobs.length} jobs stuck in 'active' state >5min, deleting...`,
                );
                for (const job of stuckActiveJobs) {
                    await db.execute(sql`DELETE FROM pgboss.job WHERE id = ${job.id}`);
                    log.warn(
                        `[Math Updater] Watchdog: Deleted stuck active job ${job.id.slice(0, 8)}... (key: ${job.singleton_key}, started: ${job.started_on})`,
                    );
                }
            }

            const timeSinceLastCall = Date.now() - lastWorkerCallTime;
            // createdCount exists at runtime but not in pg-boss types
            const pendingCount = Number(
                "createdCount" in ourQueue ? ourQueue.createdCount : 0,
            );
            const hasPendingJobs = pendingCount > 0;

            // Detect polling stall: worker not called in timeout period + pending jobs exist
            if (timeSinceLastCall > WATCHDOG_TIMEOUT_MS && hasPendingJobs) {
                log.error(
                    `[Math Updater] Watchdog: Worker stalled for ${(timeSinceLastCall / 1000).toFixed(1)}s with ${pendingCount} pending job(s). Restarting...`,
                );

                try {
                    await boss.offWork(workerId);
                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    // Re-register worker using the same handler
                    workerId = await boss.work(
                        "update-conversation-math",
                        { batchSize: config.MATH_UPDATER_BATCH_SIZE },
                        workerHandler,
                    );

                    log.info(
                        `[Math Updater] Watchdog: Worker restarted (ID: ${workerId})`,
                    );
                } catch (restartError) {
                    log.error(
                        { error: restartError },
                        "[Math Updater] Watchdog: Failed to restart worker!",
                    );
                }
            }
        } catch (error) {
            log.error({ error }, "[Math Updater] Watchdog error");
        }
    }, WATCHDOG_INTERVAL_MS);

    // Graceful shutdown
    const shutdown = async () => {
        log.info("[Math Updater] Shutting down gracefully...");

        clearInterval(watchdogIntervalId);
        await boss.stop();
        log.info("[Math Updater] pg-boss stopped");
        process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown());
    process.on("SIGINT", () => void shutdown());
    process.on("SIGHUP", () => void shutdown());
}

main().catch((error) => {
    log.error(error, "[Math Updater] Fatal error during startup");
    process.exit(1);
});
