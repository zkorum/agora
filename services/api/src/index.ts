import {
    Dto,
    type AuthenticateResponse,
    type GetConversationResponse,
    type VerifyOtp200,
} from "@/shared/types/dto.js";
import fastifyAuth from "@fastify/auth";
import fastifyCors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import * as ucans from "@ucans/ucans";
import {
    drizzle,
    type PostgresJsDatabase as PostgresDatabase,
} from "drizzle-orm/postgres-js";
import { type FastifyRequest } from "fastify";
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import fs from "fs";
import postgres from "postgres";
import { config, log, server } from "./app.js";
import { DrizzleFastifyLogger } from "./logger.js";
import * as authService from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import * as feedService from "@/service/feed.js";
import * as postService from "@/service/post.js";
// import * as p2pService from "@/service/p2p.js";
import * as nostrService from "@/service/nostr.js";
import WebSocket from "ws";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { Relay, useWebSocketImplementation } from "nostr-tools/relay";
import {
    httpMethodToAbility,
    httpUrlToResourcePointer,
} from "./shared/ucan/ucan.js";
import {
    deleteOpinionBySlugId,
    fetchOpinionsByConversationSlugId,
    fetchOpinionsByOpinionSlugIdList,
    postNewOpinion,
} from "./service/comment.js";
import { getUserPollResponse, submitPollResponse } from "./service/poll.js";
import {
    castVoteForOpinionSlugId,
    getUserVotesForPostSlugIds as getUserVotesByConversations,
} from "./service/voting.js";
import {
    getUserComments,
    getUserPosts,
    getUserProfile,
} from "./service/user.js";
import axios, { type AxiosInstance } from "axios";
import {
    generateVerificationLink,
    verifyUserStatusAndAuthenticate,
} from "./service/rarimo.js";
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
import { nowZeroMs } from "./shared/common/util.js";
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
import { loadAndImportToAgora } from "./commands/polis/import.js";
import twilio from "twilio";
import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
    addUserOrganizationMapping,
    createOrganization,
    deleteOrganization,
    getAllOrganizations,
    getOrganizationNamesByUsername,
    removeUserOrganizationMapping,
} from "./service/administrator/organization.js";
import type {
    DeviceIsKnownTrueLoginStatusExtended,
    DeviceLoginStatusExtended,
} from "./shared/types/zod.js";
import {
    getAllTopics,
    getUserFollowedTopics,
    userFollowTopicByCode,
    userUnfollowTopicByCode,
} from "./service/topic.js";
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

