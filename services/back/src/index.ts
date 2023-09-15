import "dotenv/config"; // this loads .env values in process.env
import fs from "fs";
import { type FastifyRequest } from "fastify";
import fastifyAuth from "@fastify/auth";
import fastifySensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import fastifyCors from "@fastify/cors";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Service } from "./service/service.js";
import {
    serializerCompiler,
    validatorCompiler,
    jsonSchemaTransform,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { DrizzleFastifyLogger } from "./logger.js";
import { Dto } from "./dto.js";
import * as ucans from "@ucans/ucans";
import {
    httpMethodToAbility,
    httpUrlToResourcePointer,
} from "./shared/ucan/ucan.js";
import {
    BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES as SIGNATURE_PARAMS_LABEL_BYTES,
    initializeWasm,
    BBSPlusSignatureParamsG1 as SignatureParams,
    BBSPlusKeypairG2 as KeyPair,
} from "@docknetwork/crypto-wasm-ts";
import { config, Environment, server } from "./app.js";

server.register(fastifySensible);
server.register(fastifyAuth);
server.register(fastifyCors, {
    // put your options here
});

// Add schema validator and serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(fastifySwagger, {
    openapi: {
        info: {
            title: "ZKorum",
            description: "ZKorum backend",
            version: "1.0.0",
        },
        servers: [],
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
        const genericError = new Error("Internal server error", {
            cause: error,
        });
        reply.send(genericError);
    } else {
        // For other status codes, forward the original error
        reply.send(error);
    }
});

const client = postgres(config.CONNECTION_STRING);
const db = drizzle(client, {
    logger: new DrizzleFastifyLogger(server.log),
});

// This is necessary for crypto-wasm-ts to work
await initializeWasm();
// TODO: for production: load secret key from encrypted AWS S3. Not very safe but no KMS support BBSPlus secret key at this time. WIP
// for dev: load from file
const params = SignatureParams.generate(100, SIGNATURE_PARAMS_LABEL_BYTES);
const keypair = KeyPair.generate(params);
const sk = keypair.sk;

interface ExpectedDeviceStatus {
    userId?: string;
    isSyncing?: boolean;
    isLoggedIn?: boolean;
}

interface OptionsVerifyUcan {
    expectedDeviceStatus?: ExpectedDeviceStatus;
}

// auth functions
// TODO: store UCAN in ucan table at the end and check whether UCAN has already been seen in the ucan table on the first place - if yes, throw unauthorized error and log the potential replay attack attempt.
// ! WARNING: will not work if there are queryParams. We only use POST requests and JSON body requests (JSON-RPC style).
async function verifyUCAN(
    db: PostgresJsDatabase,
    request: FastifyRequest,
    options: OptionsVerifyUcan = {
        expectedDeviceStatus: {
            isLoggedIn: true,
            isSyncing: true,
        },
    }
): Promise<string> {
    const authHeader = request.headers.authorization;
    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        throw server.httpErrors.unauthorized();
    } else {
        const { scheme, hierPart } = httpUrlToResourcePointer(
            new URL(request.originalUrl, config.SERVER_URL)
        );
        const encodedUcan = authHeader.substring(7, authHeader.length);
        const rootIssuerDid = ucans.parse(encodedUcan).payload.iss;
        const result = await ucans.verify(encodedUcan, {
            audience: config.SERVER_DID,
            isRevoked: async (_ucan) => false, // users' generated UCANs are short-lived action-specific one-time token so the revocation feature is unnecessary
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
            throw server.httpErrors.createError(
                401,
                "Unauthorized",
                new AggregateError(result.error)
            );
        }
        if (options.expectedDeviceStatus !== undefined) {
            const deviceStatus = await Service.getDeviceStatus(
                db,
                rootIssuerDid
            );
            if (deviceStatus === undefined) {
                if (options.expectedDeviceStatus.isLoggedIn !== undefined) {
                    throw server.httpErrors.unauthorized();
                } else if (options.expectedDeviceStatus.userId !== undefined) {
                    throw server.httpErrors.forbidden();
                } else if (
                    options.expectedDeviceStatus.isSyncing !== undefined
                ) {
                    throw server.httpErrors.forbidden();
                }
            } else {
                const { userId, isLoggedIn, isSyncing } = deviceStatus;
                if (
                    options.expectedDeviceStatus.isLoggedIn !== undefined &&
                    options.expectedDeviceStatus.isLoggedIn !== isLoggedIn
                ) {
                    throw server.httpErrors.unauthorized();
                } else if (
                    options.expectedDeviceStatus.userId !== undefined &&
                    options.expectedDeviceStatus.userId !== userId
                ) {
                    throw server.httpErrors.forbidden();
                } else if (
                    options.expectedDeviceStatus.isSyncing !== undefined &&
                    options.expectedDeviceStatus.isSyncing !== isSyncing
                ) {
                    throw server.httpErrors.forbidden();
                }
            }
        }
        return rootIssuerDid;
    }
}

