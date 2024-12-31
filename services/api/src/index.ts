import { Dto, type FetchPostBySlugIdResponse } from "@/shared/types/dto.js";
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
import { config, server } from "./app.js";
import { DrizzleFastifyLogger } from "./logger.js";
import * as authService from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import * as feedService from "@/service/feed.js";
import * as postService from "@/service/post.js";
import {
    httpMethodToAbility,
    httpUrlToResourcePointer,
} from "./shared/ucan/ucan.js";
import {
    deleteCommentBySlugId,
    fetchCommentsByPostSlugId,
    postNewComment,
} from "./service/comment.js";
import { getUserPollResponse, submitPollResponse } from "./service/poll.js";
import {
    castVoteForCommentSlugId,
    getUserVotesForPostSlugIds,
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
    fetchCommentModeration,
    fetchPostModeration,
    moderateByCommentSlugId,
    moderateByPostSlugId,
    withdrawModerationReportByCommentSlugId,
    withdrawModerationReportByPostSlugId,
} from "./service/moderation.js";
import { nowZeroMs } from "./shared/common/util.js";

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
// axiosVerificatorSvc.interceptors.request.use((request) => {
//     server.log.info("Starting Request", JSON.stringify(request));
//     return request;
// });
// axiosVerificatorSvc.interceptors.response.use((response) => {
//     server.log.info("Response:", JSON.stringify(response));
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