export const db = drizzle(client, {
    logger: new DrizzleFastifyLogger(log),
});

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
    deviceStatus: DeviceIsKnownTrueLoginStatusExtended;
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
    const rootIssuerDid = ucans.parse(encodedUcan).payload.iss;
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
        for (const err of result.error) {
            if (err instanceof Error) {
                log.error(`Error verifying UCAN - ${err.name}: ${err.message}`);
                log.error(err.cause);
                log.error(err.stack);
            } else {
                log.error(`Unknown Error verifying UCAN:`);
                log.error(err);
            }
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
    const deviceStatus = await authUtilService.getDeviceStatus(db, didWrite);
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
                    axiosPolis: axiosPolis,
                    polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                    polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                    polisUserPassword: config.POLIS_USER_PASSWORD,
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
            return await getUserComments({
                db: db,
                userId: deviceStatus.userId,
                lastCommentSlugId: request.body.lastOpinionSlugId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
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
                opinionSlugId: request.body.opinionSlugId,
                didWrite: didWrite,
                proof: encodedUcan,
                votingAction: request.body.chosenOption,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                axiosPolis: axiosPolis,
                polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                polisUserPassword: config.POLIS_USER_PASSWORD,
                polisDelayToFetch: config.POLIS_DELAY_TO_FETCH,
                voteNotifMilestones: config.VOTE_NOTIF_MILESTONES,
                awsAiLabelSummaryEnable:
                    config.AWS_AI_LABEL_SUMMARY_ENABLE &&
                    (config.NODE_ENV === "production" ||
                        config.NODE_ENV === "staging"),
                awsAiLabelSummaryRegion: config.AWS_AI_LABEL_SUMMARY_REGION,
                awsAiLabelSummaryModelId: config.AWS_AI_LABEL_SUMMARY_MODEL_ID,
                awsAiLabelSummaryTemperature:
                    config.AWS_AI_LABEL_SUMMARY_TEMPERATURE,
                awsAiLabelSummaryTopP: config.AWS_AI_LABEL_SUMMARY_TOP_P,
                awsAiLabelSummaryMaxTokens:
                    config.AWS_AI_LABEL_SUMMARY_MAX_TOKENS,
                awsAiLabelSummaryPrompt: config.AWS_AI_LABEL_SUMMARY_PROMPT,
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
                axiosPolis: axiosPolis,
                polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                polisUserPassword: config.POLIS_USER_PASSWORD,
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
                commentBody: request.body.opinionBody,
                conversationSlugId: request.body.conversationSlugId,
                didWrite: didWrite,
                proof: encodedUcan,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                axiosPolis: axiosPolis,
                polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                polisUserPassword: config.POLIS_USER_PASSWORD,
                polisDelayToFetch: config.POLIS_DELAY_TO_FETCH,
                voteNotifMilestones: config.VOTE_NOTIF_MILESTONES,
                awsAiLabelSummaryEnable:
                    config.AWS_AI_LABEL_SUMMARY_ENABLE &&
                    (config.NODE_ENV === "production" ||
                        config.NODE_ENV === "staging"),
                awsAiLabelSummaryRegion: config.AWS_AI_LABEL_SUMMARY_REGION,
                awsAiLabelSummaryModelId: config.AWS_AI_LABEL_SUMMARY_MODEL_ID,
                awsAiLabelSummaryTemperature:
                    config.AWS_AI_LABEL_SUMMARY_TEMPERATURE,
                awsAiLabelSummaryTopP: config.AWS_AI_LABEL_SUMMARY_TOP_P,
                awsAiLabelSummaryMaxTokens:
                    config.AWS_AI_LABEL_SUMMARY_MAX_TOKENS,
                awsAiLabelSummaryPrompt: config.AWS_AI_LABEL_SUMMARY_PROMPT,
                now: now,
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

                const opinionItemsPerSlugId =
                    await fetchOpinionsByConversationSlugId({
                        db: db,
                        postSlugId: request.body.conversationSlugId,
                        fetchTarget: request.body.filter,
                        personalizationUserId: deviceStatus.userId,
                        clusterKey: request.body.clusterKey,
                    });
                return Array.from(opinionItemsPerSlugId.values());
            } else {
                const opinionItemsPerSlugId =
                    await fetchOpinionsByConversationSlugId({
                        db: db,
                        postSlugId: request.body.conversationSlugId,
                        fetchTarget: request.body.filter,
                        clusterKey: request.body.clusterKey,
                    });
                return Array.from(opinionItemsPerSlugId.values());
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
            const opinionItemsPerSlugId =
                await fetchOpinionsByConversationSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                    fetchTarget: "hidden",
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

            const postResponse = await postService.createNewPost({
                db: db,
                conversationTitle: request.body.conversationTitle,
                conversationBody: request.body.conversationBody ?? null,
                pollingOptionList: request.body.pollingOptionList ?? null,
                authorId: deviceStatus.userId,
                didWrite: didWrite,
                proof: encodedUcan,
                axiosPolis: axiosPolis,
                indexConversationAt: request.body.indexConversationAt,
                postAsOrganization: request.body.postAsOrganization,
                isIndexed: request.body.isIndexed,
                isLoginRequired: request.body.isLoginRequired,
            });
            reply.send(postResponse);
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
                    axiosPolis: axiosPolis,
                    polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                    polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                    polisUserPassword: config.POLIS_USER_PASSWORD,
                    userAgent,
                });
            return verificationStatusAndNullifier;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/delete`,
        schema: {},
        handler: async (request, reply) => {
            const { didWrite, encodedUcan, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                });

            await deleteUserAccount({
                proof: encodedUcan,
                db: db,
                didWrite: didWrite,
                userId: deviceStatus.userId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
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
            body: Dto.getOrganizationNamesByUsernameRequest,
            response: {
                200: Dto.getOrganizationNamesByUsernameResponse,
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

            return await getOrganizationNamesByUsername({
                db: db,
                username: request.body.username,
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
});

if (
    config.POLIS_CONV_TO_IMPORT_ON_RUN !== undefined &&
    axiosPolis !== undefined
) {
    const polisConv = config.POLIS_CONV_TO_IMPORT_ON_RUN;
    await loadAndImportToAgora({
        db,
        axiosPolis,
        polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
        polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
        polisUserPassword: config.POLIS_USER_PASSWORD,
        summaryFilePath: polisConv[0],
        commentFilePath: polisConv[1],
        voteFilePath: polisConv[2],
        polisDelayToFetch: config.POLIS_DELAY_TO_FETCH,
    });
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
}
