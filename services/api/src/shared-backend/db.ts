/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type SharedConfigSchema } from "./config.js";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import pino from "pino";
import { DrizzleFastifyLogger } from "./logger.js";
import type { FastifyBaseLogger } from "fastify";

export async function createDb(
    config: SharedConfigSchema,
    log: pino.Logger | FastifyBaseLogger,
) {
    let client;
    if (
        config.NODE_ENV === "production" &&
        config.AWS_SECRET_ID !== undefined &&
        config.AWS_SECRET_REGION !== undefined &&
        config.DB_HOST !== undefined
    ) {
        const awsSecretsManagerClient = new SecretsManagerClient({
            region: config.AWS_SECRET_REGION,
        });
        try {
            const response = await awsSecretsManagerClient.send(
                new GetSecretValueCommand({
                    SecretId: config.AWS_SECRET_ID,
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
                client = postgres({
                    host: config.DB_HOST,
                    port: config.DB_PORT,
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
    } else if (config.CONNECTION_STRING !== undefined) {
        try {
            client = postgres(config.CONNECTION_STRING, {
                connect_timeout: 10,
            });
        } catch (e) {
            log.error("Unable to connect to the database");
            log.error(e);
            process.exit(1);
        }
    } else {
        log.error(
            "CONNECTION_STRING cannot be undefined in any mode except production",
        );
        process.exit(1);
    }
    return drizzle(client, {
        logger: new DrizzleFastifyLogger(log),
    });
}
