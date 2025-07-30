import {
    codeToString,
    generateOneTimeCode,
    generateUUID,
    hashWithSalt,
} from "@/crypto.js";
import {
    authAttemptPhoneTable,
    deviceTable,
    zkPassportTable,
    phoneTable,
    userTable,
} from "@/schema.js";
import { nowZeroMs } from "@/shared/common/util.js";
import type {
    AuthenticateRequestBody,
    AuthenticateResponse,
    VerifyOtp200,
} from "@/shared/types/dto.js";
import { eq, and, TransactionRollbackError } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { base64 } from "@/shared/common/index.js";
import parsePhoneNumberFromString, {
    type CountryCode,
} from "libphonenumber-js/max";
import { log } from "@/app.js";
import {
    PEPPER_VERSION,
    isPhoneNumberTypeSupported,
    toUnionUndefined,
} from "@/shared/shared.js";
import { httpErrors } from "@fastify/sensible";
import { generateUnusedRandomUsername } from "./account.js";
import * as authUtilService from "@/service/authUtil.js";
import twilio from "twilio";

interface VerifyOtpProps {
    db: PostgresDatabase;
    maxAttempt: number;
    didWrite: string;
    code: number;
    phoneNumber: string;
    defaultCallingCode: string;
    twilioClient?: twilio.Twilio;
    twilioServiceSid?: string;
    peppers: string[];
}

interface RegisterWithPhoneNumberProps {
    db: PostgresDatabase;
    didWrite: string;
    lastTwoDigits: number;
    countryCallingCode: string;
    phoneCountryCode?: CountryCode;
    phoneHash: string;
    pepperVersion: number;
    userAgent: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
}

interface RegisterWithoutVerificationProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
    userAgent: string;
}

interface RegisterWithZKPProps {
    db: PostgresDatabase;
    didWrite: string;
    citizenship: string;
    nullifier: string;
    sex: string;
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
}

interface LoginProps {
    db: PostgresDatabase;
    didWrite: string;
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
    sessionExpiry: Date;
}

interface AuthTypeAndUserId {
    userId: string;
    type: AuthenticateType | "associated_with_another_user";
}

interface GetPhoneAuthenticationTypeByNumber {
    db: PostgresDatabase;
    phoneNumber: string;
    didWrite: string;
    peppers: string[];
}

interface GetPhoneAuthenticationTypeByHash {
    db: PostgresDatabase;
    phoneHash: string;
    didWrite: string;
}

interface GetZKPAuthenticationType {
    db: PostgresDatabase;
    nullifier: string;
    didWrite: string;
}

interface AuthenticateAttemptProps {
    db: PostgresDatabase;
    authenticateRequestBody: AuthenticateRequestBody;
    minutesBeforeSmsCodeExpiry: number;
    didWrite: string;
    userAgent: string;
    throttleSmsSecondsInterval: number;
    testCode: number;
    doUseTestCode: boolean;
    peppers: string[];
    twilioClient?: twilio.Twilio;
    twilioServiceSid?: string;
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
    testCode: number;
    doUseTestCode: boolean;
    peppers: string[];
    twilioClient?: twilio.Twilio;
    twilioServiceSid?: string;
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
    testCode: number;
    doUseTestCode: boolean;
    peppers: string[];
    twilioClient?: twilio.Twilio;
    twilioServiceSid?: string;
}

interface SendOtpPhoneNumberProps {
    phoneNumber: string;
    twilioClient: twilio.Twilio;
    twilioServiceSid: string;
}

interface RegisterOrLoginWithPhoneNumberProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    didWrite: string;
    lastTwoDigits: number;
    countryCallingCode: string;
    phoneCountryCode?: CountryCode;
    phoneHash: string;
    pepperVersion: number;
    userAgent: string;
    userId: string;
    now: Date;
}

interface RegisterOrLoginWithPhoneNumberReturn {
    success: true;
}

