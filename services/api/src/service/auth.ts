import {
    codeToString,
    generateOneTimeCode,
    generateUUID,
    hashWithSalt,
    otpCodesEqual,
} from "@/crypto.js";
import { determineAuthType } from "./auth/core/stateHelpers.js";
import {
    checkEmailDeliverability,
    type ReacherIsReachable,
} from "@/service/emailVerification.js";
import type { AxiosInstance } from "axios";
import type { AuthResult } from "./auth/core/types.js";
import {
    authAttemptPhoneTable,
    authAttemptEmailTable,
    deviceTable,
    emailTable,
    otpEmailDestinationStateTable,
    otpPhoneDestinationStateTable,
    zkPassportTable,
    phoneTable,
    userTable,
    userDisplayLanguageTable,
    userSpokenLanguagesTable,
} from "@/shared-backend/schema.js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import { nowZeroMs } from "@/shared/util.js";
import type {
    AuthenticateRequestBody,
    AuthenticateResponse,
    AuthenticateEmailResponse,
    VerifyPhoneOtp200,
    VerifyOtp200,
} from "@/shared/types/dto-auth.js";
import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";
import type { ActivePhoneAuthMode } from "@/shared/types/phone-auth.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import {
    eq,
    and,
    TransactionRollbackError,
    gt,
    isNull,
    lt,
    lte,
    or,
    sql,
} from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import parsePhoneNumberFromString, {
    type CountryCode,
} from "libphonenumber-js/max";
import { config, log } from "@/app.js";
import { PEPPER_VERSION, toUnionUndefined } from "@/shared/shared.js";
import { httpErrors } from "@fastify/sensible";
import { generateUnusedRandomUsername } from "./account.js";
import * as authUtilService from "@/service/authUtil.js";
import { z } from "zod";
import { isPhoneNumberTypeSupported } from "@/shared-app-api/phone.js";
import { base64Decode, base64Encode } from "@/shared-app-api/base64.js";
import { mergeGuestIntoVerifiedUser } from "./merge.js";
import { sendOtpEmail } from "./email.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { startHardAuthSession } from "./authSession.js";
import { ensureAddEmailSecurityNotification } from "./notification.js";
import { decideDestinationWrongGuess } from "./auth/otpPolicy.js";
import { randomInt } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { isBlockedPhoneNumber } from "./blockedPhoneNumber.js";
import type { PhoneSmsBudget } from "./phoneSmsBudget.js";
import { logApiError } from "@/logging/privacy.js";
import { restoreAccountAfterVerification } from "./accountRecovery.js";

const OTP_DESTINATION_STREAK_RESET_MS = 24 * 60 * 60 * 1000;

interface OtpDestinationStateRecord {
    lastOtpSentAt: Date;
    consecutiveFailedVerifyAttempts: number;
    backoffUntil: Date | null;
    updatedAt: Date;
}

function buildNextCodeSoonestTime({
    now,
    throttleSecondsInterval,
}: {
    now: Date;
    throttleSecondsInterval: number;
}): Date {
    const nextCodeSoonestTime = new Date(now);
    nextCodeSoonestTime.setSeconds(
        nextCodeSoonestTime.getSeconds() + throttleSecondsInterval,
    );
    return nextCodeSoonestTime;
}

function getEffectiveOtpDestinationState({
    state,
    now,
}: {
    state: OtpDestinationStateRecord | null;
    now: Date;
}): OtpDestinationStateRecord | null {
    if (state === null) {
        return null;
    }
    if (
        now.getTime() - state.updatedAt.getTime() <
        OTP_DESTINATION_STREAK_RESET_MS
    ) {
        return state;
    }
    return {
        ...state,
        consecutiveFailedVerifyAttempts: 0,
        backoffUntil: null,
    };
}

function getOtpDestinationThrottleUntil({
    state,
    now,
    throttleSecondsInterval,
}: {
    state: OtpDestinationStateRecord | null;
    now: Date;
    throttleSecondsInterval: number;
}): Date | null {
    if (state === null) {
        return null;
    }

    const resendThrottleUntil = buildNextCodeSoonestTime({
        now: state.lastOtpSentAt,
        throttleSecondsInterval,
    });

    let throttleUntil = resendThrottleUntil;
    if (
        state.backoffUntil !== null &&
        state.backoffUntil.getTime() > throttleUntil.getTime()
    ) {
        throttleUntil = state.backoffUntil;
    }

    if (throttleUntil.getTime() <= now.getTime()) {
        return null;
    }
    return throttleUntil;
}

function buildPhoneAuthenticateThrottledResponse(
    nextCodeSoonestTime: Date,
): AuthenticateResponse {
    return {
        success: false,
        reason: "throttled",
        nextCodeSoonestTime,
    };
}

function buildEmailAuthenticateThrottledResponse(
    nextCodeSoonestTime: Date,
): AuthenticateEmailResponse {
    return {
        success: false,
        reason: "throttled",
        nextCodeSoonestTime,
    };
}

type EmailOtpDeliverabilityResult =
    | {
          deliverable: true;
          emailReachability: ReacherIsReachable | null;
      }
    | {
          deliverable: false;
          response: AuthenticateEmailResponse;
      };

async function checkEmailOtpDeliverability({
    axiosReacher,
    email,
}: {
    axiosReacher: AxiosInstance | undefined;
    email: string;
}): Promise<EmailOtpDeliverabilityResult> {
    if (axiosReacher === undefined) {
        return {
            deliverable: true,
            emailReachability: null,
        };
    }

    const deliverability = await checkEmailDeliverability({
        axiosReacher,
        email,
    });

    if (!deliverability.deliverable) {
        return {
            deliverable: false,
            response: {
                success: false,
                reason: deliverability.reason,
            },
        };
    }

    return {
        deliverable: true,
        emailReachability: deliverability.isReachable,
    };
}

function buildTooManyWrongGuessResponse(nextCodeSoonestTime: Date): {
    success: false;
    reason: "too_many_wrong_guess";
    nextCodeSoonestTime: Date;
} {
    return {
        success: false,
        reason: "too_many_wrong_guess",
        nextCodeSoonestTime,
    };
}

