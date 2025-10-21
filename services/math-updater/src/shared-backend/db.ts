/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { withReplicas } from "drizzle-orm/pg-core";
import { type SharedConfigSchema } from "./config.js";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import pino from "pino";
import { DrizzleFastifyLogger } from "./logger.js";
import type { FastifyBaseLogger } from "fastify";

async function createPostgresClient(
    config: SharedConfigSchema,
    log: pino.Logger | FastifyBaseLogger,
    useReadReplica: boolean = false,
) {
    const awsSecretId = useReadReplica && config.AWS_SECRET_ID_READ
        ? config.AWS_SECRET_ID_READ
        : config.AWS_SECRET_ID;
    const awsSecretRegion = useReadReplica && config.AWS_SECRET_REGION_READ
        ? config.AWS_SECRET_REGION_READ
        : config.AWS_SECRET_REGION;
    const dbHost = useReadReplica && config.DB_HOST_READ
        ? config.DB_HOST_READ
        : config.DB_HOST;
    const dbPort = useReadReplica && config.DB_HOST_READ
        ? config.DB_PORT_READ
        : config.DB_PORT;
    const connectionString = useReadReplica && config.CONNECTION_STRING_READ
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
                const credentials: object = JSON.parse(
                    response.SecretString,
                ) as object;
                if (
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
                });
            } catch (error) {
                log.error(error);
                log.error(
                    "Unable to parse received SecretString in JSON or connect to DB",
                );
                process.exit(1);
            }
        } catch (e) {
            log.error(e);
            log.error("Unable to receive response from AWS Secrets Manager");
            process.exit(1);
        }
    } else if (connectionString !== undefined) {
        try {
            return postgres(connectionString, {
                connect_timeout: 10,
            });
        } catch (e) {
            log.error(`Unable to connect to the database (${useReadReplica ? 'read replica' : 'primary'})`);
            log.error(e);
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
    log: pino.Logger | FastifyBaseLogger,
) {
    const primaryClient = await createPostgresClient(config, log, false);
    const primaryDb = drizzle(primaryClient, {
        logger: new DrizzleFastifyLogger(log),
    });

    // Check if read replica config exists
    const hasReadReplica = !!(
        config.CONNECTION_STRING_READ ||
        (config.AWS_SECRET_ID_READ && config.AWS_SECRET_REGION_READ && config.DB_HOST_READ)
    );

    if (hasReadReplica) {
        const readClient = await createPostgresClient(config, log, true);
        const readDb = drizzle(readClient, {
            logger: new DrizzleFastifyLogger(log),
        });

        log.info("Connected to read replica - SELECTs will use replica, writes use primary");

        // Use Drizzle's built-in withReplicas
        // Automatically routes SELECT queries to replica, writes to primary
        return withReplicas(primaryDb, [readDb]);
    } else {
        log.info("No read replica configured, using primary for all operations");
        return primaryDb;
    }
}
