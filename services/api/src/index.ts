import { Dto, type GetConversationResponse } from "@/shared/types/dto.js";
import fastifyAuth from "@fastify/auth";
import fastifyCors from "@fastify/cors";
import fastifySensible, { httpErrors } from "@fastify/sensible";
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
import * as polisService from "@/service/polis.js";
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

const axiosPolis: AxiosInstance | undefined =
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
    relay = await Relay.connect(config.NOSTR_DEFAULT_RELAY_URL);
    log.info(`Connected to ${relay.url}`);
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

const client = postgres(config.CONNECTION_STRING);
const db = drizzle(client, {
    logger: new DrizzleFastifyLogger(log),
});

interface ExpectedDeviceStatus {
    now: Date;
    userId?: string;
    isLoggedIn?: boolean;
}

interface OptionsVerifyUcan {
    expectedDeviceStatus?: ExpectedDeviceStatus;
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

interface VerifyUCANReturn {
    didWrite: string;
    encodedUcan: string;
}

// auth for account profile interaction
// TODO: store UCAN in ucan table at the end and check whether UCAN has already been seen in the ucan table on the first place - if yes, throw unauthorized error and log the potential replay attack attempt.
// ! WARNING: will not work if there are queryParams. We only use POST requests and JSON body requests (JSON-RPC style).
async function verifyUCAN(
    db: PostgresDatabase,
    request: FastifyRequest,
    options: OptionsVerifyUcan = {
        expectedDeviceStatus: {
            now: nowZeroMs(),
            isLoggedIn: true,
        },
    },
): Promise<VerifyUCANReturn> {
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
    if (options.expectedDeviceStatus !== undefined) {
        const deviceStatus = await authService.getDeviceStatus(
            db,
            rootIssuerDid,
            options.expectedDeviceStatus.now,
        );
        if (deviceStatus === undefined) {
            if (options.expectedDeviceStatus.isLoggedIn !== undefined) {
                throw server.httpErrors.unauthorized(
                    `[${rootIssuerDid}] has not been registered but is expected to have a log in status`,
                );
            } else if (options.expectedDeviceStatus.userId !== undefined) {
                throw server.httpErrors.forbidden(
                    `[${rootIssuerDid}] has not been registered but is expected to have a specific userId`,
                );
            }
        } else {
            const { userId, isLoggedIn } = deviceStatus;
            if (
                options.expectedDeviceStatus.isLoggedIn !== undefined &&
                options.expectedDeviceStatus.isLoggedIn !== isLoggedIn
            ) {
                throw server.httpErrors.unauthorized(
                    `[${rootIssuerDid}] is expected to have 'isLoggedIn=${options.expectedDeviceStatus.isLoggedIn.toString()}' but has 'isLoggedIn=${isLoggedIn.toString()}'`,
                );
            } else if (
                options.expectedDeviceStatus.userId !== undefined &&
                options.expectedDeviceStatus.userId !== userId
            ) {
                throw server.httpErrors.forbidden(
                    `[${rootIssuerDid}] is expected to have 'userId=${options.expectedDeviceStatus.userId}' but has 'userId=${userId}'`,
                );
            }
        }
    }
    return { didWrite: rootIssuerDid, encodedUcan: encodedUcan };
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            return { isLoggedIn: status.isLoggedIn };
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined, // TODO: return already_logged_in here instead of doing it inside the function below
            });
            const userAgent = request.headers["user-agent"] ?? "Unknown device";

            // backend intentionally does NOT say whether it is a register or a login - in order to protect privacy and give no information to potential attackers
            return await authService.authenticateAttempt({
                db,
                doSend: config.NODE_ENV === "production",
                doUseTestCode:
                    config.NODE_ENV !== "production" &&
                    speciallyAuthorizedPhones.includes(
                        request.body.phoneNumber,
                    ),
                testCode: config.TEST_CODE,
                authenticateRequestBody: request.body,
                minutesBeforeSmsCodeExpiry:
                    config.MINUTES_BEFORE_SMS_OTP_EXPIRY,
                didWrite,
                throttleSmsMinutesInterval:
                    config.THROTTLE_SMS_MINUTES_INTERVAL,
                httpErrors: server.httpErrors,
                // awsMailConf: awsMailConf,
                userAgent: userAgent,
                peppers: config.PEPPERS,
            });
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            return await authService.verifyPhoneOtp({
                db,
                maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                didWrite,
                code: request.body.code,
                axiosPolis: axiosPolis,
                polisUserEmailDomain: config.POLIS_USER_EMAIL_DOMAIN,
                polisUserEmailLocalPart: config.POLIS_USER_EMAIL_LOCAL_PART,
                polisUserPassword: config.POLIS_USER_PASSWORD,
                httpErrors: server.httpErrors,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/logout`,
        handler: async (request) => {
            const now = nowZeroMs();
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: {
                    isLoggedIn: true,
                    now: now,
                },
            });
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
            if (request.body.isAuthenticatedRequest) {
                const { didWrite } = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });

                const status = await authUtilService.isLoggedIn(db, didWrite);
                if (!status.isLoggedIn) {
                    throw server.httpErrors.unauthorized(
                        "User is not logged in",
                    );
                } else {
                    return await feedService.fetchFeed({
                        db: db,
                        lastSlugId: request.body.lastSlugId,
                        personalizationUserId: status.userId,
                    });
                }
            } else {
                return await feedService.fetchFeed({
                    db: db,
                    lastSlugId: request.body.lastSlugId,
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                await moderateByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                    moderationReason: request.body.moderationReason,
                    moderationAction: request.body.moderationAction,
                    moderationExplanation: request.body.moderationExplanation,
                    userId: status.userId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/create`,
        schema: {
            body: Dto.moderateReportCommentRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                await moderateByCommentSlugId({
                    db: db,
                    commentSlugId: request.body.opinionSlugId,
                    moderationReason: request.body.moderationReason,
                    moderationAction: request.body.moderationAction,
                    moderationExplanation: request.body.moderationExplanation,
                    userId: status.userId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/withdraw`,
        schema: {
            body: Dto.moderateCancelConversationReportRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                await withdrawModerationReportByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/withdraw`,
        schema: {
            body: Dto.moderateCancelOpinionReportRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                await withdrawModerationReportByCommentSlugId({
                    db: db,
                    commentSlugId: request.body.opinionSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                return await getConversationModerationStatus({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                return await getOpinionModerationStatus({
                    db: db,
                    commentSlugId: request.body.opinionSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserProfile({
                    db: db,
                    userId: status.userId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const conversationsMap = await getUserPosts({
                    db: db,
                    userId: status.userId,
                    lastPostSlugId: request.body.lastConversationSlugId,
                });
                return Array.from(conversationsMap.values());
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserComments({
                    db: db,
                    userId: status.userId,
                    lastCommentSlugId: request.body.lastOpinionSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserVotesByConversations({
                    db: db,
                    postSlugIdList: request.body.conversationSlugIdList,
                    userId: status.userId,
                });
            }
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
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const castVoteResponse = await castVoteForOpinionSlugId({
                    db: db,
                    opinionSlugId: request.body.opinionSlugId,
                    userId: status.userId,
                    didWrite: didWrite,
                    proof: encodedUcan,
                    votingAction: request.body.chosenOption,
                    axiosPolis: axiosPolis,
                    polisDelayToFetch: config.POLIS_DELAY_TO_FETCH,
                });
                reply.send(castVoteResponse);
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await submitPollResponse({
                    db: db,
                    proof: encodedUcan,
                    authorId: status.userId,
                    didWrite: didWrite,
                    httpErrors: server.httpErrors,
                    postSlugId: request.body.conversationSlugId,
                    voteOptionChoice: request.body.voteOptionChoice,
                });
                reply.send();
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            const { didWrite } = await verifyUCAN(db, request, undefined);

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserPollResponse({
                    db: db,
                    postSlugIdList: request.body,
                    authorId: status.userId,
                    httpErrors: server.httpErrors,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/delete`,
        schema: {
            body: Dto.deleteOpinionRequest,
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan } = await verifyUCAN(
                db,
                request,
                undefined,
            );

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await deleteOpinionBySlugId({
                    db: db,
                    opinionSlugId: request.body.opinionSlugId,
                    userId: status.userId,
                    proof: encodedUcan,
                    didWrite: didWrite,
                });
                reply.send();
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const newOpinionResponse = await postNewOpinion({
                    db: db,
                    commentBody: request.body.opinionBody,
                    conversationSlugId: request.body.conversationSlugId,
                    userId: status.userId,
                    didWrite: didWrite,
                    proof: encodedUcan,
                    axiosPolis: axiosPolis,
                    polisDelayToFetch: config.POLIS_DELAY_TO_FETCH,
                    httpErrors: server.httpErrors,
                });
                reply.send(newOpinionResponse);
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            if (request.body.isAuthenticatedRequest) {
                const { didWrite } = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });

                const status = await authUtilService.isLoggedIn(db, didWrite);
                if (!status.isLoggedIn) {
                    throw server.httpErrors.unauthorized(
                        "User is not logged in",
                    );
                } else {
                    const opinionItemsPerSlugId =
                        await fetchOpinionsByConversationSlugId({
                            db: db,
                            postSlugId: request.body.conversationSlugId,
                            fetchTarget: request.body.filter,
                            personalizationUserId: status.userId,
                            clusterKey: request.body.clusterKey,
                        });
                    return Array.from(opinionItemsPerSlugId.values());
                }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }
                const opinionItemsPerSlugId =
                    await fetchOpinionsByConversationSlugId({
                        db: db,
                        postSlugId: request.body.conversationSlugId,
                        fetchTarget: "hidden",
                        clusterKey: undefined,
                    });
                return Array.from(opinionItemsPerSlugId.values());
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/delete`,
        schema: {
            body: Dto.deleteConversationRequest,
        },
        handler: async (request, reply) => {
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await postService.deletePostBySlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    userId: status.userId,
                    proof: encodedUcan,
                    didWrite: didWrite,
                });
                reply.send();
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const postResponse = await postService.createNewPost({
                    db: db,
                    conversationTitle: request.body.conversationTitle,
                    conversationBody: request.body.conversationBody ?? null,
                    pollingOptionList: request.body.pollingOptionList ?? null,
                    authorId: status.userId,
                    didWrite: didWrite,
                    proof: encodedUcan,
                    axiosPolis: axiosPolis,
                });
                reply.send(postResponse);
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            }
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
            if (request.body.isAuthenticatedRequest) {
                const { didWrite } = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });

                const status = await authUtilService.isLoggedIn(db, didWrite);
                if (!status.isLoggedIn) {
                    throw httpErrors.unauthorized("User is not logged in");
                } else {
                    const postItem = await postService.fetchPostBySlugId({
                        db: db,
                        conversationSlugId: request.body.conversationSlugId,
                        personalizationUserId: status.userId,
                    });

                    const response: GetConversationResponse = {
                        conversationData: postItem,
                    };
                    return response;
                }
            } else {
                const postItem = await postService.fetchPostBySlugId({
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
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
        url: `/api/${apiVersion}/conversation/get-polis-clusters-info`,
        schema: {
            body: Dto.getPolisClustersInfoRequest,
            response: {
                200: Dto.getPolisClustersInfoResponse,
            },
        },
        handler: async (request) => {
            return await polisService.getPolisClustersInfo({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/zkp/generate-verification-link`, // there will be another subroute like /auth to _attach_ verified identifier to *already_logged_in accounts*.
        schema: {
            response: {
                200: Dto.generateVerificationLink200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            return await generateVerificationLink({
                db,
                didWrite,
                axiosVerificatorSvc,
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
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
            const { didWrite, encodedUcan } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await deleteUserAccount({
                    proof: encodedUcan,
                    db: db,
                    didWrite: didWrite,
                    userId: status.userId,
                });
                reply.send();
                const proofChannel40EventId =
                    config.NOSTR_PROOF_CHANNEL_EVENT_ID;
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await submitUsernameChange({
                    db: db,
                    username: request.body.username,
                    userId: status.userId,
                });
            }
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
        url: `/api/${apiVersion}/report/conversation/create`,
        schema: {
            body: Dto.createConversationReportRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await createUserReportByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                    userReportReason: request.body.reportReason,
                    userReportExplanation: request.body.reportExplanation,
                    userId: status.userId,
                });
                return;
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/opinion/create`,
        schema: {
            body: Dto.createOpinionReportRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await createUserReportByCommentSlugId({
                    db: db,
                    commentSlugId: request.body.opinionSlugId,
                    userReportReason: request.body.reportReason,
                    userReportExplanation: request.body.reportExplanation,
                    userId: status.userId,
                });
                return;
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                return await fetchUserReportsByPostSlugId({
                    db: db,
                    postSlugId: request.body.conversationSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const isModerator = await isModeratorAccount({
                    db: db,
                    userId: status.userId,
                });

                if (!isModerator) {
                    throw server.httpErrors.unauthorized(
                        "User is not a moderator",
                    );
                }

                return await fetchUserReportsByCommentSlugId({
                    db: db,
                    commentSlugId: request.body.opinionSlugId,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserMutePreferences({
                    db: db,
                    userId: status.userId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/mute/user/create`,
        schema: {
            body: Dto.muteUserByUsernameRequest,
        },
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await muteUserByUsername({
                    db: db,
                    muteAction: request.body.action,
                    sourceUserId: status.userId,
                    targetUsername: request.body.targetUsername,
                });
            }
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
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getNotifications({
                    db: db,
                    userId: status.userId,
                    lastSlugId: request.body.lastSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/notification/mark-all-read`,
        schema: {},
        handler: async (request) => {
            const { didWrite } = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                await markAllNotificationsAsRead({
                    db: db,
                    userId: status.userId,
                });
            }
        },
    });
});

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