async function finalizeVerifiedPhoneOtp({
    recoverAccount,
    db,
    didWrite,
    resultOtp,
    now,
    maxAttempt,
    phoneAuthMode,
    delivery,
    sessionLifetimeDays,
    currentDisplayLanguage,
}: {
    recoverAccount: boolean;
    db: PostgresDatabase;
    didWrite: string;
    resultOtp: {
        userId: string;
        lastTwoDigits: number;
        phoneCountryCode: CountryCode | null;
        countryCallingCode: string;
        phoneHash: string;
        pepperVersion: number;
        userAgent: string;
        authType: AuthenticateType;
        code: number;
        codeExpiry: Date;
    };
    now: Date;
    maxAttempt: number;
    phoneAuthMode: ActivePhoneAuthMode;
    delivery: PhoneOtpDelivery;
    sessionLifetimeDays: number;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<VerifyPhoneOtp200> {
    return await db.transaction(async (tx) => {
        if (
            resultOtp.authType === "register" &&
            (phoneAuthMode !== "enabled" ||
                (delivery.type === "twilio" &&
                    !(await delivery.budget.canRegister({ db: tx }))))
        ) {
            return { success: false, reason: "phone_registration_unavailable" };
        }
        const claimedChallenge = await tx
            .update(authAttemptPhoneTable)
            .set({ codeExpiry: now, updatedAt: now })
            .where(
                and(
                    eq(authAttemptPhoneTable.didWrite, didWrite),
                    eq(authAttemptPhoneTable.phoneHash, resultOtp.phoneHash),
                    eq(authAttemptPhoneTable.code, resultOtp.code),
                    eq(authAttemptPhoneTable.codeExpiry, resultOtp.codeExpiry),
                    gt(authAttemptPhoneTable.codeExpiry, now),
                    lt(authAttemptPhoneTable.guessAttemptAmount, maxAttempt),
                ),
            )
            .returning({ didWrite: authAttemptPhoneTable.didWrite });
        if (claimedChallenge.length === 0) {
            return { success: false, reason: "expired_code" };
        }

        if (
            await isBlockedPhoneNumber({
                db: tx,
                phoneHash: resultOtp.phoneHash,
                pepperVersion: resultOtp.pepperVersion,
            })
        ) {
            return { success: false, reason: "verification_failed" };
        }

        await resetPhoneOtpDestinationState({
            db: tx,
            phoneHash: resultOtp.phoneHash,
            now,
        });

        const deviceStatus = await authUtilService.getDeviceStatus({
            db: tx,
            didWrite,
            now,
        });
        const authResult = await getPhoneAuthenticationTypeByHash({
            db: tx,
            phoneHash: resultOtp.phoneHash,
            deviceStatus,
        });

        if (authResult.type === "restore_deleted") {
            if (!recoverAccount)
                return { success: false, reason: "recovery_required" };
            if (
                resultOtp.authType !== "restore_deleted" ||
                resultOtp.userId !== authResult.userId
            )
                return { success: false, reason: "verification_failed" };
            return await restoreAccountAfterVerification({
                db: tx,
                userId: authResult.userId,
                didWrite,
                userAgent: resultOtp.userAgent,
                sessionLifetimeDays,
                proof: { method: "phone", phoneHash: resultOtp.phoneHash },
            });
        }
        if (recoverAccount)
            return { success: false, reason: "recovery_unavailable" };

        if (authResult.type === "associated_with_another_user") {
            return { success: false, reason: "verification_failed" };
        }

        if (resultOtp.authType !== authResult.type) {
            const currentUserId =
                authResult.type === "merge"
                    ? authResult.toUserId
                    : authResult.userId;
            log.error(
                {
                    didWrite,
                    storedType: resultOtp.authType,
                    currentType: authResult.type,
                    storedUserId: resultOtp.userId,
                    currentUserId,
                },
                "[Phone] Authentication type changed during OTP flow - rejecting for safety",
            );
            return { success: false, reason: "verification_failed" };
        }

        if (authResult.type !== "register") {
            const currentUserId =
                authResult.type === "merge"
                    ? authResult.toUserId
                    : authResult.userId;
            if (resultOtp.userId !== currentUserId) {
                log.error(
                    {
                        didWrite,
                        storedUserId: resultOtp.userId,
                        currentUserId,
                    },
                    "[Phone] User ID changed during OTP flow - rejecting for safety",
                );
                return { success: false, reason: "verification_failed" };
            }
        }

        return await registerOrLoginWithPhoneNumber({
            ...(authResult.type === "register"
                ? { ...authResult, userId: resultOtp.userId }
                : authResult),
            db: tx,
            didWrite,
            lastTwoDigits: resultOtp.lastTwoDigits,
            countryCallingCode: resultOtp.countryCallingCode,
            phoneCountryCode: toUnionUndefined(resultOtp.phoneCountryCode),
            phoneHash: resultOtp.phoneHash,
            pepperVersion: resultOtp.pepperVersion,
            userAgent: resultOtp.userAgent,
            now,
            phoneAuthMode,
            sessionLifetimeDays,
            currentDisplayLanguage,
        });
    });
}

async function finalizeVerifiedEmailOtp({
    recoverAccount,
    db,
    didWrite,
    resultOtp,
    now,
    maxAttempt,
    sessionLifetimeDays,
    currentDisplayLanguage,
}: {
    recoverAccount: boolean;
    db: PostgresDatabase;
    didWrite: string;
    resultOtp: {
        userId: string;
        email: string;
        userAgent: string;
        authType: AuthenticateType;
        emailReachability: ReacherIsReachable | null;
        code: number;
        codeExpiry: Date;
    };
    now: Date;
    maxAttempt: number;
    sessionLifetimeDays: number;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<VerifyOtp200> {
    return await db.transaction(async (tx) => {
        const claimedChallenge = await tx
            .update(authAttemptEmailTable)
            .set({ codeExpiry: now, updatedAt: now })
            .where(
                and(
                    eq(authAttemptEmailTable.didWrite, didWrite),
                    eq(authAttemptEmailTable.email, resultOtp.email),
                    eq(authAttemptEmailTable.code, resultOtp.code),
                    eq(authAttemptEmailTable.codeExpiry, resultOtp.codeExpiry),
                    gt(authAttemptEmailTable.codeExpiry, now),
                    lt(authAttemptEmailTable.guessAttemptAmount, maxAttempt),
                ),
            )
            .returning({ didWrite: authAttemptEmailTable.didWrite });
        if (claimedChallenge.length === 0) {
            return { success: false, reason: "expired_code" };
        }

        await resetEmailOtpDestinationState({
            db: tx,
            canonicalEmail: resultOtp.email,
            now,
        });

        const deviceStatus = await authUtilService.getDeviceStatus({
            db: tx,
            didWrite,
            now,
        });
        const authResult = await getEmailAuthTypeWithDeviceStatus({
            db: tx,
            email: resultOtp.email,
            deviceStatus,
        });

        if (authResult.type === "restore_deleted") {
            if (!recoverAccount)
                return { success: false, reason: "recovery_required" };
            if (
                resultOtp.authType !== "restore_deleted" ||
                resultOtp.userId !== authResult.userId
            )
                return { success: false, reason: "verification_failed" };
            return await restoreAccountAfterVerification({
                db: tx,
                userId: authResult.userId,
                didWrite,
                userAgent: resultOtp.userAgent,
                sessionLifetimeDays,
                proof: { method: "email", email: resultOtp.email },
            });
        }
        if (recoverAccount)
            return { success: false, reason: "recovery_unavailable" };

        if (authResult.type === "associated_with_another_user") {
            return { success: false, reason: "verification_failed" };
        }

        if (resultOtp.authType !== authResult.type) {
            const currentUserId =
                authResult.type === "merge"
                    ? authResult.toUserId
                    : authResult.userId;
            log.error(
                {
                    didWrite,
                    storedType: resultOtp.authType,
                    currentType: authResult.type,
                    storedUserId: resultOtp.userId,
                    currentUserId,
                },
                "[Email] Authentication type changed during OTP flow - rejecting for safety",
            );
            return { success: false, reason: "verification_failed" };
        }

        if (authResult.type !== "register") {
            const currentUserId =
                authResult.type === "merge"
                    ? authResult.toUserId
                    : authResult.userId;
            if (resultOtp.userId !== currentUserId) {
                log.error(
                    {
                        didWrite,
                        storedUserId: resultOtp.userId,
                        currentUserId,
                    },
                    "[Email] User ID changed during OTP flow - rejecting for safety",
                );
                return { success: false, reason: "verification_failed" };
            }
        }

        return await registerOrLoginWithEmail({
            ...(authResult.type === "register"
                ? { ...authResult, userId: resultOtp.userId }
                : authResult),
            db: tx,
            didWrite,
            email: resultOtp.email,
            userAgent: resultOtp.userAgent,
            now,
            sessionLifetimeDays,
            emailReachability: resultOtp.emailReachability,
            currentDisplayLanguage,
        });
    });
}

interface VerifyOtpProps {
    recoverAccount?: boolean;
    db: PostgresDatabase;
    maxAttempt: number;
    didWrite: string;
    code: number;
    phoneNumber: string;
    defaultCallingCode: string;
    phoneAuth: PhoneAuth;
    peppers: string[];
    sessionLifetimeDays: number;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

interface LocalPhoneOtpDelivery {
    type: "local";
    testCode: number;
    speciallyAuthorizedPhones: readonly string[];
}

interface TwilioPhoneOtpDelivery {
    type: "twilio";
    budget: PhoneSmsBudget;
    client: {
        verify: {
            v2: {
                services: (serviceSid: string) => {
                    verifications: {
                        create: (params: {
                            channel: "sms";
                            to: string;
                        }) => Promise<{
                            status: string;
                        }>;
                    };
                    verificationChecks: {
                        create: (params: {
                            code: string;
                            to: string;
                        }) => Promise<{
                            status: string;
                        }>;
                    };
                };
            };
        };
    };
    serviceSid: string;
}

export type PhoneOtpDelivery = LocalPhoneOtpDelivery | TwilioPhoneOtpDelivery;

export type PhoneAuth =
    | { mode: "disabled" }
    | {
          mode: ActivePhoneAuthMode;
          delivery: PhoneOtpDelivery;
          minimumResponseTimeMs: number;
          responseJitterMs: number;
      };

async function applyPhoneAuthTimingProtection({
    phoneAuth,
    startedAt,
}: {
    phoneAuth: PhoneAuth;
    startedAt: number;
}): Promise<void> {
    if (phoneAuth.mode === "disabled") {
        return;
    }
    const jitter =
        phoneAuth.responseJitterMs === 0
            ? 0
            : randomInt(phoneAuth.responseJitterMs + 1);
    const remainingDelay =
        phoneAuth.minimumResponseTimeMs +
        jitter -
        (performance.now() - startedAt);
    if (remainingDelay > 0) {
        await sleep(remainingDelay);
    }
}

interface RegisterWithPhoneNumberProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    lastTwoDigits: number;
    countryCallingCode: string;
    phoneCountryCode?: CountryCode;
    phoneHash: string;
    pepperVersion: number;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

interface RegisterWithoutVerificationProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    userAgent: string;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

interface RegisterWithZKPProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    citizenship: string;
    nullifier: string;
    sex: string;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

interface LoginProps {
    db: PostgresDatabase;
    didWrite: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
}

interface LoginNewDeviceProps {
    db: PostgresDatabase;
    didWrite: string;
    userAgent: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
}

interface LoginNewDeviceWithZKPProps {
    db: PostgresDatabase;
    didWrite: string;
    userAgent: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
}

async function insertInitialLanguagePreferencesForNewUser({
    db,
    userId,
    currentDisplayLanguage,
    now,
}: {
    db: PostgresDatabase;
    userId: string;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    now: Date;
}): Promise<void> {
    await db.insert(userDisplayLanguageTable).values({
        userId,
        languageCode: currentDisplayLanguage,
        createdAt: now,
        updatedAt: now,
    });

    await db.insert(userSpokenLanguagesTable).values({
        userId,
        languageCode: currentDisplayLanguage,
        createdAt: now,
    });
}

export async function createUserWithInitialLanguagePreferencesIfMissing({
    db,
    userId,
    currentDisplayLanguage,
    now,
}: {
    db: PostgresDatabase;
    userId: string;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    now: Date;
}): Promise<boolean> {
    const username = await generateUnusedRandomUsername({ db });
    const insertedUser = await db
        .insert(userTable)
        .values({
            username,
            id: userId,
        })
        .onConflictDoNothing({ target: userTable.id })
        .returning({ id: userTable.id });

    if (insertedUser.length === 0) {
        return false;
    }

    await insertInitialLanguagePreferencesForNewUser({
        db,
        userId,
        currentDisplayLanguage,
        now,
    });
    return true;
}

interface GetPhoneAuthenticationTypeByHash {
    db: PostgresDatabase;
    phoneHash: string;
    deviceStatus: DeviceLoginStatusExtended;
}

interface GetZKPAuthenticationType {
    db: PostgresDatabase;
    nullifier: string;
    deviceStatus: DeviceLoginStatusExtended;
}

interface AuthenticateAttemptProps {
    db: PostgresDatabase;
    authenticateRequestBody: AuthenticateRequestBody;
    minutesBeforeSmsCodeExpiry: number;
    didWrite: string;
    userAgent: string;
    throttleSmsSecondsInterval: number;
    phoneAuth: PhoneAuth;
    peppers: string[];
    now: Date;
}

interface UpdateAuthAttemptCodeProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    minutesBeforeSmsCodeExpiry: number;
    didWrite: string;
    now: Date;
    authenticateRequestBody: AuthenticateRequestBody;
    throttleSmsSecondsInterval: number;
    phoneHash: string;
    delivery: PhoneOtpDelivery;
}

interface InsertAuthAttemptCodeProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    minutesBeforeSmsCodeExpiry: number;
    didWrite: string;
    now: Date;
    userAgent: string;
    authenticateRequestBody: AuthenticateRequestBody;
    throttleSmsSecondsInterval: number;
    phoneHash: string;
    delivery: PhoneOtpDelivery;
}

interface SendOtpPhoneNumberProps {
    db: PostgresDatabase;
    phoneNumber: string;
    phoneHash: string;
    pepperVersion: number;
    isRegistration: boolean;
    delivery: TwilioPhoneOtpDelivery;
}

interface RegisterOrLoginWithPhoneNumberBaseProps {
    db: PostgresTransaction;
    didWrite: string;
    lastTwoDigits: number;
    countryCallingCode: string;
    phoneCountryCode?: CountryCode;
    phoneHash: string;
    pepperVersion: number;
    userAgent: string;
    now: Date;
    phoneAuthMode: ActivePhoneAuthMode;
    sessionLifetimeDays: number;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

type RegisterOrLoginWithPhoneNumberProps =
    | (RegisterOrLoginWithPhoneNumberBaseProps & {
          type: "register" | "login_known_device" | "login_new_device";
          userId: string;
      })
    | (RegisterOrLoginWithPhoneNumberBaseProps & {
          type: "merge";
          toUserId: string;
          fromUserId: string;
      });

async function recordWrongPhoneOtpGuess({
    db,
    didWrite,
    challenge,
    maxAttempt,
    now,
    throttleSecondsInterval,
}: {
    db: PostgresDatabase;
    didWrite: string;
    challenge: {
        phoneHash: string;
        code: number;
        codeExpiry: Date;
    };
    maxAttempt: number;
    now: Date;
    throttleSecondsInterval: number;
}): Promise<
    | { type: "expired" }
    | { type: "wrong_guess" }
    | { type: "throttled"; nextCodeSoonestTime: Date }
> {
    return await db.transaction(async (tx) => {
        const encodedNow = sql.param(now, authAttemptPhoneTable.codeExpiry);
        const updated = await tx
            .update(authAttemptPhoneTable)
            .set({
                guessAttemptAmount: sql<number>`${authAttemptPhoneTable.guessAttemptAmount} + 1`,
                codeExpiry: sql<Date>`CASE WHEN ${authAttemptPhoneTable.guessAttemptAmount} + 1 >= ${maxAttempt} THEN ${encodedNow} ELSE ${authAttemptPhoneTable.codeExpiry} END`,
                updatedAt: now,
            })
            .where(
                and(
                    eq(authAttemptPhoneTable.didWrite, didWrite),
                    eq(authAttemptPhoneTable.phoneHash, challenge.phoneHash),
                    eq(authAttemptPhoneTable.code, challenge.code),
                    eq(authAttemptPhoneTable.codeExpiry, challenge.codeExpiry),
                    gt(authAttemptPhoneTable.codeExpiry, now),
                    lt(authAttemptPhoneTable.guessAttemptAmount, maxAttempt),
                ),
            )
            .returning({
                guessAttemptAmount: authAttemptPhoneTable.guessAttemptAmount,
            });
        if (updated.length !== 1) {
            return { type: "expired" };
        }

        const destinationRows = await tx
            .select({
                lastOtpSentAt: otpPhoneDestinationStateTable.lastOtpSentAt,
                wrongGuessAttemptAmount:
                    otpPhoneDestinationStateTable.wrongGuessAttemptAmount,
                consecutiveFailedVerifyAttempts:
                    otpPhoneDestinationStateTable.consecutiveFailedVerifyAttempts,
                backoffUntil: otpPhoneDestinationStateTable.backoffUntil,
                updatedAt: otpPhoneDestinationStateTable.updatedAt,
            })
            .from(otpPhoneDestinationStateTable)
            .where(
                eq(
                    otpPhoneDestinationStateTable.phoneHash,
                    challenge.phoneHash,
                ),
            )
            .for("update");
        const destinationState = destinationRows.at(0);
        const decision = decideDestinationWrongGuess({
            state: destinationState ?? {
                wrongGuessAttemptAmount: 0,
                consecutiveFailedVerifyAttempts: 0,
                backoffUntil: null,
                updatedAt: now,
            },
            now,
            maxWrongGuesses: maxAttempt,
            throttleSecondsInterval,
        });
        await tx
            .insert(otpPhoneDestinationStateTable)
            .values({
                phoneHash: challenge.phoneHash,
                lastOtpSentAt: destinationState?.lastOtpSentAt ?? now,
                ...decision.state,
            })
            .onConflictDoUpdate({
                target: otpPhoneDestinationStateTable.phoneHash,
                set: decision.state,
            });
        return decision.type === "throttled"
            ? {
                  type: "throttled",
                  nextCodeSoonestTime: decision.nextCodeSoonestTime,
              }
            : { type: "wrong_guess" };
    });
}

async function handleWrongPhoneOtpGuess({
    db,
    didWrite,
    challenge,
    maxAttempt,
    now,
}: {
    db: PostgresDatabase;
    didWrite: string;
    challenge: {
        phoneHash: string;
        code: number;
        codeExpiry: Date;
    };
    maxAttempt: number;
    now: Date;
}): Promise<VerifyPhoneOtp200> {
    const wrongGuessResult = await recordWrongPhoneOtpGuess({
        db,
        didWrite,
        challenge,
        maxAttempt,
        now,
        throttleSecondsInterval: config.THROTTLE_SMS_SECONDS_INTERVAL,
    });
    if (wrongGuessResult.type === "expired") {
        return { success: false, reason: "expired_code" };
    }
    if (wrongGuessResult.type === "throttled") {
        return buildTooManyWrongGuessResponse(
            wrongGuessResult.nextCodeSoonestTime,
        );
    }
    return { success: false, reason: "wrong_guess" };
}

async function registerOrLoginWithPhoneNumber(
    props: RegisterOrLoginWithPhoneNumberProps,
): Promise<VerifyPhoneOtp200> {
    const {
        db,
        type,
        didWrite,
        lastTwoDigits,
        countryCallingCode,
        phoneCountryCode,
        phoneHash,
        pepperVersion,
        userAgent,
        now,
    } = props;
    const loginSessionExpiry = new Date(now);
    loginSessionExpiry.setDate(
        loginSessionExpiry.getDate() + props.sessionLifetimeDays,
    );

    switch (type) {
        case "register": {
            if (props.phoneAuthMode !== "enabled") {
                return {
                    success: false,
                    reason: "phone_registration_unavailable",
                };
            }
            // Prevent duplicate credential: user must not already have an active phone
            const existingPhone = await db
                .select({ id: phoneTable.id })
                .from(phoneTable)
                .where(
                    and(
                        eq(phoneTable.userId, props.userId),
                        eq(phoneTable.isDeleted, false),
                    ),
                )
                .limit(1);
            if (existingPhone.length > 0) {
                log.warn(
                    { userId: props.userId },
                    "[Phone] User already has an active phone credential",
                );
                return {
                    success: false,
                    reason: "already_has_credential",
                };
            }
            await registerWithPhoneNumber({
                db,
                didWrite,
                lastTwoDigits: lastTwoDigits,
                countryCallingCode: countryCallingCode,
                phoneCountryCode: phoneCountryCode,
                phoneHash: phoneHash,
                pepperVersion: pepperVersion,
                userAgent: userAgent,
                userId: props.userId,
                now,
                sessionExpiry: loginSessionExpiry,
                currentDisplayLanguage: props.currentDisplayLanguage,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "login_known_device": {
            await loginKnownDevice({
                db,
                didWrite,
                userId: props.userId,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            await ensureAddEmailSecurityNotification({
                db,
                userId: props.userId,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "login_new_device": {
            await loginNewDevice({
                db,
                didWrite,
                userAgent: userAgent,
                userId: props.userId,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            await ensureAddEmailSecurityNotification({
                db,
                userId: props.userId,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "merge": {
            const { toUserId, fromUserId } = props;

            await mergeGuestIntoVerifiedUser({
                db,
                verifiedUserId: toUserId,
                guestUserId: fromUserId,
                now,
            });
            await startHardAuthSession({
                db,
                userId: toUserId,
                didWrite,
                transition: {
                    type: "guest_merge",
                },
                now,
                sessionExpiry: loginSessionExpiry,
            });
            await ensureAddEmailSecurityNotification({ db, userId: toUserId });
            log.info(
                { verifiedUserId: toUserId, guestUserId: fromUserId },
                "[Phone] Merged guest into verified user",
            );
            return {
                success: true,
                accountMerged: true,
                userId: toUserId,
            };
        }
    }
}

export async function verifyPhoneOtp(
    props: VerifyOtpProps,
): Promise<VerifyPhoneOtp200> {
    const startedAt = performance.now();
    try {
        return await verifyPhoneOtpWithoutTimingProtection(props);
    } finally {
        await applyPhoneAuthTimingProtection({
            phoneAuth: props.phoneAuth,
            startedAt,
        });
    }
}

async function verifyPhoneOtpWithoutTimingProtection({
    recoverAccount = false,
    db,
    maxAttempt,
    didWrite,
    code,
    phoneNumber,
    defaultCallingCode,
    phoneAuth,
    peppers,
    sessionLifetimeDays,
    currentDisplayLanguage,
    now: providedNow,
}: VerifyOtpProps): Promise<VerifyPhoneOtp200> {
    if (phoneAuth.mode === "disabled") {
        return {
            success: false,
            reason: "phone_auth_unavailable",
        };
    }

    const primaryDb = getPrimaryDatabase(db);
    const now = providedNow;
    const resultOtp = await primaryDb
        .select({
            userId: authAttemptPhoneTable.userId,
            lastTwoDigits: authAttemptPhoneTable.lastTwoDigits,
            phoneCountryCode: authAttemptPhoneTable.phoneCountryCode,
            countryCallingCode: authAttemptPhoneTable.countryCallingCode,
            phoneHash: authAttemptPhoneTable.phoneHash,
            pepperVersion: authAttemptPhoneTable.pepperVersion,
            userAgent: authAttemptPhoneTable.userAgent,
            authType: authAttemptPhoneTable.type,
            guessAttemptAmount: authAttemptPhoneTable.guessAttemptAmount,
            code: authAttemptPhoneTable.code,
            codeExpiry: authAttemptPhoneTable.codeExpiry,
            isSynthetic: authAttemptPhoneTable.isSynthetic,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    if (resultOtp.length === 0) {
        return { success: false, reason: "wrong_guess" };
    }
    const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, {
        defaultCallingCode,
    });
    if (!phoneNumberObj?.isValid()) {
        throw httpErrors.badRequest("Phone number cannot be parsed correctly");
    }
    const submittedPhoneHash = await generatePhoneHash({
        phoneNumber: phoneNumberObj.number,
        peppers,
        pepperVersion: PEPPER_VERSION,
    });
    if (submittedPhoneHash !== resultOtp[0].phoneHash) {
        return { success: false, reason: "wrong_guess" };
    }

    if (
        resultOtp[0].isSynthetic ||
        resultOtp[0].codeExpiry <= now ||
        resultOtp[0].guessAttemptAmount >= maxAttempt ||
        (await isBlockedPhoneNumber({
            db: primaryDb,
            phoneHash: submittedPhoneHash,
            pepperVersion: resultOtp[0].pepperVersion,
        }))
    ) {
        return await handleWrongPhoneOtpGuess({
            db: primaryDb,
            didWrite,
            challenge: resultOtp[0],
            maxAttempt,
            now,
        });
    }

    if (phoneAuth.delivery.type === "twilio") {
        const approved = await checkOtpPhoneNumber({
            code,
            phoneNumber: phoneNumberObj.number,
            delivery: phoneAuth.delivery,
        });
        if (!approved) {
            return await handleWrongPhoneOtpGuess({
                db: primaryDb,
                didWrite,
                challenge: resultOtp[0],
                maxAttempt,
                now,
            });
        }
    } else if (!otpCodesEqual({ a: resultOtp[0].code, b: code })) {
        return await handleWrongPhoneOtpGuess({
            db: primaryDb,
            didWrite,
            challenge: resultOtp[0],
            maxAttempt,
            now,
        });
    }
    return await finalizeVerifiedPhoneOtp({
        recoverAccount,
        db: primaryDb,
        didWrite,
        resultOtp: {
            ...resultOtp[0],
            authType: authenticateTypeSchema.parse(resultOtp[0].authType),
        },
        now,
        maxAttempt,
        phoneAuthMode: phoneAuth.mode,
        delivery: phoneAuth.delivery,
        sessionLifetimeDays,
        currentDisplayLanguage,
    });
}

// WARN: we assume the OTP was verified and atomically claimed before entry.
async function registerWithPhoneNumber({
    db,
    didWrite,
    now,
    lastTwoDigits,
    phoneCountryCode,
    countryCallingCode,
    phoneHash,
    pepperVersion,
    userAgent,
    userId,
    sessionExpiry,
    currentDisplayLanguage,
}: RegisterWithPhoneNumberProps): Promise<void> {
    log.info("Register with phone number");
    await db.transaction(async (tx) => {
        // The caller atomically claimed the OTP before registration.

        const wasUserCreated =
            await createUserWithInitialLanguagePreferencesIfMissing({
                db: tx,
                userId,
                currentDisplayLanguage,
                now,
            });

        if (wasUserCreated) {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "new_device",
                    userAgent,
                },
                now,
                sessionExpiry,
            });
        } else {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "credential_upgrade",
                },
                now,
                sessionExpiry,
            });
        }

        await tx.insert(phoneTable).values({
            userId: userId,
            lastTwoDigits: lastTwoDigits,
            phoneCountryCode: phoneCountryCode,
            countryCallingCode: countryCallingCode,
            pepperVersion: pepperVersion,
            phoneHash: phoneHash,
        });
        await ensureAddEmailSecurityNotification({ db: tx, userId });
    });
}

// Note: the device is assumed to be potentially already existing
// that is because the user controlling the device might send multiple requests
// to interact with the app, while it takes times to create the user
// so multiple concurrent requests can be made to create the user
// device is saved and associated with a new unverified user
export async function createGuestUser({
    db,
    didWrite,
    now,
    userAgent,
    currentDisplayLanguage,
}: RegisterWithoutVerificationProps): Promise<{
    userId: string;
    wasUserJustCreated: boolean;
}> {
    const userId = generateUUID();
    const loginSessionExpiry = new Date(now);
    try {
        return await db.transaction(async (tx) => {
            const username = await generateUnusedRandomUsername({ db: db });
            await tx.insert(userTable).values({
                username,
                id: userId,
            });
            const insertedDevice = await tx
                .insert(deviceTable)
                .values({
                    userId: userId,
                    didWrite: didWrite,
                    userAgent: userAgent,
                    sessionExpiry: loginSessionExpiry,
                })
                .onConflictDoNothing()
                .returning();
            if (insertedDevice.length === 0) {
                // might happen when a user clicks multiple times on votes for the first time
                tx.rollback(); // will throw
            }
            await insertInitialLanguagePreferencesForNewUser({
                db: tx,
                userId,
                currentDisplayLanguage,
                now,
            });
            return { userId: userId, wasUserJustCreated: true };
        });
    } catch (e) {
        if (e instanceof TransactionRollbackError) {
            const now = nowZeroMs();
            const deviceStatus = await authUtilService.getDeviceStatus({
                db,
                didWrite,
                now,
            });
            if (!deviceStatus.isKnown) {
                throw httpErrors.internalServerError(
                    "Rollback occurred for another reason than manually actioning it, or sync error: device was deleted immediately after having seen it existing",
                );
            }
            return { userId: deviceStatus.userId, wasUserJustCreated: false };
        }
        throw e;
    }
}

// Recovery system removed - deleted users are permanently deleted

export async function registerWithZKP({
    db,
    didWrite,
    now,
    citizenship,
    nullifier,
    sex,
    userAgent,
    userId,
    sessionExpiry,
    currentDisplayLanguage,
}: RegisterWithZKPProps): Promise<void> {
    log.info("Register with ZKP");
    await db.transaction(async (tx) => {
        const wasUserCreated =
            await createUserWithInitialLanguagePreferencesIfMissing({
                db: tx,
                userId,
                currentDisplayLanguage,
                now,
            });

        if (wasUserCreated) {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "new_device",
                    userAgent,
                },
                now,
                sessionExpiry,
            });
        } else {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "credential_upgrade",
                },
                now,
                sessionExpiry,
            });
        }

        await tx.insert(zkPassportTable).values({
            userId: userId,
            citizenship: citizenship,
            nullifier: nullifier,
            sex: sex,
        });
    });
}

// ! WARN we assume the OTP was verified for login new device at this point
export async function loginNewDevice({
    db,
    didWrite,
    userId,
    userAgent,
    now,
    sessionExpiry,
}: LoginNewDeviceProps) {
    log.info("Logging-in new device with phone number");
    await db.transaction(async (tx) => {
        await tx
            .update(authAttemptPhoneTable)
            .set({
                codeExpiry: now, // this is important to forbid further usage of the same code once it has been successfully guessed
                updatedAt: now,
            })
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        await startHardAuthSession({
            db: tx,
            userId,
            didWrite,
            transition: {
                type: "new_device",
                userAgent,
            },
            now,
            sessionExpiry,
        });
    });
}

// ! WARN we assume the OTP was verified for login new device at this point
export async function loginNewDeviceWithZKP({
    db,
    didWrite,
    userId,
    userAgent,
    now,
    sessionExpiry,
}: LoginNewDeviceWithZKPProps) {
    log.info("Logging-in new device with ZKP");
    await startHardAuthSession({
        db,
        userId,
        didWrite,
        transition: {
            type: "new_device",
            userAgent,
        },
        now,
        sessionExpiry,
    });
}

// ! WARN we assume the OTP was verified and the device is already syncing
export async function loginKnownDevice({
    db,
    didWrite,
    userId,
    now,
    sessionExpiry,
}: LoginProps) {
    log.info("Logging-in known device with phone number");
    await db.transaction(async (tx) => {
        await tx
            .update(authAttemptPhoneTable)
            .set({
                codeExpiry: now, // this is important to forbid further usage of the same code once it has been successfully guessed
                updatedAt: now,
            })
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        await startHardAuthSession({
            db: tx,
            userId,
            didWrite,
            transition: {
                type: "reauthentication",
            },
            now,
            sessionExpiry,
        });
    });
}

// ! WARN we assume the OTP was verified and the device is already syncing
export async function loginKnownDeviceWithZKP({
    db,
    didWrite,
    userId,
    now,
    sessionExpiry,
}: LoginProps) {
    log.info("Logging-in known device with ZKP");
    await startHardAuthSession({
        db,
        userId,
        didWrite,
        transition: {
            type: "reauthentication",
        },
        now,
        sessionExpiry,
    });
}

// !WARNING: manually update DB enum value if changing this
// TODO: automatically sync them - use one type only
const authenticateTypeSchema = z.enum([
    "restore_deleted",
    "register",
    "login_known_device",
    "login_new_device",
    "merge",
]);
export type AuthenticateType = z.infer<typeof authenticateTypeSchema>;

type DidAssociationStatus = "does_not_exist" | "associated" | "not_associated";

interface GetDidWriteAssociationWithPhoneProps {
    db: PostgresDatabase;
    didWrite: string;
    phoneHash: string;
}

interface GetDidWriteAssociationWithNullifierProps {
    db: PostgresDatabase;
    didWrite: string;
    nullifier: string;
}

export async function getDidWriteAssociationWithPhone({
    db,
    didWrite,
    phoneHash,
}: GetDidWriteAssociationWithPhoneProps): Promise<DidAssociationStatus> {
    const result = await db
        .select({
            phoneHash: phoneTable.phoneHash,
        })
        .from(deviceTable)
        .leftJoin(
            phoneTable,
            and(
                eq(phoneTable.userId, deviceTable.userId),
                eq(phoneTable.phoneHash, phoneHash),
            ),
        )
        .where(eq(deviceTable.didWrite, didWrite));
    if (result.length === 0) {
        return "does_not_exist";
    }
    const didAssociatedWithPhone = result.filter((r) => r.phoneHash !== null);
    if (didAssociatedWithPhone.length !== 0) {
        return "associated";
    } else {
        // This didWrite could be associated with another phone, or with a nullifer, or it could very well be dangling, though this is not permitted and enforced using checks in the DB.
        // This status cannot be known to the frontend unless the user owns the didWrite corresponding private key, because otherwise the HTTP request would return a 401 already.
        // The didWrite being public, this is an important privacy consideration: this mechanism protects against enumeration attacks.
        return "not_associated";
    }
}

export async function getDidWriteAssociationWithNullifier({
    db,
    didWrite,
    nullifier,
}: GetDidWriteAssociationWithNullifierProps): Promise<DidAssociationStatus> {
    const result = await db
        .select({
            nullifier: zkPassportTable.nullifier,
        })
        .from(deviceTable)
        .leftJoin(
            zkPassportTable,
            and(
                eq(zkPassportTable.userId, deviceTable.userId),
                eq(zkPassportTable.nullifier, nullifier),
            ),
        )
        .where(eq(deviceTable.didWrite, didWrite));
    if (result.length === 0) {
        return "does_not_exist";
    }
    const didAssociatedWithNullifier = result.filter(
        (r) => r.nullifier !== null,
    );
    if (didAssociatedWithNullifier.length !== 0) {
        return "associated";
    } else {
        // This didWrite could be associated with another nullifier, or with a phone, or it could very well be dangling, though this is not permitted and enforced using checks in the DB.
        // There is no need for specific protection against enumeration attacks here, since the nullifier itself is privacy-preserving, and publicly associated with the didWrite.
        return "not_associated";
    }
}

async function getPhoneAuthenticationTypeByHash({
    db,
    phoneHash,
    deviceStatus,
}: GetPhoneAuthenticationTypeByHash): Promise<AuthResult> {
    const phoneResults = await db
        .select({
            userId: phoneTable.userId,
            isDeleted: userTable.isDeleted,
        })
        .from(phoneTable)
        .innerJoin(userTable, eq(userTable.id, phoneTable.userId))
        .where(
            and(
                eq(phoneTable.phoneHash, phoneHash),
                or(
                    eq(phoneTable.isDeleted, false),
                    eq(phoneTable.reservedForRecovery, true),
                ),
            ),
        )
        .limit(1);

    return determineAuthType({
        credentialOwner: phoneResults.at(0),
        deviceStatus,
    });
}

export async function getZKPAuthenticationType({
    db,
    nullifier,
    deviceStatus,
}: GetZKPAuthenticationType): Promise<AuthResult> {
    const nullifierResults = await db
        .select({
            userId: zkPassportTable.userId,
            isDeleted: userTable.isDeleted,
        })
        .from(zkPassportTable)
        .innerJoin(userTable, eq(userTable.id, zkPassportTable.userId))
        .where(
            and(
                eq(zkPassportTable.nullifier, nullifier),
                or(
                    eq(zkPassportTable.isDeleted, false),
                    eq(zkPassportTable.reservedForRecovery, true),
                ),
            ),
        )
        .limit(1);

    return determineAuthType({
        credentialOwner: nullifierResults.at(0),
        deviceStatus,
    });
}

export async function authenticateAttempt(
    props: AuthenticateAttemptProps,
): Promise<AuthenticateResponse> {
    const startedAt = performance.now();
    try {
        return await authenticateAttemptWithoutTimingProtection(props);
    } finally {
        await applyPhoneAuthTimingProtection({
            phoneAuth: props.phoneAuth,
            startedAt,
        });
    }
}

async function authenticateAttemptWithoutTimingProtection({
    db,
    authenticateRequestBody,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    userAgent,
    throttleSmsSecondsInterval,
    phoneAuth,
    peppers,
    now: providedNow,
}: AuthenticateAttemptProps): Promise<AuthenticateResponse> {
    if (phoneAuth.mode === "disabled") {
        return {
            success: false,
            reason: "phone_auth_unavailable",
        };
    }

    const primaryDb = getPrimaryDatabase(db);
    const now = providedNow;
    const canonicalPhone = canonicalizeSupportedPhoneNumber({
        phoneNumber: authenticateRequestBody.phoneNumber,
        defaultCallingCode: authenticateRequestBody.defaultCallingCode,
    });
    if (!canonicalPhone.success) {
        return canonicalPhone.response;
    }
    const canonicalRequestBody = {
        ...authenticateRequestBody,
        phoneNumber: canonicalPhone.phoneNumber,
    };
    const requestedPhoneHash = await generatePhoneHash({
        phoneNumber: canonicalRequestBody.phoneNumber,
        peppers,
        pepperVersion: PEPPER_VERSION,
    });
    const deviceStatus = await authUtilService.getDeviceStatus({
        db: primaryDb,
        didWrite,
        now,
    });
    const authResult = await getPhoneAuthenticationTypeByHash({
        db: primaryDb,
        phoneHash: requestedPhoneHash,
        deviceStatus,
    });
    // Never disclose credential ownership before the caller proves phone control.
    const type: AuthenticateType =
        authResult.type === "associated_with_another_user"
            ? "register"
            : authResult.type;
    const userId =
        authResult.type === "merge" ? authResult.toUserId : authResult.userId;
    const blocked = await isBlockedPhoneNumber({
        db: primaryDb,
        phoneHash: requestedPhoneHash,
        pepperVersion: PEPPER_VERSION,
    });
    if (blocked || (phoneAuth.mode === "login_only" && type === "register")) {
        return await upsertSyntheticPhoneAuthAttempt({
            db: primaryDb,
            type: blocked ? "register" : type,
            userId,
            didWrite,
            now,
            userAgent,
            authenticateRequestBody: canonicalRequestBody,
            minutesBeforeCodeExpiry: minutesBeforeSmsCodeExpiry,
            throttleSecondsInterval: throttleSmsSecondsInterval,
            phoneHash: requestedPhoneHash,
        });
    }
    const resultHasAttempted = await primaryDb
        .select({
            codeExpiry: authAttemptPhoneTable.codeExpiry,
            phoneHash: authAttemptPhoneTable.phoneHash,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    if (resultHasAttempted.length === 0) {
        return await insertAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            userAgent,
            authenticateRequestBody: canonicalRequestBody,
            throttleSmsSecondsInterval,
            phoneHash: requestedPhoneHash,
            delivery: phoneAuth.delivery,
        });
    }

    const currentAttempt = resultHasAttempted[0];

    if (canonicalRequestBody.isRequestingNewCode) {
        // if user wants to regenerate new code, do it (if possible according to throttling rules)
        return await updateAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody: canonicalRequestBody,
            throttleSmsSecondsInterval,
            phoneHash: requestedPhoneHash,
            delivery: phoneAuth.delivery,
        });
    } else if (
        currentAttempt.codeExpiry > now &&
        currentAttempt.phoneHash === requestedPhoneHash
    ) {
        return {
            success: true,
            codeExpiry: currentAttempt.codeExpiry,
            nextCodeSoonestTime: await getPhoneOtpNextSendTime({
                db: primaryDb,
                phoneHash: requestedPhoneHash,
                now,
                throttleSecondsInterval: throttleSmsSecondsInterval,
            }),
        };
    } else {
        // Existing live attempts are only reusable for the same destination.
        // If the user changes the identifier mid-flow, rotate the attempt instead
        // of returning success for a stale OTP tied to a different destination.
        return await updateAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody: canonicalRequestBody,
            throttleSmsSecondsInterval,
            phoneHash: requestedPhoneHash,
            delivery: phoneAuth.delivery,
        });
    }
}

async function sendOtpPhoneNumber({
    db,
    phoneNumber,
    phoneHash,
    pepperVersion,
    isRegistration,
    delivery,
}: SendOtpPhoneNumberProps): Promise<void> {
    if (await isBlockedPhoneNumber({ db, phoneHash, pepperVersion })) {
        return;
    }
    const country = parsePhoneNumberFromString(phoneNumber)?.country;
    if (country === undefined) return;
    if (!(await delivery.budget.reserve({ isRegistration, country }))) return;
    const verification = await delivery.client.verify.v2
        .services(delivery.serviceSid)
        .verifications.create({
            channel: "sms",
            to: phoneNumber,
        });
    if (verification.status !== "pending") {
        throw httpErrors.internalServerError("Error while sending SMS");
    }
}

async function sendOtpPhoneNumberWithoutDisclosingFailure(
    props: SendOtpPhoneNumberProps,
): Promise<void> {
    try {
        await sendOtpPhoneNumber(props);
    } catch (error) {
        logApiError({
            logger: log,
            level: "error",
            event: { event: "application_error" },
            error,
        });
    }
}

function dispatchOtpPhoneNumber(props: SendOtpPhoneNumberProps): void {
    void sendOtpPhoneNumberWithoutDisclosingFailure(props);
}

async function checkOtpPhoneNumber({
    code,
    phoneNumber,
    delivery,
}: {
    code: number;
    phoneNumber: string;
    delivery: TwilioPhoneOtpDelivery;
}): Promise<boolean> {
    try {
        const verification = await delivery.client.verify.v2
            .services(delivery.serviceSid)
            .verificationChecks.create({
                code: codeToString(code),
                to: phoneNumber,
            });
        return verification.status === "approved";
    } catch (error) {
        logApiError({
            logger: log,
            level: "error",
            event: { event: "application_error" },
            error,
        });
        return false;
    }
}

interface GeneratePhoneHashProps {
    phoneNumber: string;
    peppers: string[];
    pepperVersion: number;
}

type CanonicalPhoneNumberResult =
    | { success: true; phoneNumber: string }
    | { success: false; response: AuthenticateResponse };

function canonicalizeSupportedPhoneNumber({
    phoneNumber,
    defaultCallingCode,
}: {
    phoneNumber: string;
    defaultCallingCode: string;
}): CanonicalPhoneNumberResult {
    const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, {
        defaultCallingCode,
    });
    if (!parsedPhoneNumber?.isValid()) {
        log.warn("Refused authentication request due to invalid phone number");
        return {
            success: false,
            response: { success: false, reason: "invalid_phone_number" },
        };
    }
    if (!isPhoneNumberTypeSupported(parsedPhoneNumber.getType())) {
        log.warn(
            `Phone number refused because its type is ${String(
                parsedPhoneNumber.getType(),
            )}`,
        );
        return {
            success: false,
            response: { success: false, reason: "restricted_phone_type" },
        };
    }
    return { success: true, phoneNumber: parsedPhoneNumber.number };
}

function isSpeciallyAuthorizedPhone({
    phoneNumber,
    speciallyAuthorizedPhones,
}: {
    phoneNumber: string;
    speciallyAuthorizedPhones: readonly string[];
}): boolean {
    return speciallyAuthorizedPhones.some((authorizedPhone) => {
        const parsedAuthorizedPhone =
            parsePhoneNumberFromString(authorizedPhone);
        return (
            parsedAuthorizedPhone?.isValid() === true &&
            parsedAuthorizedPhone.number === phoneNumber
        );
    });
}

async function generatePhoneHash({
    phoneNumber,
    peppers,
    pepperVersion,
}: GeneratePhoneHashProps): Promise<string> {
    const pepper = base64Decode(peppers[pepperVersion]); // we don't rotate peppers yet
    const hash = await hashWithSalt({
        value: phoneNumber,
        salt: pepper,
    });
    const phoneHash = base64Encode(hash);
    return phoneHash;
}

async function getPhoneOtpDestinationState({
    db,
    phoneHash,
}: {
    db: PostgresDatabase;
    phoneHash: string;
}): Promise<OtpDestinationStateRecord | null> {
    const result = await db
        .select({
            lastOtpSentAt: otpPhoneDestinationStateTable.lastOtpSentAt,
            consecutiveFailedVerifyAttempts:
                otpPhoneDestinationStateTable.consecutiveFailedVerifyAttempts,
            backoffUntil: otpPhoneDestinationStateTable.backoffUntil,
            updatedAt: otpPhoneDestinationStateTable.updatedAt,
        })
        .from(otpPhoneDestinationStateTable)
        .where(eq(otpPhoneDestinationStateTable.phoneHash, phoneHash))
        .limit(1);
    return result[0] ?? null;
}

async function getEmailOtpDestinationState({
    db,
    canonicalEmail,
}: {
    db: PostgresDatabase;
    canonicalEmail: string;
}): Promise<OtpDestinationStateRecord | null> {
    const result = await db
        .select({
            lastOtpSentAt: otpEmailDestinationStateTable.lastOtpSentAt,
            consecutiveFailedVerifyAttempts:
                otpEmailDestinationStateTable.consecutiveFailedVerifyAttempts,
            backoffUntil: otpEmailDestinationStateTable.backoffUntil,
            updatedAt: otpEmailDestinationStateTable.updatedAt,
        })
        .from(otpEmailDestinationStateTable)
        .where(eq(otpEmailDestinationStateTable.email, canonicalEmail))
        .limit(1);
    return result[0] ?? null;
}

async function reservePhoneOtpSend({
    db,
    phoneHash,
    now,
    throttleSecondsInterval,
}: {
    db: PostgresDatabase;
    phoneHash: string;
    now: Date;
    throttleSecondsInterval: number;
}): Promise<Date | null> {
    const resendAllowedBefore = new Date(
        now.getTime() - throttleSecondsInterval * 1000,
    );
    const streakResetBefore = new Date(
        now.getTime() - OTP_DESTINATION_STREAK_RESET_MS,
    );
    const encodedStreakResetBefore = sql.param(
        streakResetBefore,
        otpPhoneDestinationStateTable.updatedAt,
    );
    const reserved = await db
        .insert(otpPhoneDestinationStateTable)
        .values({
            phoneHash,
            lastOtpSentAt: now,
            consecutiveFailedVerifyAttempts: 0,
            backoffUntil: null,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: otpPhoneDestinationStateTable.phoneHash,
            set: {
                lastOtpSentAt: now,
                consecutiveFailedVerifyAttempts: sql<number>`CASE WHEN ${otpPhoneDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN 0 ELSE ${otpPhoneDestinationStateTable.consecutiveFailedVerifyAttempts} END`,
                wrongGuessAttemptAmount: sql<number>`CASE WHEN ${otpPhoneDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN 0 ELSE ${otpPhoneDestinationStateTable.wrongGuessAttemptAmount} END`,
                backoffUntil: sql<Date | null>`CASE WHEN ${otpPhoneDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN NULL ELSE ${otpPhoneDestinationStateTable.backoffUntil} END`,
                updatedAt: now,
            },
            setWhere: and(
                lte(
                    otpPhoneDestinationStateTable.lastOtpSentAt,
                    resendAllowedBefore,
                ),
                or(
                    lte(
                        otpPhoneDestinationStateTable.updatedAt,
                        streakResetBefore,
                    ),
                    isNull(otpPhoneDestinationStateTable.backoffUntil),
                    lte(otpPhoneDestinationStateTable.backoffUntil, now),
                ),
            ),
        })
        .returning({ phoneHash: otpPhoneDestinationStateTable.phoneHash });
    if (reserved.length > 0) {
        return null;
    }

    const state = getEffectiveOtpDestinationState({
        state: await getPhoneOtpDestinationState({ db, phoneHash }),
        now,
    });
    return (
        getOtpDestinationThrottleUntil({
            state,
            now,
            throttleSecondsInterval,
        }) ?? buildNextCodeSoonestTime({ now, throttleSecondsInterval })
    );
}

async function getPhoneOtpNextSendTime({
    db,
    phoneHash,
    now,
    throttleSecondsInterval,
}: {
    db: PostgresDatabase;
    phoneHash: string;
    now: Date;
    throttleSecondsInterval: number;
}): Promise<Date> {
    const state = getEffectiveOtpDestinationState({
        state: await getPhoneOtpDestinationState({ db, phoneHash }),
        now,
    });
    return (
        getOtpDestinationThrottleUntil({
            state,
            now,
            throttleSecondsInterval,
        }) ?? buildNextCodeSoonestTime({ now, throttleSecondsInterval })
    );
}

async function reserveEmailOtpSend({
    db,
    canonicalEmail,
    now,
    throttleSecondsInterval,
}: {
    db: PostgresDatabase;
    canonicalEmail: string;
    now: Date;
    throttleSecondsInterval: number;
}): Promise<Date | null> {
    const resendAllowedBefore = new Date(
        now.getTime() - throttleSecondsInterval * 1000,
    );
    const streakResetBefore = new Date(
        now.getTime() - OTP_DESTINATION_STREAK_RESET_MS,
    );
    const encodedStreakResetBefore = sql.param(
        streakResetBefore,
        otpEmailDestinationStateTable.updatedAt,
    );
    const reserved = await db
        .insert(otpEmailDestinationStateTable)
        .values({
            email: canonicalEmail,
            lastOtpSentAt: now,
            consecutiveFailedVerifyAttempts: 0,
            backoffUntil: null,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: otpEmailDestinationStateTable.email,
            set: {
                lastOtpSentAt: now,
                consecutiveFailedVerifyAttempts: sql<number>`CASE WHEN ${otpEmailDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN 0 ELSE ${otpEmailDestinationStateTable.consecutiveFailedVerifyAttempts} END`,
                wrongGuessAttemptAmount: sql<number>`CASE WHEN ${otpEmailDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN 0 ELSE ${otpEmailDestinationStateTable.wrongGuessAttemptAmount} END`,
                backoffUntil: sql<Date | null>`CASE WHEN ${otpEmailDestinationStateTable.updatedAt} <= ${encodedStreakResetBefore} THEN NULL ELSE ${otpEmailDestinationStateTable.backoffUntil} END`,
                updatedAt: now,
            },
            setWhere: and(
                lte(
                    otpEmailDestinationStateTable.lastOtpSentAt,
                    resendAllowedBefore,
                ),
                or(
                    lte(
                        otpEmailDestinationStateTable.updatedAt,
                        streakResetBefore,
                    ),
                    isNull(otpEmailDestinationStateTable.backoffUntil),
                    lte(otpEmailDestinationStateTable.backoffUntil, now),
                ),
            ),
        })
        .returning({ email: otpEmailDestinationStateTable.email });
    if (reserved.length > 0) {
        return null;
    }

    const state = getEffectiveOtpDestinationState({
        state: await getEmailOtpDestinationState({ db, canonicalEmail }),
        now,
    });
    return (
        getOtpDestinationThrottleUntil({
            state,
            now,
            throttleSecondsInterval,
        }) ?? buildNextCodeSoonestTime({ now, throttleSecondsInterval })
    );
}

async function resetPhoneOtpDestinationState({
    db,
    phoneHash,
    now,
}: {
    db: PostgresDatabase;
    phoneHash: string;
    now: Date;
}) {
    await db
        .update(otpPhoneDestinationStateTable)
        .set({
            consecutiveFailedVerifyAttempts: 0,
            wrongGuessAttemptAmount: 0,
            backoffUntil: null,
            updatedAt: now,
        })
        .where(eq(otpPhoneDestinationStateTable.phoneHash, phoneHash));
}

async function resetEmailOtpDestinationState({
    db,
    canonicalEmail,
    now,
}: {
    db: PostgresDatabase;
    canonicalEmail: string;
    now: Date;
}) {
    await db
        .update(otpEmailDestinationStateTable)
        .set({
            consecutiveFailedVerifyAttempts: 0,
            wrongGuessAttemptAmount: 0,
            backoffUntil: null,
            updatedAt: now,
        })
        .where(eq(otpEmailDestinationStateTable.email, canonicalEmail));
}

async function insertAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    now,
    userAgent,
    authenticateRequestBody,
    throttleSmsSecondsInterval,
    phoneHash,
    delivery,
}: InsertAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    const throttleUntil = await reservePhoneOtpSend({
        db,
        phoneHash,
        now,
        throttleSecondsInterval: throttleSmsSecondsInterval,
    });
    if (throttleUntil !== null) {
        return buildPhoneAuthenticateThrottledResponse(throttleUntil);
    }
    const oneTimeCode =
        delivery.type === "local" &&
        isSpeciallyAuthorizedPhone({
            phoneNumber: authenticateRequestBody.phoneNumber,
            speciallyAuthorizedPhones: delivery.speciallyAuthorizedPhones,
        })
            ? delivery.testCode
            : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeSmsCodeExpiry);
    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        {
            defaultCallingCode: authenticateRequestBody.defaultCallingCode,
        },
    );
    if (!phoneNumber?.isValid()) {
        log.warn("Refused authentication request due to invalid phone number");
        return {
            success: false,
            reason: "invalid_phone_number",
        };
    }
    if (isPhoneNumberTypeSupported(phoneNumber.getType())) {
        log.info(
            // TODO: consider moving this to DEBUG logging level
            `Phone number accepted because its type is ${String(
                phoneNumber.getType(),
            )}`,
        );
    } else {
        log.warn(
            `Phone number refused because its type is ${String(
                phoneNumber.getType(),
            )}`,
        );
        return {
            success: false,
            reason: "restricted_phone_type",
        };
    }
    const phoneCountryCode = phoneNumber.country;
    const countryCallingCode = phoneNumber.countryCallingCode;
    const lastTwoDigits = phoneNumber.number.slice(-2);
    await db.insert(authAttemptPhoneTable).values({
        didWrite: didWrite,
        type: type,
        lastTwoDigits: parseInt(lastTwoDigits),
        countryCallingCode: countryCallingCode,
        phoneCountryCode: phoneCountryCode,
        phoneHash: phoneHash,
        pepperVersion: PEPPER_VERSION,
        userId: userId,
        userAgent: userAgent,
        code: oneTimeCode,
        codeExpiry: codeExpiry,
        lastOtpSentAt: now,
    });
    if (delivery.type === "twilio") {
        dispatchOtpPhoneNumber({
            db,
            phoneNumber: phoneNumber.number,
            phoneHash,
            pepperVersion: PEPPER_VERSION,
            isRegistration: type === "register",
            delivery,
        });
    }
    const nextCodeSoonestTime = buildNextCodeSoonestTime({
        now,
        throttleSecondsInterval: throttleSmsSecondsInterval,
    });
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

