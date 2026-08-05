import { AxiosHeaders } from "axios";
import axios from "axios";
import { eq, inArray } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import type { PhoneAuth } from "../src/service/auth.js";

import { readDbFixtureSql } from "./dbFixture.js";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
const TEST_PEPPER = Buffer.from("0123456789abcdef0123456789abcdef").toString(
    "base64",
);
process.env.PEPPERS = TEST_PEPPER;
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";

const authService = await import("../src/service/auth.js");
const authSessionService = await import("../src/service/authSession.js");
const realtimeEventOutboxService = await import(
    "../src/service/realtimeEventOutbox.js"
);
const schema = await import("../src/shared-backend/schema.js");
const { normalizeEmail } = await import("../src/shared/types/zod-email.js");

const {
    authAttemptEmailTable,
    authAttemptPhoneTable,
    deviceTable,
    emailTable,
    otpEmailDestinationStateTable,
    otpPhoneDestinationStateTable,
    phoneTable,
    realtimeEventOutboxTable,
    userTable,
    userDisplayLanguageTable,
} = schema;

const SESSION_EXPIRY = new Date("2100-01-01T00:00:00.000Z");
let currentNow = new Date("2026-01-01T00:00:00.000Z");

const enabledPhoneAuth = {
    mode: "enabled",
    delivery: {
        type: "local",
        testCode: 0,
        speciallyAuthorizedPhones: [],
    },
} satisfies PhoneAuth;
const loginOnlyPhoneAuth = {
    ...enabledPhoneAuth,
    mode: "login_only",
    minimumResponseTimeMs: 0,
    responseJitterMs: 0,
} satisfies PhoneAuth;
const disabledPhoneAuth = { mode: "disabled" } satisfies PhoneAuth;

function createLatch(): { promise: Promise<void>; release: () => void } {
    let resolveLatch: (() => void) | undefined;
    const promise = new Promise<void>((resolve) => {
        resolveLatch = resolve;
    });
    return {
        promise,
        release: () => {
            resolveLatch?.();
        },
    };
}

function setCurrentNow(value: string | Date) {
    currentNow = value instanceof Date ? value : new Date(value);
}

