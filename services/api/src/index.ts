import { Dto } from "@/shared/types/dto.js";
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
import { fetchCommentsByPostSlugId, postNewComment } from "./service/comment.js";
import { getUserPollResponse, submitPollResponse } from "./service/poll.js";

server.register(fastifySensible);
server.register(fastifyAuth);
server.register(fastifyCors, {
    // put your options here
    origin: (origin, cb) => {
        if (origin !== undefined) {
            if (config.CORS_ORIGIN_LIST.includes(origin)) {
                //  Request from localhost will pass
                cb(null, true);
                return;
            }
            // Generate an error on other origins, disabling access
            cb(new Error("Not allowed"), false);
        }
    }
});

// Add schema validator and serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const speciallyAuthorizedEmails: string[] =
    config.NODE_ENV === "production"
        ? []
        : config.SPECIALLY_AUTHORIZED_EMAILS !== undefined &&
            config.SPECIALLY_AUTHORIZED_EMAILS.length !== 0
            ? config.SPECIALLY_AUTHORIZED_EMAILS.replace(/\s/g, "").split(",")
            : [];

server.register(fastifySwagger, {
    openapi: {
        info: {
            title: "Agora by ZKorum",
            description: "Agora by ZKorum API",
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
    userId?: string;
    isLoggedIn?: boolean;
}

interface OptionsVerifyUcan {
    expectedDeviceStatus?: ExpectedDeviceStatus;
}

const SERVER_URL =
    config.NODE_ENV === "production"
        ? config.SERVER_URL_PROD
        : config.NODE_ENV === "staging1"
            ? config.SERVER_URL_STAGING1
            : config.SERVER_URL_DEV;

const SERVER_DID =
    config.NODE_ENV === "production"
        ? config.SERVER_DID_PROD
        : config.NODE_ENV === "staging1"
            ? config.SERVER_DID_STAGING1
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
            isLoggedIn: true,
        },
    }
): Promise<string> {
    const authHeader = getAuthHeader(request);
    const { scheme, hierPart } = httpUrlToResourcePointer(
        new URL(request.originalUrl, SERVER_URL)
    );
    const encodedUcan = authHeader.substring(7, authHeader.length);
    server.log.info(`Received UCAN: ${encodedUcan}`);
    const rootIssuerDid = ucans.parse(encodedUcan).payload.iss;
    const result = await ucans.verify(encodedUcan, {
        audience: SERVER_DID,
        isRevoked: () => new Promise((resolve) => { resolve(false); }), // users' generated UCANs are short-lived action-specific one-time token so the revocation feature is unnecessary
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
                server.log.error(`Error verifying UCAN - ${err.name}: ${err.message}`);
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
            new AggregateError(result.error)
        );
    }
    if (options.expectedDeviceStatus !== undefined) {
        const deviceStatus = await authService.getDeviceStatus(
            db,
            rootIssuerDid
        );
        if (deviceStatus === undefined) {
            if (options.expectedDeviceStatus.isLoggedIn !== undefined) {
                throw server.httpErrors.unauthorized(
                    `[${rootIssuerDid}] has not been registered but is expected to have a log in status`
                );
            } else if (options.expectedDeviceStatus.userId !== undefined) {
                throw server.httpErrors.forbidden(
                    `[${rootIssuerDid}] has not been registered but is expected to have a specific userId`
                );
            }
        } else {
            const { userId, isLoggedIn } = deviceStatus;
            if (
                options.expectedDeviceStatus.isLoggedIn !== undefined &&
                options.expectedDeviceStatus.isLoggedIn !== isLoggedIn
            ) {
                throw server.httpErrors.unauthorized(
                    `[${rootIssuerDid}] is expected to have 'isLoggedIn=${options.expectedDeviceStatus.isLoggedIn.toString()}' but has 'isLoggedIn=${isLoggedIn.toString()}'`
                );
            } else if (
                options.expectedDeviceStatus.userId !== undefined &&
                options.expectedDeviceStatus.userId !== userId
            ) {
                throw server.httpErrors.forbidden(
                    `[${rootIssuerDid}] is expected to have 'userId=${options.expectedDeviceStatus.userId}' but has 'userId=${userId}'`
                );
            }
        }
    }
    return rootIssuerDid;
}