async function upsertSyntheticPhoneAuthAttempt({
    db,
    type,
    userId,
    didWrite,
    now,
    userAgent,
    authenticateRequestBody,
    minutesBeforeCodeExpiry,
    throttleSecondsInterval,
    phoneHash,
}: {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    didWrite: string;
    now: Date;
    userAgent: string;
    authenticateRequestBody: AuthenticateRequestBody;
    minutesBeforeCodeExpiry: number;
    throttleSecondsInterval: number;
    phoneHash: string;
}): Promise<AuthenticateResponse> {
    const currentAttempts = await db
        .select({
            phoneHash: authAttemptPhoneTable.phoneHash,
            codeExpiry: authAttemptPhoneTable.codeExpiry,
            isSynthetic: authAttemptPhoneTable.isSynthetic,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite))
        .limit(1);
    const currentAttempt = currentAttempts.at(0);
    if (
        !authenticateRequestBody.isRequestingNewCode &&
        currentAttempt?.isSynthetic &&
        currentAttempt.phoneHash === phoneHash &&
        currentAttempt.codeExpiry > now
    ) {
        return {
            success: true,
            codeExpiry: currentAttempt.codeExpiry,
            nextCodeSoonestTime: await getPhoneOtpNextSendTime({
                db,
                phoneHash,
                now,
                throttleSecondsInterval,
            }),
        };
    }

    const throttleUntil = await reservePhoneOtpSend({
        db,
        phoneHash,
        now,
        throttleSecondsInterval,
    });
    if (throttleUntil !== null) {
        return buildPhoneAuthenticateThrottledResponse(throttleUntil);
    }

    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        { defaultCallingCode: authenticateRequestBody.defaultCallingCode },
    );
    if (!phoneNumber?.isValid()) {
        return { success: false, reason: "invalid_phone_number" };
    }
    const possibleCountries = phoneNumber.getPossibleCountries();
    const phoneCountryCode = phoneNumber.country ?? possibleCountries[0];
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeCodeExpiry);
    const challengeValues = {
        type,
        lastTwoDigits: Number(phoneNumber.number.slice(-2)),
        countryCallingCode: phoneNumber.countryCallingCode,
        phoneCountryCode,
        phoneHash,
        pepperVersion: PEPPER_VERSION,
        userId,
        userAgent,
        code: generateOneTimeCode(),
        codeExpiry,
        guessAttemptAmount: 0,
        isSynthetic: true,
        lastOtpSentAt: now,
        updatedAt: now,
    };
    await db
        .insert(authAttemptPhoneTable)
        .values({ didWrite, ...challengeValues })
        .onConflictDoUpdate({
            target: authAttemptPhoneTable.didWrite,
            set: challengeValues,
        });
    return {
        success: true,
        codeExpiry,
        nextCodeSoonestTime: buildNextCodeSoonestTime({
            now,
            throttleSecondsInterval,
        }),
    };
}