describe("OTP destination throttling", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();

        sqlClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 5,
        });
        db = drizzle(sqlClient);

        await sqlClient.unsafe(readDbFixtureSql("auth-otp.sql"));
    }, 120000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE
                "realtime_event_outbox",
                "otp_email_destination_state",
                "otp_phone_destination_state",
                "auth_attempt_email",
                "auth_attempt_phone",
                "email",
                "phone",
                "user_display_language",
                "zk_passport",
                "device",
                "user"
            RESTART IDENTITY;
        `);
        setCurrentNow("2026-01-01T00:00:00.000Z");
    }, 30000);

    async function createGuestDevice(didWrite: string) {
        const userId = crypto.randomUUID();
        const username = didWrite.replace(/[^a-z0-9]/gi, "").slice(-20);
        await db.insert(userTable).values({
            id: userId,
            username,
        });
        await db.insert(deviceTable).values({
            didWrite,
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        return { userId };
    }

    async function expectNoDisplayLanguagePreferences(userId: string) {
        const displayLanguages = await db
            .select()
            .from(userDisplayLanguageTable)
            .where(eq(userDisplayLanguageTable.userId, userId));

        expect(displayLanguages).toHaveLength(0);
    }

    function getWrongCode(actualCode: number): number {
        return actualCode === 111111 ? 222222 : 111111;
    }

    function createAxiosReacherSpy() {
        const axiosReacher = axios.create();
        const postSpy = vi.spyOn(axiosReacher, "post").mockResolvedValue({
            data: {
                input: "alice@example.com",
                is_reachable: "safe",
                misc: {
                    is_disposable: false,
                },
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {
                headers: new AxiosHeaders(),
            },
        });

        return {
            axiosReacher,
            postSpy,
        };
    }

    it("returns a generic error after OTP when email ownership conflicts", async () => {
        const didWrite = "did:test:email:drift";
        const email = "Alice@example.com";

        const { userId: deviceUserId } = await createGuestDevice(didWrite);

        const authenticateResponse = await authService.authenticateEmailAttempt(
            {
                db,
                axiosReacher: undefined,
                email,
                isRequestingNewCode: false,
                minutesBeforeEmailCodeExpiry: 10,
                didWrite,
                userAgent: "test-agent",
                throttleEmailSecondsInterval: 5,
                testCode: 0,
                doUseTestCode: false,
                now: currentNow,
            },
        );

        expect(authenticateResponse.success).toBe(true);

        const [authAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));

        expect(authAttempt.email).toBe(normalizeEmail(email));

        await db.insert(phoneTable).values({
            userId: deviceUserId,
            lastTwoDigits: 11,
            countryCallingCode: "1",
            phoneCountryCode: "US",
            phoneHash: "registered-device-phone-hash",
            pepperVersion: 0,
        });

        const conflictingUserId = crypto.randomUUID();
        await db.insert(userTable).values({
            id: conflictingUserId,
            username: "conflictemailuser",
        });
        await db.insert(emailTable).values({
            email: normalizeEmail(email),
            type: "primary",
            userId: conflictingUserId,
            isDeleted: false,
            emailReachability: null,
        });

        setCurrentNow("2026-01-01T00:00:06.000Z");
        const retryResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: true,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });
        expect(retryResponse.success).toBe(true);

        const wrongCodeResponse = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: getWrongCode(authAttempt.code),
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(wrongCodeResponse).toEqual({
            success: false,
            reason: "wrong_guess",
        });

        const verifyResponse = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(verifyResponse).toEqual({
            success: false,
            reason: "verification_failed",
        });

        const replayResponse = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(replayResponse).toEqual({
            success: false,
            reason: "expired_code",
        });
    }, 30000);

    it("returns a generic error after OTP when phone ownership conflicts", async () => {
        const didWrite = "did:test:phone:drift";
        const phoneNumber = "+14155552671";

        const { userId: deviceUserId } = await createGuestDevice(didWrite);

        const authenticateResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(authenticateResponse.success).toBe(true);

        const [authAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        await db.insert(emailTable).values({
            email: "verified-device@example.com",
            type: "primary",
            userId: deviceUserId,
            isDeleted: false,
            emailReachability: null,
        });

        const conflictingUserId = crypto.randomUUID();
        await db.insert(userTable).values({
            id: conflictingUserId,
            username: "conflictphoneuser",
        });
        await db.insert(phoneTable).values({
            userId: conflictingUserId,
            lastTwoDigits: authAttempt.lastTwoDigits,
            countryCallingCode: authAttempt.countryCallingCode,
            phoneCountryCode: authAttempt.phoneCountryCode,
            phoneHash: authAttempt.phoneHash,
            pepperVersion: authAttempt.pepperVersion,
            isDeleted: false,
        });

        setCurrentNow("2026-01-01T00:00:06.000Z");
        const retryResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: true,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(retryResponse.success).toBe(true);

        const wrongCodeResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: getWrongCode(authAttempt.code),
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(wrongCodeResponse).toEqual({
            success: false,
            reason: "wrong_guess",
        });

        const verifyResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(verifyResponse).toEqual({
            success: false,
            reason: "verification_failed",
        });

        const replayResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(replayResponse).toEqual({
            success: false,
            reason: "expired_code",
        });
    }, 30000);

    it("allows only one concurrent verification to claim a phone OTP", async () => {
        const didWrite = "did:test:phone:concurrent";
        const phoneNumber = "+14155552672";

        await createGuestDevice(didWrite);
        const authenticateResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(authenticateResponse.success).toBe(true);

        const [authAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        const verify = async () =>
            await authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite,
                code: authAttempt.code,
                phoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: enabledPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });

        const responses = await Promise.all([verify(), verify()]);

        expect(responses.filter((response) => response.success)).toHaveLength(
            1,
        );
        expect(
            responses.filter(
                (response) =>
                    !response.success && response.reason === "expired_code",
            ),
        ).toHaveLength(1);
    }, 30000);

    it("atomically counts concurrent wrong phone guesses", async () => {
        const didWrite = "did:test:phone:concurrent-wrong";
        const phoneNumber = "+14155552676";

        await createGuestDevice(didWrite);
        await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        const [attempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        const verifyWrongCode = async () =>
            await authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite,
                code: getWrongCode(attempt.code),
                phoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: enabledPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });
        const responses = await Promise.all([
            verifyWrongCode(),
            verifyWrongCode(),
            verifyWrongCode(),
        ]);

        expect(
            responses.filter(
                (response) =>
                    !response.success && response.reason === "wrong_guess",
            ),
        ).toHaveLength(2);
        expect(
            responses.filter(
                (response) =>
                    !response.success &&
                    response.reason === "too_many_wrong_guess",
            ),
        ).toHaveLength(1);

        const [updatedAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        expect(updatedAttempt.guessAttemptAmount).toBe(3);

        const successfulGuess = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: attempt.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(successfulGuess).toEqual({
            success: false,
            reason: "expired_code",
        });
    }, 30000);

    it("increments Twilio exhaustion backoff once per challenge", async () => {
        const didWrite = "did:test:phone:twilio-exhausted";
        const phoneNumber = "+14155552680";
        let verificationCheckCount = 0;
        let releaseVerificationChecks: (() => void) | undefined;
        const bothVerificationChecksStarted = new Promise<void>((resolve) => {
            releaseVerificationChecks = resolve;
        });
        const twilioPhoneAuth = {
            mode: "enabled",
            delivery: {
                type: "twilio",
                serviceSid: "VA-test",
                client: {
                    verify: {
                        v2: {
                            services: () => ({
                                verifications: {
                                    create: async () => ({
                                        status: "pending",
                                        toJSON: () => ({}),
                                    }),
                                },
                                verificationChecks: {
                                    create: async () => {
                                        verificationCheckCount += 1;
                                        if (verificationCheckCount === 2) {
                                            releaseVerificationChecks?.();
                                        }
                                        await bothVerificationChecksStarted;
                                        return {
                                            status: "max_attempts_reached",
                                            toJSON: () => ({}),
                                        };
                                    },
                                },
                            }),
                        },
                    },
                },
            },
        } satisfies PhoneAuth;

        await createGuestDevice(didWrite);
        const authenticateResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: twilioPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(authenticateResponse.success).toBe(true);

        const verify = async () =>
            await authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite,
                code: 123456,
                phoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: twilioPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });
        const responses = await Promise.all([verify(), verify()]);

        expect(responses[0]).toEqual(responses[1]);
        expect(responses[0].success).toBe(false);
        if (responses[0].success) {
            throw new Error("Expected exhausted Twilio challenge");
        }
        expect(responses[0].reason).toBe("too_many_wrong_guess");

        const [destinationState] = await db
            .select()
            .from(otpPhoneDestinationStateTable);
        expect(destinationState.consecutiveFailedVerifyAttempts).toBe(1);

        const [attempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        expect(attempt.codeExpiry.getTime()).toBe(currentNow.getTime());
    }, 30000);

    it("atomically counts concurrent wrong email guesses", async () => {
        const didWrite = "did:test:email:concurrent-wrong";
        const email = "concurrent@example.com";

        await createGuestDevice(didWrite);
        await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });
        const [attempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));

        const verifyWrongCode = async () =>
            await authService.verifyEmailOtp({
                db,
                maxAttempt: 3,
                didWrite,
                code: getWrongCode(attempt.code),
                email,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });
        const responses = await Promise.all([
            verifyWrongCode(),
            verifyWrongCode(),
            verifyWrongCode(),
        ]);

        expect(
            responses.filter(
                (response) =>
                    !response.success && response.reason === "wrong_guess",
            ),
        ).toHaveLength(2);
        expect(
            responses.filter(
                (response) =>
                    !response.success &&
                    response.reason === "too_many_wrong_guess",
            ),
        ).toHaveLength(1);

        const [updatedAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));
        expect(updatedAttempt.guessAttemptAmount).toBe(3);

        const successfulGuess = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: attempt.code,
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(successfulGuess).toEqual({
            success: false,
            reason: "expired_code",
        });
    }, 30000);

    it("atomically reserves concurrent phone sends per destination", async () => {
        const firstDid = "did:test:phone:reservation:1";
        const secondDid = "did:test:phone:reservation:2";
        const phoneNumber = "+14155552677";
        await createGuestDevice(firstDid);
        await createGuestDevice(secondDid);

        const authenticate = async (didWrite: string) =>
            await authService.authenticateAttempt({
                db,
                authenticateRequestBody: {
                    phoneNumber,
                    defaultCallingCode: "1",
                    isRequestingNewCode: false,
                },
                minutesBeforeSmsCodeExpiry: 10,
                didWrite,
                userAgent: "test-agent",
                throttleSmsSecondsInterval: 5,
                phoneAuth: enabledPhoneAuth,
                peppers: [TEST_PEPPER],
                now: currentNow,
            });
        const responses = await Promise.all([
            authenticate(firstDid),
            authenticate(secondDid),
        ]);

        expect(responses.filter((response) => response.success)).toHaveLength(
            1,
        );
        expect(
            responses.filter(
                (response) =>
                    !response.success && response.reason === "throttled",
            ),
        ).toHaveLength(1);
        expect(await db.select().from(authAttemptPhoneTable)).toHaveLength(1);
    }, 30000);

    it("atomically reserves concurrent email sends per destination", async () => {
        const firstDid = "did:test:email:reservation:1";
        const secondDid = "did:test:email:reservation:2";
        const email = "reservation@example.com";
        await createGuestDevice(firstDid);
        await createGuestDevice(secondDid);

        const authenticate = async (didWrite: string) =>
            await authService.authenticateEmailAttempt({
                db,
                axiosReacher: undefined,
                email,
                isRequestingNewCode: false,
                minutesBeforeEmailCodeExpiry: 10,
                didWrite,
                userAgent: "test-agent",
                throttleEmailSecondsInterval: 5,
                testCode: 0,
                doUseTestCode: false,
                now: currentNow,
            });
        const responses = await Promise.all([
            authenticate(firstDid),
            authenticate(secondDid),
        ]);

        expect(responses.filter((response) => response.success)).toHaveLength(
            1,
        );
        expect(
            responses.filter(
                (response) =>
                    !response.success && response.reason === "throttled",
            ),
        ).toHaveLength(1);
        expect(await db.select().from(authAttemptEmailTable)).toHaveLength(1);
    }, 30000);

    it("canonicalizes phone aliases for allowlisting and verification", async () => {
        const didWrite = "did:test:phone:canonical";
        const canonicalPhoneNumber = "+14155552678";
        const phoneAuth = {
            mode: "enabled",
            delivery: {
                type: "local",
                testCode: 654321,
                speciallyAuthorizedPhones: [canonicalPhoneNumber],
            },
        } satisfies PhoneAuth;
        await createGuestDevice(didWrite);

        const authenticateResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: "+1 (415) 555-2678",
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(authenticateResponse.success).toBe(true);

        const verifyResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: 654321,
            phoneNumber: "+1 415 555 2678",
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(verifyResponse.success).toBe(true);
    }, 30000);

    it("reuses the same email OTP on resend and preserves wrong-guess count", async () => {
        const didWrite = "did:test:email:1";
        const email = "Alice@example.com";

        await createGuestDevice(didWrite);

        const firstResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const [firstAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));

        expect(firstAttempt.email).toBe(normalizeEmail(email));

        const wrongGuess = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: getWrongCode(firstAttempt.code),
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(wrongGuess.success).toBe(false);
        if (wrongGuess.success) {
            throw new Error("Expected wrong guess response");
        }
        expect(wrongGuess.reason).toBe("wrong_guess");

        setCurrentNow("2026-01-01T00:00:06.000Z");

        const resendResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: true,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(resendResponse.success).toBe(true);

        const [resendAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));

        expect(resendAttempt.code).toBe(firstAttempt.code);
        expect(resendAttempt.guessAttemptAmount).toBe(1);
        expect(resendAttempt.codeExpiry.getTime()).toBe(
            firstAttempt.codeExpiry.getTime(),
        );
        expect(resendAttempt.lastOtpSentAt.getTime()).toBe(
            currentNow.getTime(),
        );
    }, 30000);

    it("skips Reacher when reusing an existing live email OTP", async () => {
        const didWrite = "did:test:email:reacher";
        const email = "Alice@example.com";
        const { axiosReacher, postSpy } = createAxiosReacherSpy();

        await createGuestDevice(didWrite);

        const firstResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);
        expect(postSpy).toHaveBeenCalledTimes(1);

        const secondResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);
        expect(postSpy).toHaveBeenCalledTimes(1);

        setCurrentNow("2026-01-01T00:00:06.000Z");

        const resendResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher,
            email,
            isRequestingNewCode: true,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(resendResponse.success).toBe(true);
        expect(postSpy).toHaveBeenCalledTimes(1);
    }, 30000);

    it("rotates a live email OTP when the identifier changes", async () => {
        const didWrite = "did:test:email:change";
        const firstEmail = "Alice@example.com";
        const secondEmail = "Bob@example.com";

        await createGuestDevice(didWrite);

        const firstResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email: firstEmail,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const secondResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email: secondEmail,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);

        const [updatedAttempt] = await db
            .select({ email: authAttemptEmailTable.email })
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, didWrite));

        expect(updatedAttempt.email).toBe(normalizeEmail(secondEmail));
    }, 30000);

    it("applies email backoff across devices and clears it after success", async () => {
        const firstDid = "did:test:email:2";
        const secondDid = "did:test:email:3";
        const email = "Alice@example.com";

        await createGuestDevice(firstDid);
        await createGuestDevice(secondDid);

        const firstResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite: firstDid,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const [firstAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, firstDid));

        let finalFailure: Awaited<
            ReturnType<typeof authService.verifyEmailOtp>
        > | null = null;
        for (let i = 0; i < 3; i += 1) {
            finalFailure = await authService.verifyEmailOtp({
                db,
                maxAttempt: 3,
                didWrite: firstDid,
                code: getWrongCode(firstAttempt.code),
                email,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });
        }

        expect(finalFailure?.success).toBe(false);
        if (finalFailure === null || finalFailure.success) {
            throw new Error("Expected too_many_wrong_guess response");
        }
        if (finalFailure.reason !== "too_many_wrong_guess") {
            throw new Error("Expected too_many_wrong_guess response");
        }
        expect(finalFailure.nextCodeSoonestTime).toBeDefined();

        const throttledResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite: secondDid,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(throttledResponse.success).toBe(false);
        if (throttledResponse.success) {
            throw new Error("Expected throttled response");
        }
        if (throttledResponse.reason !== "throttled") {
            throw new Error("Expected throttled response");
        }
        expect(throttledResponse.nextCodeSoonestTime).toBeDefined();

        setCurrentNow(
            new Date(finalFailure.nextCodeSoonestTime.getTime() + 1000),
        );

        const secondResponse = await authService.authenticateEmailAttempt({
            db,
            axiosReacher: undefined,
            email,
            isRequestingNewCode: false,
            minutesBeforeEmailCodeExpiry: 10,
            didWrite: secondDid,
            userAgent: "test-agent",
            throttleEmailSecondsInterval: 5,
            testCode: 0,
            doUseTestCode: false,
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);

        const [secondAttempt] = await db
            .select()
            .from(authAttemptEmailTable)
            .where(eq(authAttemptEmailTable.didWrite, secondDid));

        const successResponse = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite: secondDid,
            code: secondAttempt.code,
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(successResponse.success).toBe(true);
        if (!successResponse.success) {
            throw new Error("Expected successful email verification");
        }

        const [storedEmail] = await db
            .select({ email: emailTable.email })
            .from(emailTable)
            .where(eq(emailTable.userId, successResponse.userId));

        expect(storedEmail.email).toBe(normalizeEmail(email));
        await expectNoDisplayLanguagePreferences(successResponse.userId);

        const [destinationState] = await db
            .select()
            .from(otpEmailDestinationStateTable)
            .where(
                eq(otpEmailDestinationStateTable.email, normalizeEmail(email)),
            );

        expect(destinationState.consecutiveFailedVerifyAttempts).toBe(0);
        expect(destinationState.backoffUntil).toBeNull();
    }, 30000);

    it("enforces one email guess budget across rotating DIDs", async () => {
        const email = "rotating@example.com";
        let finalResponse: Awaited<
            ReturnType<typeof authService.verifyEmailOtp>
        > | null = null;

        for (let deviceIndex = 0; deviceIndex < 5; deviceIndex += 1) {
            const didWrite = `did:test:email:rotating:${String(deviceIndex)}`;
            await createGuestDevice(didWrite);
            const authentication = await authService.authenticateEmailAttempt({
                db,
                axiosReacher: undefined,
                email,
                isRequestingNewCode: false,
                minutesBeforeEmailCodeExpiry: 10,
                didWrite,
                userAgent: "test-agent",
                throttleEmailSecondsInterval: 5,
                testCode: 0,
                doUseTestCode: false,
                now: currentNow,
            });
            expect(authentication.success).toBe(true);
            const [attempt] = await db
                .select()
                .from(authAttemptEmailTable)
                .where(eq(authAttemptEmailTable.didWrite, didWrite));
            for (let guessIndex = 0; guessIndex < 2; guessIndex += 1) {
                finalResponse = await authService.verifyEmailOtp({
                    db,
                    maxAttempt: 3,
                    didWrite,
                    code: getWrongCode(attempt.code),
                    email,
                    sessionLifetimeDays: 90,
                    now: currentNow,
                    currentDisplayLanguage: "en",
                });
            }
            setCurrentNow(new Date(currentNow.getTime() + 6000));
        }

        expect(finalResponse?.success).toBe(false);
        if (finalResponse === null || finalResponse.success) {
            throw new Error("Expected destination throttling");
        }
        expect(finalResponse.reason).toBe("too_many_wrong_guess");
        const [destinationState] = await db
            .select()
            .from(otpEmailDestinationStateTable)
            .where(
                eq(otpEmailDestinationStateTable.email, normalizeEmail(email)),
            );
        expect(destinationState.consecutiveFailedVerifyAttempts).toBe(1);
        expect(destinationState.backoffUntil).not.toBeNull();
    }, 30000);

    it("reuses the same phone OTP on resend and preserves wrong-guess count", async () => {
        const didWrite = "did:test:phone:1";
        const phoneNumber = "+14155552671";

        await createGuestDevice(didWrite);

        const firstResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const [firstAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        const wrongGuess = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: getWrongCode(firstAttempt.code),
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(wrongGuess.success).toBe(false);
        if (wrongGuess.success) {
            throw new Error("Expected wrong guess response");
        }
        expect(wrongGuess.reason).toBe("wrong_guess");

        setCurrentNow("2026-01-01T00:00:06.000Z");

        const resendResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: true,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(resendResponse.success).toBe(true);

        const [resendAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        expect(resendAttempt.code).toBe(firstAttempt.code);
        expect(resendAttempt.guessAttemptAmount).toBe(1);
        expect(resendAttempt.codeExpiry.getTime()).toBe(
            firstAttempt.codeExpiry.getTime(),
        );
        expect(resendAttempt.lastOtpSentAt.getTime()).toBe(
            currentNow.getTime(),
        );
    }, 30000);

    it("does not reserve a phone send window when resuming a live challenge", async () => {
        const didWrite = "did:test:phone:resume";
        const phoneNumber = "+14155552671";
        await createGuestDevice(didWrite);
        await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        const [beforeResume] = await db
            .select()
            .from(otpPhoneDestinationStateTable);

        setCurrentNow("2026-01-01T00:00:06.000Z");
        const response = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        const [afterResume] = await db
            .select()
            .from(otpPhoneDestinationStateTable);

        expect(response.success).toBe(true);
        expect(afterResume.lastOtpSentAt).toEqual(beforeResume.lastOtpSentAt);
        expect(afterResume.updatedAt).toEqual(beforeResume.updatedAt);
    }, 30000);

    it("rotates a live phone OTP when the identifier changes", async () => {
        const didWrite = "did:test:phone:change";
        const firstPhoneNumber = "+14155552671";
        const secondPhoneNumber = "+14155552672";

        await createGuestDevice(didWrite);

        const firstResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: firstPhoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const [firstAttempt] = await db
            .select({ phoneHash: authAttemptPhoneTable.phoneHash })
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        const secondResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: secondPhoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);

        const [updatedAttempt] = await db
            .select({ phoneHash: authAttemptPhoneTable.phoneHash })
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        expect(updatedAttempt.phoneHash).not.toBe(firstAttempt.phoneHash);
    }, 30000);

    it("throttles synthetic login-only attempts with indistinguishable challenges", async () => {
        const firstDid = "did:test:phone:login-only:1";
        const secondDid = "did:test:phone:login-only:2";
        const thirdDid = "did:test:phone:login-only:3";
        const phoneNumber = "+14155552673";

        await createGuestDevice(firstDid);
        await createGuestDevice(secondDid);
        await createGuestDevice(thirdDid);

        const authenticateSynthetic = async ({
            didWrite,
            submittedPhoneNumber,
        }: {
            didWrite: string;
            submittedPhoneNumber: string;
        }) =>
            await authService.authenticateAttempt({
                db,
                authenticateRequestBody: {
                    phoneNumber: submittedPhoneNumber,
                    defaultCallingCode: "1",
                    isRequestingNewCode: false,
                },
                minutesBeforeSmsCodeExpiry: 10,
                didWrite,
                userAgent: "test-agent",
                throttleSmsSecondsInterval: 5,
                phoneAuth: loginOnlyPhoneAuth,
                peppers: [TEST_PEPPER],
                now: currentNow,
            });
        const authenticateResponse = await authenticateSynthetic({
            didWrite: firstDid,
            submittedPhoneNumber: phoneNumber,
        });

        expect(authenticateResponse.success).toBe(true);
        const firstSyntheticChallenges = await db
            .select()
            .from(authAttemptPhoneTable);
        expect(firstSyntheticChallenges).toHaveLength(1);
        expect(firstSyntheticChallenges[0].isSynthetic).toBe(true);
        expect(
            await db.select().from(otpPhoneDestinationStateTable),
        ).toHaveLength(1);

        const repeatedResponse = await authenticateSynthetic({
            didWrite: firstDid,
            submittedPhoneNumber: "+1 (415) 555-2673",
        });
        expect(repeatedResponse).toEqual(authenticateResponse);

        setCurrentNow("2026-01-01T00:00:06.000Z");
        const concurrentResponses = await Promise.all([
            authenticateSynthetic({
                didWrite: secondDid,
                submittedPhoneNumber: "+1 (415) 555-2673",
            }),
            authenticateSynthetic({
                didWrite: thirdDid,
                submittedPhoneNumber: phoneNumber,
            }),
        ]);
        expect(
            concurrentResponses.filter((response) => response.success),
        ).toHaveLength(1);
        expect(
            concurrentResponses.filter(
                (response) =>
                    !response.success && response.reason === "throttled",
            ),
        ).toHaveLength(1);
        expect(await db.select().from(authAttemptPhoneTable)).toHaveLength(2);
    }, 30000);

    it("rejects phone verification before accessing an OTP when disabled", async () => {
        const authenticateResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: "+14155552674",
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: "did:test:phone:disabled",
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: disabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(authenticateResponse).toEqual({
            success: false,
            reason: "phone_auth_unavailable",
        });

        const verifyResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite: "did:test:phone:disabled",
            code: 123456,
            phoneNumber: "+14155552674",
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: disabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(verifyResponse).toEqual({
            success: false,
            reason: "phone_auth_unavailable",
        });
    });

    it("allows an existing phone account to log in in login-only mode", async () => {
        const registeredDid = "did:test:phone:registered";
        const loginDid = "did:test:phone:existing-login";
        const syntheticDid = "did:test:phone:synthetic-login";
        const phoneNumber = "+14155552675";
        const unregisteredPhoneNumber = "+14155552679";
        const deliveryStarted = createLatch();
        const deliveryBlocked = createLatch();
        const loginOnlyTwilioPhoneAuth = {
            mode: "login_only",
            minimumResponseTimeMs: 0,
            responseJitterMs: 0,
            delivery: {
                type: "twilio",
                serviceSid: "VA-test",
                client: {
                    verify: {
                        v2: {
                            services: () => ({
                                verifications: {
                                    create: async () => {
                                        deliveryStarted.release();
                                        await deliveryBlocked.promise;
                                        return {
                                            status: "pending",
                                            toJSON: () => ({}),
                                        };
                                    },
                                },
                                verificationChecks: {
                                    create: async () => {
                                        throw new Error(
                                            "Simulated Twilio verification failure",
                                        );
                                    },
                                },
                            }),
                        },
                    },
                },
            },
        } satisfies PhoneAuth;

        await createGuestDevice(registeredDid);
        const registrationAttempt = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: registeredDid,
            userAgent: "registered-device",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(registrationAttempt.success).toBe(true);

        const [registrationOtp] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, registeredDid));
        const registrationResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite: registeredDid,
            code: registrationOtp.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });
        expect(registrationResponse.success).toBe(true);
        if (!registrationResponse.success) {
            throw new Error("Expected phone registration to succeed");
        }

        setCurrentNow("2026-01-01T00:00:06.000Z");
        await createGuestDevice(syntheticDid);
        const loginAttempt = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: "(415) 555-2675",
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: loginDid,
            userAgent: "new-device",
            throttleSmsSecondsInterval: 5,
            phoneAuth: loginOnlyTwilioPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(loginAttempt.success).toBe(true);
        await deliveryStarted.promise;
        deliveryBlocked.release();

        const syntheticAttempt = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: unregisteredPhoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: syntheticDid,
            userAgent: "synthetic-device",
            throttleSmsSecondsInterval: 5,
            phoneAuth: loginOnlyTwilioPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(syntheticAttempt).toEqual(loginAttempt);

        const repeatedLoginAttempt = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: loginDid,
            userAgent: "new-device",
            throttleSmsSecondsInterval: 5,
            phoneAuth: loginOnlyTwilioPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        const repeatedSyntheticAttempt = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber: unregisteredPhoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: syntheticDid,
            userAgent: "synthetic-device",
            throttleSmsSecondsInterval: 5,
            phoneAuth: loginOnlyTwilioPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });
        expect(repeatedSyntheticAttempt).toEqual(repeatedLoginAttempt);
        expect(repeatedLoginAttempt.success).toBe(true);

        const syntheticChallenges = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, syntheticDid));
        expect(syntheticChallenges).toHaveLength(1);
        expect(syntheticChallenges[0].isSynthetic).toBe(true);

        const [loginOtp] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, loginDid));
        const wrongCode = getWrongCode(loginOtp.code);
        const [realWrongResponse, syntheticWrongResponse] = await Promise.all([
            authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite: loginDid,
                code: wrongCode,
                phoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: loginOnlyTwilioPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            }),
            authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite: syntheticDid,
                code: wrongCode,
                phoneNumber: unregisteredPhoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: loginOnlyTwilioPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            }),
        ]);
        expect(syntheticWrongResponse).toEqual(realWrongResponse);
        expect(realWrongResponse).toEqual({
            success: false,
            reason: "wrong_guess",
        });
        const loginResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite: loginDid,
            code: loginOtp.code,
            phoneNumber: "+1 415 555 2675",
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: loginOnlyPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(loginResponse).toEqual({
            success: true,
            accountMerged: false,
            userId: registrationResponse.userId,
        });
    }, 30000);

    it("applies phone backoff across devices and clears it after success", async () => {
        const firstDid = "did:test:phone:2";
        const secondDid = "did:test:phone:3";
        const phoneNumber = "+14155552671";

        await createGuestDevice(firstDid);
        await createGuestDevice(secondDid);

        const firstResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: firstDid,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(firstResponse.success).toBe(true);

        const [firstAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, firstDid));

        let finalFailure: Awaited<
            ReturnType<typeof authService.verifyPhoneOtp>
        > | null = null;
        for (let i = 0; i < 3; i += 1) {
            finalFailure = await authService.verifyPhoneOtp({
                db,
                maxAttempt: 3,
                didWrite: firstDid,
                code: getWrongCode(firstAttempt.code),
                phoneNumber,
                defaultCallingCode: "1",
                peppers: [TEST_PEPPER],
                phoneAuth: enabledPhoneAuth,
                sessionLifetimeDays: 90,
                now: currentNow,
                currentDisplayLanguage: "en",
            });
        }

        expect(finalFailure?.success).toBe(false);
        if (finalFailure === null || finalFailure.success) {
            throw new Error("Expected too_many_wrong_guess response");
        }
        if (finalFailure.reason !== "too_many_wrong_guess") {
            throw new Error("Expected too_many_wrong_guess response");
        }
        expect(finalFailure.nextCodeSoonestTime).toBeDefined();

        const throttledResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: secondDid,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(throttledResponse.success).toBe(false);
        if (throttledResponse.success) {
            throw new Error("Expected throttled response");
        }
        if (throttledResponse.reason !== "throttled") {
            throw new Error("Expected throttled response");
        }
        expect(throttledResponse.nextCodeSoonestTime).toBeDefined();

        setCurrentNow(
            new Date(finalFailure.nextCodeSoonestTime.getTime() + 1000),
        );

        const secondResponse = await authService.authenticateAttempt({
            db,
            authenticateRequestBody: {
                phoneNumber,
                defaultCallingCode: "1",
                isRequestingNewCode: false,
            },
            minutesBeforeSmsCodeExpiry: 10,
            didWrite: secondDid,
            userAgent: "test-agent",
            throttleSmsSecondsInterval: 5,
            phoneAuth: enabledPhoneAuth,
            peppers: [TEST_PEPPER],
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);

        const [secondAttempt] = await db
            .select()
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, secondDid));

        const successResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite: secondDid,
            code: secondAttempt.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [TEST_PEPPER],
            phoneAuth: enabledPhoneAuth,
            sessionLifetimeDays: 90,
            now: currentNow,
            currentDisplayLanguage: "en",
        });

        expect(successResponse.success).toBe(true);
        if (!successResponse.success) {
            throw new Error("Expected successful phone verification");
        }
        await expectNoDisplayLanguagePreferences(successResponse.userId);

        const [destinationState] = await db
            .select()
            .from(otpPhoneDestinationStateTable)
            .where(
                eq(
                    otpPhoneDestinationStateTable.phoneHash,
                    secondAttempt.phoneHash,
                ),
            );

        expect(destinationState.consecutiveFailedVerifyAttempts).toBe(0);
        expect(destinationState.backoffUntil).toBeNull();
    }, 30000);

    it("lists only active sessions for the authenticated account", async () => {
        const currentDid = "did:test:session:current";
        const { userId } = await createGuestDevice(currentDid);
        await db.insert(deviceTable).values([
            {
                didWrite: "did:test:session:other",
                userId,
                userAgent: "private-other-agent",
                sessionExpiry: new Date("2099-01-01T00:00:00.000Z"),
                sessionStartedAt: new Date("2026-01-02T00:00:00.000Z"),
            },
            {
                didWrite: "did:test:session:expired",
                userId,
                userAgent: "private-expired-agent",
                sessionExpiry: new Date("2025-01-01T00:00:00.000Z"),
            },
        ]);
        const otherUser = await createGuestDevice(
            "did:test:session:other-user",
        );

        const sessions = await authSessionService.listActiveSessions({
            db,
            userId,
            currentDidWrite: currentDid,
            now: currentNow,
        });

        expect(sessions.type).toBe("active");
        if (sessions.type !== "active") {
            throw new Error("Expected the current session to remain active");
        }
        expect(sessions.otherSessions).toHaveLength(1);
        expect(sessions.currentSession.didWrite).toBe(currentDid);
        expect(sessions.otherSessions[0]?.didWrite).toBe(
            "did:test:session:other",
        );
        expect(JSON.stringify(sessions)).not.toContain("private-");
        expect(JSON.stringify(sessions)).not.toContain(otherUser.userId);
    });

    it("waits for earlier outbox inserts before exposing a safe upper bound", async () => {
        const firstInsertStarted = createLatch();
        const allowFirstInsertCommit = createLatch();
        const firstInsert = sqlClient.begin(async (tx) => {
            await tx`
                INSERT INTO "realtime_event_outbox" ("event_type", "payload")
                VALUES ('test_first', '{}'::jsonb)
            `;
            firstInsertStarted.release();
            await allowFirstInsertCommit.promise;
        });
        await firstInsertStarted.promise;
        await sqlClient`
            INSERT INTO "realtime_event_outbox" ("event_type", "payload")
            VALUES ('test_second', '{}'::jsonb)
        `;

        let didResolve = false;
        const safeUpperBound =
            realtimeEventOutboxService
                .fetchSafeOutboxUpperBound({ db })
                .then((value) => {
                    didResolve = true;
                    return value;
                });
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(didResolve).toBe(false);

        allowFirstInsertCommit.release();
        await firstInsert;
        await expect(safeUpperBound).resolves.toBe(2);
    });

    it("revokes another session without touching the current session", async () => {
        const currentDid = "did:test:session:revoke-current";
        const otherDid = "did:test:session:revoke-other";
        const { userId } = await createGuestDevice(currentDid);
        await db.insert(deviceTable).values({
            didWrite: otherDid,
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        const activeSessions = await authSessionService.listActiveSessions({
            db,
            userId,
            currentDidWrite: currentDid,
            now: currentNow,
        });
        if (activeSessions.type !== "active") {
            throw new Error("Expected active sessions before revocation");
        }
        const otherSession = activeSessions.otherSessions.at(0);
        if (otherSession === undefined) {
            throw new Error("Expected another active session");
        }

        const revokedSessionCount = await authSessionService.revokeSession({
            db,
            userId,
            currentDidWrite: currentDid,
            didWrite: otherSession.didWrite,
            now: currentNow,
        });

        expect(revokedSessionCount).toBe(1);
        const sessions = await authSessionService.listActiveSessions({
            db,
            userId,
            currentDidWrite: currentDid,
            now: currentNow,
        });
        expect(sessions.type).toBe("active");
        if (sessions.type !== "active") {
            throw new Error("Expected the current session to remain active");
        }
        expect(sessions.otherSessions).toHaveLength(0);
        const revocationEvents = await db
            .select()
            .from(realtimeEventOutboxTable);
        expect(revocationEvents).toHaveLength(1);
        expect(revocationEvents[0].eventType).toBe("auth_state_changed");
        expect(revocationEvents[0].payload).toEqual({
            userIds: [userId],
            reason: "revoked",
        });
    });

    it("only revokes active DIDs owned by the account", async () => {
        const currentDid = "did:test:session:protected-current";
        const otherDid = "did:test:session:protected-other";
        const foreignDid = "did:test:session:protected-foreign";
        const { userId } = await createGuestDevice(currentDid);
        await createGuestDevice(foreignDid);
        await db.insert(deviceTable).values({
            didWrite: otherDid,
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        const listed = await authSessionService.listActiveSessions({
            db,
            userId,
            currentDidWrite: currentDid,
            now: currentNow,
        });
        if (listed.type !== "active") {
            throw new Error("Expected active sessions");
        }
        if (listed.otherSessions.at(0) === undefined) {
            throw new Error("Expected another session");
        }

        for (const didWrite of [
            currentDid,
            foreignDid,
            "did:test:session:unknown",
        ]) {
            expect(
                await authSessionService.revokeSession({
                    db,
                    userId,
                    currentDidWrite: currentDid,
                    didWrite,
                    now: currentNow,
                }),
            ).toBe(0);
        }
        const protectedDevices = await db
            .select({
                didWrite: deviceTable.didWrite,
                sessionExpiry: deviceTable.sessionExpiry,
            })
            .from(deviceTable)
            .where(
                inArray(deviceTable.didWrite, [
                    currentDid,
                    otherDid,
                    foreignDid,
                ]),
            );
        expect(protectedDevices).toEqual(
            expect.arrayContaining([
                {
                    didWrite: currentDid,
                    sessionExpiry: SESSION_EXPIRY,
                },
                {
                    didWrite: otherDid,
                    sessionExpiry: SESSION_EXPIRY,
                },
                {
                    didWrite: foreignDid,
                    sessionExpiry: SESSION_EXPIRY,
                },
            ]),
        );
        expect(await db.select().from(realtimeEventOutboxTable)).toHaveLength(
            0,
        );
    });

    it("does not update a session after its observed expiry was revoked", async () => {
        const didWrite = "did:test:session:refresh-race";
        await createGuestDevice(didWrite);
        const decision = authSessionService.decideSessionExpiryUpdate({
            now: currentNow,
            currentExpiry: SESSION_EXPIRY,
            refreshThresholdDays: 36500,
            sessionLifetimeDays: 90,
        });
        if (decision.type !== "update") {
            throw new Error("Expected an expiry update decision");
        }
        await db
            .update(deviceTable)
            .set({ sessionExpiry: currentNow })
            .where(eq(deviceTable.didWrite, didWrite));

        expect(
            await authSessionService.updateSessionExpiryIfCurrent({
                db,
                didWrite,
                now: currentNow,
                decision,
            }),
        ).toBeUndefined();
        const [device] = await db
            .select({ sessionExpiry: deviceTable.sessionExpiry })
            .from(deviceTable)
            .where(eq(deviceTable.didWrite, didWrite));
        expect(device.sessionExpiry).toEqual(currentNow);
    });

    it("updates the observed expiry and returns its effective expiry", async () => {
        const didWrite = "did:test:session:refresh-current";
        await createGuestDevice(didWrite);
        const decision = authSessionService.decideSessionExpiryUpdate({
            now: currentNow,
            currentExpiry: SESSION_EXPIRY,
            refreshThresholdDays: 36500,
            sessionLifetimeDays: 90,
        });
        if (decision.type !== "update") {
            throw new Error("Expected an expiry update decision");
        }

        const effectiveExpiry =
            await authSessionService.updateSessionExpiryIfCurrent({
                db,
                didWrite,
                now: currentNow,
                decision,
            });

        expect(effectiveExpiry).toEqual(decision.nextExpiry);
    });

    it("revokes inherited guest sessions before starting one hard session", async () => {
        const currentDid = "did:test:session:upgrade-current";
        const { userId } = await createGuestDevice(currentDid);
        await db.insert(deviceTable).values({
            didWrite: "did:test:session:upgrade-other",
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        const newExpiry = new Date("2026-04-01T00:00:00.000Z");

        await authSessionService.startHardAuthSession({
            db,
            userId,
            didWrite: currentDid,
            transition: {
                type: "credential_upgrade",
            },
            now: currentNow,
            sessionExpiry: newExpiry,
        });

        const transitionedDevices = await db
            .select({
                didWrite: deviceTable.didWrite,
                sessionStartedAt: deviceTable.sessionStartedAt,
                sessionExpiry: deviceTable.sessionExpiry,
            })
            .from(deviceTable)
            .where(eq(deviceTable.userId, userId));
        const currentDevice = transitionedDevices.find(
            (device) => device.didWrite === currentDid,
        );
        const otherDevice = transitionedDevices.find(
            (device) => device.didWrite !== currentDid,
        );
        if (currentDevice === undefined || otherDevice === undefined) {
            throw new Error("Expected both upgraded account devices");
        }
        expect(currentDevice.sessionStartedAt).toEqual(currentNow);
        expect(currentDevice.sessionExpiry).toEqual(newExpiry);
        expect(otherDevice.sessionExpiry).toEqual(currentNow);

        const revocationEvents = await db
            .select({ payload: realtimeEventOutboxTable.payload })
            .from(realtimeEventOutboxTable);
        expect(revocationEvents).toHaveLength(1);
        expect(revocationEvents[0].payload).toEqual({
            userIds: [userId],
            reason: "identity_changed",
        });
    });

    it("updates only the current session during hard reauthentication", async () => {
        const currentDid = "did:test:session:reauth-current";
        const otherDid = "did:test:session:reauth-other";
        const { userId } = await createGuestDevice(currentDid);
        await db.insert(phoneTable).values({
            userId,
            lastTwoDigits: 71,
            countryCallingCode: "1",
            phoneHash: "reauthenticated-phone",
            pepperVersion: 0,
        });
        await db.insert(deviceTable).values({
            didWrite: otherDid,
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        const before = await db
            .select({
                didWrite: deviceTable.didWrite,
                sessionStartedAt: deviceTable.sessionStartedAt,
                sessionExpiry: deviceTable.sessionExpiry,
            })
            .from(deviceTable)
            .where(eq(deviceTable.userId, userId));
        const previousOther = before.find(
            (device) => device.didWrite === otherDid,
        );
        if (previousOther === undefined) {
            throw new Error("Expected the other registered account session");
        }

        const newExpiry = new Date("2026-04-01T00:00:00.000Z");
        await authSessionService.startHardAuthSession({
            db,
            userId,
            didWrite: currentDid,
            transition: {
                type: "reauthentication",
            },
            now: currentNow,
            sessionExpiry: newExpiry,
        });

        const after = await db
            .select({
                didWrite: deviceTable.didWrite,
                sessionStartedAt: deviceTable.sessionStartedAt,
                sessionExpiry: deviceTable.sessionExpiry,
            })
            .from(deviceTable)
            .where(eq(deviceTable.userId, userId));
        const current = after.find((device) => device.didWrite === currentDid);
        const other = after.find((device) => device.didWrite === otherDid);
        if (current === undefined || other === undefined) {
            throw new Error("Expected both reauthenticated account sessions");
        }
        expect(current.sessionStartedAt).toEqual(currentNow);
        expect(current.sessionExpiry).toEqual(newExpiry);
        expect(other).toEqual(previousOther);

        const [revocationEvent] = await db
            .select({ payload: realtimeEventOutboxTable.payload })
            .from(realtimeEventOutboxTable);
        expect(revocationEvent.payload).toEqual({
            userIds: [userId],
            reason: "session_reauthenticated",
        });
    });

    it("does not reactivate a registered DID after logout", async () => {
        const didWrite = "did:test:session:retired-reauth";
        const { userId } = await createGuestDevice(didWrite);
        await db.insert(phoneTable).values({
            userId,
            lastTwoDigits: 71,
            countryCallingCode: "1",
            phoneHash: "retired-reauth-phone",
            pepperVersion: 0,
        });
        await db
            .update(deviceTable)
            .set({ sessionExpiry: currentNow })
            .where(eq(deviceTable.didWrite, didWrite));

        await expect(
            authSessionService.startHardAuthSession({
                db,
                userId,
                didWrite,
                transition: { type: "reauthentication" },
                now: currentNow,
                sessionExpiry: new Date("2026-04-01T00:00:00.000Z"),
            }),
        ).rejects.toThrow("Cannot start a session for an inactive device");

        const [device] = await db
            .select({ sessionExpiry: deviceTable.sessionExpiry })
            .from(deviceTable)
            .where(eq(deviceTable.didWrite, didWrite));
        expect(device.sessionExpiry).toEqual(currentNow);
        expect(await db.select().from(realtimeEventOutboxTable)).toHaveLength(
            0,
        );
    });

    it("logout-all ignores historical sessions", async () => {
        const activeDid = "did:test:session:logout-all-active";
        const { userId } = await createGuestDevice(activeDid);
        await db.insert(phoneTable).values({
            userId,
            lastTwoDigits: 71,
            countryCallingCode: "1",
            phoneHash: "logout-all-phone",
            pepperVersion: 0,
        });
        const historicalExpiry = new Date("2025-01-01T00:00:00.000Z");
        await db.insert(deviceTable).values({
            didWrite: "did:test:session:logout-all-historical",
            userId,
            userAgent: "test-agent",
            sessionExpiry: historicalExpiry,
        });

        const revoked = await authSessionService.revokeAllSessions({
            db,
            userId,
            now: currentNow,
        });

        expect(revoked).toBe(1);
        const [historicalDevice] = await db
            .select({ sessionExpiry: deviceTable.sessionExpiry })
            .from(deviceTable)
            .where(
                eq(
                    deviceTable.didWrite,
                    "did:test:session:logout-all-historical",
                ),
            );
        expect(historicalDevice.sessionExpiry).toEqual(historicalExpiry);
        const [revocationEvent] = await db
            .select({ payload: realtimeEventOutboxTable.payload })
            .from(realtimeEventOutboxTable);
        expect(revocationEvent.payload).toEqual({
            userIds: [userId],
            reason: "logout_all",
        });
    });

    it("emits the affected user on logout", async () => {
        const didWrite = "did:test:session:logout-current";
        const { userId } = await createGuestDevice(didWrite);

        expect(
            await authSessionService.revokeCurrentSession({
                db,
                didWrite,
                now: currentNow,
            }),
        ).toBe(1);
        const [revocationEvent] = await db
            .select({ payload: realtimeEventOutboxTable.payload })
            .from(realtimeEventOutboxTable);
        expect(revocationEvent.payload).toEqual({
            userIds: [userId],
            reason: "logout",
        });
    });

    it("enforces nonnegative wrong-guess counters", async () => {
        await expect(
            db.insert(otpPhoneDestinationStateTable).values({
                phoneHash: "negative-phone-counter",
                lastOtpSentAt: currentNow,
                wrongGuessAttemptAmount: -1,
            }),
        ).rejects.toThrow();
        await expect(
            db.insert(otpEmailDestinationStateTable).values({
                email: "negative@example.com",
                lastOtpSentAt: currentNow,
                wrongGuessAttemptAmount: -1,
            }),
        ).rejects.toThrow();
    });
});
