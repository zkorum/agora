// util service to get data about devices, users, emails, etc
import {
    conversationTable,
    deviceTable,
    emailTable,
    opinionTable,
    organizationTable,
    phoneTable,
    userOrganizationMappingTable,
    userTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import { and, eq, gt } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { IsLoggedInResponse } from "@/shared/types/dto-auth.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import { nowZeroMs } from "@/shared/util.js";
import { httpErrors } from "@fastify/sensible";
import type {
    DeviceLoginStatusExtended,
    ParticipationMode,
} from "@/shared/types/zod.js";

// Internal type extending the API type with sessionExpiry for the isKnown=true case.
// sessionExpiry is internal-only — NOT exposed in the check-login-status API response.
type DeviceStatusKnownWithSession = Extract<
    DeviceLoginStatusExtended,
    { isKnown: true }
> & {
    sessionExpiry: Date;
};
export type DeviceLoginStatusInternal =
    | DeviceStatusKnownWithSession
    | Extract<DeviceLoginStatusExtended, { isKnown: false }>;
import * as authService from "@/service/auth.js";
import { log } from "@/app.js";

interface InfoDevice {
    userAgent: string;
    userId: string;
    sessionExpiry: Date;
}

interface IsSiteModeratorParams {
    db: PostgresDatabase;
    userId: string;
}

export async function isSiteModeratorAccount({
    db,
    userId,
}: IsSiteModeratorParams): Promise<boolean> {
    const userTableResponse = await db
        .select({ isSiteModerator: userTable.isSiteModerator })
        .from(userTable)
        .where(eq(userTable.id, userId));
    if (userTableResponse.length === 1) {
        return userTableResponse[0].isSiteModerator;
    } else {
        throw httpErrors.internalServerError(
            "User table returned more than 1 response while checking if a user is a site moderator",
        );
    }
}

interface IsSiteOrgAdminParams {
    db: PostgresDatabase;
    userId: string;
}

export async function isSiteOrgAdminAccount({
    db,
    userId,
}: IsSiteOrgAdminParams): Promise<boolean> {
    const userTableResponse = await db
        .select({ isSiteOrgAdmin: userTable.isSiteOrgAdmin })
        .from(userTable)
        .where(eq(userTable.id, userId));
    if (userTableResponse.length === 1) {
        return userTableResponse[0].isSiteOrgAdmin;
    } else {
        throw httpErrors.internalServerError(
            "User table returned more than 1 response while checking if a user is a site org admin",
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
    participationMode: ParticipationMode;
    userAgent: string;
    now: Date;
}

export async function getOrRegisterUserIdFromDeviceStatus({
    db,
    didWrite,
    participationMode,
    userAgent,
    now,
}: GetOrRegisterUserIdFromDeviceStatusProps): Promise<string> {
    const deviceStatus = await getDeviceStatus({
        db,
        didWrite,
        now,
    });
    // For non-guest modes, the user must be registered and logged in.
    // The specific verification check (strong/email) is done separately
    // in voting.ts, comment.ts, and poll.ts.
    if (participationMode !== "guest") {
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
    return await db.transaction(async (tx) => {
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

interface IsUserPartOfOrganizationByIdProps {
    db: PostgresDatabase;
    userId: string;
    organizationId: number;
}

export async function isUserPartOfOrganizationById({
    db,
    userId,
    organizationId,
}: IsUserPartOfOrganizationByIdProps): Promise<boolean> {
    const result = await db
        .select({ id: userOrganizationMappingTable.id })
        .from(userOrganizationMappingTable)
        .where(
            and(
                eq(userOrganizationMappingTable.userId, userId),
                eq(userOrganizationMappingTable.organizationId, organizationId),
            ),
        )
        .limit(1);
    return result.length > 0;
}

interface GetDeviceStatusParams {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
}

/**
 * Get device authentication status
 *
 * AUTHENTICATION TAXONOMY:
 * - Unknown device: No record in database (isKnown: false)
 * - Guest (soft login): Device exists, user has NO strong credentials
 *   - Can be "logged in" with sessionExpiry, but isLoggedIn returns false for guests
 * - Zupass-only (soft verification): Guest with event tickets, NOT counted as registered
 * - Registered (hard verification): User has phone, Rarimo, or email credentials (isRegistered: true)
 *   - Only registered users can be "logged in" (isLoggedIn: true)
 *
 * CREDENTIAL HIERARCHY:
 * - Strong credentials (phone/Rarimo/email): Checked by this function, grant isRegistered: true
 * - Soft credentials (Zupass): NOT checked here, users remain guests (isRegistered: false)
 *
 * DELETED USER HANDLING:
 * - Deleted users are treated as unknown devices (isKnown: false)
 * - No recovery window - deleted accounts are permanently gone
 */
export async function getDeviceStatus({
    db,
    didWrite,
    now,
}: GetDeviceStatusParams): Promise<DeviceLoginStatusInternal> {
    const resultDevice = await db
        .select({
            sessionExpiry: deviceTable.sessionExpiry,
            phoneTableId: phoneTable.id,
            phoneLastTwoDigits: phoneTable.lastTwoDigits,
            phoneCountryCallingCode: phoneTable.countryCallingCode,
            zkPassportTableId: zkPassportTable.id,
            zkPassportCitizenship: zkPassportTable.citizenship,
            zkPassportSex: zkPassportTable.sex,
            emailTableId: emailTable.id,
            email: emailTable.email,
            userId: deviceTable.userId,
            isDeleted: userTable.isDeleted,
        })
        .from(deviceTable)
        .innerJoin(userTable, eq(deviceTable.userId, userTable.id))
        .leftJoin(
            zkPassportTable,
            and(
                eq(zkPassportTable.userId, deviceTable.userId),
                eq(zkPassportTable.isDeleted, false),
            ),
        )
        .leftJoin(
            phoneTable,
            and(
                eq(phoneTable.userId, deviceTable.userId),
                eq(phoneTable.isDeleted, false),
            ),
        )
        .leftJoin(
            emailTable,
            and(
                eq(emailTable.userId, deviceTable.userId),
                eq(emailTable.isDeleted, false),
            ),
        )
        .where(eq(deviceTable.didWrite, didWrite));

    if (resultDevice.length === 0) {
        log.info(`[AuthUtil] Device not found in database for didWrite`);
        return {
            isKnown: false,
            isLoggedIn: false,
            isRegistered: false,
            credentials: { email: null, phone: null, rarimo: null },
        };
    }

    const device = resultDevice[0];

    // If user is deleted, treat as unknown device (no recovery)
    if (device.isDeleted) {
        log.info(`[AuthUtil] User is deleted - returning isKnown: false`);
        return {
            isKnown: false,
            isLoggedIn: false,
            isRegistered: false,
            credentials: { email: null, phone: null, rarimo: null },
        };
    }

    const sessionExpiry = device.sessionExpiry;
    const isLoggedIn = sessionExpiry.getTime() > now.getTime();
    // isRegistered: true if user has phone, Rarimo, or email (strong credentials)
    // Zupass tickets are NOT checked here - they are "soft credentials"
    const isRegistered =
        device.phoneTableId !== null ||
        device.zkPassportTableId !== null ||
        device.emailTableId !== null;

    const credentials = {
        email: device.email,
        phone:
            device.phoneLastTwoDigits !== null &&
            device.phoneCountryCallingCode !== null
                ? {
                      lastTwoDigits: device.phoneLastTwoDigits,
                      countryCallingCode: device.phoneCountryCallingCode,
                  }
                : null,
        // TODO: handle more gracefully when nullifier exists but citizenship/sex is missing.
        // We should return whatever fields we have (partial data), and only allow
        // the user to click on "ID Verified" when info beyond the nullifier is present.
        rarimo:
            device.zkPassportCitizenship !== null &&
            device.zkPassportSex !== null
                ? {
                      citizenship: device.zkPassportCitizenship,
                      sex: device.zkPassportSex,
                  }
                : null,
    };

    // Device is known (not deleted)
    return {
        isKnown: true,
        isLoggedIn: isRegistered && isLoggedIn,
        isRegistered: isRegistered,
        userId: device.userId,
        credentials,
        sessionExpiry,
    };
}

interface HasStrongVerificationParams {
    db: PostgresDatabase;
    userId: string;
}

/**
 * Checks if user has "strong verification" credentials (phone or Rarimo passport).
 * Email-only users do NOT qualify.
 */
export async function hasStrongVerification({
    db,
    userId,
}: HasStrongVerificationParams): Promise<boolean> {
    const result = await db
        .select({
            phoneId: phoneTable.id,
            zkPassportId: zkPassportTable.id,
        })
        .from(userTable)
        .leftJoin(
            phoneTable,
            and(
                eq(phoneTable.userId, userTable.id),
                eq(phoneTable.isDeleted, false),
            ),
        )
        .leftJoin(
            zkPassportTable,
            and(
                eq(zkPassportTable.userId, userTable.id),
                eq(zkPassportTable.isDeleted, false),
            ),
        )
        .where(eq(userTable.id, userId));

    if (result.length === 0) {
        return false;
    }
    return result[0].phoneId !== null || result[0].zkPassportId !== null;
}

interface HasEmailVerificationParams {
    db: PostgresDatabase;
    userId: string;
}

/**
 * Checks if user has email verification credentials.
 * Phone/Rarimo alone do NOT count — this specifically checks for email.
 */
export async function hasEmailVerification({
    db,
    userId,
}: HasEmailVerificationParams): Promise<boolean> {
    const result = await db
        .select({
            emailId: emailTable.id,
        })
        .from(userTable)
        .leftJoin(
            emailTable,
            and(
                eq(emailTable.userId, userTable.id),
                eq(emailTable.isDeleted, false),
            ),
        )
        .where(eq(userTable.id, userId));

    if (result.length === 0) {
        return false;
    }
    return result[0].emailId !== null;
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
        .where(
            and(
                eq(deviceTable.didWrite, didWrite),
                eq(emailTable.isDeleted, false),
            ),
        );
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
        .where(and(eq(userTable.id, userId), eq(emailTable.isDeleted, false)));
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
    const canonicalEmail = normalizeEmail(email);

    const result = await db
        .select()
        .from(userTable)
        .leftJoin(emailTable, eq(emailTable.userId, userTable.id))
        .leftJoin(deviceTable, eq(deviceTable.userId, userTable.id))
        .where(
            and(
                eq(emailTable.email, canonicalEmail),
                eq(deviceTable.didWrite, didWrite),
                eq(emailTable.isDeleted, false),
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

interface CanModerateConversationResult {
    isAuthorized: boolean;
    isSiteModerator: boolean;
}

interface CanModerateConversationParams {
    db: PostgresDatabase;
    userId: string;
    conversationSlugId: string;
}

/**
 * Checks if a user can moderate content in a conversation.
 * Returns authorized if user is a site moderator, the conversation author,
 * or a member of the organization that owns the conversation.
 */
export async function canModerateConversation({
    db,
    userId,
    conversationSlugId,
}: CanModerateConversationParams): Promise<CanModerateConversationResult> {
    const isMod = await isSiteModeratorAccount({ db, userId });
    if (isMod) {
        return { isAuthorized: true, isSiteModerator: true };
    }

    const conversation = await db
        .select({
            authorId: conversationTable.authorId,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        throw httpErrors.notFound("Conversation not found");
    }

    const isAuthor = conversation[0].authorId === userId;
    if (isAuthor) {
        return { isAuthorized: true, isSiteModerator: false };
    }

    if (conversation[0].organizationId !== null) {
        const isOrgMember = await isUserPartOfOrganizationById({
            db,
            userId,
            organizationId: conversation[0].organizationId,
        });
        if (isOrgMember) {
            return { isAuthorized: true, isSiteModerator: false };
        }
    }

    return { isAuthorized: false, isSiteModerator: false };
}

interface CanModerateConversationByOpinionSlugIdParams {
    db: PostgresDatabase;
    userId: string;
    opinionSlugId: string;
}

/**
 * Like canModerateConversation but resolves the conversation from an opinion slugId.
 */
export async function canModerateConversationByOpinionSlugId({
    db,
    userId,
    opinionSlugId,
}: CanModerateConversationByOpinionSlugIdParams): Promise<CanModerateConversationResult> {
    const opinionResult = await db
        .select({
            conversationSlugId: conversationTable.slugId,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .where(eq(opinionTable.slugId, opinionSlugId))
        .limit(1);

    if (opinionResult.length === 0) {
        throw httpErrors.notFound("Opinion not found");
    }

    return await canModerateConversation({
        db,
        userId,
        conversationSlugId: opinionResult[0].conversationSlugId,
    });
}
