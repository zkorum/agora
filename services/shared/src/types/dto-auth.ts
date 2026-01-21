import { z } from "zod";
import {
    zodCode,
    zodSupportedCountryCallingCode,
    zodDateTimeFlexible,
    zodUserId,
    zodDeviceLoginStatus,
} from "./zod.js";
import { zodPhoneNumber } from "./zod-phone.js";

export const checkLoginStatusResponse = z
    .object({
        loggedInStatus: zodDeviceLoginStatus,
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

export const authenticate200 = z.discriminatedUnion("success", [
    z
        .object({
            success: z.literal(true),
            codeExpiry: zodDateTimeFlexible,
            nextCodeSoonestTime: zodDateTimeFlexible,
        })
        .strict(),
    z.object({
        success: z.literal(false),
        reason: z.enum([
            "already_logged_in",
            "associated_with_another_user",
            "throttled",
            "invalid_phone_number",
            "restricted_phone_type",
        ]),
    }),
]);

export const verifyOtp200 = z.discriminatedUnion("success", [
    z
        .object({
            success: z.literal(true),
            accountMerged: z.boolean(), // true when guest merged into verified, false otherwise
            userId: z.string(), // User ID (for tracking account merges in frontend)
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.enum([
                "expired_code",
                "wrong_guess",
                "too_many_wrong_guess",
                "already_logged_in",
                "associated_with_another_user",
                "auth_state_changed", // Added: auth type changed during OTP flow
            ]),
        })
        .strict(),
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
export type IsLoggedInResponse = z.infer<typeof isLoggedInResponse>;
