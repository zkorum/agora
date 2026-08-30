/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { withReplicas } from "drizzle-orm/pg-core";
import { setTimeout as sleep } from "node:timers/promises";
import type { SharedConfigSchema } from "./config.js";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type pino from "pino";
import { DrizzleFastifyLogger, safeDependencyError } from "./logger.js";

const POSTGRES_STARTUP_RETRY_MS = 5_000;

interface PrimaryReplicaDatabase extends PostgresJsDatabase {
    $primary: PostgresJsDatabase;
}

export function hasPrimaryDatabase(
    database: PostgresJsDatabase,
): database is PrimaryReplicaDatabase {
    return "$primary" in database;
}

export function getPrimaryDatabase(
    database: PostgresJsDatabase,
): PostgresJsDatabase {
    return hasPrimaryDatabase(database) ? database.$primary : database;
}

export async function createPostgresClient(
    config: SharedConfigSchema,
    log: Pick<pino.BaseLogger, "info" | "error">,
    useReadReplica = false,
) {
    const awsSecretId =
        useReadReplica && config.AWS_SECRET_ID_READ
            ? config.AWS_SECRET_ID_READ
            : config.AWS_SECRET_ID;
    const awsSecretRegion =
        useReadReplica && config.AWS_SECRET_REGION_READ
            ? config.AWS_SECRET_REGION_READ
            : config.AWS_SECRET_REGION;
    const dbHost =
        useReadReplica && config.DB_HOST_READ
            ? config.DB_HOST_READ
            : config.DB_HOST;
    const dbPort =
        useReadReplica && config.DB_HOST_READ
            ? config.DB_PORT_READ
            : config.DB_PORT;
    const connectionString =
        useReadReplica && config.CONNECTION_STRING_READ
            ? config.CONNECTION_STRING_READ
            : config.CONNECTION_STRING;

    if (
        config.NODE_ENV === "production" &&
        awsSecretId !== undefined &&
        awsSecretRegion !== undefined &&
        dbHost !== undefined
    ) {
        const awsSecretsManagerClient = new SecretsManagerClient({
            region: awsSecretRegion,
        });
        try {
            const response = await awsSecretsManagerClient.send(
                new GetSecretValueCommand({
                    SecretId: awsSecretId,
                }),
            );
            if (!response.SecretString) {
                if (response.SecretBinary) {
                    log.error("Unexpected binary format for the secret");
                    process.exit(1);
                } else {
                    log.error("No secret found");
                    process.exit(1);
                }
            }
            try {
                const credentials: unknown = JSON.parse(response.SecretString);
                if (
                    typeof credentials !== "object" ||
                    credentials === null ||
                    !("username" in credentials) ||
                    typeof credentials.username !== "string"
                ) {
                    log.error(
                        "Field 'username' is not in the secrets or is not a string",
                    );
                    process.exit(1);
                }
                if (
                    !("password" in credentials) ||
                    typeof credentials.password !== "string"
                ) {
                    log.error(
                        "Field 'password' is not in the secrets or is not a string",
                    );
                    process.exit(1);
                }
                return postgres({
                    host: dbHost,
                    port: dbPort,
                    database: config.DB_NAME,
                    username: credentials.username,
                    password: credentials.password,
                    ssl: "require",
                    connect_timeout: 10,
                    // Using postgres-js default max: 10 (optimal for our 4 vCPU database)
                    // Connection lifecycle managed automatically (45-90 min lifetime)
                });
            } catch {
                log.error(
                    "Unable to parse received SecretString in JSON or connect to DB",
                );
                process.exit(1);
            }
        } catch {
            log.error("Unable to receive response from AWS Secrets Manager");
            process.exit(1);
        } finally {
            awsSecretsManagerClient.destroy();
        }
    } else if (connectionString !== undefined) {
        try {
            return postgres(connectionString, {
                connect_timeout: 10,
                // Using postgres-js default max: 10 (optimal for our 4 vCPU database)
                // Connection lifecycle managed automatically (45-90 min lifetime)
                ssl: config.NODE_ENV === "production" ? "require" : undefined,
            });
        } catch {
            log.error(
                `Unable to connect to the database (${useReadReplica ? "read replica" : "primary"})`,
            );
            process.exit(1);
        }
    } else {
        log.error(
            "CONNECTION_STRING cannot be undefined in any mode except production",
        );
        process.exit(1);
    }
}

