// util service to get data about devices, users, emails, etc
import {
    deviceTable,
    emailTable,
    organizationTable,
    phoneTable,
    userOrganizationMappingTable,
    userTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import { and, eq, gt } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { IsLoggedInResponse } from "@/shared/types/dto.js";
import { nowZeroMs } from "@/shared/util.js";
import { httpErrors } from "@fastify/sensible";
import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";
import * as authService from "@/service/auth.js";

interface InfoDevice {
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
}

interface IsModeratorProps {
    db: PostgresDatabase;
    userId: string;
}

export async function isModeratorAccount({
    db,
    userId,
}: IsModeratorProps): Promise<boolean> {
    const userTableResponse = await db
        .select({ isModerator: userTable.isModerator })
        .from(userTable)
        .where(eq(userTable.id, userId));
    if (userTableResponse.length === 1) {
        const userItem = userTableResponse[0];
        return userItem.isModerator;
    } else {
        throw httpErrors.internalServerError(
            "User table returned more than 1 response while checking if a user is a moderator",
        );
    }
}

export async function isLoggedIn(
    db: PostgresDatabase,
    didWrite: string,
): Promise<IsLoggedInResponse> {
    const now = nowZeroMs();
    const resultDevice = await db
        .select({ userId: deviceTable.userId })
        .from(deviceTable)
        .where(
            and(
                eq(deviceTable.didWrite, didWrite),
                gt(deviceTable.sessionExpiry, now),
            ),
        );
    if (resultDevice.length === 0) {
        // device has never been registered OR device is logged out
        return { isLoggedIn: false };
    } else {
        return { isLoggedIn: true, userId: resultDevice[0].userId };
    }
}

interface GetOrRegisterUserIdFromDeviceStatusProps {
    db: PostgresDatabase;
    didWrite: string;
    conversationIsIndexed: boolean;
    conversationIsLoginRequired: boolean;
    userAgent: string;
    now: Date;
}

export async function getOrRegisterUserIdFromDeviceStatus({
    db,
    didWrite,
    conversationIsIndexed,
    conversationIsLoginRequired,
    userAgent,
    now,
}: GetOrRegisterUserIdFromDeviceStatusProps): Promise<string> {
    const deviceStatus = await getDeviceStatus(db, didWrite);
    return await db.transaction(async (tx) => {
        if (conversationIsIndexed || conversationIsLoginRequired) {
            if (!deviceStatus.isKnown) {
                throw httpErrors.unauthorized("Device is unknown");
            } else if (!deviceStatus.isRegistered) {
                throw httpErrors.unauthorized(
                    "Device is not registered with a verified user",
                );
            } else if (!deviceStatus.isLoggedIn) {
                throw httpErrors.unauthorized("Device is not logged in");
            }
            return deviceStatus.userId;
        }
        if (deviceStatus.isKnown) {
            if (deviceStatus.isRegistered && !deviceStatus.isLoggedIn) {
                throw httpErrors.unauthorized(
                    "Registered device must be logged-in to add or delete content to their account",
                );
            }
            return deviceStatus.userId;
        }
        // save device and associate it with a brand new unverified user -- unless the device is already known
        const { userId } = await authService.createGuestUser({
            db: tx,
            didWrite,
            now,
            userAgent,
        });
        return userId;
    });
}

interface IsUserPartOfOrganizationProps {
    db: PostgresDatabase;
    userId: string;
    organizationName: string;
}

export async function isUserPartOfOrganization({
    db,
    userId,
    organizationName,
}: IsUserPartOfOrganizationProps): Promise<number | undefined> {
    const result = await db
        .select({ organizationId: organizationTable.id })
        .from(userTable)
        .innerJoin(
            userOrganizationMappingTable,
            eq(userTable.id, userOrganizationMappingTable.userId),
        )
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                userOrganizationMappingTable.organizationId,
            ),
        )
        .where(
            and(
                eq(userTable.id, userId),
                eq(organizationTable.name, organizationName),
            ),
        );
    if (result.length === 0) {
        return undefined;
    }
    return result[0].organizationId;
}