async function registerOrLoginWithPhoneNumber({
    db,
    type,
    didWrite,
    lastTwoDigits,
    countryCallingCode,
    phoneCountryCode,
    phoneHash,
    pepperVersion,
    userAgent,
    userId,
    now,
}: RegisterOrLoginWithPhoneNumberProps): Promise<RegisterOrLoginWithPhoneNumberReturn> {
    const loginSessionExpiry = new Date(now);
    loginSessionExpiry.setFullYear(loginSessionExpiry.getFullYear() + 1000);
    switch (type) {
        case "register": {
            await registerWithPhoneNumber({
                db,
                didWrite,
                lastTwoDigits: lastTwoDigits,
                countryCallingCode: countryCallingCode,
                phoneCountryCode: phoneCountryCode,
                phoneHash: phoneHash,
                pepperVersion: pepperVersion,
                userAgent: userAgent,
                userId: userId,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
            };
        }
        case "login_known_device": {
            await loginKnownDevice({
                db,
                didWrite,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
            };
        }
        case "login_new_device": {
            await loginNewDevice({
                db,
                didWrite,
                userAgent: userAgent,
                userId: userId,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
            };
        }
    }
}

export async function verifyPhoneOtp({
    db,
    maxAttempt,
    didWrite,
    code,
    phoneNumber,
    defaultCallingCode,
    twilioClient,
    twilioServiceSid,
    peppers,
}: VerifyOtpProps): Promise<VerifyOtp200> {
    if (
        (twilioClient !== undefined && twilioServiceSid === undefined) ||
        (twilioClient === undefined && twilioServiceSid !== undefined)
    ) {
        log.error("Twilio configuration error");
        throw httpErrors.internalServerError("Internal Error");
    }
    const now = nowZeroMs();
    const resultOtp = await db
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
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    if (resultOtp.length === 0) {
        throw httpErrors.badRequest(
            "Device has never made an authentication attempt",
        );
    }
    // we recalculate type and userId for security reasons
    const { type, userId } = await getPhoneAuthenticationTypeByHash({
        db,
        phoneHash: resultOtp[0].phoneHash,
        didWrite,
    });
    if (resultOtp[0].authType !== type) {
        log.warn(
            `User was initially identified as trying to "${resultOtp[0].authType}" but is now going to "${type}"`,
        );
    }
    if (resultOtp[0].userId !== userId) {
        log.warn(
            `User was initially identified as "${resultOtp[0].userId}" but is now "${userId}"`,
        );
    }
    if (type === "associated_with_another_user") {
        return {
            success: false,
            reason: type,
        };
    }

    // if we use twilio, we don't use the local code at all.
    // will change when we migrate to another service
    if (twilioServiceSid !== undefined && twilioClient !== undefined) {
        const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, {
            defaultCallingCode: defaultCallingCode,
        });
        if (phoneNumberObj === undefined) {
            throw httpErrors.badRequest(
                "Phone number cannot be parsed correctly",
            );
        }
        const phoneHash = await generatePhoneHash({
            phoneNumber: phoneNumberObj.number,
            peppers: peppers,
            pepperVersion: PEPPER_VERSION,
        });
        if (phoneHash !== resultOtp[0].phoneHash) {
            throw httpErrors.badRequest(
                "The provided phone number is not associated with the user's ongoing device auth flow", // with the DID
            );
        }
        const verificationCheck = await twilioClient.verify.v2
            .services(twilioServiceSid)
            .verificationChecks.create({
                code: codeToString(code),
                to: phoneNumberObj.number,
            });
        switch (verificationCheck.status) {
            case "pending":
                return {
                    success: false,
                    reason: "wrong_guess",
                };
            case "canceled":
                throw httpErrors.badRequest(
                    "This phone number verification was canceled",
                );
            case "max_attempts_reached":
                return {
                    success: false,
                    reason: "too_many_wrong_guess",
                };
            case "deleted":
                throw httpErrors.badRequest(
                    "This phone number verification was deleted",
                );
            case "failed":
                log.error(`Unexpected "failed" status received by Twilio`);
                throw httpErrors.internalServerError(
                    "Unexpected error from phone number verification",
                );
            case "expired":
                return { success: false, reason: "expired_code" };
            case "approved":
                return registerOrLoginWithPhoneNumber({
                    db,
                    type,
                    didWrite,
                    lastTwoDigits: resultOtp[0].lastTwoDigits,
                    countryCallingCode: resultOtp[0].countryCallingCode,
                    phoneCountryCode: toUnionUndefined(
                        resultOtp[0].phoneCountryCode,
                    ),
                    phoneHash: resultOtp[0].phoneHash,
                    pepperVersion: resultOtp[0].pepperVersion,
                    userAgent: resultOtp[0].userAgent,
                    userId: userId,
                    now,
                });
            default:
                log.error(
                    `Unexpected status received by Twilio: ${JSON.stringify(
                        verificationCheck.toJSON(),
                    )}`,
                );
                throw httpErrors.internalServerError(
                    "Unexpected error from phone number verification",
                );
        }
    } else if (resultOtp[0].codeExpiry <= now) {
        return { success: false, reason: "expired_code" };
    } else if (resultOtp[0].code === code) {
        return registerOrLoginWithPhoneNumber({
            db,
            type,
            didWrite,
            lastTwoDigits: resultOtp[0].lastTwoDigits,
            countryCallingCode: resultOtp[0].countryCallingCode,
            phoneCountryCode: toUnionUndefined(resultOtp[0].phoneCountryCode),
            phoneHash: resultOtp[0].phoneHash,
            pepperVersion: resultOtp[0].pepperVersion,
            userAgent: resultOtp[0].userAgent,
            userId: userId,
            now,
        });
    } else {
        await updateCodeGuessAttemptAmount(
            db,
            didWrite,
            resultOtp[0].guessAttemptAmount + 1,
        );
        if (resultOtp[0].guessAttemptAmount + 1 >= maxAttempt) {
            // code is now considered expired
            await expireCode(db, didWrite);
            return {
                success: false,
                reason: "too_many_wrong_guess",
            };
        }
        return {
            success: false,
            reason: "wrong_guess",
        };
    }
}

export async function expireCode(db: PostgresDatabase, didWrite: string) {
    const now = nowZeroMs();
    await db
        .update(authAttemptPhoneTable)
        .set({
            codeExpiry: now,
            updatedAt: now,
        })
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
}

export async function updateCodeGuessAttemptAmount(
    db: PostgresDatabase,
    didWrite: string,
    attemptAmount: number,
) {
    const now = nowZeroMs();
    return await db
        .update(authAttemptPhoneTable)
        .set({
            guessAttemptAmount: attemptAmount,
            updatedAt: now,
        })
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
}

// WARN: we assume the OTP was verified for registering at this point
export async function registerWithPhoneNumber({
    db,
    didWrite,
    lastTwoDigits,
    phoneCountryCode,
    countryCallingCode,
    phoneHash,
    pepperVersion,
    userAgent,
    userId,
    now,
    sessionExpiry,
}: RegisterWithPhoneNumberProps): Promise<void> {
    log.info("Register with phone number");
    await db.transaction(async (tx) => {
        await tx
            .update(authAttemptPhoneTable)
            .set({
                codeExpiry: now, // this is important to forbid further usage of the same code once it has been successfully guessed
                updatedAt: now,
            })
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        await tx.insert(userTable).values({
            username: await generateUnusedRandomUsername({
                db: db,
            }),
            id: userId,
        });
        await tx.insert(deviceTable).values({
            userId: userId,
            didWrite: didWrite,
            userAgent: userAgent,
            sessionExpiry: sessionExpiry,
        });
        await tx.insert(phoneTable).values({
            userId: userId,
            lastTwoDigits: lastTwoDigits,
            phoneCountryCode: phoneCountryCode,
            countryCallingCode: countryCallingCode,
            pepperVersion: pepperVersion,
            phoneHash: phoneHash,
        });
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
}: RegisterWithoutVerificationProps): Promise<{
    userId: string;
    wasUserJustCreated: boolean;
}> {
    const userId = generateUUID();
    const loginSessionExpiry = new Date(now);
    try {
        return await db.transaction(async (tx) => {
            await tx.insert(userTable).values({
                username: await generateUnusedRandomUsername({ db: db }),
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
            return { userId: userId, wasUserJustCreated: true };
        });
    } catch (e) {
        if (e instanceof TransactionRollbackError) {
            const deviceStatus = await authUtilService.getDeviceStatus(
                db,
                didWrite,
            );
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

export async function registerWithZKP({
    db,
    didWrite,
    citizenship,
    nullifier,
    sex,
    userAgent,
    userId,
    sessionExpiry,
}: RegisterWithZKPProps): Promise<void> {
    log.info("Register with ZKP");
    await db.transaction(async (tx) => {
        await tx.insert(userTable).values({
            username: await generateUnusedRandomUsername({ db: db }),
            id: userId,
        });
        await tx.insert(deviceTable).values({
            userId: userId,
            didWrite: didWrite,
            userAgent: userAgent,
            sessionExpiry: sessionExpiry,
        });
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
        await tx.insert(deviceTable).values({
            userId: userId,
            didWrite: didWrite,
            userAgent: userAgent,
            sessionExpiry: sessionExpiry,
        });
    });
}

// ! WARN we assume the OTP was verified for login new device at this point
export async function loginNewDeviceWithZKP({
    db,
    didWrite,
    userId,
    userAgent,
    sessionExpiry,
}: LoginNewDeviceWithZKPProps) {
    log.info("Logging-in new device with ZKP");
    await db.insert(deviceTable).values({
        userId: userId,
        didWrite: didWrite,
        userAgent: userAgent,
        sessionExpiry: sessionExpiry,
    });
}

// ! WARN we assume the OTP was verified and the device is already syncing
export async function loginKnownDevice({
    db,
    didWrite,
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
        await tx
            .update(deviceTable)
            .set({
                sessionExpiry: sessionExpiry,
                updatedAt: now,
            })
            .where(eq(deviceTable.didWrite, didWrite));
    });
}

// ! WARN we assume the OTP was verified and the device is already syncing
export async function loginKnownDeviceWithZKP({
    db,
    didWrite,
    now,
    sessionExpiry,
}: LoginProps) {
    log.info("Logging-in known device with ZKP");
    await db
        .update(deviceTable)
        .set({
            sessionExpiry: sessionExpiry,
            updatedAt: now,
        })
        .where(eq(deviceTable.didWrite, didWrite));
}

// !WARNING: manually update DB enum value if changing this
// TODO: automatically sync them - use one type only
export type AuthenticateType =
    | "register"
    | "login_known_device"
    | "login_new_device";

export async function isPhoneNumberAvailable(
    db: PostgresDatabase,
    phoneHash: string,
): Promise<boolean> {
    const result = await db
        .select()
        .from(phoneTable)
        .innerJoin(userTable, eq(phoneTable.userId, userTable.id))
        .where(
            and(
                eq(phoneTable.phoneHash, phoneHash),
                eq(userTable.isDeleted, false),
            ),
        );
    if (result.length === 0) {
        return true;
    } else {
        return false;
    }
}

export async function isNullifierAvailable(
    db: PostgresDatabase,
    nullifier: string,
): Promise<boolean> {
    const result = await db
        .select()
        .from(zkPassportTable)
        .where(eq(zkPassportTable.nullifier, nullifier));
    if (result.length === 0) {
        return true;
    } else {
        return false;
    }
}

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

export async function getOrGenerateUserIdFromPhoneHash(
    db: PostgresDatabase,
    phoneHash: string,
): Promise<string> {
    const result = await db
        .select({ userId: userTable.id })
        .from(userTable)
        .leftJoin(phoneTable, eq(phoneTable.userId, userTable.id))
        .where(
            and(
                eq(phoneTable.phoneHash, phoneHash),
                eq(userTable.isDeleted, false),
            ),
        );
    if (result.length === 0) {
        // The phone number is not associated with any existing non-deleted user
        // But maybe it was already used to attempt a register
        const resultAttempt = await db
            .select({
                userId: authAttemptPhoneTable.userId,
                isDeleted: userTable.isDeleted,
            })
            .from(authAttemptPhoneTable)
            .leftJoin(userTable, eq(userTable.id, authAttemptPhoneTable.userId))
            .where(eq(authAttemptPhoneTable.phoneHash, phoneHash));
        if (resultAttempt.length === 0) {
            // this phone number has never been used to attempt a register
            return generateUUID();
        } else {
            const didLoginAttemptsWithoutUsers = resultAttempt.filter(
                (user) => user.isDeleted === null,
            );
            if (didLoginAttemptsWithoutUsers.length > 0) {
                // there are attempts that aren't associated with any user
                // at this point every userId being attempted should be identical, by design
                return didLoginAttemptsWithoutUsers[0].userId;
            } else {
                // there are only attempts from pending deleted users
                // so we will create a new user for this phone number
                return generateUUID();
            }
        }
    } else {
        return result[0].userId;
    }
}

export async function getOrGenerateUserIdFromNullifier(
    db: PostgresDatabase,
    nullifier: string,
): Promise<string> {
    const result = await db
        .select({ userId: userTable.id })
        .from(userTable)
        .leftJoin(zkPassportTable, eq(zkPassportTable.userId, userTable.id))
        .where(eq(zkPassportTable.nullifier, nullifier));
    if (result.length === 0) {
        return generateUUID();
    } else {
        return result[0].userId;
    }
}

export async function getPhoneAuthenticationTypeByHash({
    db,
    phoneHash,
    didWrite,
}: GetPhoneAuthenticationTypeByHash): Promise<AuthTypeAndUserId> {
    const isPhoneNumberAvailableVal = await isPhoneNumberAvailable(
        db,
        phoneHash,
    );
    const didWriteAssociationWithPhoneStatus: DidAssociationStatus =
        await getDidWriteAssociationWithPhone({
            db,
            didWrite,
            phoneHash,
        });
    const userId = await getOrGenerateUserIdFromPhoneHash(db, phoneHash);
    switch (didWriteAssociationWithPhoneStatus) {
        case "does_not_exist":
            if (isPhoneNumberAvailableVal) {
                return { type: "register", userId: userId };
            } else {
                return { type: "login_new_device", userId: userId };
            }
        case "associated":
            return {
                type: "login_known_device",
                userId: userId,
            };
        case "not_associated":
            return { type: "associated_with_another_user", userId: userId };
    }
}

export async function getPhoneAuthenticationTypeByNumber({
    db,
    phoneNumber,
    didWrite,
    peppers,
}: GetPhoneAuthenticationTypeByNumber): Promise<AuthTypeAndUserId> {
    const phoneHash = await generatePhoneHash({
        phoneNumber: phoneNumber,
        peppers: peppers,
        pepperVersion: PEPPER_VERSION,
    });
    return getPhoneAuthenticationTypeByHash({
        db,
        phoneHash,
        didWrite,
    });
}

export async function getZKPAuthenticationType({
    db,
    nullifier,
    didWrite,
}: GetZKPAuthenticationType): Promise<AuthTypeAndUserId> {
    const isNullifierAvailableVal = await isNullifierAvailable(db, nullifier);
    const didWriteAssociationWithNullifierStatus: DidAssociationStatus =
        await getDidWriteAssociationWithNullifier({
            db,
            didWrite,
            nullifier,
        });
    const userId = await getOrGenerateUserIdFromNullifier(db, nullifier);
    switch (didWriteAssociationWithNullifierStatus) {
        case "does_not_exist":
            if (isNullifierAvailableVal) {
                return { type: "register", userId: userId };
            } else {
                return { type: "login_new_device", userId: userId };
            }
        case "associated":
            return {
                type: "login_known_device",
                userId: userId,
            };
        case "not_associated":
            return { type: "associated_with_another_user", userId: userId };
    }
}

export async function authenticateAttempt({
    db,
    authenticateRequestBody,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    userAgent,
    throttleSmsSecondsInterval,
    testCode,
    doUseTestCode,
    peppers,
    twilioClient,
    twilioServiceSid,
}: AuthenticateAttemptProps): Promise<AuthenticateResponse> {
    const now = nowZeroMs();
    const { type, userId } = await getPhoneAuthenticationTypeByNumber({
        db,
        phoneNumber: authenticateRequestBody.phoneNumber,
        didWrite,
        peppers,
    });
    if (type === "associated_with_another_user") {
        return {
            success: false,
            reason: type,
        };
    }
    const resultHasAttempted = await db
        .select({
            codeExpiry: authAttemptPhoneTable.codeExpiry,
            lastOtpSentAt: authAttemptPhoneTable.lastOtpSentAt,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    if (resultHasAttempted.length === 0) {
        // this is a first attempt, generate new code, insert data and send email in one transaction
        return await insertAuthAttemptCode({
            db,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            userAgent,
            authenticateRequestBody,
            throttleSmsSecondsInterval,
            doUseTestCode,
            testCode,
            peppers,
            twilioClient,
            twilioServiceSid,
        });
    } else if (authenticateRequestBody.isRequestingNewCode) {
        // if user wants to regenerate new code, do it (if possible according to throttling rules)
        return await updateAuthAttemptCode({
            db,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody,
            throttleSmsSecondsInterval,
            // awsMailConf,
            doUseTestCode,
            testCode,
            peppers,
            twilioClient,
            twilioServiceSid,
        });
    } else if (resultHasAttempted[0].codeExpiry > now) {
        // code hasn't expired
        const nextCodeSoonestTime = resultHasAttempted[0].lastOtpSentAt;
        nextCodeSoonestTime.setSeconds(
            nextCodeSoonestTime.getSeconds() + throttleSmsSecondsInterval,
        );
        return {
            success: true,
            codeExpiry: resultHasAttempted[0].codeExpiry,
            nextCodeSoonestTime: nextCodeSoonestTime,
        };
    } else {
        // code has expired, generate a new one if not throttled
        return await updateAuthAttemptCode({
            db,
            type,
            userId,
            minutesBeforeSmsCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody,
            throttleSmsSecondsInterval,
            // awsMailConf,
            doUseTestCode,
            testCode,
            peppers,
            twilioClient,
            twilioServiceSid,
        });
    }
}

export async function sendOtpPhoneNumber({
    phoneNumber,
    twilioClient,
    twilioServiceSid,
}: SendOtpPhoneNumberProps) {
    // TODO: verify phone number validity with Twilio before sending the SMS
    const verification = await twilioClient.verify.v2
        .services(twilioServiceSid)
        .verifications.create({
            channel: "sms",
            to: phoneNumber,
        });
    if (verification.status !== "pending") {
        log.error(
            `Error while sending SMS with Twilio: ${JSON.stringify(
                verification.toJSON(),
            )} `,
        );
        throw httpErrors.internalServerError("Error while sending SMS");
    }
}

interface GeneratePhoneHashProps {
    phoneNumber: string;
    peppers: string[];
    pepperVersion: number;
}

async function generatePhoneHash({
    phoneNumber,
    peppers,
    pepperVersion,
}: GeneratePhoneHashProps): Promise<string> {
    const pepper = base64.base64Decode(peppers[pepperVersion]); // we don't rotate peppers yet
    const hash = await hashWithSalt({
        value: phoneNumber,
        salt: pepper,
    });
    const phoneHash = base64.base64Encode(hash);
    return phoneHash;
}

export async function insertAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    now,
    userAgent,
    authenticateRequestBody,
    throttleSmsSecondsInterval,
    testCode,
    doUseTestCode,
    peppers,
    twilioClient,
    twilioServiceSid,
}: InsertAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    const doSendViaSms =
        twilioClient !== undefined && twilioServiceSid !== undefined;
    if (doUseTestCode && doSendViaSms) {
        throw httpErrors.badRequest("Test code shall not be sent via sms");
    }
    const phoneHash = await generatePhoneHash({
        phoneNumber: authenticateRequestBody.phoneNumber,
        peppers: peppers,
        pepperVersion: PEPPER_VERSION,
    });
    const isThrottled = await isThrottledByPhoneHash(
        db,
        phoneHash,
        throttleSmsSecondsInterval,
        minutesBeforeSmsCodeExpiry,
    );
    if (isThrottled) {
        return {
            success: false,
            reason: "throttled",
        };
    }
    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
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
    if (doSendViaSms) {
        // may throw errors and return 500 :)
        // TODO: migrate away from Twilio Verify to Pinpoint as currently the oneTimeCode we generate is unused
        await sendOtpPhoneNumber({
            phoneNumber: phoneNumber.number,
            twilioClient,
            twilioServiceSid,
        });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    if (
        phoneNumber.country === undefined &&
        phoneNumber.getPossibleCountries.length === 0
    ) {
        log.warn("Cannot infer phone country code from phone number");
    }
    const phoneCountryCode =
        (phoneNumber.country ?? phoneNumber.getPossibleCountries().length !== 0)
            ? phoneNumber.getPossibleCountries()[0]
            : undefined;
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
    const nextCodeSoonestTime = new Date(now);
    nextCodeSoonestTime.setSeconds(
        nextCodeSoonestTime.getSeconds() + throttleSmsSecondsInterval,
    );
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

export async function updateAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeSmsCodeExpiry,
    didWrite,
    now,
    authenticateRequestBody,
    throttleSmsSecondsInterval,
    doUseTestCode,
    testCode,
    peppers,
    twilioClient,
    twilioServiceSid,
}: UpdateAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    const doSendViaSms =
        twilioClient !== undefined && twilioServiceSid !== undefined;
    if (doUseTestCode && doSendViaSms) {
        throw httpErrors.badRequest("Test code shall not be sent via sms");
    }
    const pepperVersion = 0;
    const pepper = base64.base64Decode(peppers[pepperVersion]); // we don't rotate peppers yet
    const hash = await hashWithSalt({
        value: authenticateRequestBody.phoneNumber,
        salt: pepper,
    });
    const phoneHash = base64.base64Encode(hash);
    const isThrottled = await isThrottledByPhoneHash(
        db,
        phoneHash,
        throttleSmsSecondsInterval,
        minutesBeforeSmsCodeExpiry,
    );
    if (isThrottled) {
        return {
            success: false,
            reason: "throttled",
        };
    }
    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeSmsCodeExpiry);
    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        {
            defaultCallingCode: authenticateRequestBody.defaultCallingCode,
        },
    );
    if (phoneNumber === undefined) {
        throw httpErrors.badRequest("Phone number cannot be parsed correctly");
    }
    if (doSendViaSms) {
        await sendOtpPhoneNumber({
            phoneNumber: phoneNumber.number,
            twilioClient,
            twilioServiceSid,
        });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    if (
        phoneNumber.country === undefined &&
        phoneNumber.getPossibleCountries.length === 0
    ) {
        log.warn("Cannot infer phone country code from phone number");
    }
    const phoneCountryCode =
        (phoneNumber.country ?? phoneNumber.getPossibleCountries().length !== 0)
            ? phoneNumber.getPossibleCountries()[0]
            : undefined;
    const countryCallingCode = phoneNumber.countryCallingCode;
    const lastTwoDigits = phoneNumber.number.slice(-2);
    await db
        .update(authAttemptPhoneTable)
        .set({
            userId: userId,
            type: type,
            lastTwoDigits: parseInt(lastTwoDigits),
            countryCallingCode: countryCallingCode,
            phoneCountryCode: phoneCountryCode,
            phoneHash: phoneHash,
            pepperVersion: pepperVersion,
            code: oneTimeCode,
            codeExpiry: codeExpiry,
            guessAttemptAmount: 0,
            lastOtpSentAt: now,
            updatedAt: now,
        })
        .where(eq(authAttemptPhoneTable.didWrite, didWrite));
    const nextCodeSoonestTime = new Date(now);
    nextCodeSoonestTime.setSeconds(
        nextCodeSoonestTime.getSeconds() + throttleSmsSecondsInterval,
    );
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

// throttleSmsSecondsInterval: "10" in "we allow one sms every 10 seconds"
export async function isThrottledByPhoneHash(
    db: PostgresDatabase,
    phoneHash: string,
    throttleSmsSecondsInterval: number,
    minutesBeforeSmsCodeExpiry: number,
): Promise<boolean> {
    const now = nowZeroMs();
    // now - 10 seconds if throttleSmsSecondsInterval == 10
    const secondsIntervalAgo = new Date(now);
    secondsIntervalAgo.setSeconds(
        secondsIntervalAgo.getSeconds() - throttleSmsSecondsInterval,
    );

    const results = await db
        .select({
            lastOtpSentAt: authAttemptPhoneTable.lastOtpSentAt,
            codeExpiry: authAttemptPhoneTable.codeExpiry,
        })
        .from(authAttemptPhoneTable)
        .where(eq(authAttemptPhoneTable.phoneHash, phoneHash));
    for (const result of results) {
        const expectedExpiryTime = new Date(result.lastOtpSentAt);
        expectedExpiryTime.setMinutes(
            expectedExpiryTime.getMinutes() + minutesBeforeSmsCodeExpiry,
        );
        if (
            result.lastOtpSentAt.getTime() > secondsIntervalAgo.getTime() &&
            expectedExpiryTime.getTime() === result.codeExpiry.getTime() // code hasn't been guessed, because otherwise it would have been manually expired before the normal expiry time
        ) {
            return true;
        }
    }
    return false;
}

// !WARNING: check should already been done that the device exists and is logged in
// TODO: make sure the key cannot be reused, since we delete the key in our front? probably not
export async function logout(db: PostgresDatabase, didWrite: string) {
    const now = nowZeroMs();
    return await db
        .update(deviceTable)
        .set({
            sessionExpiry: now,
            updatedAt: now,
        })
        .where(eq(deviceTable.didWrite, didWrite));
}
