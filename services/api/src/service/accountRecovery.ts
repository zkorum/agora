import { and, eq, gt, isNull, notExists, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import { getAccountLifecycle } from "@/shared-backend/accountLifecycle.js";
import { lockAccountConversations } from "@/shared-backend/accountContributions.js";
import {
    deviceTable,
    retiredDeviceKeyTable,
    userTable,
    emailTable,
    phoneTable,
    zkPassportTable,
} from "@/shared-backend/schema.js";
import { getAccountDatabaseTime } from "./accountDatabaseTime.js";
import { applyAccountLiveInputChange } from "./accountLiveInputs.js";
import { startHardAuthSession } from "./authSession.js";
import { restoreAccountDefaultResources } from "./accountOrganizationLifecycle.js";

// Only provider/OTP verification or the signed original-device route supplies this.
export type VerifiedRecoveryProof =
    | { method: "email"; email: string }
    | { method: "phone"; phoneHash: string }
    | { method: "passport"; nullifier: string }
    | { method: "guest_device"; didWrite: string };

type AccountRecoveryResult =
    | { success: true; accountMerged: false; userId: string }
    | { success: false; reason: "recovery_unavailable" };

async function ownsRecoveryProof({
    db,
    userId,
    proof,
}: {
    db: PostgresTransaction;
    userId: string;
    proof: VerifiedRecoveryProof;
}): Promise<boolean> {
    switch (proof.method) {
        case "email":
            return (
                (
                    await db
                        .select({ id: emailTable.id })
                        .from(emailTable)
                        .where(
                            and(
                                eq(emailTable.userId, userId),
                                eq(emailTable.email, proof.email),
                                eq(emailTable.reservedForRecovery, true),
                            ),
                        )
                        .for("update")
                ).length === 1
            );
        case "phone":
            return (
                (
                    await db
                        .select({ id: phoneTable.id })
                        .from(phoneTable)
                        .where(
                            and(
                                eq(phoneTable.userId, userId),
                                eq(phoneTable.phoneHash, proof.phoneHash),
                                eq(phoneTable.reservedForRecovery, true),
                            ),
                        )
                        .for("update")
                ).length === 1
            );
        case "passport":
            return (
                (
                    await db
                        .select({ id: zkPassportTable.id })
                        .from(zkPassportTable)
                        .where(
                            and(
                                eq(zkPassportTable.userId, userId),
                                eq(zkPassportTable.nullifier, proof.nullifier),
                                eq(zkPassportTable.reservedForRecovery, true),
                            ),
                        )
                        .for("update")
                ).length === 1
            );
        case "guest_device": {
            const devices = await db
                .select({ didWrite: deviceTable.didWrite })
                .from(deviceTable)
                .where(
                    and(
                        eq(deviceTable.userId, userId),
                        eq(deviceTable.didWrite, proof.didWrite),
                        notExists(
                            db
                                .select({ key: retiredDeviceKeyTable.didWrite })
                                .from(retiredDeviceKeyTable)
                                .where(
                                    eq(
                                        retiredDeviceKeyTable.didWrite,
                                        deviceTable.didWrite,
                                    ),
                                ),
                        ),
                        // Historical credentials also disqualify guest recovery.
                        notExists(
                            db
                                .select({ id: emailTable.id })
                                .from(emailTable)
                                .where(eq(emailTable.userId, userId)),
                        ),
                        notExists(
                            db
                                .select({ id: phoneTable.id })
                                .from(phoneTable)
                                .where(eq(phoneTable.userId, userId)),
                        ),
                        notExists(
                            db
                                .select({ id: zkPassportTable.id })
                                .from(zkPassportTable)
                                .where(eq(zkPassportTable.userId, userId)),
                        ),
                    ),
                )
                .for("update");
            return devices.length === 1;
        }
    }
}

export async function recoverGuestAccount({
    db,
    originalDidWrite,
    freshDidWrite,
    userAgent,
    sessionLifetimeDays,
}: {
    db: PostgresJsDatabase;
    originalDidWrite: string;
    freshDidWrite: string;
    userAgent: string;
    sessionLifetimeDays: number;
}): Promise<AccountRecoveryResult> {
    const primary = getPrimaryDatabase(db);
    const devices = await primary
        .select({ userId: deviceTable.userId })
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, originalDidWrite));
    const device = devices.at(0);
    if (device === undefined) {
        return { success: false, reason: "recovery_unavailable" };
    }

    return await primary.transaction(
        async (tx) =>
            await restoreAccountAfterVerification({
                db: tx,
                userId: device.userId,
                didWrite: freshDidWrite,
                proof: { method: "guest_device", didWrite: originalDidWrite },
                userAgent,
                sessionLifetimeDays,
            }),
    );
}