export async function getDeviceStatus(
    db: PostgresDatabase,
    didWrite: string,
): Promise<DeviceLoginStatusExtended> {
    const now = nowZeroMs();
    const resultDevice = await db
        .select({
            sessionExpiry: deviceTable.sessionExpiry,
            phoneTableId: phoneTable.id,
            zkPassportTableId: zkPassportTable.id,
            userId: deviceTable.userId,
            isDeleted: userTable.isDeleted,
        })
        .from(deviceTable)
        .innerJoin(userTable, eq(deviceTable.userId, userTable.id))
        .leftJoin(
            zkPassportTable,
            eq(zkPassportTable.userId, deviceTable.userId),
        )
        .leftJoin(phoneTable, eq(phoneTable.userId, deviceTable.userId))
        .where(eq(deviceTable.didWrite, didWrite));
    if (resultDevice.length === 0 || resultDevice[0].isDeleted) {
        return { isKnown: false, isLoggedIn: false, isRegistered: false };
    } else {
        const sessionExpiry = resultDevice[0].sessionExpiry;
        const isLoggedIn = sessionExpiry.getTime() > now.getTime();
        const isRegistered =
            resultDevice[0].phoneTableId !== null ||
            resultDevice[0].zkPassportTableId !== null;
        return {
            isKnown: true,
            isLoggedIn: isRegistered && isLoggedIn,
            isRegistered: isRegistered,
            userId: resultDevice[0].userId,
        };
    }
}

export async function getEmailsFromDidWrite(
    db: PostgresDatabase,
    didWrite: string,
): Promise<string[]> {
    const results = await db
        .select({ email: emailTable.email })
        .from(emailTable)
        .leftJoin(userTable, eq(userTable.id, emailTable.userId))
        .leftJoin(deviceTable, eq(deviceTable.userId, emailTable.userId))
        .where(eq(deviceTable.didWrite, didWrite));
    if (results.length === 0) {
        return [];
    } else {
        return results.map((result) => result.email);
    }
}

export async function getEmailsFromUserId(
    db: PostgresDatabase,
    userId: string,
): Promise<string[]> {
    const results = await db
        .select({ email: emailTable.email })
        .from(emailTable)
        .leftJoin(userTable, eq(emailTable.userId, userTable.id))
        .where(eq(userTable.id, userId));
    if (results.length === 0) {
        return [];
    } else {
        return results.map((result) => result.email);
    }
}

export async function getInfoFromDevice(
    db: PostgresDatabase,
    didWrite: string,
): Promise<InfoDevice> {
    const results = await db
        .select({
            userId: userTable.id,
            userAgent: deviceTable.userAgent,
            sessionExpiry: deviceTable.sessionExpiry,
        })
        .from(userTable)
        .innerJoin(deviceTable, eq(deviceTable.userId, userTable.id))
        .where(eq(deviceTable.didWrite, didWrite));
    if (results.length === 0) {
        throw new Error("This didWrite is not registered to any user");
    }
    return {
        userId: results[0].userId,
        userAgent: results[0].userAgent,
        sessionExpiry: results[0].sessionExpiry,
    };
}

export async function isEmailAssociatedWithDevice(
    db: PostgresDatabase,
    didWrite: string,
    email: string,
): Promise<boolean> {
    const result = await db
        .select()
        .from(userTable)
        .leftJoin(emailTable, eq(emailTable.userId, userTable.id))
        .leftJoin(deviceTable, eq(deviceTable.userId, userTable.id))
        .where(
            and(
                eq(emailTable.email, email),
                eq(deviceTable.didWrite, didWrite),
            ),
        );
    if (result.length !== 0) {
        return true;
    } else {
        return false;
    }
}

export async function getUserIdFromDevice(
    db: PostgresDatabase,
    didWrite: string,
): Promise<string> {
    const results = await db
        .select({ userId: userTable.id })
        .from(userTable)
        .leftJoin(deviceTable, eq(deviceTable.userId, userTable.id))
        .where(eq(deviceTable.didWrite, didWrite));
    if (results.length === 0) {
        throw new Error("This didWrite is not registered to any user");
    }
    return results[0].userId;
}