export async function createDb(
    config: SharedConfigSchema,
    log: Pick<pino.BaseLogger, "info" | "error">,
) {
    const primaryClient = await createReadyPostgresClient({
        config,
        log,
        useReadReplica: false,
    });
    const primaryDb = drizzle(primaryClient, {
        logger: new DrizzleFastifyLogger({
            fastifyLogger: log,
        }),
    });

    // Check if read replica config exists
    const hasReadReplica = !!(
        config.CONNECTION_STRING_READ ??
        (config.AWS_SECRET_ID_READ &&
            config.AWS_SECRET_REGION_READ &&
            config.DB_HOST_READ)
    );

    if (hasReadReplica) {
        const readClient = await createReadyPostgresClient({
            config,
            log,
            useReadReplica: true,
        });
        const readDb = drizzle(readClient, {
            logger: new DrizzleFastifyLogger({
                fastifyLogger: log,
            }),
        });

        log.info(
            "Connected to read replica - SELECTs will use replica, writes use primary",
        );

        // Use Drizzle's built-in withReplicas
        // Automatically routes SELECT queries to replica, writes to primary
        return withReplicas(primaryDb, [readDb]);
    } else {
        log.info(
            "No read replica configured, using primary for all operations",
        );
        return primaryDb;
    }
}

type PostgresClient = Awaited<ReturnType<typeof createPostgresClient>>;
type PostgresListener = Awaited<ReturnType<PostgresClient["listen"]>>;

export interface ManagedPostgresDatabase {
    db: PostgresJsDatabase;
    listen: ({
        channel,
        onNotification,
        onListen,
    }: {
        channel: string;
        onNotification: (payload: string) => void;
        onListen?: () => void;
    }) => Promise<void>;
    close: () => Promise<void>;
}

export async function createManagedPostgresDatabase({
    config,
    log,
}: {
    config: SharedConfigSchema;
    log: Pick<pino.BaseLogger, "info" | "error">;
}): Promise<ManagedPostgresDatabase> {
    const client = await createReadyPostgresClient({
        config,
        log,
        useReadReplica: false,
    });
    const db = drizzle(client);
    const listeners = new Set<PostgresListener>();
    let activeListenOperations = 0;
    let listenOperationsIdle = Promise.resolve();
    let resolveListenOperations: (() => void) | undefined;
    let closing = false;
    let closePromise: Promise<void> | undefined;
    const isClosing = (): boolean => closing;

    const listen = async ({
        channel,
        onNotification,
        onListen,
    }: {
        channel: string;
        onNotification: (payload: string) => void;
        onListen?: () => void;
    }): Promise<void> => {
        if (isClosing()) {
            throw new Error("Managed PostgreSQL database is closing");
        }

        activeListenOperations += 1;
        if (activeListenOperations === 1) {
            listenOperationsIdle = new Promise((resolve) => {
                resolveListenOperations = resolve;
            });
        }

        try {
            const listener = await client.listen(
                channel,
                onNotification,
                onListen,
            );
            if (isClosing()) {
                await listener.unlisten();
                throw new Error("Managed PostgreSQL database is closing");
            }
            listeners.add(listener);
        } finally {
            activeListenOperations -= 1;
            if (activeListenOperations === 0) {
                resolveListenOperations?.();
                resolveListenOperations = undefined;
            }
        }
    };

    const close = async (): Promise<void> => {
        if (closePromise === undefined) {
            closing = true;
            closePromise = closeManagedPostgresResources({
                client,
                listeners,
                listenOperationsIdle,
                log,
            });
        }
        await closePromise;
    };

    return { db, listen, close };
}

async function closePostgresClient({
    client,
    log,
}: {
    client: PostgresClient;
    log: Pick<pino.BaseLogger, "error">;
}): Promise<void> {
    try {
        await client.end({ timeout: 5 });
    } catch (error: unknown) {
        log.error(
            safeDependencyError(error),
            "Failed to close unavailable PostgreSQL client",
        );
    }
}

async function closeManagedPostgresResources({
    client,
    listeners,
    listenOperationsIdle,
    log,
}: {
    client: PostgresClient;
    listeners: Set<PostgresListener>;
    listenOperationsIdle: Promise<void>;
    log: Pick<pino.BaseLogger, "error">;
}): Promise<void> {
    await listenOperationsIdle;
    for (const listener of listeners) {
        try {
            await listener.unlisten();
        } catch (error: unknown) {
            log.error(
                safeDependencyError(error),
                "Failed to stop PostgreSQL listener",
            );
        }
    }
    listeners.clear();
    await closePostgresClient({ client, log });
}

async function createReadyPostgresClient({
    config,
    log,
    useReadReplica,
}: {
    config: SharedConfigSchema;
    log: Pick<pino.BaseLogger, "info" | "error">;
    useReadReplica: boolean;
}): Promise<PostgresClient> {
    const role = useReadReplica ? "read replica" : "primary";
    let readyClient: PostgresClient | undefined;
    while (readyClient === undefined) {
        const client = await createPostgresClient(config, log, useReadReplica);
        try {
            await client`select 1`;
            log.info(`[DB] PostgreSQL ${role} connection verified`);
            readyClient = client;
        } catch (error: unknown) {
            log.error(
                safeDependencyError(error),
                `[DB] PostgreSQL ${role} unavailable; retrying in ${String(POSTGRES_STARTUP_RETRY_MS)}ms`,
            );
            await closePostgresClient({ client, log });
            await sleep(POSTGRES_STARTUP_RETRY_MS);
        }
    }
    return readyClient;
}
