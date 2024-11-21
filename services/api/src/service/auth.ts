import {
    codeToString,
    generateOneTimeCode,
    generateUUID,
    hashWithSalt,
} from "@/crypto.js";
import {
    authAttemptPhoneTable,
    deviceTable,
    phoneTable,
    userTable,
} from "@/schema.js";
import { nowZeroMs } from "@/shared/common/util.js";
import type {
    AuthenticateRequestBody,
    GetDeviceStatusResp,
    VerifyOtp200,
} from "@/shared/types/dto.js";
import type { HttpErrors } from "@fastify/sensible/lib/httpError.js";
import { eq } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { base64 } from "@/shared/common/index.js";
import parsePhoneNumberFromString, {
    type CountryCode,
} from "libphonenumber-js";
import { log } from "@/app.js";
import { PEPPER_VERSION, toUnionUndefined } from "@/shared/shared.js";

interface VerifyOtpProps {
    db: PostgresDatabase;
    maxAttempt: number;
    didWrite: string;
    code: number;
    httpErrors: HttpErrors;
}

interface RegisterProps {
    db: PostgresDatabase;
    didWrite: string;
    lastTwoDigits: string;
    countryCallingCode: string;
    phoneCountryCode?: CountryCode;
    phoneHash: string;
    pepperVersion: number;
    userAgent: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
    userName: string;
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

interface AuthTypeAndUserId {
    userId: string;
    type: AuthenticateType;
}

interface AuthenticateAttemptProps {
    db: PostgresDatabase;
    type: AuthenticateType;
    authenticateRequestBody: AuthenticateRequestBody;
    userId: string;
    minutesBeforeCodeExpiry: number;
    didWrite: string;
    userAgent: string;
    throttleMinutesInterval: number;
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
    minutesBeforeCodeExpiry: number;
    didWrite: string;
    now: Date;
    authenticateRequestBody: AuthenticateRequestBody;
    throttleMinutesInterval: number;
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
    minutesBeforeCodeExpiry: number;
    didWrite: string;
    now: Date;
    userAgent: string;
    authenticateRequestBody: AuthenticateRequestBody;
    throttleMinutesInterval: number;
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

interface AuthenticateOtp {
    codeExpiry: Date;
    nextCodeSoonestTime: Date;
}

export async function getDeviceStatus(
    db: PostgresDatabase,
    didWrite: string,
): Promise<GetDeviceStatusResp> {
    const now = nowZeroMs();
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

export async function throwIfAlreadyLoggedIn(
    db: PostgresDatabase,
    didWrite: string,
    httpErrors: HttpErrors,
): Promise<GetDeviceStatusResp> {
    const deviceStatus = await getDeviceStatus(db, didWrite);
    if (deviceStatus !== undefined) {
        if (deviceStatus.isLoggedIn) {
            throw httpErrors.createError(409, "Conflict", {
                reason: "already_logged_in",
                userId: deviceStatus.userId,
                sessionExpiry: deviceStatus.sessionExpiry,
            });
        }
    }
    return deviceStatus;
}

export async function verifyOtp({
    db,
    maxAttempt,
    didWrite,
    code,
    httpErrors,
}: VerifyOtpProps): Promise<VerifyOtp200> {
    await throwIfAlreadyLoggedIn(db, didWrite, httpErrors);
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
    const now = nowZeroMs();
    if (resultOtp[0].codeExpiry <= now) {
        return { success: false, reason: "expired_code" };
    } else if (resultOtp[0].code === code) {
        const loginSessionExpiry = new Date(now);
        loginSessionExpiry.setFullYear(loginSessionExpiry.getFullYear() + 1000);
        switch (resultOtp[0].authType) {
        case "register": {
            await register({
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
                userId: resultOtp[0].userId,
                now,
                sessionExpiry: loginSessionExpiry,
                userName: "TEST USER"
            });
            return {
                success: true,
                userId: resultOtp[0].userId,
                sessionExpiry: loginSessionExpiry,
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
                userId: resultOtp[0].userId,
                sessionExpiry: loginSessionExpiry,
            };
        }
        case "login_new_device": {
            await loginNewDevice({
                db,
                didWrite,
                userAgent: resultOtp[0].userAgent,
                userId: resultOtp[0].userId,
                now,
                sessionExpiry: loginSessionExpiry,
            });
            return {
                success: true,
                userId: resultOtp[0].userId,
                sessionExpiry: loginSessionExpiry,
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
export async function register({
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
    userName
}: RegisterProps): Promise<void> {
    await db.transaction(async (tx) => {
        await tx
            .update(authAttemptPhoneTable)
            .set({
                codeExpiry: now, // this is important to forbid further usage of the same code once it has been successfully guessed
                updatedAt: now,
            })
            .where(eq(authAttemptPhoneTable.didWrite, didWrite));
        await tx.insert(userTable).values({
            userName: userName,
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

// ! WARN we assume the OTP was verified for login new device at this point
export async function loginNewDevice({
    db,
    didWrite,
    userId,
    userAgent,
    now,
    sessionExpiry,
}: LoginNewDeviceProps) {
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

// ! WARN we assume the OTP was verified and the device is already syncing
export async function loginKnownDevice({
    db,
    didWrite,
    now,
    sessionExpiry,
}: LoginProps) {
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

// should be up to date with DB value
// TODO: automatically sync them - use one type only
export enum AuthenticateType {
    REGISTER = "register",
    LOGIN_KNOWN_DEVICE = "login_known_device",
    LOGIN_NEW_DEVICE = "login_new_device",
}

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

export async function isDidWriteAvailable(
    db: PostgresDatabase,
    didWrite: string,
): Promise<boolean> {
    const result = await db
        .select()
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, didWrite));
    if (result.length === 0) {
        return true;
    } else {
        return false;
    }
}

export async function getOrGenerateUserId(
    db: PostgresDatabase,
    phoneNumber: string,
    peppers: string[],
): Promise<string> {
    const pepper = base64.base64Decode(peppers[0]); // for now we only support one unique app-wide pepper - we'll see when rotating
    const calculatedPhoneHash = await hashWithSalt({
        value: phoneNumber,
        salt: pepper,
    });
    const expectedPhoneHash = base64.base64Encode(calculatedPhoneHash);
    const result = await db
        .select({ userId: userTable.id })
        .from(userTable)
        .leftJoin(phoneTable, eq(phoneTable.userId, userTable.id))
        .where(eq(phoneTable.phoneHash, expectedPhoneHash));
    if (result.length === 0) {
        // The phone number is not associated with any existing user
        // But maybe it was already used to attempt a register
        const resultAttempt = await db
            .select({ userId: authAttemptPhoneTable.userId })
            .from(authAttemptPhoneTable)
            .where(eq(authAttemptPhoneTable.phoneHash, expectedPhoneHash));
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

export async function getAuthenticateType(
    db: PostgresDatabase,
    authenticateBody: AuthenticateRequestBody,
    didWrite: string,
    peppers: string[],
    httpErrors: HttpErrors,
): Promise<AuthTypeAndUserId> {

    const phoneHash = await generatePhoneHash({
        phoneNumber: authenticateBody.phoneNumber,
        peppers: peppers,
        pepperVersion: PEPPER_VERSION
    });

    const isPhoneNumberAvailableVal = await isPhoneNumberAvailable(
        db,
        phoneHash,
    );
    const isDidWriteAvailableVal = await isDidWriteAvailable(db, didWrite);
    const userId = await getOrGenerateUserId(
        db,
        authenticateBody.phoneNumber,
        peppers,
    );
    if (isPhoneNumberAvailableVal && isDidWriteAvailableVal) {
        return { type: AuthenticateType.REGISTER, userId: userId };
    } else if (!isPhoneNumberAvailableVal && isDidWriteAvailableVal) {
        return { type: AuthenticateType.LOGIN_NEW_DEVICE, userId: userId };
    } else if (!isPhoneNumberAvailableVal && !isDidWriteAvailableVal) {
        await throwIfAlreadyLoggedIn(db, didWrite, httpErrors);
        return {
            type: AuthenticateType.LOGIN_KNOWN_DEVICE,
            userId: userId,
        };
    } else {
        throw httpErrors.forbidden(
            `The DID is associated with another phone number`,
        );
    }
}

export async function authenticateAttempt({
    db,
    type,
    authenticateRequestBody,
    userId,
    minutesBeforeCodeExpiry,
    didWrite,
    userAgent,
    throttleMinutesInterval,
    httpErrors,
    testCode,
    doUseTestCode,
    doSend,
    peppers,
}: AuthenticateAttemptProps): Promise<AuthenticateOtp> {
    const now = nowZeroMs();
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
            minutesBeforeCodeExpiry,
            didWrite,
            now,
            userAgent,
            authenticateRequestBody,
            throttleMinutesInterval,
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
            minutesBeforeCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody,
            throttleMinutesInterval,
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
            nextCodeSoonestTime.getMinutes() + throttleMinutesInterval,
        );
        return {
            codeExpiry: resultHasAttempted[0].codeExpiry,
            nextCodeSoonestTime: nextCodeSoonestTime,
        };
    } else {
        // code has expired, generate a new one if not throttled
        return await updateAuthAttemptCode({
            db,
            type,
            userId,
            minutesBeforeCodeExpiry,
            didWrite,
            now,
            authenticateRequestBody,
            throttleMinutesInterval,
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
    phoneNumber: string,
    peppers: string[],
    pepperVersion: number
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
    minutesBeforeCodeExpiry,
    didWrite,
    now,
    userAgent,
    authenticateRequestBody,
    throttleMinutesInterval,
    httpErrors,
    testCode,
    doUseTestCode,
    doSend,
    peppers, // awsMailConf,
}: InsertAuthAttemptCodeProps): Promise<AuthenticateOtp> {
    if (doUseTestCode && doSend) {
        throw httpErrors.badRequest("Test code shall not be sent via sms");
    }
    const phoneHash = await generatePhoneHash({
        phoneNumber: authenticateRequestBody.phoneNumber,
        peppers: peppers,
        pepperVersion: PEPPER_VERSION
    });
    await throttleByPhoneHash(
        db,
        phoneHash,
        throttleMinutesInterval,
        minutesBeforeCodeExpiry,
        httpErrors,
    );
    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeCodeExpiry);
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
    const lastTwoDigits = authenticateRequestBody.phoneNumber.slice(-2);
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
    await db.insert(authAttemptPhoneTable).values({
        didWrite: didWrite,
        type: type,
        lastTwoDigits: lastTwoDigits,
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
        nextCodeSoonestTime.getMinutes() + throttleMinutesInterval,
    );
    return {
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

export async function updateAuthAttemptCode({
    db,
    type,
    userId,
    minutesBeforeCodeExpiry,
    didWrite,
    now,
    authenticateRequestBody,
    throttleMinutesInterval,
    httpErrors,
    doSend,
    doUseTestCode,
    testCode,
    peppers,
}: UpdateAuthAttemptCodeProps): Promise<AuthenticateOtp> {
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
    await throttleByPhoneHash(
        db,
        phoneHash,
        throttleMinutesInterval,
        minutesBeforeCodeExpiry,
        httpErrors,
    );
    const oneTimeCode = doUseTestCode ? testCode : generateOneTimeCode();
    const codeExpiry = new Date(now);
    codeExpiry.setMinutes(codeExpiry.getMinutes() + minutesBeforeCodeExpiry);
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
    const lastTwoDigits = authenticateRequestBody.phoneNumber.slice(-2);
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
    await db
        .update(authAttemptPhoneTable)
        .set({
            userId: userId,
            type: type,
            lastTwoDigits: lastTwoDigits,
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
        nextCodeSoonestTime.getMinutes() + throttleMinutesInterval,
    );
    return {
        codeExpiry: codeExpiry,
        nextCodeSoonestTime: nextCodeSoonestTime,
    };
}

// minutesInterval: "3" in "we allow one sms every 3 minutes"
export async function throttleByPhoneHash(
    db: PostgresDatabase,
    phoneHash: string,
    minutesInterval: number,
    minutesBeforeCodeExpiry: number,
    httpErrors: HttpErrors,
) {
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
            expectedExpiryTime.getMinutes() + minutesBeforeCodeExpiry,
        );
        if (
            result.lastOtpSentAt.getTime() >= minutesIntervalAgo.getTime() &&
            expectedExpiryTime.getTime() === result.codeExpiry.getTime() // code hasn't been guessed, because otherwise it would have been manually expired before the normal expiry time
        ) {
            throw httpErrors.tooManyRequests("Throttling amount of sms sent");
        }
    }
}

// ! WARNING check should already been done that the device exists and is logged in
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
