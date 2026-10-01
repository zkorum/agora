import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    phoneSmsBudgetAlertTable,
    phoneSmsBudgetPolicyTable,
    phoneSmsBudgetReservationTable,
} from "@/shared-backend/schema.js";
import {
    and,
    count,
    eq,
    getTableColumns,
    gte,
    isNull,
    lte,
    sql,
    sum,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALERT_LEASE_MS = 5 * 60 * 1000;

type BudgetMode = "enabled" | "login_only" | "disabled";
type AlertKind = "warning" | "hard_limit";

interface Usage {
    hourlySends: number;
    dailySends: number;
    hourlyCents: bigint;
    dailyCents: bigint;
}

type Policy = typeof phoneSmsBudgetPolicyTable.$inferSelect;

function exceedsBudget({
    policy,
    usage,
    nextSend,
}: {
    policy: Policy;
    usage: Usage;
    nextSend: boolean;
}): boolean {
    const sends = nextSend ? 1 : 0;
    const cents = nextSend ? BigInt(policy.estimatedCentsPerSend) : 0n;
    return (
        usage.hourlySends + sends > policy.hourlySendLimit ||
        usage.dailySends + sends > policy.dailySendLimit ||
        usage.hourlyCents + cents > BigInt(policy.hourlyBudgetCents) ||
        usage.dailyCents + cents > BigInt(policy.dailyBudgetCents)
    );
}

function crossesWarning({
    policy,
    usage,
}: {
    policy: Policy;
    usage: Usage;
}): boolean {
    return (
        usage.hourlySends * 100 >=
            policy.hourlySendLimit * policy.warningPercent ||
        usage.dailySends * 100 >=
            policy.dailySendLimit * policy.warningPercent ||
        usage.hourlyCents * 100n >=
            BigInt(policy.hourlyBudgetCents) * BigInt(policy.warningPercent) ||
        usage.dailyCents * 100n >=
            BigInt(policy.dailyBudgetCents) * BigInt(policy.warningPercent)
    );
}

async function getUsage({
    db,
    now,
}: {
    db: PostgresJsDatabase;
    now: Date;
}): Promise<Usage> {
    const hourAgo = new Date(now.getTime() - HOUR_MS);
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const hourly = await db
        .select({
            sends: count(),
            cents: sum(phoneSmsBudgetReservationTable.estimatedCents),
        })
        .from(phoneSmsBudgetReservationTable)
        .where(gte(phoneSmsBudgetReservationTable.reservedAt, hourAgo));
    const daily = await db
        .select({
            sends: count(),
            cents: sum(phoneSmsBudgetReservationTable.estimatedCents),
        })
        .from(phoneSmsBudgetReservationTable)
        .where(gte(phoneSmsBudgetReservationTable.reservedAt, dayAgo));
    return {
        hourlySends: hourly[0]?.sends ?? 0,
        dailySends: daily[0]?.sends ?? 0,
        hourlyCents: BigInt(hourly[0]?.cents ?? 0),
        dailyCents: BigInt(daily[0]?.cents ?? 0),
    };
}

async function queueAlert({
    db,
    kind,
    now,
}: {
    db: PostgresJsDatabase;
    kind: AlertKind;
    now: Date;
}): Promise<void> {
    await db
        .insert(phoneSmsBudgetAlertTable)
        .values({
            id: randomUUID(),
            kind,
            day: now.toISOString().slice(0, 10),
            nextAttemptAt: now,
        })
        .onConflictDoNothing();
}

async function pauseRegistration(db: PostgresJsDatabase): Promise<void> {
    const paused = (
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({
                registrationPausedAt: sql`clock_timestamp()`,
                updatedAt: sql`clock_timestamp()`,
            })
            .where(
                and(
                    eq(phoneSmsBudgetPolicyTable.id, 1),
                    isNull(phoneSmsBudgetPolicyTable.registrationPausedAt),
                ),
            )
            .returning({
                registrationPausedAt:
                    phoneSmsBudgetPolicyTable.registrationPausedAt,
            })
    ).at(0);
    const pausedAt = paused?.registrationPausedAt;
    if (pausedAt === undefined || pausedAt === null) return;
    await queueAlert({ db, kind: "warning", now: pausedAt });
}

export function createPhoneSmsBudget({
    db,
    sendAlert,
    log,
}: {
    db: PostgresJsDatabase;
    sendAlert?: (message: { subject: string; text: string }) => Promise<void>;
    log: Pick<Console, "error">;
}) {
    const primaryDb = getPrimaryDatabase(db);
    let monitorTimer: NodeJS.Timeout | undefined;
    let draining = false;
    let monitoring = false;
    // Drizzle has no clock_timestamp() helper. Map the writer's clock alongside
    // each real policy/alert row so reservations and alerts share its time base.
    const dbClock = sql`clock_timestamp()`.mapWith((value) =>
        z.coerce.date().parse(value),
    );

    const readPolicy = async ({
        db,
        forUpdate,
    }: {
        db: PostgresJsDatabase;
        forUpdate: boolean;
    }) => {
        const query = db
            .select({
                ...getTableColumns(phoneSmsBudgetPolicyTable),
                dbNow: dbClock,
            })
            .from(phoneSmsBudgetPolicyTable)
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));
        const policies = forUpdate ? await query.for("update") : await query;
        return policies.at(0);
    };

    const immediateMode = ({
        policy,
        forVerification,
    }: {
        policy: Policy;
        forVerification: boolean;
    }): BudgetMode | undefined => {
        if (
            forVerification &&
            (!policy.sendingEnabled || policy.registrationPausedAt !== null)
        ) {
            return "login_only";
        }
        if (!forVerification && !policy.sendingEnabled) return "disabled";
        return undefined;
    };

    const modeForPolicy = ({
        policy,
        usage,
        forVerification,
    }: {
        policy: Policy;
        usage: Usage;
        forVerification: boolean;
    }): BudgetMode => {
        const immediate = immediateMode({ policy, forVerification });
        if (immediate !== undefined) return immediate;
        if (
            !forVerification &&
            exceedsBudget({ policy, usage, nextSend: true })
        ) {
            return "disabled";
        }
        return policy.registrationPausedAt !== null ||
            crossesWarning({ policy, usage })
            ? "login_only"
            : "enabled";
    };

    const reconcilePolicy = async ({
        forVerification = false,
    }: { forVerification?: boolean } = {}): Promise<BudgetMode> => {
        return await primaryDb.transaction(async (tx) => {
            const policy = await readPolicy({ db: tx, forUpdate: true });
            if (policy === undefined) return "disabled";
            const immediate = immediateMode({ policy, forVerification });
            if (immediate !== undefined) return immediate;

            const usage = await getUsage({ db: tx, now: policy.dbNow });
            if (
                policy.registrationPausedAt === null &&
                crossesWarning({ policy, usage })
            ) {
                await pauseRegistration(tx);
            }
            if (
                policy.sendingEnabled &&
                exceedsBudget({ policy, usage, nextSend: true })
            ) {
                await queueAlert({
                    db: tx,
                    kind: "hard_limit",
                    now: policy.dbNow,
                });
            }
            return modeForPolicy({ policy, usage, forVerification });
        });
    };

    const getMode = async ({
        forVerification = false,
    }: { forVerification?: boolean } = {}): Promise<BudgetMode> => {
        const policy = await readPolicy({ db: primaryDb, forUpdate: false });
        if (policy === undefined) return "disabled";
        const immediate = immediateMode({ policy, forVerification });
        if (immediate !== undefined) return immediate;
        const usage = await getUsage({ db: primaryDb, now: policy.dbNow });
        if (
            policy.registrationPausedAt === null &&
            crossesWarning({ policy, usage })
        ) {
            return await reconcilePolicy({ forVerification });
        }
        return modeForPolicy({ policy, usage, forVerification });
    };

    const reserve = async ({
        isRegistration,
    }: {
        isRegistration: boolean;
    }): Promise<boolean> => {
        return await primaryDb.transaction(async (tx) => {
            const policy = await readPolicy({ db: tx, forUpdate: true });
            if (policy?.sendingEnabled !== true) return false;
            const timestamp = policy.dbNow;
            const usage = await getUsage({ db: tx, now: timestamp });
            const warningReached = crossesWarning({ policy, usage });
            if (warningReached && policy.registrationPausedAt === null) {
                await pauseRegistration(tx);
            }
            if (
                isRegistration &&
                (policy.registrationPausedAt !== null || warningReached)
            ) {
                return false;
            }
            if (exceedsBudget({ policy, usage, nextSend: true })) {
                await queueAlert({
                    db: tx,
                    kind: "hard_limit",
                    now: timestamp,
                });
                return false;
            }
            await tx.insert(phoneSmsBudgetReservationTable).values({
                id: randomUUID(),
                reservedAt: timestamp,
                estimatedCents: policy.estimatedCentsPerSend,
            });
            const after: Usage = {
                hourlySends: usage.hourlySends + 1,
                dailySends: usage.dailySends + 1,
                hourlyCents:
                    usage.hourlyCents + BigInt(policy.estimatedCentsPerSend),
                dailyCents:
                    usage.dailyCents + BigInt(policy.estimatedCentsPerSend),
            };
            if (
                !warningReached &&
                policy.registrationPausedAt === null &&
                crossesWarning({ policy, usage: after })
            ) {
                await pauseRegistration(tx);
            }
            if (exceedsBudget({ policy, usage: after, nextSend: true })) {
                await queueAlert({
                    db: tx,
                    kind: "hard_limit",
                    now: timestamp,
                });
            }
            return true;
        });
    };

    const drainAlerts = async (): Promise<void> => {
        if (sendAlert === undefined || draining) return;
        draining = true;
        try {
            for (let i = 0; i < 5; i += 1) {
                const alert = await primaryDb.transaction(async (tx) => {
                    const due = (
                        await tx
                            .select({
                                id: phoneSmsBudgetAlertTable.id,
                                kind: phoneSmsBudgetAlertTable.kind,
                                day: phoneSmsBudgetAlertTable.day,
                                attemptCount:
                                    phoneSmsBudgetAlertTable.attemptCount,
                                dbNow: dbClock,
                            })
                            .from(phoneSmsBudgetAlertTable)
                            .where(
                                and(
                                    isNull(phoneSmsBudgetAlertTable.sentAt),
                                    lte(
                                        phoneSmsBudgetAlertTable.nextAttemptAt,
                                        sql`clock_timestamp()`,
                                    ),
                                ),
                            )
                            .orderBy(phoneSmsBudgetAlertTable.nextAttemptAt)
                            .limit(1)
                            .for("update", { skipLocked: true })
                    ).at(0);
                    if (due === undefined) return undefined;
                    await tx
                        .update(phoneSmsBudgetAlertTable)
                        .set({
                            attemptCount: due.attemptCount + 1,
                            nextAttemptAt: new Date(
                                due.dbNow.getTime() + ALERT_LEASE_MS,
                            ),
                        })
                        .where(eq(phoneSmsBudgetAlertTable.id, due.id));
                    return due;
                });
                if (alert === undefined) return;
                try {
                    await sendAlert({
                        subject:
                            alert.kind === "warning"
                                ? "Agora phone registration paused: SMS budget warning"
                                : "Agora phone SMS stopped: no budget capacity",
                        text:
                            alert.kind === "warning"
                                ? `Agora paused new phone registrations after reaching the SMS budget warning threshold on ${alert.day}. Existing phone login remains available within the hard cap. Review the phone_sms_budget_policy and phone_sms_budget_reservation tables before reopening registration.`
                                : `Agora cannot reserve another phone SMS under the global send/cost ceilings on ${alert.day}. No more phone SMS will be sent until rolling capacity becomes available or you adjust the policy. Review the phone_sms_budget_policy and phone_sms_budget_reservation tables.`,
                    });
                    await primaryDb
                        .update(phoneSmsBudgetAlertTable)
                        .set({ sentAt: sql`clock_timestamp()` })
                        .where(
                            and(
                                eq(phoneSmsBudgetAlertTable.id, alert.id),
                                eq(
                                    phoneSmsBudgetAlertTable.attemptCount,
                                    alert.attemptCount + 1,
                                ),
                                isNull(phoneSmsBudgetAlertTable.sentAt),
                            ),
                        );
                } catch (error) {
                    log.error(
                        error,
                        "[Phone SMS Budget] Alert delivery failed; will retry",
                    );
                    const delayMs = Math.min(
                        60 * 60 * 1000,
                        60_000 * 2 ** Math.min(alert.attemptCount, 6),
                    );
                    await primaryDb
                        .update(phoneSmsBudgetAlertTable)
                        .set({
                            nextAttemptAt: sql`clock_timestamp() + (${delayMs} * interval '1 millisecond')`,
                        })
                        .where(
                            and(
                                eq(phoneSmsBudgetAlertTable.id, alert.id),
                                eq(
                                    phoneSmsBudgetAlertTable.attemptCount,
                                    alert.attemptCount + 1,
                                ),
                                isNull(phoneSmsBudgetAlertTable.sentAt),
                            ),
                        );
                }
            }
        } finally {
            draining = false;
        }
    };

    const start = (): void => {
        if (monitorTimer !== undefined) return;
        const monitor = async (): Promise<void> => {
            if (monitoring) return;
            monitoring = true;
            try {
                await reconcilePolicy();
                await drainAlerts();
            } finally {
                monitoring = false;
            }
        };
        const runMonitor = (): void => {
            void monitor().catch((error: unknown) => {
                log.error(error, "[Phone SMS Budget] Monitoring failed");
            });
        };
        runMonitor();
        monitorTimer = setInterval(runMonitor, 60_000);
        monitorTimer.unref();
    };

    const shutdown = (): void => {
        if (monitorTimer !== undefined) clearInterval(monitorTimer);
        monitorTimer = undefined;
    };

    return {
        getMode,
        reserve,
        drainAlerts,
        start,
        shutdown,
    };
}

export type PhoneSmsBudget = Pick<
    ReturnType<typeof createPhoneSmsBudget>,
    "reserve"
>;