// const client = postgres(config.CONNECTION_STRING);
const client = postgres(config.CONNECTION_STRING);
const db = drizzle(client, {
    logger: new DrizzleFastifyLogger(server.log),
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
): Promise<string> {
    const authHeader = getAuthHeader(request);
    const { scheme, hierPart } = httpUrlToResourcePointer(
        new URL(request.originalUrl, SERVER_URL),
    );
    const encodedUcan = authHeader.substring(7, authHeader.length);
    server.log.info(`Received UCAN: ${encodedUcan}`);
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
                server.log.error(
                    `Error verifying UCAN - ${err.name}: ${err.message}`,
                );
                server.log.error(err.cause);
                server.log.error(err.stack);
            } else {
                server.log.error(`Unknown Error verifying UCAN:`);
                server.log.error(err);
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
    return rootIssuerDid;
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
            response: {
                200: Dto.authenticateCheckLoginStatus,
            },
        },
        handler: async (request) => {
            const now = nowZeroMs();
            await verifyUCAN(db, request, {
                expectedDeviceStatus: {
                    isLoggedIn: true,
                    now: now,
                },
            });
            return;
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
            const didWrite = await verifyUCAN(db, request, {
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
        url: `/api/${apiVersion}/auth/verify-phone-otp`,
        schema: {
            body: Dto.verifyOtpReqBody,
            response: {
                200: Dto.verifyOtp200,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            return await authService.verifyPhoneOtp({
                db,
                maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                didWrite,
                code: request.body.code,
                httpErrors: server.httpErrors,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/logout`,
        handler: async (request) => {
            const now = nowZeroMs();
            const didWrite = await verifyUCAN(db, request, {
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
        url: `/api/${apiVersion}/feed/fetch-recent`,
        schema: {
            body: Dto.fetchFeedRequest,
            response: {
                200: Dto.fetchFeedResponse,
            },
        },
        handler: async (request) => {
            if (request.body.isAuthenticatedRequest) {
                const didWrite = await verifyUCAN(db, request, {
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
                        fetchPollResponse: true,
                        userId: status.userId,
                    });
                }
            } else {
                return await feedService.fetchFeed({
                    db: db,
                    lastSlugId: request.body.lastSlugId,
                    fetchPollResponse: false,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/post/create`,
        schema: {
            body: Dto.moderateReportPostRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
                    postSlugId: request.body.postSlugId,
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
        url: `/api/${apiVersion}/moderation/comment/create`,
        schema: {
            body: Dto.moderateReportCommentRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
                    commentSlugId: request.body.commentSlugId,
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
        url: `/api/${apiVersion}/moderation/post/withdraw`,
        schema: {
            body: Dto.moderateCancelPostReportRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
                    postSlugId: request.body.postSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/comment/withdraw`,
        schema: {
            body: Dto.moderateCancelCommentReportRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
                    commentSlugId: request.body.commentSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/post/fetch-report`,
        schema: {
            body: Dto.fetchPostModerationRequest,
            response: {
                200: Dto.fetchPostModerationResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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

                return await fetchPostModeration({
                    db: db,
                    postSlugId: request.body.postSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/comment/fetch-report`,
        schema: {
            body: Dto.fetchCommentModerationRequest,
            response: {
                200: Dto.fetchCommentModerationResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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

                return await fetchCommentModeration({
                    db: db,
                    commentSlugId: request.body.commentSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/fetch-user-profile`,
        schema: {
            response: {
                200: Dto.fetchUserProfileResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
        url: `/api/${apiVersion}/user/fetch-user-posts`,
        schema: {
            body: Dto.fetchUserPostsRequest,
            response: {
                200: Dto.fetchUserPostsResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserPosts({
                    db: db,
                    userId: status.userId,
                    lastPostSlugId: request.body.lastPostSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/fetch-user-comments`,
        schema: {
            body: Dto.fetchUserCommentsRequest,
            response: {
                200: Dto.fetchUserCommentsResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserComments({
                    db: db,
                    userId: status.userId,
                    lastCommentSlugId: request.body.lastCommentSlugId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/voting/fetch-user-votes-for-post-slug-ids`,
        schema: {
            body: Dto.fetchUserVotesForPostSlugIdRequest,
            response: {
                200: Dto.fetchUserVotesForPostSlugIdsResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                return await getUserVotesForPostSlugIds({
                    db: db,
                    postSlugIdList: request.body.postSlugIdList,
                    userId: status.userId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/voting/cast-vote`,
        schema: {
            body: Dto.castVoteForCommentRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);

                await castVoteForCommentSlugId({
                    db: db,
                    commentSlugId: request.body.commentSlugId,
                    userId: status.userId,
                    didWrite: didWrite,
                    authHeader: authHeader,
                    votingAction: request.body.chosenOption,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/poll/submitResponse`,
        schema: {
            body: Dto.submitPollResponseRequest,
            response: {},
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);

                await submitPollResponse({
                    db: db,
                    authHeader: authHeader,
                    authorId: status.userId,
                    didWrite: didWrite,
                    httpErrors: server.httpErrors,
                    postSlugId: request.body.postSlugId,
                    voteOptionChoice: request.body.voteOptionChoice,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/poll/get-user-poll-response`,
        schema: {
            body: Dto.fetchUserPollResponseRequest,
            response: {
                200: Dto.fetchUserPollResponseResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, undefined);

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
        url: `/api/${apiVersion}/comment/delete`,
        schema: {
            body: Dto.deleteCommentBySlugIdRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, undefined);

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);
                await deleteCommentBySlugId({
                    db: db,
                    commentSlugId: request.body.commentSlugId,
                    userId: status.userId,
                    authHeader: authHeader,
                    didWrite: didWrite,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/comment/create`,
        schema: {
            body: Dto.createCommentRequest,
            response: {
                200: Dto.createCommentResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);
                return await postNewComment({
                    db: db,
                    commentBody: request.body.commentBody,
                    postSlugId: request.body.postSlugId,
                    userId: status.userId,
                    didWrite: didWrite,
                    authHeader: authHeader,
                    httpErrors: server.httpErrors,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/comment/fetch-comments-by-post-slugId`,
        schema: {
            body: Dto.fetchCommentFeedRequest,
            response: {
                200: Dto.fetchCommentFeedResponse,
            },
        },
        handler: async (request) => {
            return await fetchCommentsByPostSlugId({
                db: db,
                postSlugId: request.body.postSlugId,
                fetchTarget: request.body.filter,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/comment/fetch-hidden-comments`,
        schema: {
            body: Dto.fetchHiddenCommentRequest,
            response: {
                200: Dto.fetchHiddenCommentResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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

                return await fetchCommentsByPostSlugId({
                    db: db,
                    postSlugId: request.body.postSlugId,
                    fetchTarget: "hidden",
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/post/delete`,
        schema: {
            body: Dto.deletePostBySlugIdRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);
                await postService.deletePostBySlugId({
                    db: db,
                    postSlugId: request.body.postSlugId,
                    userId: status.userId,
                    authHeader: authHeader,
                    didWrite: didWrite,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/post/create`,
        schema: {
            body: Dto.createNewPostRequest,
            response: {
                200: Dto.createNewPostResponse,
            },
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);
                return await postService.createNewPost({
                    db: db,
                    postTitle: request.body.postTitle,
                    postBody: request.body.postBody ?? null,
                    pollingOptionList: request.body.pollingOptionList ?? null,
                    authorId: status.userId,
                    didWrite: didWrite,
                    authHeader: authHeader,
                });
            }
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/post/fetch-post-by-slug-id`,
        schema: {
            body: Dto.fetchPostBySlugIdRequest,
            response: {
                200: Dto.fetchPostBySlugIdResponse,
            },
        },
        handler: async (request) => {
            if (request.body.isAuthenticatedRequest) {
                const didWrite = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });

                const status = await authUtilService.isLoggedIn(db, didWrite);
                if (!status.isLoggedIn) {
                    throw httpErrors.unauthorized("User is not logged in");
                } else {
                    const postItem = await postService.fetchPostBySlugId({
                        db: db,
                        postSlugId: request.body.postSlugId,
                        fetchPollResponse: true,
                        userId: status.userId,
                    });

                    const response: FetchPostBySlugIdResponse = {
                        postData: postItem,
                    };
                    return response;
                }
            } else {
                const postItem = await postService.fetchPostBySlugId({
                    db: db,
                    postSlugId: request.body.postSlugId,
                    fetchPollResponse: false,
                });

                const response: FetchPostBySlugIdResponse = {
                    postData: postItem,
                };
                return response;
            }
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
            const didWrite = await verifyUCAN(db, request, {
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
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
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

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/delete-user`,
        schema: {},
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });

            const status = await authUtilService.isLoggedIn(db, didWrite);
            if (!status.isLoggedIn) {
                throw server.httpErrors.unauthorized("Device is not logged in");
            } else {
                const authHeader = getAuthHeader(request);
                await deleteUserAccount({
                    authHeader: authHeader,
                    db: db,
                    didWrite: didWrite,
                    userId: status.userId,
                });
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/submit-username-change`,
        schema: {
            body: Dto.submitUsernameChangeRequest,
        },
        handler: async (request) => {
            const didWrite = await verifyUCAN(db, request, {
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
});

server.ready((e) => {
    if (e) {
        server.log.error(e);
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
        server.log.error(err);
        process.exit(1);
    }
});
