import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    deviceTable,
    realtimeEventOutboxTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { AuthSession } from "@/shared/types/dto-auth.js";
import { and, desc, eq, gt, lte, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

const authStateChangeReason = z.enum([
    "logout",
    "revoked",
    "logout_all",
    "account_deleted",
    "identity_changed",
    "session_reauthenticated",
]);

export const authStateChangedPayload = z
    .object({
        userIds: z.array(z.uuid()).min(1),
        reason: authStateChangeReason,
    })
    .strict();

type SessionRefreshDecision =
    | { type: "not_needed" }
    | {
          type: "refresh";
          expectedExpiry: Date;
          refreshedExpiry: Date;
      };

export function decideSessionRefresh({
    now,
    currentExpiry,
    refreshThresholdDays,
    sessionLifetimeDays,
}: {
    now: Date;
    currentExpiry: Date;
    refreshThresholdDays: number;
    sessionLifetimeDays: number;
}): SessionRefreshDecision {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry =
        (currentExpiry.getTime() - now.getTime()) / millisecondsPerDay;
    if (daysUntilExpiry >= refreshThresholdDays) {
        return { type: "not_needed" };
    }

    const refreshedExpiry = new Date(
        now.getTime() + sessionLifetimeDays * millisecondsPerDay,
    );
    return {
        type: "refresh",
        expectedExpiry: currentExpiry,
        refreshedExpiry,
    };
}

function createNewSessionStart({
    now,
    sessionExpiry,
}: {
    now: Date;
    sessionExpiry: Date;
}) {
    return {
        sessionStartedAt: now,
        sessionExpiry,
        updatedAt: now,
    };
}

export async function refreshSessionIfCurrent({
    db,
    didWrite,
    now,
    decision,
}: {
    db: PostgresJsDatabase;
    didWrite: string;
    now: Date;
    decision: Extract<SessionRefreshDecision, { type: "refresh" }>;
}): Promise<Date | undefined> {
    const primaryDb = getPrimaryDatabase(db);
    const refreshed = await primaryDb
        .update(deviceTable)
        .set({
            sessionExpiry: decision.refreshedExpiry,
            updatedAt: now,
        })
        .where(
            and(
                eq(deviceTable.didWrite, didWrite),
                eq(deviceTable.sessionExpiry, decision.expectedExpiry),
                gt(deviceTable.sessionExpiry, now),
            ),
        )
        .returning({ sessionExpiry: deviceTable.sessionExpiry });
    return refreshed.at(0)?.sessionExpiry;
}

interface SessionRow {
    didWrite: string;
    startedAt: Date;
    expiresAt: Date;
}

function toPublicSession(row: SessionRow): AuthSession {
    return {
        didWrite: row.didWrite,
        startedAt: row.startedAt,
        expiresAt: row.expiresAt,
    };
}

export async function listActiveSessions({
    db,
    userId,
    currentDidWrite,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    currentDidWrite: string;
    now: Date;
}): Promise<
    | {
          type: "active";
          currentSession: AuthSession;
          otherSessions: AuthSession[];
      }
    | { type: "current_session_revoked" }
> {
    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .select({
            didWrite: deviceTable.didWrite,
            startedAt: deviceTable.sessionStartedAt,
            expiresAt: deviceTable.sessionExpiry,
        })
        .from(deviceTable)
        .where(
            and(
                eq(deviceTable.userId, userId),
                gt(deviceTable.sessionExpiry, now),
            ),
        )
        .orderBy(desc(deviceTable.sessionStartedAt));

    const currentRow = rows.find((row) => row.didWrite === currentDidWrite);
    if (currentRow === undefined) {
        return { type: "current_session_revoked" };
    }
    const currentSession = toPublicSession(currentRow);
    const otherSessions = rows
        .filter((row) => row.didWrite !== currentDidWrite)
        .map(toPublicSession);
    return { type: "active", currentSession, otherSessions };
}

async function recordAuthStateChange({
    db,
    userIds,
    reason,
}: {
    db: PostgresJsDatabase;
    userIds: string[];
    reason: z.infer<typeof authStateChangeReason>;
}): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length === 0) {
        return;
    }
    const payload = authStateChangedPayload.parse({
        userIds: uniqueUserIds,
        reason,
    });
    await db.insert(realtimeEventOutboxTable).values({
        eventType: "auth_state_changed",
        payload,
    });
}

export async function revokeSession({
    db,
    userId,
    currentDidWrite,
    didWrite,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    currentDidWrite: string;
    didWrite: string;
    now: Date;
}): Promise<number> {
    const primaryDb = getPrimaryDatabase(db);
    return await primaryDb.transaction(async (tx) => {
        const revoked = await tx
            .update(deviceTable)
            .set({ sessionExpiry: now, updatedAt: now })
            .where(
                and(
                    eq(deviceTable.userId, userId),
                    eq(deviceTable.didWrite, didWrite),
                    ne(deviceTable.didWrite, currentDidWrite),
                    gt(deviceTable.sessionExpiry, now),
                ),
            )
            .returning({ userId: deviceTable.userId });
        await recordAuthStateChange({
            db: tx,
            userIds: revoked.map((row) => row.userId),
            reason: "revoked",
        });
        return revoked.length;
    });
}