const apiVersion = "v1";

const awsMailConf = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
};

server.after(() => {

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/auth/check-login-status`,
            schema: {
                response: { 200: Dto.authenticateCheckLoginStatus, 409: Dto.auth409 },
            },
            handler: async (request) => {
                await verifyUCAN(db, request, {
                    expectedDeviceStatus: {
                        isLoggedIn: true
                    },
                });
                return;
            },
        });

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/auth/authenticate`,
            schema: {
                body: Dto.authenticateRequestBody,
                response: { 200: Dto.authenticateResponse, 409: Dto.auth409 },
            },
            handler: async (request) => {
                // This endpoint is accessible without being logged in
                // this endpoint could be especially subject to attacks such as DDoS or man-in-the-middle (to associate their own DID instead of the legitimate user's ones for example)
                // => TODO: restrict this endpoint and the "verifyOtp" endpoint to use same IP Address: the correct IP Address must part of the UCAN
                // => TODO: allow email owners to report spam/attacks and to request blocking the IP Addresses that attempted access
                // The web infrastructure is as it is and IP Addresses are the backbone over which our HTTP endpoints function, we can avoid storing/logging IP Addresses as much as possible, but we can't fix it magically
                // As a social network (hopefully) subject to heavy traffic, the whole app will need to be protected via a privacy-preserving alternative to CAPTCHA anyway, such as Turnstile: https://developers.cloudflare.com/turnstile/
                // => TODO: encourage users to use a mixnet such as Tor to preserve their privacy.
                const didWrite = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });
                const { type, userId } = await authService.getAuthenticateType(
                    db,
                    request.body,
                    didWrite,
                    server.httpErrors
                );
                const userAgent =
                    request.headers["user-agent"] ?? "Unknown device";

                return await authService.authenticateAttempt({
                    db,
                    type,
                    doSendEmail: config.NODE_ENV === "production",
                    doUseTestCode:
                        config.NODE_ENV !== "production" &&
                        speciallyAuthorizedEmails.includes(request.body.email),
                    testCode: config.TEST_CODE,
                    authenticateRequestBody: request.body,
                    userId,
                    minutesBeforeCodeExpiry:
                        config.MINUTES_BEFORE_EMAIL_OTP_EXPIRY,
                    didWrite,
                    throttleMinutesInterval:
                        config.THROTTLE_EMAIL_MINUTES_INTERVAL,
                    httpErrors: server.httpErrors,
                    awsMailConf: awsMailConf,
                    userAgent: userAgent,
                }).then(({ codeExpiry, nextCodeSoonestTime }) => {
                    // backend intentionally does NOT send whether it is a register or a login, and does not send the address the email is sent to - in order to protect privacy and give no information to potential attackers
                    return {
                        codeExpiry: codeExpiry,
                        nextCodeSoonestTime: nextCodeSoonestTime,
                    };
                });
            },
        });

    // TODO: for now, there is no 2FA so when this returns true, it means the user has finished logging in/registering - but it will change
    // TODO: for now there is no way to communicate "isTrusted", it's set to true automatically - but it will change
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/auth/verifyOtp`,
            schema: {
                body: Dto.verifyOtpReqBody,
                response: {
                    200: Dto.verifyOtp200,
                    409: Dto.auth409, // WARNING when changing auth 409 - also change expected type in frontend manually!
                },
            },
            handler: async (request) => {
                const didWrite = await verifyUCAN(db, request, {
                    expectedDeviceStatus: undefined,
                });
                return await authService.verifyOtp({
                    db,
                    maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                    didWrite,
                    code: request.body.code,
                    httpErrors: server.httpErrors,
                });
            },
        });
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/auth/logout`,
            handler: async (request) => {
                const didWrite = await verifyUCAN(db, request, {
                    expectedDeviceStatus: {
                        isLoggedIn: true,
                    },
                });
                await authService.logout(db, didWrite);
            },
        });
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/feed/fetchRecent`,
            schema: {
                body: Dto.fetchFeedRequest,
                response: {
                    200: Dto.fetchFeed200,
                },
            },
            handler: async (request) => {
                return await feedService.fetchFeed({
                    db: db,
                    showHidden: request.body.showHidden,
                    lastCreatedAt: new Date(request.body.lastCreatedAt),
                });
            },
        });

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
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
                        voteOptionChoice: request.body.voteOptionChoice
                    })
                }
            },
        });

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
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
                        postSlugId: request.body.postSlugId,
                        authorId: status.userId,
                        httpErrors: server.httpErrors
                    });
                }
            },
        });

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/comment/create`,
            schema: {
                body: Dto.createCommentRequest,
                response: {
                    200: Dto.createCommentResponse,
                },
            },
            handler: async (request) => {

                const didWrite = await verifyUCAN(db, request, undefined);

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
                        httpErrors: server.httpErrors
                    });
                }
            },
        });

    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/comment/fetch`,
            schema: {
                body: Dto.fetchCommentFeedRequest,
                response: {
                    200: Dto.fetchCommentFeedResponse,
                },
            },
            handler: async (request) => {
                return await fetchCommentsByPostSlugId(
                    db,
                    request.body.postSlugId);

                /*
                const authHeader = request.headers.authorization;
                if (!authHeader?.startsWith("Bearer ")) {
                    // unauthorized user
                    const comments = await postService.fetchCommentsByPostSlugId({
                        db: db,
                        postSlugId: request.body.postSlugId,
                        order: "recent",
                        showHidden: true,
                        createdAt:
                            request.body.createdAt !== undefined
                                ? new Date(request.body.createdAt)
                                : undefined,
                    });
                    return { comments };
                } else {
                    const didWrite = await verifyUCAN(db, request, {
                        expectedDeviceStatus: {
                            isLoggedIn: undefined,
                        },
                    });
                    const status = await authUtilService.isLoggedIn(db, didWrite);
                    if (!status.isLoggedIn) {
                        throw server.httpErrors.unauthorized("Device is not logged in");
                    } else {
                        // logged-in user request
                        const { userId } = status;
                        const comments = await postService.fetchCommentsByPostSlugId({
                            db: db,
                            postSlugId: request.body.postSlugId,
                            userId: userId,
                            order: "recent",
                            showHidden: true,
                            createdAt:
                                request.body.createdAt !== undefined
                                    ? new Date(request.body.createdAt)
                                    : undefined,
                        });
                        return { comments };
                    }
                }
                */
            },
        });
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/comment/fetchToVoteOn`,
            schema: {
                body: Dto.commentFetchToVoteOnRequest,
                response: {
                    200: Dto.commentFetchToVoteOn200,
                },
            },
            handler: async (request) => {
                const didWrite = await verifyUCAN(db, request, {
                    expectedDeviceStatus: {
                        isLoggedIn: undefined,
                    },
                });
                const status = await authUtilService.isLoggedIn(db, didWrite);
                if (!status.isLoggedIn) {
                    throw server.httpErrors.unauthorized("Device is not logged in");
                } else {
                    const { userId } = status;
                    const comments = await postService.fetchNextCommentsToVoteOn({
                        db: db,
                        userId: userId,
                        postSlugId: request.body.postSlugId,
                        numberOfCommentsToFetch: request.body.numberOfCommentsToFetch,
                        httpErrors: server.httpErrors
                    });
                    return comments;
                }
            },
        });
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/post/create`,
            schema: {
                body: Dto.createNewPostRequest,
                response: {
                    200: Dto.createNewPostResponse
                }
            },
            handler: async (request) => {
                const didWrite = await verifyUCAN(db, request, undefined);
                // const canCreatePost = await authUtilService.canCreatePost(db, didWrite)

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
                        authHeader: authHeader
                    });
                }
            },
        });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/poll/respond`, {
    //         schema: {
    //             body: Dto.respondPollRequest,
    //             // response: {
    //             //     200: Dto.pollRespond200,
    //             // },
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             //TODO
    //         },
    //     });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/moderation/hidePost`, {
    //         schema: {
    //             body: Dto.moderatePostRequest,
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             // const isAdmin = await authUtilService.isAdmin(db, didWrite);
    //             // if (isAdmin !== true) {
    //             //     throw server.httpErrors.forbidden(
    //             //         "Only admin can moderate content"
    //             //     );
    //             // }
    //             // await Service.hidePost({
    //             //     db: db,
    //             //     pollUid: request.body.pollUid,
    //             // });
    //         },
    //     });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/moderation/unhidePost`, {
    //         schema: {
    //             body: Dto.moderatePostRequest,
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             // const isAdmin = await authUtilService.isAdmin(db, didWrite);
    //             // if (isAdmin !== true) {
    //             //     throw server.httpErrors.forbidden(
    //             //         "Only admin can moderate content"
    //             //     );
    //             // }
    //             // await Service.unhidePost({
    //             //     db: db,
    //             //     pollUid: request.body.pollUid,
    //             // });
    //         },
    //     });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/moderation/hideComment`, {
    //         schema: {
    //             body: Dto.moderateCommentRequest,
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             // const canModeratePost = await authUtilService.canModeratePost(db, didWrite, request.body.postSlugId);
    //             // if (canModeratePost !== true) {
    //             //     throw server.httpErrors.forbidden(
    //             //         "User cannot moderate this post"
    //             //     );
    //             // }
    //             // await Service.hideComment({
    //             //     db: db,
    //             //     commentSlugId: request.body.commentSlugId,
    //             // });
    //         },
    //     });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/moderation/unhideComment`, {
    //         schema: {
    //             body: Dto.moderateCommentRequest,
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             // const canModeratePost = await authUtilService.canModeratePost(db, didWrite, request.body.postSlugId);
    //             // if (canModeratePost !== true) {
    //             //     throw server.httpErrors.forbidden(
    //             //         "User cannot moderate this post"
    //             //     );
    //             // }
    //             // await Service.unhideComment({
    //             //     db: db,
    //             //     commentSlugId: request.body.commentSlugId,
    //             // });
    //         },
    //     });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post(`/api/${apiVersion}/comment/create`, {
    //         schema: {
    //             body: Dto.commentRequest,
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 expectedDeviceStatus: {
    //                     isLoggedIn: true,
    //                 },
    //             });
    //             // await Service.createComment({
    //             //     db: db,
    //             //     payload: request.body.payload,
    //             //     httpErrors: server.httpErrors,
    //             //     nlpBaseUrl: config.NLP_BASE_URL,
    //             // });
    //         },
    //     });
    server
        .withTypeProvider<ZodTypeProvider>()
        .route({
            method: "POST",
            url: `/api/${apiVersion}/post/fetch`,
            schema: {
                body: Dto.fetchPostBySlugIdRequest,
                response: {
                    200: Dto.fetchPostBySlugIdResponse,
                },
            },
            handler: async (request) => {
                return await postService.fetchPostBySlugId(
                    db, request.body.postSlugId
                );

                /*
                  // anonymous request, no auth
                  const { post, postId } = await Service.fetchPostByUidOrSlugId({
                      db: db,
                      postUidOrSlugId: request.body.postSlugId,
                      type: "slugId",
                      httpErrors: server.httpErrors,
                  });
                  const comments = await Service.fetchCommentsByPostId({
                      db: db,
                      postId: postId,
                      order: "more",
                      showHidden: true,
                      updatedAt: undefined,
                  });
                  return { post, comments };
                */
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

const host = config.NODE_ENV === "development" ? config.MODE === "capacitor" ? "192.168.1.96" : "0.0.0.0" : "0.0.0.0";

server.listen({ port: config.PORT, host: host }, (err) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});