async function updateAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    now,
    authenticateRequestBody,
    throttleSmsSecondsInterval,
    phoneHash,
    delivery,
}: UpdateAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    const throttleUntil = await reservePhoneOtpSend({
        db,
        phoneHash,
        now,
        throttleSecondsInterval: throttleSmsSecondsInterval,
    });
    if (throttleUntil !== null) {
        return buildPhoneAuthenticateThrottledResponse(throttleUntil);
    }
    const currentAttempt = await db
        .select({
            phoneHash: authAttemptPhoneTable.phoneHash,
            code: authAttemptPhoneTable.code,
            codeExpiry: authAttemptPhoneTable.codeExpiry,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite))
        .limit(1);
    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        {
            defaultCallingCode: authenticateRequestBody.defaultCallingCode,
        },
    );
    if (!phoneNumber?.isValid()) {
        log.warn("Refused authentication request due to invalid phone number");
        return {
            success: false,
            reason: "invalid_phone_number",
        };
    }
    if (!isPhoneNumberTypeSupported(phoneNumber.getType())) {
        log.warn(
            `Phone number refused because its type is ${String(
                phoneNumber.getType(),
            )}`,
        );
        return {
            success: false,
            reason: "restricted_phone_type",
        };
    }
    const phoneCountryCode = phoneNumber.country;
    const countryCallingCode = phoneNumber.countryCallingCode;
    const lastTwoDigits = phoneNumber.number.slice(-2);
    const canReuseExistingCode =
        currentAttempt.length > 0 &&
        currentAttempt[0].phoneHash === phoneHash &&
        currentAttempt[0].codeExpiry.getTime() > now.getTime();

    if (canReuseExistingCode) {
        await db
            .update(authAttemptPhoneTable)
            .set({
                userId: userId,
                type: type,
                lastTwoDigits: parseInt(lastTwoDigits),
                countryCallingCode: countryCallingCode,
                phoneCountryCode: phoneCountryCode,
                phoneHash: phoneHash,
                pepperVersion: PEPPER_VERSION,
                code:
                    delivery.type === "twilio"
                        ? generateOneTimeCode()
                        : currentAttempt[0].code,
                isSynthetic: false,
                lastOtpSentAt: now,
                updatedAt: now,
            })
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        if (delivery.type === "twilio") {
            dispatchOtpPhoneNumber({
                db,
                phoneNumber: phoneNumber.number,
                phoneHash,
                pepperVersion: PEPPER_VERSION,
                isRegistration: type === "register",
                delivery,
            });
        }
        return {
            success: true,
            codeExpiry: currentAttempt[0].codeExpiry,
            nextCodeSoonestTime: buildNextCodeSoonestTime({
                now,
                throttleSecondsInterval: throttleSmsSecondsInterval,
            }),
        };
    }

    const oneTimeCode =
        delivery.type === "local" &&
        isSpeciallyAuthorizedPhone({
            phoneNumber: authenticateRequestBody.phoneNumber,
            speciallyAuthorizedPhones: delivery.speciallyAuthorizedPhones,
        })
            ? delivery.testCode
            : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeSmsCodeExpiry);
    await db
        .update(authAttemptPhoneTable)
        .set({
            userId: userId,
            type: type,
            lastTwoDigits: parseInt(lastTwoDigits),
            countryCallingCode: countryCallingCode,
            phoneCountryCode: phoneCountryCode,
            phoneHash: phoneHash,
            pepperVersion: PEPPER_VERSION,
            code: oneTimeCode,
            codeExpiry: codeExpiry,
            guessAttemptAmount: 0,
            isSynthetic: false,
            lastOtpSentAt: now,
            updatedAt: now,
        })
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    if (delivery.type === "twilio") {
        dispatchOtpPhoneNumber({
            db,
            phoneNumber: phoneNumber.number,
            phoneHash,
            pepperVersion: PEPPER_VERSION,
            isRegistration: type === "register",
            delivery,
        });
    }
    const nextCodeSoonestTime = buildNextCodeSoonestTime({
        now,
        throttleSecondsInterval: throttleSmsSecondsInterval,
    });
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