server.after(() => {
    server.withTypeProvider<ZodTypeProvider>().post("/auth/authenticate", {
        schema: {
            body: Dto.authenticateRequestBody,
            response: { 200: Dto.authenticateResponse, 409: Dto.auth409 },
        },
        handler: async (request, _reply) => {
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
            const { type, userId } = await Service.getAuthenticateType(
                db,
                request.body,
                didWrite,
                server.httpErrors
            );
            return await Service.authenticateAttempt(
                db,
                type,
                request.body,
                userId,
                config.MINUTES_BEFORE_EMAIL_OTP_EXPIRY,
                didWrite,
                config.THROTTLE_EMAIL_MINUTES_INTERVAL,
                server.httpErrors
            ).then(({ codeExpiry, nextCodeSoonestTime }) => {
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
    server.withTypeProvider<ZodTypeProvider>().post("/auth/verifyOtp", {
        schema: {
            body: Dto.verifyOtpReqBody,
            response: { 200: Dto.verifyOtp200, 409: Dto.auth409 },
        },
        handler: async (request, _reply) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: undefined,
            });
            return await Service.verifyOtp(
                db,
                config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                didWrite,
                request.body.code,
                server.httpErrors
            );
        },
    });
    server.withTypeProvider<ZodTypeProvider>().post("/auth/logout", {
        handler: async (request, _reply) => {
            const didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: {
                    isLoggedIn: true,
                },
            });
            await Service.logout(db, didWrite);
        },
    });
    // TODO
    server.withTypeProvider<ZodTypeProvider>().post("/auth/sync", {
        schema: {
            body: Dto.createOrGetEmailCredentialsReq,
            response: {
                // TODO 200: Dto.createOrGetEmailCredentialsRes,
                409: Dto.sync409,
            },
        },
        handler: async (request, _reply) => {
            const _didWrite = await verifyUCAN(db, request, {
                expectedDeviceStatus: {
                    isSyncing: false,
                },
            });
            // TODO
            // return await AuthService.syncAttempt(db, didWrite);
        },
    });
    // server
    //     .withTypeProvider<ZodTypeProvider>()
    //     .post("/credential/createOrGetEmailCredentials", {
    //         schema: {
    //             body: Dto.createOrGetEmailCredentialsReq,
    //             response: { 200: Dto.createOrGetEmailCredentialsRes },
    //         },
    //         handler: async (request, _reply) => {
    //             const didWrite = await verifyUCAN(db, request, {
    //                 deviceMustBeLoggedIn: true,
    //                 deviceMustBeSyncing: true,
    //             });
    //             const isEmailAssociatedWithDevice =
    //                 await Service.isEmailAssociatedWithDevice(
    //                     db,
    //                     request.body.email,
    //                     didWrite
    //                 );
    //             if (!isEmailAssociatedWithDevice) {
    //                 throw server.httpErrors.forbidden(
    //                     "Email is not associated with this device"
    //                 );
    //             }
    //             return await CredentialService.createOrGetEmailCredentials(
    //                 db,
    //                 request.body.email,
    //                 request.body.secretBlindedCredentialRequest,
    //                 sk,
    //                 server.httpErrors
    //             );
    //         },
    //     });
});

server.ready((e) => {
    if (e) {
        server.log.error(e);
        process.exit(1);
    }
    if (config.NODE_ENV === Environment.Development) {
        const swaggerYaml = server.swagger({ yaml: true });
        fs.writeFileSync("./openapi-zkorum.yml", swaggerYaml);
    }
});

server.listen({ port: config.PORT }, (err) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});
