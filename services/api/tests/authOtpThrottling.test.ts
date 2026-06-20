import { AxiosHeaders } from "axios";
import axios from "axios";
import { eq } from "drizzle-orm";
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

import { readDbFixtureSql } from "./dbFixture.js";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
process.env.PEPPERS = Buffer.from("0123456789abcdef0123456789abcdef").toString(
    "base64",
);
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";

const authService = await import("../src/service/auth.js");
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
    userTable,
} = schema;

const SESSION_EXPIRY = new Date("2100-01-01T00:00:00.000Z");
let currentNow = new Date("2026-01-01T00:00:00.000Z");

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
            max: 1,
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
            firstName: username,
        });
        await db.insert(deviceTable).values({
            didWrite,
            userId,
            userAgent: "test-agent",
            sessionExpiry: SESSION_EXPIRY,
        });
        return { userId };
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

    it("returns auth_state_changed when email OTP ownership drifts to another verified user", async () => {
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
            firstName: "conflictemailuser",
        });
        await db.insert(emailTable).values({
            email: normalizeEmail(email),
            type: "primary",
            userId: conflictingUserId,
            isDeleted: false,
            emailReachability: null,
        });

        const verifyResponse = await authService.verifyEmailOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            email,
            sessionLifetimeDays: 90,
            now: currentNow,
        });

        expect(verifyResponse).toEqual({
            success: false,
            reason: "auth_state_changed",
        });
    }, 30000);

    it("returns auth_state_changed when phone OTP ownership drifts to another verified user", async () => {
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            firstName: "conflictphoneuser",
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

        const verifyResponse = await authService.verifyPhoneOtp({
            db,
            maxAttempt: 3,
            didWrite,
            code: authAttempt.code,
            phoneNumber,
            defaultCallingCode: "1",
            peppers: [process.env.PEPPERS!],
            sessionLifetimeDays: 90,
            now: currentNow,
        });

        expect(verifyResponse).toEqual({
            success: false,
            reason: "auth_state_changed",
        });
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

        const [destinationState] = await db
            .select()
            .from(otpEmailDestinationStateTable)
            .where(
                eq(otpEmailDestinationStateTable.email, normalizeEmail(email)),
            );

        expect(destinationState.consecutiveFailedVerifyAttempts).toBe(0);
        expect(destinationState.backoffUntil).toBeNull();
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            peppers: [process.env.PEPPERS!],
            sessionLifetimeDays: 90,
            now: currentNow,
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
            now: currentNow,
        });

        expect(secondResponse.success).toBe(true);

        const [updatedAttempt] = await db
            .select({ phoneHash: authAttemptPhoneTable.phoneHash })
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));

        expect(updatedAttempt.phoneHash).not.toBe(firstAttempt.phoneHash);
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
                peppers: [process.env.PEPPERS!],
                sessionLifetimeDays: 90,
                now: currentNow,
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            testCode: 0,
            doUseTestCode: false,
            peppers: [process.env.PEPPERS!],
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
            peppers: [process.env.PEPPERS!],
            sessionLifetimeDays: 90,
            now: currentNow,
        });

        expect(successResponse.success).toBe(true);

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
});