// ============================================================================
// Email Authentication
// ============================================================================

interface GetEmailAuthTypeWithDeviceStatusParams {
    db: PostgresDatabase;
    email: string;
    deviceStatus: DeviceLoginStatusExtended;
}

async function getEmailAuthTypeWithDeviceStatus({
    db,
    email,
    deviceStatus,
}: GetEmailAuthTypeWithDeviceStatusParams): Promise<AuthResult> {
    const canonicalEmail = normalizeEmail(email);

    const emailResults = await db
        .select({
            userId: emailTable.userId,
            isDeleted: userTable.isDeleted,
        })
        .from(emailTable)
        .innerJoin(userTable, eq(userTable.id, emailTable.userId))
        .where(
            and(
                eq(emailTable.email, canonicalEmail),
                or(
                    eq(emailTable.isDeleted, false),
                    eq(emailTable.reservedForRecovery, true),
                ),
            ),
        )
        .limit(1);

    return determineAuthType({
        credentialOwner: emailResults.at(0),
        deviceStatus,
    });
}

interface GetEmailAuthTypeParams {
    db: PostgresDatabase;
    email: string;
    didWrite: string;
}

/**
 * Get email authentication type, computing deviceStatus internally.
 * Used by authenticateEmailAttempt().
 * Computes device status before resolving credential ownership.
 */
