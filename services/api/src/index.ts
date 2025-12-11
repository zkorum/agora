import {
    Dto,
    type AuthenticateResponse,
    type GetConversationResponse,
    type VerifyOtp200,
} from "@/shared/types/dto.js";
import fastifyAuth from "@fastify/auth";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifySensible from "@fastify/sensible";
import fastifySSE from "@fastify/sse";
import fastifySwagger from "@fastify/swagger";
import * as ucans from "@ucans/ucans";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { type FastifyRequest } from "fastify";
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import fs from "fs";
import { config, log, server } from "./app.js";
import * as authService from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import * as csvImportService from "@/service/csvImport.js";
import * as feedService from "@/service/feed.js";
import * as postService from "@/service/post.js";
import {
    validateCsvFieldNames,
    MAX_CSV_FILE_SIZE,
} from "@/shared-app-api/csvUpload.js";
import * as conversationExportService from "@/service/conversationExport/index.js";
import * as conversationImportService from "@/service/conversationImport/index.js";
import { startStaleImportCleanup } from "@/service/conversationImport/cleanupScheduler.js";
import { validateS3Access } from "./service/s3.js";
// import * as p2pService from "@/service/p2p.js";
import * as nostrService from "@/service/nostr.js";
// import * as polisService from "@/service/polis.js";
// import * as migrationService from "@/service/migration.js";
import WebSocket from "ws";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { Relay, useWebSocketImplementation } from "nostr-tools/relay";
import {
    httpMethodToAbility,
    httpUrlToResourcePointer,
} from "./shared-app-api/ucan/ucan.js";
import {
    deleteOpinionBySlugId,
    fetchAnalysisByConversationSlugId,
    fetchOpinionsByPostSlugId,
    fetchOpinionsByOpinionSlugIdList,
    postNewOpinion,
} from "./service/comment.js";
import { getUserPollResponse, submitPollResponse } from "./service/poll.js";
import {
    castVoteForOpinionSlugId,
    getUserVotesForPostSlugIds as getUserVotesByConversations,
} from "./service/voting.js";
import {
    getFilteredUserComments,
    getUserPosts,
    getUserProfile,
} from "./service/user.js";
import axios, { type AxiosInstance } from "axios";
import {
    generateVerificationLink,
    verifyUserStatusAndAuthenticate,
} from "./service/rarimo.js";
import { verifyEventTicket } from "./service/zupass.js";
import {
    checkUserNameInUse,
    deleteUserAccount,
    generateUnusedRandomUsername,
    submitUsernameChange,
} from "./service/account.js";
import { isModeratorAccount } from "@/service/authUtil.js";
import {
    fetchModerationReportByCommentSlugId as getOpinionModerationStatus,
    fetchModerationReportByPostSlugId as getConversationModerationStatus,
    moderateByCommentSlugId,
    moderateByPostSlugId,
    withdrawModerationReportByCommentSlugId,
    withdrawModerationReportByPostSlugId,
} from "./service/moderation.js";
import {
    createUserReportByCommentSlugId,
    createUserReportByPostSlugId,
    fetchUserReportsByCommentSlugId,
    fetchUserReportsByPostSlugId,
} from "./service/report.js";
import {
    getUserMutePreferences,
    muteUserByUsername,
} from "./service/muteUser.js";
import {
    getNotifications,
    markAllNotificationsAsRead,
} from "./service/notification.js";
import twilio from "twilio";
import { initializeValkey } from "./shared-backend/valkey.js";
import { createVoteBuffer } from "./service/voteBuffer.js";
import { createExportBuffer } from "./service/exportBuffer.js";
import { createImportBuffer } from "./service/importBuffer.js";
import { NotificationSSEManager } from "./service/notificationSSE.js";
import {
    addUserOrganizationMapping,
    createOrganization,
    deleteOrganization,
    getAllOrganizations,
    getOrganizationsByUsername,
    removeUserOrganizationMapping,
} from "./service/administrator/organization.js";
import type {
    DeviceIsKnownTrueLoginStatus,
    DeviceLoginStatusExtended,
} from "./shared/types/zod.js";
import {
    getAllTopics,
    getUserFollowedTopics,
    userFollowTopicByCode,
    userUnfollowTopicByCode,
} from "./service/topic.js";
import {
    getLanguagePreferences,
    updateLanguagePreferences,
} from "./service/language.js";
import {
    ZodSupportedDisplayLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "./shared/languages.js";
import { createDb } from "./shared-backend/db.js";
import {
    initializeGoogleCloudCredentials,
    type GoogleCloudCredentials,
} from "./shared-backend/googleCloudAuth.js";
import { nowZeroMs } from "./shared/util.js";
// import { Protocols, createLightNode } from "@waku/sdk";
// import { WAKU_TOPIC_CREATE_POST } from "@/service/p2p.js";

server.register(fastifySensible);
server.register(fastifyAuth);
server.register(fastifyCors, {
    // put your options here
    origin: (origin, cb) => {
        //TODO: allow https and enforcing CORS during dev?
        if (config.NODE_ENV === "development") {
            cb(null, true);
            return;
        }
        if (origin !== undefined) {
            if (config.CORS_ORIGIN_LIST.includes(origin)) {
                //  Request from localhost will pass
                cb(null, true);
                return;
            }
            // Generate an error on other origins, disabling access
            cb(new Error("Not allowed"), false);
        }
    },
});

// Register multipart plugin for file uploads (for CSV import)
server.register(fastifyMultipart, {
    limits: {
        fileSize: MAX_CSV_FILE_SIZE,
        files: 3,
    },
});

// Register SSE plugin for real-time notification streaming
// @fastify/sse has type compatibility issues with Fastify v5
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
await server.register(fastifySSE as any);

// Add schema validator and serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const speciallyAuthorizedPhones: string[] =
    config.NODE_ENV === "production"
        ? []
        : config.SPECIALLY_AUTHORIZED_PHONES !== undefined &&
            config.SPECIALLY_AUTHORIZED_PHONES.length !== 0
          ? config.SPECIALLY_AUTHORIZED_PHONES.replace(/\s/g, "").split(",")
          : [];

const axiosVerificatorSvc: AxiosInstance = axios.create({
    baseURL: config.VERIFICATOR_SVC_BASE_URL,
});

export const axiosPolis: AxiosInstance | undefined =
    config.POLIS_BASE_URL !== undefined
        ? axios.create({
              baseURL: config.POLIS_BASE_URL,
          })
        : undefined;

// Websocket polyfill necessary on nodejs to avoid
// .pnpm/nostr-tools@2.10.4_typescript@5.2.2/node_modules/nostr-tools/lib/esm/relay.js:260
// this._WebSocket = opts.websocketImplementation || WebSocket;
// ReferenceError: WebSocket is not defined             ^
// See https://github.com/nbd-wtf/nostr-tools/issues/57#issuecomment-1363420743
useWebSocketImplementation(WebSocket);
// Agora backend's own private key
let nostrSecretKey: Uint8Array;
let nostrPublicKey: string;
if (config.NODE_ENV === "development") {
    nostrSecretKey = generateSecretKey(); // `sk` is a Uint8Array
    nostrPublicKey = getPublicKey(nostrSecretKey);
} else {
    // TODO: use AWS KMS
    nostrSecretKey = generateSecretKey(); // `sk` is a Uint8Array
    nostrPublicKey = getPublicKey(nostrSecretKey);
}
let relay: Relay;
if (config.NOSTR_PROOF_CHANNEL_EVENT_ID !== undefined) {
    try {
        relay = await Relay.connect(config.NOSTR_DEFAULT_RELAY_URL);
        log.info(`Connected to ${relay.url}`);
    } catch (e) {
        log.error("Unable to start the connection with the Nostr relay");
        log.error(e);
        process.exit(1);
    }
}

const mustSendActualSms = config.NODE_ENV === "production";
let twilioClient: twilio.Twilio | undefined;
if (mustSendActualSms) {
    if (
        config.TWILIO_AUTH_TOKEN === undefined ||
        config.TWILIO_ACCOUNT_SID === undefined ||
        config.TWILIO_SERVICE_SID === undefined
    ) {
        log.error("Twilio configuration must be set for SMS to be sent");
        process.exit(1);
    } else {
        twilioClient = twilio(
            config.TWILIO_ACCOUNT_SID,
            config.TWILIO_AUTH_TOKEN,
        );
    }
}

// axiosVerificatorSvc.interceptors.request.use((request) => {
//     log.info("Starting Request", JSON.stringify(request));
//     return request;
// });
// axiosVerificatorSvc.interceptors.response.use((response) => {
//     log.info("Response:", JSON.stringify(response));
//     return response;
// });

server.register(fastifySwagger, {
    openapi: {
        info: {
            title: "Agora Citizen Network",
            description: "Agora API",
            version: "1.0.0",
        },
        servers: [],
        security: [
            {
                BearerAuth: [],
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                },
            },
        },
    },
    transform: jsonSchemaTransform,
    // You can also create transform with custom skiplist of endpoints that should not be included in the specification:
    //
    // transform: createJsonSchemaTransform({
    //   skipList: [ '/documentation/static/*' ]
    // })
});

