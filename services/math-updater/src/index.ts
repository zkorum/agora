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
import { sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pLimit from "p-limit";

/**
 * Delete old jobs using SQL
 * pg-boss doesn't provide a direct API to clear all jobs in a queue,
 * so we use raw SQL through Drizzle
 */
async function deleteOldJobs(db: PostgresJsDatabase): Promise<void> {
    try {
        // Delete ALL scan-conversations jobs regardless of singleton_key
        // This catches jobs with the singleton key, NULL, or any other value
        const scanResult = await db.execute(
            sql`DELETE FROM pgboss.job WHERE name = 'scan-conversations'`,
        );

        log.info(
            `[Math Updater] Deleted ${scanResult.count} old scan-conversations job(s)`,
        );

        // Delete ALL update-conversation-math jobs to clear stuck singletonKey jobs
        const updateResult = await db.execute(
            sql`DELETE FROM pgboss.job WHERE name = 'update-conversation-math'`,
        );

        log.info(
            `[Math Updater] Deleted ${updateResult.count} old update-conversation-math job(s)`,
        );

        // Clear singleton tracking for update-conversation-math jobs
        // This ensures singletonKey can be reused immediately
        const singletonResult = await db.execute(
            sql`DELETE FROM pgboss.schedule WHERE name LIKE 'update-math-%'`,
        );

        log.info(
            `[Math Updater] Cleared ${singletonResult.count} singleton schedule entries`,
        );
    } catch (error) {
        log.warn(
            { error },
            "[Math Updater] Failed to delete old jobs, continuing anyway",
        );
    }
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

    // Initialize pg-boss with AWS Secrets support
    const pgBossCommonConfig = {
        application_name: "agora-math-updater",
        max: config.MATH_UPDATER_BATCH_SIZE + 5, // Batch size + overhead for pg-boss operations
        // NOTE: If migrating from v10 to v11 fails, drop the pgboss schema:
        // DROP SCHEMA IF EXISTS pgboss CASCADE;
        // Then restart with migrate: true to create fresh v11 schema
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

    // Clean up any old/stale jobs before starting new loop
    await deleteOldJobs(db);

    // Delete and recreate update-conversation-math queue with proper policy
    // Policy cannot be changed once set, so we delete and recreate
    try {
        await boss.deleteQueue("update-conversation-math");
        log.info(
            "[Math Updater] Deleted existing update-conversation-math queue",
        );
    } catch (error) {
        log.info(
            "[Math Updater] No existing update-conversation-math queue to delete",
        );
    }

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

    // Register single worker with batch processing and controlled concurrency
    // Uses pLimit to process multiple conversations concurrently while protecting the database
    // singletonKey in scanner ensures one job per conversation
    await boss.work(
        "update-conversation-math",
        {
            batchSize: config.MATH_UPDATER_BATCH_SIZE,
        },
        async (jobs: PgBoss.Job<UpdateConversationMathData>[]) => {
            // Process jobs with controlled concurrency to protect the database
            const limit = pLimit(config.MATH_UPDATER_JOB_CONCURRENCY);
            await Promise.all(
                jobs.map((job) =>
                    limit(() =>
                        updateConversationMathHandler(job, db, axiosPolis),
                    ),
                ),
            );
        },
    );
    log.info(
        `[Math Updater] Registered update-conversation-math worker (batch size: ${config.MATH_UPDATER_BATCH_SIZE}, concurrency: ${config.MATH_UPDATER_JOB_CONCURRENCY})`,
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

    log.info("[Math Updater] Service is ready and running");

    // Graceful shutdown
    const shutdown = async () => {
        log.info("[Math Updater] Shutting down gracefully...");

        // Delete any pending jobs before stopping
        await deleteOldJobs(db);

        await boss.stop();
        log.info("[Math Updater] pg-boss stopped");
        process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    process.on("SIGHUP", shutdown);
}

main().catch((error) => {
    log.error(error, "[Math Updater] Fatal error during startup");
    process.exit(1);
});
