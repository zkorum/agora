/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const activePhoneAuthModeSchema = z.enum(["enabled", "login_only"]);
export const phoneAuthModeSchema = z.enum([
    ...activePhoneAuthModeSchema.options,
    "disabled",
]);

export type ActivePhoneAuthMode = z.infer<typeof activePhoneAuthModeSchema>;
export type PhoneAuthMode = z.infer<typeof phoneAuthModeSchema>;