export async function getEmailAuthType({
    db,
    email,
    didWrite,
}: GetEmailAuthTypeParams): Promise<AuthResult> {
    const now = nowZeroMs();
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    return getEmailAuthTypeWithDeviceStatus({
        db,
        email,
        deviceStatus,
    });
}

interface AuthenticateEmailAttemptProps {
    db: PostgresDatabase;
    axiosReacher: AxiosInstance | undefined;
    email: string;
    isRequestingNewCode: boolean;
    minutesBeforeEmailCodeExpiry: number;
    didWrite: string;
    userAgent: string;
    throttleEmailSecondsInterval: number;
    testCode: number;
    doUseTestCode: boolean;
    headerLanguageCode?: SupportedDisplayLanguageCodes;
    now: Date;
}

export async function authenticateEmailAttempt({
    db,
    axiosReacher,
    email,
    isRequestingNewCode,
    minutesBeforeEmailCodeExpiry,
    didWrite,
    userAgent,
    throttleEmailSecondsInterval,
    testCode,
    doUseTestCode,
    headerLanguageCode = "en",
    now: providedNow,
}: AuthenticateEmailAttemptProps): Promise<AuthenticateEmailResponse> {
    const primaryDb = getPrimaryDatabase(db);
    const now = providedNow;
    const canonicalEmail = normalizeEmail(email);
    const authResult = await getEmailAuthType({
        db: primaryDb,
        email: canonicalEmail,
        didWrite,
    });
    // Never disclose credential ownership before the caller proves email control.
    const type: AuthenticateType =
        authResult.type === "associated_with_another_user"
            ? "register"
            : authResult.type;
    const userId =
        authResult.type === "merge" ? authResult.toUserId : authResult.userId;

    const resultHasAttempted = await primaryDb
        .select({
            codeExpiry: authAttemptEmailTable.codeExpiry,
            lastOtpSentAt: authAttemptEmailTable.lastOtpSentAt,
            email: authAttemptEmailTable.email,
        })
        .from(authAttemptEmailTable)
        .where(eq(authAttemptEmailTable.didWrite, didWrite));
    if (resultHasAttempted.length === 0) {
        // first attempt: generate new code, insert data and send email
        return await insertEmailAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeEmailCodeExpiry,
            didWrite,
            now,
            userAgent,
            email: canonicalEmail,
            axiosReacher,
            throttleEmailSecondsInterval,
            doUseTestCode,
            testCode,
            languageCode: headerLanguageCode,
        });
    }

    const currentAttempt = resultHasAttempted[0];
    const isSameEmailAttempt = currentAttempt.email === canonicalEmail;

    if (isRequestingNewCode) {
        // user wants to regenerate new code (if possible according to throttling)
        return await updateEmailAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeEmailCodeExpiry,
            didWrite,
            now,
            email: canonicalEmail,
            axiosReacher,
            throttleEmailSecondsInterval,
            doUseTestCode,
            testCode,
            languageCode: headerLanguageCode,
        });
    } else if (currentAttempt.codeExpiry > now && isSameEmailAttempt) {
        // code hasn't expired
        const nextCodeSoonestTime = currentAttempt.lastOtpSentAt;
        nextCodeSoonestTime.setSeconds(
            nextCodeSoonestTime.getSeconds() + throttleEmailSecondsInterval,
        );
        return {
            success: true,
            codeExpiry: currentAttempt.codeExpiry,
            nextCodeSoonestTime: nextCodeSoonestTime,
        };
    } else {
        // Existing live attempts are only reusable for the same destination.
        // If the identifier changes mid-flow, update the attempt instead of
        // returning success for an OTP tied to the previous address.
        return await updateEmailAuthAttemptCode({
            db: primaryDb,
            type,
            userId,
            minutesBeforeEmailCodeExpiry,
            didWrite,
            now,
            email: canonicalEmail,
            axiosReacher,
            throttleEmailSecondsInterval,
            doUseTestCode,
            testCode,
            languageCode: headerLanguageCode,
        });
    }
}

interface InsertEmailAuthAttemptCodeProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    minutesBeforeEmailCodeExpiry: number;
    didWrite: string;
    now: Date;
    userAgent: string;
    email: string;
    axiosReacher: AxiosInstance | undefined;
    throttleEmailSecondsInterval: number;
    testCode: number;
    doUseTestCode: boolean;
    languageCode: SupportedDisplayLanguageCodes;
}

async function insertEmailAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeEmailCodeExpiry,
    didWrite,
    now,
    userAgent,
    email,
    axiosReacher,
    throttleEmailSecondsInterval,
    doUseTestCode,
    testCode,
    languageCode,
}: InsertEmailAuthAttemptCodeProps): Promise<AuthenticateEmailResponse> {
    const canonicalEmail = normalizeEmail(email);
    const deliverability = await checkEmailOtpDeliverability({
        axiosReacher,
        email: canonicalEmail,
    });

    if (!deliverability.deliverable) {
        return deliverability.response;
    }

    const throttleUntil = await reserveEmailOtpSend({
        db,
        canonicalEmail,
        now,
        throttleSecondsInterval: throttleEmailSecondsInterval,
    });
    if (throttleUntil !== null) {
        return buildEmailAuthenticateThrottledResponse(throttleUntil);
    }

    const emailReachability = deliverability.emailReachability;
    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(
        codeExpiry.getMinutes() + minutesBeforeEmailCodeExpiry,
    );
    const mustSendActualEmail = config.NODE_ENV === "production";
    if (mustSendActualEmail) {
        await sendOtpEmail({
            email: canonicalEmail,
            otp: oneTimeCode,
            languageCode,
        });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    await db.insert(authAttemptEmailTable).values({
        didWrite: didWrite,
        type: type,
        email: canonicalEmail,
        userId: userId,
        userAgent: userAgent,
        code: oneTimeCode,
        emailReachability: emailReachability,
        codeExpiry: codeExpiry,
        lastOtpSentAt: now,
    });
    const nextCodeSoonestTime = buildNextCodeSoonestTime({
        now,
        throttleSecondsInterval: throttleEmailSecondsInterval,
    });
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

interface UpdateEmailAuthAttemptCodeProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    minutesBeforeEmailCodeExpiry: number;
    didWrite: string;
    now: Date;
    email: string;
    axiosReacher: AxiosInstance | undefined;
    throttleEmailSecondsInterval: number;
    testCode: number;
    doUseTestCode: boolean;
    languageCode: SupportedDisplayLanguageCodes;
}

async function updateEmailAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeEmailCodeExpiry,
    didWrite,
    now,
    email,
    axiosReacher,
    throttleEmailSecondsInterval,
    doUseTestCode,
    testCode,
    languageCode,
}: UpdateEmailAuthAttemptCodeProps): Promise<AuthenticateEmailResponse> {
    const canonicalEmail = normalizeEmail(email);
    const currentAttempt = await db
        .select({
            email: authAttemptEmailTable.email,
            code: authAttemptEmailTable.code,
            codeExpiry: authAttemptEmailTable.codeExpiry,
        })
        .from(authAttemptEmailTable)
        .where(eq(authAttemptEmailTable.didWrite, didWrite))
        .limit(1);

    const mustSendActualEmail = config.NODE_ENV === "production";

    const canReuseExistingCode =
        currentAttempt.length > 0 &&
        currentAttempt[0].email === canonicalEmail &&
        currentAttempt[0].codeExpiry.getTime() > now.getTime();

    if (canReuseExistingCode) {
        const throttleUntil = await reserveEmailOtpSend({
            db,
            canonicalEmail,
            now,
            throttleSecondsInterval: throttleEmailSecondsInterval,
        });
        if (throttleUntil !== null) {
            return buildEmailAuthenticateThrottledResponse(throttleUntil);
        }
        if (mustSendActualEmail) {
            await sendOtpEmail({
                email: canonicalEmail,
                otp: currentAttempt[0].code,
                languageCode,
            });
        } else {
            console.log(
                "\n\nCode:",
                codeToString(currentAttempt[0].code),
                currentAttempt[0].codeExpiry,
                "\n\n",
            );
        }
        await db
            .update(authAttemptEmailTable)
            .set({
                userId: userId,
                type: type,
                email: canonicalEmail,
                lastOtpSentAt: now,
                updatedAt: now,
            })
            .where(eq(authAttemptEmailTable.didWrite, didWrite));
        return {
            success: true,
            codeExpiry: currentAttempt[0].codeExpiry,
            nextCodeSoonestTime: buildNextCodeSoonestTime({
                now,
                throttleSecondsInterval: throttleEmailSecondsInterval,
            }),
        };
    }

    const deliverability = await checkEmailOtpDeliverability({
        axiosReacher,
        email: canonicalEmail,
    });

    if (!deliverability.deliverable) {
        return deliverability.response;
    }

    const throttleUntil = await reserveEmailOtpSend({
        db,
        canonicalEmail,
        now,
        throttleSecondsInterval: throttleEmailSecondsInterval,
    });
    if (throttleUntil !== null) {
        return buildEmailAuthenticateThrottledResponse(throttleUntil);
    }

    const emailReachability = deliverability.emailReachability;

    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(
        codeExpiry.getMinutes() + minutesBeforeEmailCodeExpiry,
    );
    if (mustSendActualEmail) {
        await sendOtpEmail({
            email: canonicalEmail,
            otp: oneTimeCode,
            languageCode,
        });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    await db
        .update(authAttemptEmailTable)
        .set({
            userId: userId,
            type: type,
            email: canonicalEmail,
            code: oneTimeCode,
            emailReachability: emailReachability,
            codeExpiry: codeExpiry,
            guessAttemptAmount: 0,
            lastOtpSentAt: now,
            updatedAt: now,
        })
        .where(eq(authAttemptEmailTable.didWrite, didWrite));
    const nextCodeSoonestTime = buildNextCodeSoonestTime({
        now,
        throttleSecondsInterval: throttleEmailSecondsInterval,
    });
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

async function recordWrongEmailOtpGuess({
    db,
    didWrite,
    challenge,
    maxAttempt,
    now,
}: {
    db: PostgresDatabase;
    didWrite: string;
    challenge: {
        email: string;
        code: number;
        codeExpiry: Date;
    };
    maxAttempt: number;
    now: Date;
}): Promise<
    | { type: "expired" }
    | { type: "wrong_guess"; challengeGuessAttemptAmount: number }
    | { type: "throttled"; nextCodeSoonestTime: Date }
> {
    return await db.transaction(async (tx) => {
        // Success and failure paths lock the challenge before the destination.
        // A consistent order prevents concurrent correct/wrong submissions from
        // deadlocking while preserving destination-wide throttling.
        const activeChallenges = await tx
            .select({ didWrite: authAttemptEmailTable.didWrite })
            .from(authAttemptEmailTable)
            .where(
                and(
                    eq(authAttemptEmailTable.didWrite, didWrite),
                    eq(authAttemptEmailTable.email, challenge.email),
                    eq(authAttemptEmailTable.code, challenge.code),
                    eq(authAttemptEmailTable.codeExpiry, challenge.codeExpiry),
                    gt(authAttemptEmailTable.codeExpiry, now),
                    lt(authAttemptEmailTable.guessAttemptAmount, maxAttempt),
                ),
            )
            .for("update");
        if (activeChallenges.length !== 1) {
            return { type: "expired" };
        }

        const destinationRows = await tx
            .select({
                wrongGuessAttemptAmount:
                    otpEmailDestinationStateTable.wrongGuessAttemptAmount,
                consecutiveFailedVerifyAttempts:
                    otpEmailDestinationStateTable.consecutiveFailedVerifyAttempts,
                backoffUntil: otpEmailDestinationStateTable.backoffUntil,
                updatedAt: otpEmailDestinationStateTable.updatedAt,
            })
            .from(otpEmailDestinationStateTable)
            .where(eq(otpEmailDestinationStateTable.email, challenge.email))
            .for("update");
        const destinationState = destinationRows.at(0);
        if (
            destinationState !== undefined &&
            destinationState.backoffUntil !== null &&
            destinationState.backoffUntil > now
        ) {
            return {
                type: "throttled",
                nextCodeSoonestTime: destinationState.backoffUntil,
            };
        }

        const encodedNow = sql.param(now, authAttemptEmailTable.codeExpiry);
        const updated = await tx
            .update(authAttemptEmailTable)
            .set({
                guessAttemptAmount: sql<number>`${authAttemptEmailTable.guessAttemptAmount} + 1`,
                codeExpiry: sql<Date>`CASE WHEN ${authAttemptEmailTable.guessAttemptAmount} + 1 >= ${maxAttempt} THEN ${encodedNow} ELSE ${authAttemptEmailTable.codeExpiry} END`,
                updatedAt: now,
            })
            .where(
                and(
                    eq(authAttemptEmailTable.didWrite, didWrite),
                    eq(authAttemptEmailTable.email, challenge.email),
                    eq(authAttemptEmailTable.code, challenge.code),
                    eq(authAttemptEmailTable.codeExpiry, challenge.codeExpiry),
                    gt(authAttemptEmailTable.codeExpiry, now),
                    lt(authAttemptEmailTable.guessAttemptAmount, maxAttempt),
                ),
            )
            .returning({
                guessAttemptAmount: authAttemptEmailTable.guessAttemptAmount,
            });
        const challengeGuessAttemptAmount = updated.at(0)?.guessAttemptAmount;
        if (challengeGuessAttemptAmount === undefined) {
            return { type: "expired" };
        }

        const decision = decideDestinationWrongGuess({
            state: destinationState ?? {
                wrongGuessAttemptAmount: 0,
                consecutiveFailedVerifyAttempts: 0,
                backoffUntil: null,
                updatedAt: now,
            },
            now,
            maxWrongGuesses: config.EMAIL_OTP_DESTINATION_MAX_WRONG_GUESSES,
            throttleSecondsInterval: config.THROTTLE_EMAIL_SECONDS_INTERVAL,
        });
        await tx
            .insert(otpEmailDestinationStateTable)
            .values({
                email: challenge.email,
                lastOtpSentAt: now,
                ...decision.state,
            })
            .onConflictDoUpdate({
                target: otpEmailDestinationStateTable.email,
                set: decision.state,
            });
        if (decision.type === "throttled") {
            return {
                type: "throttled",
                nextCodeSoonestTime: decision.nextCodeSoonestTime,
            };
        }
        return {
            type: "wrong_guess",
            challengeGuessAttemptAmount,
        };
    });
}

interface RegisterWithEmailProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    email: string;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
    emailReachability: ReacherIsReachable | null;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

// WARN: we assume the OTP was verified AND EXPIRED at registerOrLoginWithEmail entry point
async function registerWithEmail({
    db,
    didWrite,
    now,
    email,
    userAgent,
    userId,
    sessionExpiry,
    emailReachability,
    currentDisplayLanguage,
}: RegisterWithEmailProps): Promise<void> {
    const canonicalEmail = normalizeEmail(email);

    log.info("Register with email");
    await db.transaction(async (tx) => {
        // The caller atomically claimed the OTP before registration.

        const wasUserCreated =
            await createUserWithInitialLanguagePreferencesIfMissing({
                db: tx,
                userId,
                currentDisplayLanguage,
                now,
            });

        if (wasUserCreated) {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "new_device",
                    userAgent,
                },
                now,
                sessionExpiry,
            });
        } else {
            await startHardAuthSession({
                db: tx,
                userId,
                didWrite,
                transition: {
                    type: "credential_upgrade",
                },
                now,
                sessionExpiry,
            });
        }

        await tx.insert(emailTable).values({
            userId: userId,
            email: canonicalEmail,
            type: "primary",
            emailReachability: emailReachability,
        });
    });
}