export async function revokeAllSessions({
    db,
    userId,
    now,
    reason = "logout_all",
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    reason?: "logout_all" | "account_deleted";
}): Promise<number> {
    const primaryDb = getPrimaryDatabase(db);
    return await primaryDb.transaction(async (tx) => {
        return await revokeAllSessionsWithinTransaction({
            db: tx,
            userId,
            now,
            reason,
        });
    });
}

export async function revokeAllSessionsWithinTransaction({
    db,
    userId,
    now,
    reason,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    reason: "logout_all" | "account_deleted";
}): Promise<number> {
    const revoked = await db
        .update(deviceTable)
        .set({ sessionExpiry: now, updatedAt: now })
        .where(
            and(
                eq(deviceTable.userId, userId),
                gt(deviceTable.sessionExpiry, now),
            ),
        )
        .returning({ userId: deviceTable.userId });
    await recordAuthStateChange({
        db,
        userIds: revoked.map((row) => row.userId),
        reason,
    });
    return revoked.length;
}

export async function revokeCurrentSession({
    db,
    didWrite,
    now,
}: {
    db: PostgresJsDatabase;
    didWrite: string;
    now: Date;
}): Promise<number> {
    const primaryDb = getPrimaryDatabase(db);
    return await primaryDb.transaction(async (tx) => {
        const revoked = await tx
            .update(deviceTable)
            .set({ sessionExpiry: now, updatedAt: now })
            .where(
                and(
                    eq(deviceTable.didWrite, didWrite),
                    gt(deviceTable.sessionExpiry, now),
                ),
            )
            .returning({ userId: deviceTable.userId });
        await recordAuthStateChange({
            db: tx,
            userIds: revoked.map((row) => row.userId),
            reason: "logout",
        });
        return revoked.length;
    });
}

export async function recordIdentityChangedUsers({
    db,
    userIds,
}: {
    db: PostgresJsDatabase;
    userIds: string[];
}): Promise<void> {
    await recordAuthStateChange({
        db,
        userIds,
        reason: "identity_changed",
    });
}

type HardAuthSessionTransition =
    | { type: "credential_upgrade" }
    | { type: "guest_merge" }
    | { type: "new_device"; userAgent: string }
    | { type: "reauthentication" };

async function startSessionWithinTransaction({
    db,
    userId,
    didWrite,
    transition,
    now,
    sessionExpiry,
}: {
    db: PostgresJsDatabase;
    userId: string;
    didWrite: string;
    transition: HardAuthSessionTransition;
    now: Date;
    sessionExpiry: Date;
}): Promise<void> {
    const users = await db
        .select({ userId: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, userId), eq(userTable.isDeleted, false)))
        .for("update");
    if (users.length !== 1) {
        throw new Error("Cannot start a session for an inactive user");
    }

    if (transition.type === "credential_upgrade") {
        const inherited = await db
            .update(deviceTable)
            .set({ sessionExpiry: now, updatedAt: now })
            .where(eq(deviceTable.userId, userId))
            .returning({ userId: deviceTable.userId });
        await recordAuthStateChange({
            db,
            userIds: inherited.map((row) => row.userId),
            reason: "identity_changed",
        });
    }

    if (transition.type === "new_device") {
        await db.insert(deviceTable).values({
            userId,
            didWrite,
            userAgent: transition.userAgent,
            ...createNewSessionStart({ now, sessionExpiry }),
        });
        return;
    }

    const sessionStartCondition =
        transition.type === "reauthentication"
            ? and(
                  eq(deviceTable.didWrite, didWrite),
                  eq(deviceTable.userId, userId),
                  gt(deviceTable.sessionExpiry, now),
              )
            : and(
                  eq(deviceTable.didWrite, didWrite),
                  eq(deviceTable.userId, userId),
              );
    const started = await db
        .update(deviceTable)
        .set(createNewSessionStart({ now, sessionExpiry }))
        .where(sessionStartCondition)
        .returning({ userId: deviceTable.userId });
    if (started.length !== 1) {
        throw new Error("Cannot start a session for an inactive device");
    }
    if (transition.type === "reauthentication") {
        await recordAuthStateChange({
            db,
            userIds: [userId],
            reason: "session_reauthenticated",
        });
    }
}

export async function startHardAuthSession({
    db,
    userId,
    didWrite,
    transition,
    now,
    sessionExpiry,
}: {
    db: PostgresJsDatabase;
    userId: string;
    didWrite: string;
    now: Date;
    sessionExpiry: Date;
    transition: HardAuthSessionTransition;
}): Promise<void> {
    const primaryDb = getPrimaryDatabase(db);
    await primaryDb.transaction(async (tx) => {
        await startSessionWithinTransaction({
            db: tx,
            userId,
            didWrite,
            transition,
            now,
            sessionExpiry,
        });
    });
}

export async function startGuestSessionAfterMerge({
    db,
    userId,
    didWrite,
    now,
    sessionExpiry,
}: {
    db: PostgresJsDatabase;
    userId: string;
    didWrite: string;
    now: Date;
    sessionExpiry: Date;
}): Promise<void> {
    const started = await db
        .update(deviceTable)
        .set(createNewSessionStart({ now, sessionExpiry }))
        .where(
            and(
                eq(deviceTable.didWrite, didWrite),
                eq(deviceTable.userId, userId),
                lte(deviceTable.sessionExpiry, now),
            ),
        )
        .returning({ didWrite: deviceTable.didWrite });
    if (started.length !== 1) {
        throw new Error("Failed to start the merged guest device session");
    }
}
