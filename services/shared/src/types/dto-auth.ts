import { z } from "zod";
import {
    zodCode,
    zodSupportedCountryCallingCode,
    zodDateTimeFlexible,
    zodUserId,
    zodDeviceLoginStatus,
} from "./zod.js";
import { zodEmail } from "./zod-email.js";
import { zodPhoneNumber } from "./zod-phone.js";

export const checkLoginStatusResponse = z
    .object({
        loggedInStatus: zodDeviceLoginStatus,
    })
    .strict();

export const authSession = z
    .object({
        didWrite: z.string().min(1).max(1000),
        startedAt: zodDateTimeFlexible,
        expiresAt: zodDateTimeFlexible,
    })
    .strict();

export const listAuthSessionsResponse = z
    .object({
        currentSession: authSession,
        otherSessions: z.array(authSession),
    })
    .strict();

export const revokeAuthSessionRequest = z
    .object({
        didWrite: z.string().min(1).max(1000),
    })
    .strict();

export const revokeAuthSessionResponse = z
    .object({
        revoked: z.boolean(),
    })
    .strict();

export const logoutAllAuthSessionsResponse = z
    .object({
        revokedSessionCount: z.number().int().nonnegative(),
    })
    .strict();

export const authenticateRequestBody = z
    .object({
        phoneNumber: zodPhoneNumber,
        defaultCallingCode: zodSupportedCountryCallingCode,
        isRequestingNewCode: z.boolean(),
    })
    .strict();

export const verifyOtpReqBody = z.object({
    code: zodCode,
    phoneNumber: zodPhoneNumber,
    defaultCallingCode: zodSupportedCountryCallingCode,
});

const authenticateFailure200 = z.discriminatedUnion("reason", [
    z
        .object({
            success: z.literal(false),
            reason: z.literal("throttled"),
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.enum([
                "already_has_credential",
                "invalid_phone_number",
                "restricted_phone_type",
                "phone_auth_unavailable",
            ]),
        })
        .strict(),
]);

export const authenticate200 = z.discriminatedUnion("success", [
    z
        .object({
            success: z.literal(true),
            codeExpiry: zodDateTimeFlexible,
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    authenticateFailure200,
]);

const verifyOtpFailureReasons = [
    "expired_code",
    "wrong_guess",
    "already_has_credential",
    "verification_failed",
] as const;

const verifyOtpFailure200 = z.discriminatedUnion("reason", [
    z
        .object({
            success: z.literal(false),
            reason: z.literal("too_many_wrong_guess"),
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.enum(verifyOtpFailureReasons),
        })
        .strict(),
]);

const verifyOtpSuccess200 = z
    .object({
        success: z.literal(true),
        accountMerged: z.boolean(),
        userId: zodUserId,
    })
    .strict();

export const verifyOtp200 = z.discriminatedUnion("success", [
    verifyOtpSuccess200,
    verifyOtpFailure200,
]);

const verifyPhoneOtpFailure200 = z.discriminatedUnion("reason", [
    z
        .object({
            success: z.literal(false),
            reason: z.literal("too_many_wrong_guess"),
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.enum([
                "expired_code",
                "wrong_guess",
                "already_has_credential",
                "verification_failed",
                "phone_auth_unavailable",
                "phone_registration_unavailable",
            ]),
        })
        .strict(),
]);

export const verifyPhoneOtp200 = z.discriminatedUnion("success", [
    verifyOtpSuccess200,
    verifyPhoneOtpFailure200,
]);

export const authenticateEmailRequestBody = z
    .object({
        email: zodEmail,
        isRequestingNewCode: z.boolean(),
    })
    .strict();

export const verifyEmailOtpReqBody = z.object({
    code: zodCode,
    email: zodEmail,
});

const authenticateEmailFailure200 = z.discriminatedUnion("reason", [
    z
        .object({
            success: z.literal(false),
            reason: z.literal("throttled"),
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.enum([
                "already_has_credential",
                "unreachable",
                "disposable",
            ]),
        })
        .strict(),
]);

export const authenticateEmail200 = z.discriminatedUnion("success", [
    z
        .object({
            success: z.literal(true),
            codeExpiry: zodDateTimeFlexible,
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    authenticateEmailFailure200,
]);

export const isLoggedInResponse = z.discriminatedUnion("isLoggedIn", [
    z.object({ isLoggedIn: z.literal(true), userId: zodUserId }).strict(),
    z
        .object({
            isLoggedIn: z.literal(false),
        })
        .strict(),
]);

export type AuthenticateRequestBody = z.infer<typeof authenticateRequestBody>;
export type VerifyOtpReqBody = z.infer<typeof verifyOtpReqBody>;
export type AuthenticateResponse = z.infer<typeof authenticate200>;
export type VerifyOtp200 = z.infer<typeof verifyOtp200>;
export type VerifyPhoneOtp200 = z.infer<typeof verifyPhoneOtp200>;
export type IsLoggedInResponse = z.infer<typeof isLoggedInResponse>;
export type AuthenticateEmailRequestBody = z.infer<
    typeof authenticateEmailRequestBody
>;
export type VerifyEmailOtpReqBody = z.infer<typeof verifyEmailOtpReqBody>;
export type AuthenticateEmailResponse = z.infer<typeof authenticateEmail200>;
export type AuthSession = z.infer<typeof authSession>;