// Custom error handler
server.setErrorHandler((error, _request, reply) => {
    // Check if the error has a status code of 500
    if (error.statusCode === undefined || error.statusCode >= 500) {
        // Modify the response message for status code 500
        // ... by wrapping the original error with a generic error
        // For security sake, we don't want the frontend to know the exact nature of the internal errors
        const genericError = server.httpErrors.internalServerError();
        genericError.cause = error;
        reply.send(genericError);
    } else if (error.statusCode === 401) {
        const genericError = server.httpErrors.unauthorized();
        genericError.cause = error;
        reply.send(genericError);
    } else if (error.statusCode === 403) {
        const genericError = server.httpErrors.forbidden();
        genericError.cause = error;
        reply.send(genericError);
    } else {
        // For other status codes, forward the original error
        reply.send(error);
    }
});

// // Create and start a Light Node
// const node = await createLightNode({
//     defaultBootstrap: true,
//     networkConfig: {
//         clusterId: 1,
//         contentTopics: ["/agora/1/create-conversation/proto"],
//     },
// });
// await node.start();
// await node.waitForPeers([Protocols.LightPush]);

const db = await createDb(config, log);

// Validate S3 configuration if export feature is enabled
if (config.CONVERSATION_EXPORT_ENABLED) {
    if (!config.AWS_S3_BUCKET_NAME || !config.AWS_S3_REGION) {
        log.error(
            "[API] S3 configuration missing but export feature is enabled",
        );
        process.exit(1);
    }
    try {
        await validateS3Access({ bucketName: config.AWS_S3_BUCKET_NAME });
    } catch (error) {
        log.error(error, "[API] Failed to validate S3 access");
        process.exit(1);
    }
}

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
        log.info("[API] Google Cloud Translation initialized successfully");
    } catch (error) {
        log.error(
            error,
            "[API] Failed to initialize Google Cloud Translation - translations will be disabled",
        );
        // Continue without translations - this is not a fatal error
    }
} else {
    log.info(
        "[API] Google Cloud Translation not configured - translations disabled",
    );
}

// Initialize Valkey (optional - for vote buffer persistence)
const valkey = initializeValkey({ valkeyUrl: config.VALKEY_URL, log });

// Initialize VoteBuffer (batches votes to reduce DB contention)
const voteBuffer = createVoteBuffer({
    db,
    valkey,
    flushIntervalMs: 1000,
});
log.info(
    `[API] Vote buffer initialized (flush interval: 1s, persistence: ${valkey !== undefined ? "Valkey" : "in-memory only"})`,
);

// Initialize Notification SSE Manager for real-time notifications
const notificationSSEManager = new NotificationSSEManager();
notificationSSEManager.initialize();

// Initialize ExportBuffer (batches export requests to reduce system load)
const exportBuffer = createExportBuffer({
    db,
    valkey,
    notificationSSEManager,
    flushIntervalMs: 1000,
    maxBatchSize: 100,
    cooldownSeconds: config.CONVERSATION_EXPORT_COOLDOWN_SECONDS,
    exportExpiryDays: config.CONVERSATION_EXPORT_EXPIRY_DAYS,
});
log.info(
    `[API] Export buffer initialized (flush interval: 1s, cooldown: ${String(config.CONVERSATION_EXPORT_COOLDOWN_SECONDS)}s, persistence: ${valkey !== undefined ? "Valkey" : "in-memory only"})`,
);

// Initialize ImportBuffer (batches import requests to reduce system load)
const importBuffer = createImportBuffer({
    db,
    valkey,
    notificationSSEManager,
    voteBuffer,
    flushIntervalMs: 1000,
    maxBatchSize: 5,
});
log.info(
    `[API] Import buffer initialized (flush interval: 1s, max batch: 5, persistence: ${valkey !== undefined ? "Valkey" : "in-memory only"})`,
);

// Start scheduled cleanup for stale imports
const stopImportCleanup = startStaleImportCleanup({ db });

interface ExpectedDeviceStatus {
    userId?: string;
    isKnown?: boolean;
    isLoggedIn?: boolean;
    isRegistered?: boolean;
    isGuestOrLoggedIn?: boolean;
}

interface OptionsVerifyUcan {
    expectedDeviceStatus?: ExpectedDeviceStatus;
}

interface ExpectedKnownDeviceStatus {
    userId?: string;
    isLoggedIn?: boolean;
    isRegistered?: boolean;
    isGuestOrLoggedIn?: boolean; // lowest precedence
}

