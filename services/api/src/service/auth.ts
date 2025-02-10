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
    GetDeviceStatusResp,
    VerifyOtp200,
} from "@/shared/types/dto.js";
import { eq, and } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { base64 } from "@/shared/common/index.js";
import parsePhoneNumberFromString, {
    type CountryCode,
} from "libphonenumber-js";
import { log } from "@/app.js";
import { PEPPER_VERSION, toUnionUndefined } from "@/shared/shared.js";
import type { HttpErrors } from "@fastify/sensible";
import { generateUnusedRandomUsername } from "./account.js";
import { isLoggedIn } from "./authUtil.js";
import * as polisService from "@/service/polis.js";
import type { AxiosInstance } from "axios";

interface VerifyOtpProps {
    db: PostgresDatabase;
    maxAttempt: number;
    didWrite: string;
    axiosPolis?: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    code: number;
    httpErrors: HttpErrors;
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
    axiosPolis?: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    now: Date;
    sessionExpiry: Date;
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
    axiosPolis?: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
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
    throttleSmsMinutesInterval: number;
    httpErrors: HttpErrors;
    doSend: boolean;
    testCode: number;
    doUseTestCode: boolean;
    peppers: string[];
}

interface UpdateAuthAttemptCodeProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    userId: string;
    minutesBeforeSmsCodeExpiry: number;
    didWrite: string;
    now: Date;
    authenticateRequestBody: AuthenticateRequestBody;
    throttleSmsMinutesInterval: number;
    httpErrors: HttpErrors;
    doSend: boolean;
    testCode: number;
    doUseTestCode: boolean;
    peppers: string[];
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
    throttleSmsMinutesInterval: number;
    httpErrors: HttpErrors;
    testCode: number;
    doUseTestCode: boolean;
    doSend: boolean;
    peppers: string[];
}

// interface SendOtpPhoneNumberProps {
//     phoneNumber: string;
//     phoneCountryCode: PhoneCountryCode;
//     otp: number;
// }

export async function getDeviceStatus(
    db: PostgresDatabase,
    didWrite: string,
    now: Date,
): Promise<GetDeviceStatusResp> {
    const resultDevice = await db
        .select({
            userId: deviceTable.userId,
            sessionExpiry: deviceTable.sessionExpiry,
        })
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, didWrite));
    if (resultDevice.length === 0) {
        // device has never been registered
        return undefined;
    } else {
        return {
            userId: resultDevice[0].userId,
            isLoggedIn: resultDevice[0].sessionExpiry > now,
            sessionExpiry: resultDevice[0].sessionExpiry,
        };
    }
}

export async function verifyPhoneOtp({
    db,
    maxAttempt,
    didWrite,
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
    code,
    httpErrors,
}: VerifyOtpProps): Promise<VerifyOtp200> {
    const now = nowZeroMs();
    const status = await isLoggedIn(db, didWrite);
    if (status.isLoggedIn) {
        return {
            success: false,
            reason: "already_logged_in",
        };
    }
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
    if (resultOtp[0].codeExpiry <= now) {
        return { success: false, reason: "expired_code" };
    } else if (resultOtp[0].code === code) {
        const loginSessionExpiry = new Date(now);
        loginSessionExpiry.setFullYear(loginSessionExpiry.getFullYear() + 1000);
        switch (type) {
            case "register": {
                await registerWithPhoneNumber({
                    db,
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
                    axiosPolis: axiosPolis,
                    polisUserEmailDomain,
                    polisUserEmailLocalPart,
                    polisUserPassword,
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
                    userAgent: resultOtp[0].userAgent,
                    userId: userId,
                    now,
                    sessionExpiry: loginSessionExpiry,
                });
                return {
                    success: true,
                };
            }
        }
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
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
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
        if (axiosPolis !== undefined) {
            await polisService.createUser({
                axiosPolis,
                polisUserEmailDomain,
                polisUserEmailLocalPart,
                polisUserPassword,
                userId,
            });
        }
    });
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
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
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
        if (axiosPolis !== undefined) {
            await polisService.createUser({
                axiosPolis,
                polisUserEmailDomain,
                polisUserEmailLocalPart,
                polisUserPassword,
                userId,
            });
        }
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
        .where(eq(phoneTable.phoneHash, phoneHash));
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
        .where(eq(phoneTable.phoneHash, phoneHash));
    if (result.length === 0) {
        // The phone number is not associated with any existing user
        // But maybe it was already used to attempt a register
        const resultAttempt = await db
            .select({ userId: authAttemptPhoneTable.userId })
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.phoneHash, phoneHash));
        if (resultAttempt.length === 0) {
            // this email has never been used to attempt a register
            return generateUUID();
        } else {
            // at this point every userId in attempts should be identical, by design
            return resultAttempt[0].userId;
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
    throttleSmsMinutesInterval,
    httpErrors,
    testCode,
    doUseTestCode,
    doSend,
    peppers,
}: AuthenticateAttemptProps): Promise<AuthenticateResponse> {
    const now = nowZeroMs();
    // TODO: move this check to verifyUCAN directly in the controller:
    const status = await isLoggedIn(db, didWrite);
    if (status.isLoggedIn) {
        return {
            success: false,
            reason: "already_logged_in",
        };
    }

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
            throttleSmsMinutesInterval,
            httpErrors,
            doSend,
            doUseTestCode,
            testCode,
            peppers,
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
            throttleSmsMinutesInterval,
            httpErrors,
            doSend,
            // awsMailConf,
            doUseTestCode,
            testCode,
            peppers,
        });
    } else if (resultHasAttempted[0].codeExpiry > now) {
        // code hasn't expired
        const nextCodeSoonestTime = resultHasAttempted[0].lastOtpSentAt;
        nextCodeSoonestTime.setMinutes(
            nextCodeSoonestTime.getMinutes() + throttleSmsMinutesInterval,
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
            throttleSmsMinutesInterval,
            httpErrors,
            doSend,
            // awsMailConf,
            doUseTestCode,
            testCode,
            peppers,
        });
    }
}

