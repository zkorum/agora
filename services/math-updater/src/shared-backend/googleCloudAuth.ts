/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
/**
 * Google Cloud Translation API authentication helper
 * Handles both local development (GOOGLE_APPLICATION_CREDENTIALS) and production (AWS Secrets Manager)
 */

import { v3 } from "@google-cloud/translate";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type pino from "pino";
import { readFile } from "fs/promises";

export interface GoogleCloudConfig {
    projectId: string;
    location: string;
}

export interface GoogleCloudCredentials {
    client: v3.TranslationServiceClient;
    config: GoogleCloudConfig;
}

interface ServiceAccountCredentials {
    project_id: string;
    client_email: string;
    private_key: string;
}

/**
 * Parse and validate Google Cloud service account JSON
 * @param serviceAccountJson - Service account JSON string
 * @returns Validated service account credentials
 * @throws Error if required fields are missing or invalid
 */
function parseServiceAccountJson(
    serviceAccountJson: string,
): ServiceAccountCredentials {
    const serviceAccount = JSON.parse(serviceAccountJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
        [key: string]: unknown;
    };

    if (
        !serviceAccount.project_id ||
        typeof serviceAccount.project_id !== "string"
    ) {
        throw new Error(
            "[Google Cloud Auth] Field 'project_id' is not in the service account JSON or is not a string",
        );
    }
    if (
        !serviceAccount.client_email ||
        typeof serviceAccount.client_email !== "string"
    ) {
        throw new Error(
            "[Google Cloud Auth] Field 'client_email' is not in the service account JSON or is not a string",
        );
    }
    if (
        !serviceAccount.private_key ||
        typeof serviceAccount.private_key !== "string"
    ) {
        throw new Error(
            "[Google Cloud Auth] Field 'private_key' is not in the service account JSON or is not a string",
        );
    }

    return {
        project_id: serviceAccount.project_id,
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    };
}

/**
 * Initialize Google Cloud Translation client with proper authentication
 *
 * Authentication priority:
 * 1. If googleCloudServiceAccountAwsSecretKey is set (production):
 *    - Fetch service account JSON from AWS Secrets Manager
 *    - Extract project_id from the service account JSON
 *    - Initialize client with explicit credentials
 * 2. Otherwise (local development):
 *    - Use googleApplicationCredentialsPath to read service account file
 *    - Parse the service account JSON file to extract project_id
 *    - Initialize client with credentials from the file
 *
 * Note: projectId and location are returned because they must be included in every API request
 * as part of the required 'parent' parameter: `projects/${projectId}/locations/${location}`
 *
 * @param googleCloudServiceAccountAwsSecretKey - AWS secret key containing service account JSON (optional)
 * @param awsSecretRegion - AWS region for Secrets Manager (required if using AWS Secrets Manager)
 * @param googleApplicationCredentialsPath - Path to service account JSON file (for local development)
 * @param googleCloudTranslationLocation - Translation API location (e.g., "global", "europe-west1")
 * @param googleCloudTranslationEndpoint - API endpoint (e.g., "translate-eu.googleapis.com" for EU data residency)
 * @param log - Pino or Fastify logger instance
 * @returns GoogleCloudCredentials with initialized client and config
 * @throws Error if authentication fails or required parameters are missing
 */
export async function initializeGoogleCloudCredentials({
    googleCloudServiceAccountAwsSecretKey,
    awsSecretRegion,
    googleApplicationCredentialsPath,
    googleCloudTranslationLocation,
    googleCloudTranslationEndpoint,
    log,
}: {
    googleCloudServiceAccountAwsSecretKey?: string;
    awsSecretRegion?: string;
    googleApplicationCredentialsPath?: string;
    googleCloudTranslationLocation: string;
    googleCloudTranslationEndpoint?: string;
    log: Pick<pino.BaseLogger, "info">;
}): Promise<GoogleCloudCredentials> {
    let serviceAccount: ServiceAccountCredentials;

    // Production mode: use AWS Secrets Manager
    if (
        googleCloudServiceAccountAwsSecretKey !== undefined &&
        awsSecretRegion !== undefined
    ) {
        log.info(
            `[Google Cloud Auth] Using AWS Secrets Manager for service account credentials (secret key: ${googleCloudServiceAccountAwsSecretKey})`,
        );

        const awsSecretsManagerClient = new SecretsManagerClient({
            region: awsSecretRegion,
        });

        const response = await awsSecretsManagerClient.send(
            new GetSecretValueCommand({
                SecretId: googleCloudServiceAccountAwsSecretKey,
            }),
        );

        if (!response.SecretString) {
            throw new Error(
                "[Google Cloud Auth] No secret found in AWS Secrets Manager",
            );
        }

        serviceAccount = parseServiceAccountJson(response.SecretString);
    } else if (googleApplicationCredentialsPath !== undefined) {
        // Local development: use service account file
        log.info(
            `[Google Cloud Auth] Using service account file: ${googleApplicationCredentialsPath}`,
        );

        const serviceAccountJson = await readFile(
            googleApplicationCredentialsPath,
            "utf-8",
        );
        serviceAccount = parseServiceAccountJson(serviceAccountJson);
    } else {
        throw new Error(
            "[Google Cloud Auth] Either GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY (with AWS_SECRET_REGION) or GOOGLE_APPLICATION_CREDENTIALS must be provided",
        );
    }

    // Initialize client with credentials
    const client = new v3.TranslationServiceClient({
        credentials: {
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
        },
        ...(googleCloudTranslationEndpoint && {
            apiEndpoint: googleCloudTranslationEndpoint,
        }),
    });

    log.info(
        `[Google Cloud Auth] Initialized Translation client for project: ${serviceAccount.project_id}${googleCloudTranslationEndpoint ? ` with endpoint: ${googleCloudTranslationEndpoint}` : ""}`,
    );

    return {
        client,
        config: {
            projectId: serviceAccount.project_id,
            location: googleCloudTranslationLocation,
        },
    };
}