interface OptionsVerifyUcanKnownDevice {
    expectedKnownDeviceStatus?: ExpectedKnownDeviceStatus;
}

const SERVER_URL =
    config.NODE_ENV === "production"
        ? config.SERVER_URL_PROD
        : config.NODE_ENV === "staging"
          ? config.SERVER_URL_STAGING
          : config.SERVER_URL_DEV;

const SERVER_DID =
    config.NODE_ENV === "production"
        ? config.SERVER_DID_PROD
        : config.NODE_ENV === "staging"
          ? config.SERVER_DID_STAGING
          : config.SERVER_DID_DEV;

function getAuthHeader(request: FastifyRequest) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw server.httpErrors.unauthorized("No UCAN in Bearer token");
    } else {
        return authHeader;
    }
}

function getEncodedUcan(request: FastifyRequest): string {
    const authHeader = getAuthHeader(request);
    const encodedUcan = authHeader.substring(7, authHeader.length);
    return encodedUcan;
}

interface VerifyUcanAndDeviceStatusReturn {
    didWrite: string;
    encodedUcan: string;
    deviceStatus: DeviceLoginStatusExtended;
}
interface VerifyUcanKnownDeviceReturn {
    didWrite: string;
    encodedUcan: string;
    deviceStatus: DeviceIsKnownTrueLoginStatus;
}

interface VerifyUcanReturn {
    didWrite: string;
    encodedUcan: string;
}
async function verifyUcan(request: FastifyRequest): Promise<VerifyUcanReturn> {
    const encodedUcan = getEncodedUcan(request);

    const { scheme, hierPart } = httpUrlToResourcePointer(
        new URL(request.originalUrl, SERVER_URL),
    );

    const parsedUcan = ucans.parse(encodedUcan);
    const rootIssuerDid = parsedUcan.payload.iss;
    const result = await ucans.verify(encodedUcan, {
        audience: SERVER_DID,
        isRevoked: () =>
            new Promise((resolve) => {
                resolve(false);
            }), // users' generated UCANs are short-lived action-specific one-time token so the revocation feature is unnecessary
        requiredCapabilities: [
            {
                capability: {
                    with: { scheme, hierPart },
                    can: httpMethodToAbility(request.method),
                },
                rootIssuer: rootIssuerDid,
            },
        ],
    });
    if (!result.ok) {
        log.error(
            `UCAN verification failed - encodedUcan: ${encodedUcan}, SERVER_DID: ${SERVER_DID}, scheme: ${scheme}, hierPart: ${hierPart}, parsedUcan: ${JSON.stringify(parsedUcan)}, result: ${JSON.stringify(result)}`,
        );
        if (Array.isArray(result.error)) {
            result.error.forEach((err, i) => {
                log.error(
                    `UCAN verification error ${String(i)}: ${err instanceof Error ? `${err.name} - ${err.message}` : String(err)}`,
                );
            });
        }
        throw server.httpErrors.createError(
            401,
            "UCAN validation failed",
            new AggregateError(result.error),
        );
    }
    return {
        encodedUcan: encodedUcan,
        didWrite: rootIssuerDid,
    };
}