// export async function sendOtpPhoneNumber({ phoneNumber, phoneCountryCode, otp, awsMailConf }: SendOtpPhoneNumberProps) {
//     // TODO: verify phone number validity with Twilio
//     return
// }

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
    throttleSmsMinutesInterval,
    httpErrors,
    testCode,
    doUseTestCode,
    doSend,
    peppers, // awsMailConf,
}: InsertAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    if (doUseTestCode && doSend) {
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
        throttleSmsMinutesInterval,
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
    if (doSend) {
        // may throw errors and return 500 :)
        // await sendOtpPhoneNumber({
        //     phoneNumber: authenticateRequestBody.phoneNumber,
        //     phoneCountryCode: authenticateRequestBody.phoneCountryCode,
        //     otp: oneTimeCode,
        //     awsMailConf,
        // });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        {
            defaultCallingCode: authenticateRequestBody.defaultCallingCode,
        },
    );
    if (!phoneNumber) {
        throw httpErrors.badRequest("Phone number cannot be parsed correctly");
    }
    if (
        phoneNumber.country === undefined &&
        phoneNumber.getPossibleCountries.length === 0
    ) {
        log.warn("Cannot infer phone country code from phone number");
    }
    const phoneCountryCode =
        phoneNumber.country ?? phoneNumber.getPossibleCountries().length !== 0
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
    nextCodeSoonestTime.setMinutes(
        nextCodeSoonestTime.getMinutes() + throttleSmsMinutesInterval,
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
    throttleSmsMinutesInterval,
    httpErrors,
    doSend,
    doUseTestCode,
    testCode,
    peppers,
}: UpdateAuthAttemptCodeProps): Promise<AuthenticateResponse> {
    if (doUseTestCode && doSend) {
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
        throttleSmsMinutesInterval,
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
    if (doSend) {
        // await sendOtpPhoneNumber({
        //     phoneNumber: authenticateRequestBody.phoneNumber,
        //     phoneCountryCode: authenticateRequestBody.phoneCountryCode,
        //     otp: oneTimeCode,
        //     awsMailConf,
        // });
    } else {
        console.log("\n\nCode:", codeToString(oneTimeCode), codeExpiry, "\n\n");
    }
    const phoneNumber = parsePhoneNumberFromString(
        authenticateRequestBody.phoneNumber,
        {
            defaultCallingCode: authenticateRequestBody.defaultCallingCode,
        },
    );
    if (!phoneNumber) {
        throw httpErrors.badRequest("Phone number cannot be parsed correctly");
    }
    if (
        phoneNumber.country === undefined &&
        phoneNumber.getPossibleCountries.length === 0
    ) {
        log.warn("Cannot infer phone country code from phone number");
    }
    const phoneCountryCode =
        phoneNumber.country ?? phoneNumber.getPossibleCountries().length !== 0
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
    nextCodeSoonestTime.setMinutes(
        nextCodeSoonestTime.getMinutes() + throttleSmsMinutesInterval,
    );
    return {
        success: true,
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

// minutesInterval: "3" in "we allow one sms every 3 minutes"
export async function isThrottledByPhoneHash(
    db: PostgresDatabase,
    phoneHash: string,
    minutesInterval: number,
    minutesBeforeSmsCodeExpiry: number,
): Promise<boolean> {
    const now = nowZeroMs();
    // now - 3 minutes if minutesInterval == 3
    const minutesIntervalAgo = new Date(now);
    minutesIntervalAgo.setMinutes(
        minutesIntervalAgo.getMinutes() - minutesInterval,
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
            result.lastOtpSentAt.getTime() >= minutesIntervalAgo.getTime() &&
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