export async function restoreAccountAfterVerification({
    db,
    userId,
    didWrite,
    userAgent,
    sessionLifetimeDays,
    proof,
}: {
    db: PostgresTransaction;
    userId: string;
    didWrite: string;
    userAgent: string;
    sessionLifetimeDays: number;
    proof: VerifiedRecoveryProof;
}): Promise<AccountRecoveryResult> {
    const unavailable = {
        success: false,
        reason: "recovery_unavailable",
    } as const;
    const accounts = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .for("no key update");
    const account = accounts.at(0);
    if (account === undefined) return unavailable;
    const lifecycle = getAccountLifecycle(account);
    if (
        account.authRestrictedAt !== null ||
        lifecycle.state !== "pending_deletion"
    )
        return unavailable;
    await lockAccountConversations({ db, userId });
    if (!(await ownsRecoveryProof({ db, userId, proof }))) return unavailable;
    const existing = await db
        .select({ key: deviceTable.didWrite })
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, didWrite));
    const retired = await db
        .select({ key: retiredDeviceKeyTable.didWrite })
        .from(retiredDeviceKeyTable)
        .where(eq(retiredDeviceKeyTable.didWrite, didWrite));
    if (existing.length > 0 || retired.length > 0) return unavailable;
    const now = await getAccountDatabaseTime({ db, userId });
    const restored = await db
        .update(userTable)
        .set({
            isDeleted: false,
            deletedAt: null,
            deletionReason: null,
            deletionRequestedAt: null,
            recoverableUntil: null,
            updatedAt: now,
        })
        .where(
            and(
                eq(userTable.id, userId),
                isNull(userTable.purgeStartedAt),
                // Stored timestamps use UTC without a zone; do not inherit the session zone.
                gt(
                    userTable.recoverableUntil,
                    sql`clock_timestamp() AT TIME ZONE 'UTC'`,
                ),
            ),
        )
        .returning({ id: userTable.id });
    if (restored.length === 0) return unavailable;
    await restoreAccountDefaultResources({
        db,
        userId,
        requestedAt: lifecycle.requestedAt,
        now,
    });
    await db
        .update(emailTable)
        .set({ isDeleted: false, reservedForRecovery: false, updatedAt: now })
        .where(
            and(
                eq(emailTable.userId, userId),
                eq(emailTable.reservedForRecovery, true),
            ),
        );
    await db
        .update(phoneTable)
        .set({ isDeleted: false, reservedForRecovery: false, updatedAt: now })
        .where(
            and(
                eq(phoneTable.userId, userId),
                eq(phoneTable.reservedForRecovery, true),
            ),
        );
    await db
        .update(zkPassportTable)
        .set({ isDeleted: false, reservedForRecovery: false, updatedAt: now })
        .where(
            and(
                eq(zkPassportTable.userId, userId),
                eq(zkPassportTable.reservedForRecovery, true),
            ),
        );
    // Revoked keys must not become usable guest identities after account restoration.
    await db
        .insert(retiredDeviceKeyTable)
        .select(
            db
                .select({
                    didWrite: deviceTable.didWrite,
                    retiredAt:
                        sql<Date>`clock_timestamp() AT TIME ZONE 'UTC'`.as(
                            "retired_at",
                        ),
                })
                .from(deviceTable)
                .where(eq(deviceTable.userId, userId)),
        )
        .onConflictDoNothing();
    await applyAccountLiveInputChange({
        db,
        userId,
        change: { type: "restore" },
    });
    await startHardAuthSession({
        db,
        userId,
        didWrite,
        now,
        transition: { type: "new_device", userAgent },
        sessionExpiry: new Date(
            now.getTime() + sessionLifetimeDays * 24 * 60 * 60 * 1000,
        ),
    });
    return { success: true, accountMerged: false, userId };
}