async function verifyUcanAndDeviceStatus(
    db: PostgresDatabase,
    request: FastifyRequest,
    options?: OptionsVerifyUcan,
): Promise<VerifyUcanAndDeviceStatusReturn> {
    const defaultOptions = {
        expectedDeviceStatus: {
            isLoggedIn: true,
            isKnown: true,
            isRegistered: true,
            isGuestOrLoggedIn: false,
        },
    };
    let actualOptions = options;
    actualOptions ??= defaultOptions;
    const { encodedUcan, didWrite } = await verifyUcan(request);
    const now = nowZeroMs();
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    if (
        actualOptions.expectedDeviceStatus?.isKnown !== undefined &&
        actualOptions.expectedDeviceStatus.isKnown !== deviceStatus.isKnown
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isKnown=${actualOptions.expectedDeviceStatus.isKnown.toString()}' but has 'isKnown=${deviceStatus.isKnown.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isRegistered !== undefined &&
        actualOptions.expectedDeviceStatus.isRegistered !==
            deviceStatus.isRegistered
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isRegistered=${actualOptions.expectedDeviceStatus.isRegistered.toString()}' but has 'isRegistered=${deviceStatus.isRegistered.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isLoggedIn !== undefined &&
        actualOptions.expectedDeviceStatus.isLoggedIn !==
            deviceStatus.isLoggedIn
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isLoggedIn=${actualOptions.expectedDeviceStatus.isLoggedIn.toString()}' but has 'isLoggedIn=${deviceStatus.isLoggedIn.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.userId !== undefined &&
        !deviceStatus.isKnown
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to have 'userId=${actualOptions.expectedDeviceStatus.userId}' but is unknown`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.userId !== undefined &&
        deviceStatus.isKnown &&
        actualOptions.expectedDeviceStatus.userId !== deviceStatus.userId
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to have 'userId=${actualOptions.expectedDeviceStatus.userId}' but has 'userId=${deviceStatus.userId}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isGuestOrLoggedIn !== undefined &&
        actualOptions.expectedDeviceStatus.isGuestOrLoggedIn ===
            !(deviceStatus.isKnown && !deviceStatus.isRegistered) && // neither guest
        !(deviceStatus.isLoggedIn && deviceStatus.isRegistered) // nor logged-in
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to be either Guest or a Logged-In registered user but it is neither`,
        );
    }
    return {
        didWrite: didWrite,
        encodedUcan: encodedUcan,
        deviceStatus: deviceStatus,
    };
}

// always return userId !== undefined
async function verifyUcanAndKnownDeviceStatus(
    db: PostgresDatabase,
    request: FastifyRequest,
    options?: OptionsVerifyUcanKnownDevice,
): Promise<VerifyUcanKnownDeviceReturn> {
    const defaultOptions = {
        expectedDeviceStatus: {
            isKnown: true,
            isRegistered: true,
            isLoggedIn: true,
            isGuestOrLoggedIn: false,
        },
    };
    let actualOptions: OptionsVerifyUcan;
    if (options !== undefined) {
        actualOptions = {
            expectedDeviceStatus: { isKnown: true, ...options },
        };
    } else {
        actualOptions = defaultOptions;
    }
    const { didWrite, encodedUcan, deviceStatus } =
        await verifyUcanAndDeviceStatus(db, request, actualOptions);
    if (!deviceStatus.isKnown) {
        log.error(
            "The error below is unexpected, it should have been checked already by `verifyUcanAndDeviceStatus`",
        );
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to be a known device`,
        );
    }
    return {
        didWrite,
        encodedUcan,
        deviceStatus,
    };
}

const apiVersion = "v1";

function checkConversationExportEnabled(): void {
    if (!config.CONVERSATION_EXPORT_ENABLED) {
        throw server.httpErrors.serviceUnavailable(
            "Conversation export feature is currently disabled",
        );
    }
}

// const awsMailConf = {
//     accessKeyId: config.AWS_ACCESS_KEY_ID,
//     secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
// };

server.after(() => {
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/check-login-status`,
        schema: {
            response: { 200: Dto.checkLoginStatusResponse },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            // if-else statements are just for typescript and the zod discriminated union thing
            if (deviceStatus.isKnown) {
                return {
                    loggedInStatus: {
                        isKnown: deviceStatus.isKnown,
                        isLoggedIn: deviceStatus.isLoggedIn,
                        isRegistered: deviceStatus.isRegistered,
                        userId: deviceStatus.userId,
                    },
                };
            } else {
                return {
                    loggedInStatus: {
                        isKnown: deviceStatus.isKnown,
                        isLoggedIn: deviceStatus.isLoggedIn,
                        isRegistered: deviceStatus.isRegistered,
                    },
                };
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/authenticate`,
        schema: {
            body: Dto.authenticateRequestBody,
            response: { 200: Dto.authenticate200 },
        },
        handler: async (request) => {
            // This endpoint is accessible without being logged in
            // this endpoint could be especially subject to attacks such as DDoS or man-in-the-middle (to associate their own DID instead of the legitimate user's ones for example)
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            // wrapper function for Typescript to be happy with the zod discriminated union type
            async function doAuthenticate(): Promise<AuthenticateResponse> {
                if (deviceStatus.isLoggedIn) {
                    return {
                        success: false,
                        reason: "already_logged_in",
                    };
                }
                const userAgent =
                    request.headers["user-agent"] ?? "Unknown device";

                // backend intentionally does NOT say whether it is a register or a login - in order to protect privacy and give no information to potential attackers
                return await authService.authenticateAttempt({
                    db,
                    twilioClient,
                    twilioServiceSid: config.TWILIO_SERVICE_SID,
                    doUseTestCode:
                        !mustSendActualSms &&
                        speciallyAuthorizedPhones.includes(
                            request.body.phoneNumber,
                        ),
                    testCode: config.TEST_CODE,
                    authenticateRequestBody: request.body,
                    minutesBeforeSmsCodeExpiry:
                        config.MINUTES_BEFORE_SMS_OTP_EXPIRY,
                    didWrite,
                    throttleSmsSecondsInterval:
                        config.THROTTLE_SMS_SECONDS_INTERVAL,
                    // awsMailConf: awsMailConf,
                    userAgent: userAgent,
                    peppers: config.PEPPERS,
                });
            }
            return await doAuthenticate();
        },
    });

    // TODO: for now, there is no 2FA so when this returns true, it means the user has finished logging in/registering - but it will change
    // TODO: for now there is no way to communicate "isTrusted", it's set to true automatically - but it will change
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/phone/verify-otp`,
        schema: {
            body: Dto.verifyOtpReqBody,
            response: {
                200: Dto.verifyOtp200,
            },
        },
        handler: async (request) => {
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            async function doVerifyPhoneOtp(): Promise<VerifyOtp200> {
                if (deviceStatus.isLoggedIn) {
                    return {
                        success: false,
                        reason: "already_logged_in",
                    };
                }
                return await authService.verifyPhoneOtp({
                    db,
                    maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                    didWrite,
                    code: request.body.code,
                    phoneNumber: request.body.phoneNumber,
                    defaultCallingCode: request.body.defaultCallingCode,
                    twilioClient: twilioClient,
                    twilioServiceSid: config.TWILIO_SERVICE_SID,
                    peppers: config.PEPPERS,
                });
            }
            return await doVerifyPhoneOtp();
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/logout`,
        handler: async (request) => {
            const { didWrite } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            await authService.logout(db, didWrite);
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/fetch-recent`,
        schema: {
            body: Dto.fetchFeedRequest,
            response: {
                200: Dto.fetchFeedResponse,
            },
        },
        handler: async (request) => {
            let isAuthenticatedRequest = false;
            const authHeader = request.headers.authorization;
            if (authHeader !== undefined) {
                isAuthenticatedRequest = true;
            } else {
                isAuthenticatedRequest = false;
            }
            if (isAuthenticatedRequest) {
                const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                    db,
                    request,
                    {
                        expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                    },
                );

                return await feedService.fetchFeed({
                    db: db,
                    personalizationUserId: deviceStatus.userId,
                    baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                    sortAlgorithm: request.body.sortAlgorithm,
                });
            } else {
                return await feedService.fetchFeed({
                    db: db,
                    baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                    sortAlgorithm: request.body.sortAlgorithm,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/create`,
        schema: {
            body: Dto.moderateReportPostRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await moderateByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                moderationReason: request.body.moderationReason,
                moderationAction: request.body.moderationAction,
                moderationExplanation: request.body.moderationExplanation,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/create`,
        schema: {
            body: Dto.moderateReportCommentRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await moderateByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
                moderationReason: request.body.moderationReason,
                moderationAction: request.body.moderationAction,
                moderationExplanation: request.body.moderationExplanation,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/withdraw`,
        schema: {
            body: Dto.moderateCancelConversationReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await withdrawModerationReportByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/withdraw`,
        schema: {
            body: Dto.moderateCancelOpinionReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await withdrawModerationReportByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/get`,
        schema: {
            body: Dto.getConversationModerationStatusRequest,
            response: {
                200: Dto.getConversationModerationStatusResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await getConversationModerationStatus({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/get`,
        schema: {
            body: Dto.getOpinionModerationStatusRequest,
            response: {
                200: Dto.getOpinionModerationStatusResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await getOpinionModerationStatus({
                db: db,
                commentSlugId: request.body.opinionSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/get-followed`,
        schema: {
            response: {
                200: Dto.getUserFollowedTopicCodesResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserFollowedTopics({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/follow`,
        schema: {
            body: Dto.userFollowTopicCodeRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await userFollowTopicByCode({
                db: db,
                topicCode: request.body.topicCode,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/unfollow`,
        schema: {
            body: Dto.userUnfollowTopicCodeRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await userUnfollowTopicByCode({
                db: db,
                topicCode: request.body.topicCode,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/profile/get`,
        schema: {
            response: {
                200: Dto.getUserProfileResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserProfile({
                db: db,
                userId: deviceStatus.userId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/conversation/fetch`,
        schema: {
            body: Dto.fetchUserConversationsRequest,
            response: {
                200: Dto.fetchUserConversationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            const conversationsMap = await getUserPosts({
                db: db,
                userId: deviceStatus.userId,
                lastPostSlugId: request.body.lastConversationSlugId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                limit: 10,
            });
            return Array.from(conversationsMap.values());
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/opinion/fetch`,
        schema: {
            body: Dto.fetchUserOpinionsRequest,
            response: {
                200: Dto.fetchUserOpinionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getFilteredUserComments({
                db: db,
                userId: deviceStatus.userId,
                lastCommentSlugId: request.body.lastOpinionSlugId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                limit: 10,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/vote/get-by-conversations`,
        schema: {
            body: Dto.getUserVotesByConversationsRequest,
            response: {
                200: Dto.getUserVotesByConversationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserVotesByConversations({
                db: db,
                postSlugIdList: request.body.conversationSlugIdList,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/vote/cast`,
        schema: {
            body: Dto.castVoteRequest,
            response: {
                200: Dto.castVoteResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan } = await verifyUcan(request);

            const now = nowZeroMs();
            const castVoteResponse = await castVoteForOpinionSlugId({
                db: db,
                voteBuffer: voteBuffer,
                opinionSlugId: request.body.opinionSlugId,
                didWrite: didWrite,
                proof: encodedUcan,
                votingAction: request.body.chosenOption,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: now,
            });
            reply.send(castVoteResponse);
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/poll/respond`,
        schema: {
            body: Dto.pollRespondRequest,
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan } = await verifyUcan(request);
            const now = nowZeroMs();
            await submitPollResponse({
                db: db,
                proof: encodedUcan,
                didWrite: didWrite,
                httpErrors: server.httpErrors,
                postSlugId: request.body.conversationSlugId,
                voteOptionChoice: request.body.voteOptionChoice,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: now,
            });
            reply.send();
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/poll/get-response-by-conversations`,
        schema: {
            body: Dto.getUserPollResponseByConversationsRequest,
            response: {
                200: Dto.getUserPollResponseByConversationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            return await getUserPollResponse({
                db: db,
                postSlugIdList: request.body,
                authorId: deviceStatus.userId,
                httpErrors: server.httpErrors,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/delete`,
        schema: {
            body: Dto.deleteOpinionRequest,
        },
        handler: async (request, reply) => {
            const { deviceStatus, encodedUcan, didWrite } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                });
            await deleteOpinionBySlugId({
                db: db,
                opinionSlugId: request.body.opinionSlugId,
                userId: deviceStatus.userId,
                proof: encodedUcan,
                didWrite: didWrite,
            });
            reply.send();
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/create`,
        schema: {
            body: Dto.createOpinionRequest,
            response: {
                200: Dto.createOpinionResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan } = await verifyUcan(request);
            const now = nowZeroMs();
            const newOpinionResponse = await postNewOpinion({
                db: db,
                voteBuffer: voteBuffer,
                commentBody: request.body.opinionBody,
                conversationSlugId: request.body.conversationSlugId,
                didWrite: didWrite,
                proof: encodedUcan,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: now,
                isSeed: false,
                notificationSSEManager: notificationSSEManager,
            });
            reply.send(newOpinionResponse);
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-by-conversation`,
        schema: {
            body: Dto.fetchOpinionsRequest,
            response: {
                200: Dto.fetchOpinionsResponse,
            },
        },
        handler: async (request) => {
            let isAuthenticatedRequest = false;
            const authHeader = request.headers.authorization;
            if (authHeader !== undefined) {
                isAuthenticatedRequest = true;
            } else {
                isAuthenticatedRequest = false;
            }
            if (isAuthenticatedRequest) {
                const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                    db,
                    request,
                    {
                        expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                    },
                );

                const opinionItemsPerSlugId = await fetchOpinionsByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                    filterTarget: request.body.filter,
                    personalizationUserId: deviceStatus.userId,
                    limit: 3000,
                });
                return Array.from(opinionItemsPerSlugId.values());
            } else {
                const opinionItemsPerSlugId = await fetchOpinionsByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                    filterTarget: request.body.filter,
                    limit: 3000,
                });
                return Array.from(opinionItemsPerSlugId.values());
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-by-conversation`,
        schema: {
            body: Dto.fetchAnalysisRequest,
            response: {
                200: Dto.fetchAnalysisResponse,
            },
        },
        handler: async (request) => {
            let isAuthenticatedRequest = false;
            const authHeader = request.headers.authorization;
            if (authHeader !== undefined) {
                isAuthenticatedRequest = true;
            } else {
                isAuthenticatedRequest = false;
            }
            if (isAuthenticatedRequest) {
                const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                    db,
                    request,
                    {
                        expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                    },
                );

                // Get display language from validated header or use default "en"
                const parsedHeaderDisplayLanguage =
                    ZodSupportedDisplayLanguageCodes.safeParse(
                        request.headers["accept-language"],
                    );
                const headerDisplayLanguage: SupportedDisplayLanguageCodes =
                    parsedHeaderDisplayLanguage.success
                        ? parsedHeaderDisplayLanguage.data
                        : "en";

                // Get user's display language from DB (falls back to header language)
                const displayLanguage = await getLanguagePreferences({
                    db,
                    userId: deviceStatus.userId,
                    request: { currentDisplayLanguage: headerDisplayLanguage },
                }).then((prefs) => prefs.displayLanguage);

                const analysis = await fetchAnalysisByConversationSlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    personalizationUserId: deviceStatus.userId,
                    displayLanguage,
                    googleCloudCredentials,
                });
                return analysis;
            } else {
                // Get display language from validated header or use default "en"
                const displayLanguage =
                    request.headers["accept-language"] ?? "en";

                const analysis = await fetchAnalysisByConversationSlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    displayLanguage,
                    googleCloudCredentials,
                });
                return analysis;
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-by-slug-id-list`,
        schema: {
            body: Dto.getOpinionBySlugIdListRequest,
            response: {
                200: Dto.getOpinionBySlugIdListResponse,
            },
        },
        handler: async (request) => {
            return await fetchOpinionsByOpinionSlugIdList({
                db: db,
                opinionSlugIdList: request.body.opinionSlugIdList,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-hidden-by-conversation`,
        schema: {
            body: Dto.fetchHiddenOpinionsRequest,
            response: {
                200: Dto.fetchHiddenOpinionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }
            const opinionItemsPerSlugId = await fetchOpinionsByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                filterTarget: "hidden",
                limit: 3000,
            });
            return Array.from(opinionItemsPerSlugId.values());
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/delete`,
        schema: {
            body: Dto.deleteConversationRequest,
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: { isLoggedIn: true },
                });
            await postService.deletePostBySlugId({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
                proof: encodedUcan,
                didWrite: didWrite,
            });
            reply.send();
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/create`,
        schema: {
            body: Dto.createNewConversationRequest,
            response: {
                200: Dto.createNewConversationResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });

            const { conversationSlugId } = await postService.createNewPost({
                db: db,
                voteBuffer: voteBuffer,
                conversationTitle: request.body.conversationTitle,
                conversationBody: request.body.conversationBody ?? null,
                pollingOptionList: request.body.pollingOptionList ?? null,
                authorId: deviceStatus.userId,
                didWrite: didWrite,
                proof: encodedUcan,
                indexConversationAt: request.body.indexConversationAt,
                postAsOrganization: request.body.postAsOrganization,
                isIndexed: request.body.isIndexed,
                isLoginRequired: request.body.isLoginRequired,
                seedOpinionList: request.body.seedOpinionList,
                requiresEventTicket: request.body.requiresEventTicket,
            });
            reply.send({ conversationSlugId });
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
            // await p2pService.broadcastProof({
            //     proof: encodedUcan,
            //     node: node,
            //     topic: WAKU_TOPIC_CREATE_POST,
            // });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import`,
        schema: {
            body: Dto.importConversationRequest,
            response: {
                200: Dto.importConversationResponse,
            },
        },
        handler: async (request) => {
            const { didWrite, encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });

            if (axiosPolis === undefined) {
                log.error(
                    "Connection with Polis Python bridge must be operational to import conversations",
                );
                throw server.httpErrors.internalServerError(
                    "Backend service is not equiped to process the import request",
                );
            }

            return await postService.importConversation({
                db: db,
                voteBuffer: voteBuffer,
                authorId: deviceStatus.userId,
                didWrite: didWrite,
                proof: encodedUcan,
                polisUrl: request.body.polisUrl,
                axiosPolis: axiosPolis,
                indexConversationAt: request.body.indexConversationAt,
                postAsOrganization: request.body.postAsOrganization,
                isIndexed: request.body.isIndexed,
                isLoginRequired: request.body.isLoginRequired,
                requiresEventTicket: request.body.requiresEventTicket,
                isOrgImportOnly: config.IS_ORG_IMPORT_ONLY,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/validate-csv`,
        schema: {
            consumes: ["multipart/form-data"],
            response: {
                200: Dto.validateCsvResponse,
            },
        },
        handler: async (request, reply) => {
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: {
                    isLoggedIn: true,
                    isRegistered: true,
                },
            });

            // Parse multipart request - accept any combination of files
            const parts = request.parts();
            const files: Partial<Record<string, string>> = {};

            for await (const part of parts) {
                if (part.type === "file") {
                    // Validate file size before buffering to prevent memory exhaustion
                    const chunks: Buffer[] = [];
                    let totalSize = 0;
                    for await (const chunk of part.file) {
                        totalSize += chunk.length;
                        if (totalSize > MAX_CSV_FILE_SIZE) {
                            throw server.httpErrors.payloadTooLarge(
                                `File '${part.fieldname}' exceeds maximum size of 50MB`,
                            );
                        }
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    files[part.fieldname] = buffer.toString("utf-8");
                }
                // Ignore form fields - validation doesn't need them
            }

            // Validate the uploaded files (supports 1, 2, or 3 files)
            const validationResult =
                await csvImportService.validateIndividualCsvFiles({ files });

            reply.send(validationResult);
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import-csv`,
        schema: {
            consumes: ["multipart/form-data"],
            response: {
                200: Dto.importCsvConversationResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });

            // Parse multipart request
            const parts = request.parts();
            const files: Partial<Record<string, string>> = {};
            const formFields: Record<string, string> = {};

            for await (const part of parts) {
                if (part.type === "file") {
                    // Validate file size before buffering to prevent memory exhaustion
                    const chunks: Buffer[] = [];
                    let totalSize = 0;
                    for await (const chunk of part.file) {
                        totalSize += chunk.length;
                        if (totalSize > MAX_CSV_FILE_SIZE) {
                            throw server.httpErrors.payloadTooLarge(
                                `File '${part.fieldname}' exceeds maximum size of 50MB`,
                            );
                        }
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    files[part.fieldname] = buffer.toString("utf-8");
                } else {
                    // Parse form fields
                    formFields[part.fieldname] = part.value as string;
                }
            }

            // Validate that all required files are present
            const fileValidation = validateCsvFieldNames(Object.keys(files));
            if (!fileValidation.isValid) {
                throw server.httpErrors.badRequest(
                    `Missing required CSV files: ${fileValidation.missingFields.join(", ")}`,
                );
            }

            // Validate and parse form fields using DTO with preprocessing
            const parsedFields =
                Dto.importCsvConversationFormRequest.parse(formFields);

            // Check organization restriction (same as URL import)
            authUtilService.validateOrgImportRestriction(
                parsedFields.postAsOrganization,
                config.IS_ORG_IMPORT_ONLY,
            );

            // Verify organization membership if specified
            if (parsedFields.postAsOrganization !== undefined) {
                const organizationId =
                    await authUtilService.isUserPartOfOrganization({
                        db,
                        organizationName: parsedFields.postAsOrganization,
                        userId: deviceStatus.userId,
                    });
                if (organizationId === undefined) {
                    throw server.httpErrors.forbidden(
                        `User '${deviceStatus.userId}' is not part of the organization: '${parsedFields.postAsOrganization}'`,
                    );
                }
            }

            // Request CSV import (creates record and queues for async processing)
            const { importSlugId } =
                await conversationImportService.requestConversationImport({
                    db,
                    userId: deviceStatus.userId,
                    files,
                    formData: {
                        postAsOrganization: parsedFields.postAsOrganization,
                        indexConversationAt: parsedFields.indexConversationAt,
                        isLoginRequired: parsedFields.isLoginRequired,
                        isIndexed: parsedFields.isIndexed,
                        requiresEventTicket: parsedFields.requiresEventTicket,
                    },
                    proof: encodedUcan,
                    didWrite,
                    importBuffer,
                });

            reply.send({ importSlugId });
        },
    });

    // Get Active Import for User
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/conversation/import/active`,
        schema: {
            response: {
                200: Dto.getActiveImportResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            return await conversationImportService.getActiveImportForUser({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    // Conversation Import Status Route
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/conversation/import/status/:importSlugId`,
        schema: {
            params: Dto.getConversationImportStatusRequest,
            response: {
                200: Dto.getConversationImportStatusResponse,
            },
        },
        handler: async (request) => {
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
            });

            const status =
                await conversationImportService.getConversationImportStatus({
                    db: db,
                    importSlugId: request.params.importSlugId,
                });

            if (status === null) {
                throw server.httpErrors.notFound("Import not found");
            }

            return status;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/get`,
        schema: {
            body: Dto.getConversationRequest,
            response: {
                200: Dto.getConversationResponse,
            },
        },
        handler: async (request) => {
            let isAuthenticatedRequest = false;
            const authHeader = request.headers.authorization;
            if (authHeader !== undefined) {
                isAuthenticatedRequest = true;
            } else {
                isAuthenticatedRequest = false;
            }
            if (isAuthenticatedRequest) {
                const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                    db,
                    request,
                    {
                        expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                    },
                );

                const postItem = await postService.fetchPostBySlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    personalizedUserId: deviceStatus.userId,
                    baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                });

                const response: GetConversationResponse = {
                    conversationData: postItem,
                };
                return response;
            } else {
                const postItem = await postService.fetchPostBySlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                });

                const response: GetConversationResponse = {
                    conversationData: postItem,
                };
                return response;
            }
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/zkp/generate-verification-link`, // there will be another subroute like /auth to _attach_ verified identifier to *already_logged_in accounts*.
        schema: {
            body: Dto.generateVerificationLinkRequest,
            response: {
                200: Dto.generateVerificationLink200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            return await generateVerificationLink({
                db,
                didWrite,
                axiosVerificatorSvc,
                linkType: request.body.linkType,
                baseEventId: config.BASE_EVENT_ID,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/zkp/verify-user-status-and-authenticate`, // there will be another subroute like /auth to _attach_ verified identifier to *already_logged_in accounts*.
        schema: {
            response: {
                200: Dto.verifyUserStatusAndAuthenticate200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const userAgent = request.headers["user-agent"] ?? "Unknown device";
            const verificationStatusAndNullifier =
                await verifyUserStatusAndAuthenticate({
                    db,
                    didWrite: didWrite,
                    axiosVerificatorSvc,
                    userAgent,
                });
            return verificationStatusAndNullifier;
        },
    });

    // Zupass event ticket verification
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/ticket/verify`,
        schema: {
            body: Dto.verifyEventTicketRequest,
            response: {
                200: Dto.verifyEventTicket200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            return await verifyEventTicket({
                db,
                didWrite,
                proofData: request.body.proof,
                eventSlug: request.body.eventSlug,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/delete`,
        schema: {},
        handler: async (request, reply) => {
            const { encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                });
            await deleteUserAccount({
                db: db,
                userId: deviceStatus.userId,
            });
            reply.send();
            const proofChannel40EventId = config.NOSTR_PROOF_CHANNEL_EVENT_ID;
            if (proofChannel40EventId !== undefined) {
                try {
                    await nostrService.broadcastProof({
                        proof: encodedUcan,
                        secretKey: nostrSecretKey,
                        publicKey: nostrPublicKey,
                        proofChannel40EventId: proofChannel40EventId,
                        relay: relay,
                        defaultRelayUrl: config.NOSTR_DEFAULT_RELAY_URL,
                    });
                } catch (e) {
                    log.error(
                        "Error while trying to broadcast proof to Nostr:",
                    );
                    log.error(e);
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/username/update`,
        schema: {
            body: Dto.updateUsernameRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await submitUsernameChange({
                db: db,
                username: request.body.username,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/is-username-in-use`,
        schema: {
            body: Dto.checkUsernameInUseRequest,
            response: {
                200: Dto.checkUsernameInUseResponse,
            },
        },
        handler: async (request) => {
            return await checkUserNameInUse({
                db: db,
                username: request.body.username,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/generate-unused-random-username`,
        schema: {
            response: {
                200: Dto.generateUnusedRandomUsernameResponse,
            },
        },
        handler: async () => {
            return await generateUnusedRandomUsername({
                db: db,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/add-user-organization-mapping`,
        schema: {
            body: Dto.addUserOrganizationMappingRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await addUserOrganizationMapping({
                db: db,
                username: request.body.username,
                organizationName: request.body.organizationName,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/remove-user-organization-mapping`,
        schema: {
            body: Dto.addUserOrganizationMappingRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await removeUserOrganizationMapping({
                db: db,
                username: request.body.username,
                organizationName: request.body.organizationName,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-organization-names-by-username`,
        schema: {
            body: Dto.getOrganizationsByUsernameRequest,
            response: {
                200: Dto.getOrganizationsByUsernameResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await getOrganizationsByUsername({
                db: db,
                username: request.body.username,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-all-organizations`,
        schema: {
            response: {
                200: Dto.getAllOrganizationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await getAllOrganizations({
                db: db,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/create-organization`,
        schema: {
            body: Dto.createOrganizationRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await createOrganization({
                db: db,
                organizationName: request.body.organizationName,
                imagePath: request.body.imagePath,
                isFullImagePath: request.body.isFullImagePath,
                websiteUrl: request.body.websiteUrl,
                description: request.body.description,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/delete-organization`,
        schema: {
            body: Dto.deleteOrganizationRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await deleteOrganization({
                db: db,
                organizationName: request.body.organizationName,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/conversation/create`,
        schema: {
            body: Dto.createConversationReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await createUserReportByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                userReportReason: request.body.reportReason,
                userReportExplanation: request.body.reportExplanation,
                userId: deviceStatus.userId,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/opinion/create`,
        schema: {
            body: Dto.createOpinionReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await createUserReportByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
                userReportReason: request.body.reportReason,
                userReportExplanation: request.body.reportExplanation,
                userId: deviceStatus.userId,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/conversation/fetch`,
        schema: {
            body: Dto.fetchConversationReportsRequest,
            response: {
                200: Dto.fetchConversationReportsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await fetchUserReportsByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/opinion/fetch`,
        schema: {
            body: Dto.fetchOpinionReportsRequest,
            response: {
                200: Dto.fetchOpinionReportsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            return await fetchUserReportsByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/mute/user/get`,
        schema: {
            response: {
                200: Dto.getMutedUsersResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            return await getUserMutePreferences({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/mute/user/create`,
        schema: {
            body: Dto.muteUserByUsernameRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await muteUserByUsername({
                db: db,
                muteAction: request.body.action,
                sourceUserId: deviceStatus.userId,
                targetUsername: request.body.targetUsername,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/notification/fetch`,
        schema: {
            body: Dto.fetchNotificationsRequest,
            response: {
                200: Dto.fetchNotificationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getNotifications({
                db: db,
                userId: deviceStatus.userId,
                lastSlugId: request.body.lastSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/notification/mark-all-read`,
        schema: {},
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await markAllNotificationsAsRead({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    // SSE endpoint for real-time notifications
    // Accepts authentication via query parameter since EventSource doesn't support custom headers
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/notification/stream`,
        sse: true, // Enable SSE mode - provides reply.sse.* methods
        schema: {
            querystring: Dto.notificationStreamQuerystring,
        },
        handler: async (request, reply) => {
            // Authenticate BEFORE initializing SSE to allow proper HTTP error responses
            let deviceStatus;
            try {
                // Get auth token from query parameter (type-safe)
                const { auth } = request.query;

                // Manually inject the auth header for UCAN verification
                request.headers.authorization = `Bearer ${auth}`;

                const result = await verifyUcanAndKnownDeviceStatus(
                    db,
                    request,
                    {
                        expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                    },
                );
                deviceStatus = result.deviceStatus;
            } catch (error) {
                log.error(error, "[SSE] Authentication failed");
                // Send HTTP error response before any SSE operations
                // Use string response instead of object for SSE-enabled routes
                return reply.code(401).send("Authentication failed");
            }

            // Only proceed with SSE initialization after successful authentication
            try {
                // Keep connection alive (prevents automatic close after handler returns)
                reply.sse.keepAlive();

                // Register this connection with the SSE manager
                // The manager will use reply.sse.send() to broadcast notifications
                notificationSSEManager.connect(deviceStatus.userId, reply);

                // Keep the handler alive by waiting for socket close event
                // This is necessary to prevent Fastify from closing the connection
                await new Promise<void>((resolve) => {
                    request.raw.on("close", () => {
                        resolve();
                    });
                });
            } catch (error) {
                log.error(error, "[SSE] Error during SSE connection");
                // At this point SSE is active, connection will be cleaned up by disconnect handler
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/get-all-topics`,
        schema: {
            response: {
                200: Dto.getAllTopicsResponse,
            },
        },
        handler: async () => {
            return await getAllTopics({
                db: db,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/language-preferences/get`,
        schema: {
            body: Dto.getLanguagePreferencesRequest,
            response: {
                200: Dto.getLanguagePreferencesResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getLanguagePreferences({
                db: db,
                userId: deviceStatus.userId,
                request: request.body,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/language-preferences/update`,
        schema: {
            body: Dto.updateLanguagePreferencesRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await updateLanguagePreferences({
                db: db,
                userId: deviceStatus.userId,
                preferences: request.body,
            });
        },
    });

    // Conversation Export Routes
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/request`,
        schema: {
            body: Dto.requestConversationExportRequest,
            response: {
                200: Dto.requestConversationExportResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.requestConversationExport({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
                exportBuffer: exportBuffer,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/conversation/export/status/:exportSlugId`,
        schema: {
            params: Dto.getConversationExportStatusRequest,
            response: {
                200: Dto.getConversationExportStatusResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
            });
            return await conversationExportService.getConversationExportStatus({
                db: db,
                exportSlugId: request.params.exportSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/conversation/export/history/:conversationSlugId`,
        schema: {
            params: Dto.getConversationExportHistoryRequest,
            response: {
                200: Dto.getConversationExportHistoryResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
            });
            return await conversationExportService.getConversationExportHistory(
                {
                    db: db,
                    conversationSlugId: request.params.conversationSlugId,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/conversation/export/readiness/:conversationSlugId`,
        schema: {
            params: Dto.getConversationExportHistoryRequest,
            response: {
                200: Dto.getExportReadinessResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.getExportReadinessForConversation(
                {
                    db: db,
                    conversationSlugId: request.params.conversationSlugId,
                    userId: deviceStatus.userId,
                    cooldownSeconds:
                        config.CONVERSATION_EXPORT_COOLDOWN_SECONDS,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "DELETE",
        url: `/api/${apiVersion}/conversation/export/:exportSlugId`,
        schema: {
            params: Dto.deleteConversationExportRequest,
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isModerator = await isModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isModerator) {
                throw server.httpErrors.unauthorized("User is not a moderator");
            }

            await conversationExportService.deleteConversationExport({
                db: db,
                exportSlugId: request.params.exportSlugId,
            });
        },
    });
});

if (
    config.POLIS_CONV_TO_IMPORT_ON_RUN !== undefined &&
    axiosPolis !== undefined
) {
    console.log("not implemented yet");
    // const polisConv = config.POLIS_CONV_TO_IMPORT_ON_RUN;
    // await loadAndImportToAgora({
    //     db,
    //     axiosPolis,
    //     polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
    //     polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
    //     polisUserPassword: config.POLIS_USER_PASSWORD,
    //     summaryFilePath: polisConv[0],
    //     commentFilePath: polisConv[1],
    //     voteFilePath: polisConv[2],
    // });
} else {
    server.ready((e) => {
        if (e) {
            log.error(e);
            // await node.stop();
            process.exit(1);
        }
        if (config.NODE_ENV === "development") {
            const swaggerObj = server.swagger({ yaml: false });
            const swaggerJson = JSON.stringify(swaggerObj, null, 4);
            fs.writeFileSync("./openapi-zkorum.json", swaggerJson);
        }
    });

    const host =
        config.NODE_ENV === "development"
            ? config.MODE === "capacitor"
                ? "192.168.1.96"
                : "0.0.0.0"
            : "0.0.0.0";

    server.listen({ port: config.PORT, host: host }, (err) => {
        if (err) {
            log.error(err);
            // await node.stop();
            process.exit(1);
        }
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
        log.info(`[API] ${signal} received, shutting down gracefully...`);

        try {
            // Stop scheduled cleanup
            stopImportCleanup();

            // Flush pending votes before shutdown
            await voteBuffer.shutdown();

            // Flush pending exports before shutdown
            await exportBuffer.shutdown();

            // Flush pending imports before shutdown
            await importBuffer.shutdown();

            // Close SSE connections before shutdown
            await notificationSSEManager.shutdown();

            // Close Valkey connection
            if (valkey !== undefined) {
                await valkey.quit();
                log.info("[Valkey] Connection closed");
            }

            // Close server
            await server.close();
            log.info("[API] Server closed");

            process.exit(0);
        } catch (error) {
            log.error(error, "[API] Error during shutdown");
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));

    // await migrationService.fixNullPassInOpinionTable({ db });
    // await migrationService.fixEmptyOpinionIdInPolisClusterOpinionTable({ db });
    // if (axiosPolis !== undefined) {
    //     const _backgroundTasks = (async () => {
    //         try {
    //             await polisService.updateMathAllConversations({
    //                 db,
    //                 axiosPolis: axiosPolis,
    //                 awsAiLabelSummaryEnable:
    //                     config.AWS_AI_LABEL_SUMMARY_ENABLE &&
    //                     (config.NODE_ENV === "production" ||
    //                         config.NODE_ENV === "staging"),
    //                 awsAiLabelSummaryRegion: config.AWS_AI_LABEL_SUMMARY_REGION,
    //                 awsAiLabelSummaryModelId:
    //                     config.AWS_AI_LABEL_SUMMARY_MODEL_ID,
    //                 awsAiLabelSummaryTemperature:
    //                     config.AWS_AI_LABEL_SUMMARY_TEMPERATURE,
    //                 awsAiLabelSummaryTopP: config.AWS_AI_LABEL_SUMMARY_TOP_P,
    //                 awsAiLabelSummaryMaxTokens:
    //                     config.AWS_AI_LABEL_SUMMARY_MAX_TOKENS,
    //                 awsAiLabelSummaryPrompt: config.AWS_AI_LABEL_SUMMARY_PROMPT,
    //                 doUpdateCounts: true,
    //             });
    //         } catch (updateErr) {
    //             log.error("Error during background update:", updateErr);
    //         }
    //     })();
    // }
}