interface RegisterOrLoginWithEmailBaseProps {
    db: PostgresTransaction;
    didWrite: string;
    email: string;
    userAgent: string;
    now: Date;
    sessionLifetimeDays: number;
    emailReachability: ReacherIsReachable | null;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

type RegisterOrLoginWithEmailProps =
    | (RegisterOrLoginWithEmailBaseProps & {
          type: "register" | "login_known_device" | "login_new_device";
          userId: string;
      })
    | (RegisterOrLoginWithEmailBaseProps & {
          type: "merge";
          toUserId: string;
          fromUserId: string;
      });

async function registerOrLoginWithEmail(
    props: RegisterOrLoginWithEmailProps,
): Promise<VerifyOtp200> {
    const { db, type, didWrite, email, userAgent, now, emailReachability } =
        props;
    const loginSessionExpiry = new Date(now);
    loginSessionExpiry.setDate(
        loginSessionExpiry.getDate() + props.sessionLifetimeDays,
    );

    switch (type) {
        case "register": {
            // Prevent duplicate credential: user must not already have an active email
            const existingEmail = await db
                .select({ id: emailTable.id })
                .from(emailTable)
                .where(
                    and(
                        eq(emailTable.userId, props.userId),
                        eq(emailTable.isDeleted, false),
                    ),
                )
                .limit(1);
            if (existingEmail.length > 0) {
                log.warn(
                    { userId: props.userId },
                    "[Email] User already has an active email credential",
                );
                return {
                    success: false,
                    reason: "already_has_credential",
                };
            }
            await registerWithEmail({
                db,
                didWrite,
                email,
                userAgent,
                userId: props.userId,
                now,
                sessionExpiry: loginSessionExpiry,
                emailReachability,
                currentDisplayLanguage: props.currentDisplayLanguage,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "login_known_device": {
            // OTP was already claimed by the caller; just update the session.
            await startHardAuthSession({
                db,
                userId: props.userId,
                didWrite,
                transition: {
                    type: "reauthentication",
                },
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "login_new_device": {
            await startHardAuthSession({
                db,
                userId: props.userId,
                didWrite,
                transition: {
                    type: "new_device",
                    userAgent,
                },
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
                accountMerged: false,
                userId: props.userId,
            };
        }
        case "merge": {
            const { toUserId, fromUserId } = props;

            await mergeGuestIntoVerifiedUser({
                db,
                verifiedUserId: toUserId,
                guestUserId: fromUserId,
                now,
            });
            await startHardAuthSession({
                db,
                userId: toUserId,
                didWrite,
                transition: {
                    type: "guest_merge",
                },
                now,
                sessionExpiry: loginSessionExpiry,
            });
            log.info(
                { verifiedUserId: toUserId, guestUserId: fromUserId },
                "[Email] Merged guest into verified user",
            );
            return {
                success: true,
                accountMerged: true,
                userId: toUserId,
            };
        }
    }
}

interface VerifyEmailOtpProps {
    recoverAccount?: boolean;
    db: PostgresDatabase;
    maxAttempt: number;
    didWrite: string;
    code: number;
    email: string;
    sessionLifetimeDays: number;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}

export async function verifyEmailOtp({
    recoverAccount = false,
    db,
    maxAttempt,
    didWrite,
    code,
    email,
    sessionLifetimeDays,
    currentDisplayLanguage,
    now: providedNow,
}: VerifyEmailOtpProps): Promise<VerifyOtp200> {
    const primaryDb = getPrimaryDatabase(db);
    const now = providedNow;
    const canonicalEmail = normalizeEmail(email);
    const resultOtp = await primaryDb
        .select({
            userId: authAttemptEmailTable.userId,
            email: authAttemptEmailTable.email,
            userAgent: authAttemptEmailTable.userAgent,
            authType: authAttemptEmailTable.type,
            guessAttemptAmount: authAttemptEmailTable.guessAttemptAmount,
            code: authAttemptEmailTable.code,
            codeExpiry: authAttemptEmailTable.codeExpiry,
            emailReachability: authAttemptEmailTable.emailReachability,
        })
        .from(authAttemptEmailTable)
        .where(eq(authAttemptEmailTable.didWrite, didWrite));
    if (resultOtp.length === 0) {
        throw httpErrors.badRequest(
            "Device has never made an email authentication attempt",
        );
    }
    // Verify the submitted email matches the stored one
    if (resultOtp[0].email !== canonicalEmail) {
        throw httpErrors.badRequest(
            "The provided email is not associated with the device's ongoing auth flow",
        );
    }

    // Direct code comparison (no Twilio involved for email)
    if (resultOtp[0].codeExpiry <= now) {
        return { success: false, reason: "expired_code" };
    } else if (otpCodesEqual({ a: resultOtp[0].code, b: code })) {
        return await finalizeVerifiedEmailOtp({
            recoverAccount,
            db: primaryDb,
            didWrite,
            resultOtp: {
                ...resultOtp[0],
                authType: authenticateTypeSchema.parse(resultOtp[0].authType),
            },
            now,
            maxAttempt,
            sessionLifetimeDays,
            currentDisplayLanguage,
        });
    } else {
        const wrongGuessResult = await recordWrongEmailOtpGuess({
            db: primaryDb,
            didWrite,
            challenge: resultOtp[0],
            maxAttempt,
            now,
        });
        if (wrongGuessResult.type === "expired") {
            return { success: false, reason: "expired_code" };
        }
        if (wrongGuessResult.type === "throttled") {
            return buildTooManyWrongGuessResponse(
                wrongGuessResult.nextCodeSoonestTime,
            );
        }
        if (wrongGuessResult.challengeGuessAttemptAmount >= maxAttempt) {
            return buildTooManyWrongGuessResponse(
                (
                    await getEmailOtpDestinationState({
                        db: primaryDb,
                        canonicalEmail,
                    })
                )?.backoffUntil ??
                    buildNextCodeSoonestTime({
                        now,
                        throttleSecondsInterval:
                            config.THROTTLE_EMAIL_SECONDS_INTERVAL,
                    }),
            );
        }
        return {
            success: false,
            reason: "wrong_guess",
        };
    }
}
