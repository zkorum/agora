import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, isNull, sql } from "drizzle-orm";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    createPhoneSmsBudget,
    getPhoneSmsMonthStart,
} from "../src/service/phoneSmsBudget.js";
import {
    phoneSmsBudgetAlertTable,
    phoneSmsBudgetPolicyTable,
    phoneSmsBudgetReservationTable,
} from "../src/shared-backend/schema.js";
import { readDbFixtureSql } from "./dbFixture.js";
import { z } from "zod";
import type { PhoneCountry } from "../src/shared/types/phone-country-policy.js";

describe("global phone SMS budget", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    const sendAlert = vi.fn(
        async (_message: { subject: string; text: string }) => {},
    );

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 10,
        });
        db = drizzle({ client });
        await client.unsafe(readDbFixtureSql("auth-otp.sql"));
    }, 120000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120000);

    beforeEach(async () => {
        await db.transaction(async (tx) => {
            await tx.delete(phoneSmsBudgetAlertTable);
            await tx.delete(phoneSmsBudgetReservationTable);
            await tx.delete(phoneSmsBudgetPolicyTable);
        });
        sendAlert.mockReset();
    });

    async function configure({ hourlyLimit = 2, dailyLimit = 3 } = {}) {
        await db.insert(phoneSmsBudgetPolicyTable).values({
            id: 1,
            sendingEnabled: true,
            hourlySendLimit: hourlyLimit,
            dailySendLimit: dailyLimit,
            estimatedCentsPerSend: 10,
            hourlyBudgetCents: hourlyLimit * 10,
            dailyBudgetCents: dailyLimit * 10,
            monthlyBudgetCents: 3000,
            warningPercent: 75,
        });
    }

    function budget() {
        const gate = createPhoneSmsBudget({
            db,
            sendAlert,
            logError: vi.fn(),
            costEstimates: new Map<PhoneCountry, number>([["US", 10]]),
        });
        return {
            ...gate,
            reserve: ({ isRegistration }: { isRegistration: boolean }) =>
                gate.reserve({ isRegistration, country: "US" }),
        };
    }

    it("creates an enabled monthly policy without manual budget configuration", async () => {
        const gate = budget();
        expect(await gate.getMode()).toBe("enabled");
        expect(await gate.getMode({ forVerification: true })).toBe("enabled");
        expect(await gate.reserve({ isRegistration: true })).toBe(true);
        expect(await db.select().from(phoneSmsBudgetPolicyTable)).toMatchObject(
            [
                {
                    sendingEnabled: true,
                    estimatedCentsPerSend: 15,
                    monthlyBudgetCents: 10000,
                    warningPercent: 75,
                    hourlySendLimit: null,
                    dailySendLimit: null,
                    hourlyBudgetCents: null,
                    dailyBudgetCents: null,
                },
            ],
        );
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toMatchObject([{ estimatedCents: 15 }]);
    });

    it("initializes once across instances and permits a burst up to the monthly hard cap", async () => {
        const first = budget();
        const second = budget();
        const admitted = await Promise.all(
            Array.from(
                { length: 680 },
                async (_, index) =>
                    await (index % 2 === 0 ? first : second).reserve({
                        isRegistration: false,
                    }),
            ),
        );
        expect(admitted.filter(Boolean)).toHaveLength(666);
        expect(await db.select().from(phoneSmsBudgetPolicyTable)).toHaveLength(
            1,
        );
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(666);
        expect(await first.getMode()).toBe("disabled");
        expect(await first.getMode({ forVerification: true })).toBe(
            "login_only",
        );
        expect(await db.select().from(phoneSmsBudgetAlertTable)).toHaveLength(
            2,
        );
    }, 30000);

    it("pauses registration at 75 percent but preserves remaining capacity for login", async () => {
        const gate = budget();
        expect(await gate.getMode()).toBe("enabled");
        await db.insert(phoneSmsBudgetReservationTable).values(
            Array.from({ length: 499 }, () => ({
                id: crypto.randomUUID(),
                reservedAt: sql`clock_timestamp()`,
                estimatedCents: 15,
            })),
        );
        expect(await gate.getMode()).toBe("enabled");
        expect(await gate.reserve({ isRegistration: true })).toBe(true);
        expect(await gate.getMode()).toBe("login_only");
        expect(await gate.reserve({ isRegistration: true })).toBe(false);
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        const [policy] = await db.select().from(phoneSmsBudgetPolicyTable);
        expect(policy.registrationPauseExpiresAt?.toISOString()).toBe(
            new Date(
                Date.UTC(
                    policy.updatedAt.getUTCFullYear(),
                    policy.updatedAt.getUTCMonth() + 1,
                    1,
                ),
            ).toISOString(),
        );
    });

    it("preserves an explicitly disabled policy and its configured limits", async () => {
        await configure({ hourlyLimit: 7, dailyLimit: 25 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ sendingEnabled: false });
        const before = await db.select().from(phoneSmsBudgetPolicyTable);
        const gate = budget();
        expect(await gate.getMode()).toBe("disabled");
        expect(await gate.reserve({ isRegistration: false })).toBe(false);
        expect(await db.select().from(phoneSmsBudgetPolicyTable)).toEqual(
            before,
        );
    });

    it("uses the database clock when reserving production sends", async () => {
        await configure();
        const gate = createPhoneSmsBudget({
            db,
            sendAlert,
            logError: vi.fn(),
            costEstimates: new Map<PhoneCountry, number>([["US", 10]]),
        });
        expect(
            await gate.reserve({ isRegistration: false, country: "US" }),
        ).toBe(true);
        const [reservation] = await db
            .select()
            .from(phoneSmsBudgetReservationTable);
        const [clock] = await db
            .select({
                value: sql`clock_timestamp()`.mapWith((value) =>
                    z.coerce.date().parse(value),
                ),
            })
            .from(phoneSmsBudgetPolicyTable);
        expect(
            Math.abs(reservation.reservedAt.getTime() - clock.value.getTime()),
        ).toBeLessThan(5_000);
    });

    it("serializes concurrent sends, pauses registration, and protects the rolling ceiling", async () => {
        await configure({ hourlyLimit: 3, dailyLimit: 4 });
        const gate = budget();
        const otherInstance = budget();
        const results = await Promise.all(
            Array.from(
                { length: 12 },
                async (_, index) =>
                    await (index % 2 === 0 ? gate : otherInstance).reserve({
                        isRegistration: true,
                    }),
            ),
        );
        expect(results.filter(Boolean)).toHaveLength(3);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(3);
        expect(await gate.getMode()).toBe("disabled");
        expect(await gate.getMode({ forVerification: true })).toBe(
            "login_only",
        );
        expect(await db.select().from(phoneSmsBudgetAlertTable)).toHaveLength(
            2,
        );

        await db.update(phoneSmsBudgetReservationTable).set({
            reservedAt: sql`clock_timestamp() - interval '61 minutes'`,
        });
        expect(await gate.getMode()).toBe("login_only");
        expect(await gate.reserve({ isRegistration: true })).toBe(false);
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        expect(await gate.getMode()).toBe("disabled");
        await db
            .update(phoneSmsBudgetReservationTable)
            .set({ reservedAt: sql`clock_timestamp() - interval '25 hours'` });
        expect(await gate.getMode()).toBe("login_only");
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({
                registrationPausedAt: null,
                registrationPauseExpiresAt: null,
            })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));
        expect(await gate.getMode()).toBe("enabled");
    });

    it("enforces the cent ceiling even when send-count capacity remains, and picks up operator changes", async () => {
        await configure({ hourlyLimit: 10, dailyLimit: 20 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ hourlyBudgetCents: 15, dailyBudgetCents: 30 })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));
        const gate = budget();
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        expect(await gate.reserve({ isRegistration: false })).toBe(false);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(1);

        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ hourlyBudgetCents: 30 })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ sendingEnabled: false })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));
        expect(await gate.getMode()).toBe("disabled");
        expect(await gate.getMode({ forVerification: true })).toBe(
            "login_only",
        );
        expect(await gate.reserve({ isRegistration: false })).toBe(false);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(2);
    });

    it("persists the warning pause when an operator lowers a live ceiling", async () => {
        await configure({ hourlyLimit: 10, dailyLimit: 20 });
        const gate = budget();
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ hourlySendLimit: 1, warningPercent: 75 })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));

        expect(await gate.getMode({ forVerification: true })).toBe(
            "login_only",
        );
        const [policy] = await db.select().from(phoneSmsBudgetPolicyTable);
        expect(policy.registrationPausedAt).not.toBeNull();
        expect(await gate.reserve({ isRegistration: true })).toBe(false);
        expect(await db.select().from(phoneSmsBudgetAlertTable)).toHaveLength(
            2,
        );

        await db
            .update(phoneSmsBudgetReservationTable)
            .set({ reservedAt: sql`clock_timestamp() - interval '25 hours'` });
        expect(await gate.getMode()).toBe("login_only");
    });

    it("does not pause registration using a policy superseded while waiting for the writer lock", async () => {
        await configure({ hourlyLimit: 10, dailyLimit: 20 });
        const gate = budget();
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ hourlySendLimit: 1 })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));

        const { mode } = await db.transaction(async (tx) => {
            await tx
                .select({ id: phoneSmsBudgetPolicyTable.id })
                .from(phoneSmsBudgetPolicyTable)
                .where(eq(phoneSmsBudgetPolicyTable.id, 1))
                .for("update");
            const mode = gate.getMode();
            let waiting = false;
            for (let attempt = 0; attempt < 100; attempt += 1) {
                // Observe the transaction blocked on its recheck, not an
                // arbitrary timer: the initial policy read has already run.
                const rows = z.array(z.object({ waiting: z.number() })).parse(
                    await client.unsafe(
                        `SELECT COUNT(*)::int AS waiting FROM pg_stat_activity
                         WHERE datname = current_database()
                           AND pid <> pg_backend_pid()
                           AND wait_event_type = 'Lock'
                           AND query LIKE '%phone_sms_budget_policy%'`,
                    ),
                );
                if ((rows.at(0)?.waiting ?? 0) > 0) {
                    waiting = true;
                    break;
                }
                await sleep(20);
            }
            expect(waiting).toBe(true);
            await tx
                .update(phoneSmsBudgetPolicyTable)
                .set({ hourlySendLimit: 10 })
                .where(eq(phoneSmsBudgetPolicyTable.id, 1));
            return { mode };
        });

        expect(await mode).toBe("enabled");
        const [policy] = await db.select().from(phoneSmsBudgetPolicyTable);
        expect(policy.registrationPausedAt).toBeNull();
        expect(await db.select().from(phoneSmsBudgetAlertTable)).toHaveLength(
            0,
        );
    }, 30000);

    it("alerts on a newly exhausted hard limit even when registration was already paused", async () => {
        await configure({ hourlyLimit: 10, dailyLimit: 20 });
        const gate = createPhoneSmsBudget({
            db,
            logError: vi.fn(),
            costEstimates: new Map<PhoneCountry, number>([["US", 10]]),
        });
        expect(
            await gate.reserve({ isRegistration: false, country: "US" }),
        ).toBe(true);
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({
                registrationPausedAt: sql`clock_timestamp()`,
                hourlyBudgetCents: 15,
            })
            .where(eq(phoneSmsBudgetPolicyTable.id, 1));

        expect(await gate.getMode()).toBe("disabled");
        gate.start();
        try {
            await vi.waitFor(async () => {
                expect(
                    (await db.select().from(phoneSmsBudgetAlertTable)).map(
                        (alert) => alert.kind,
                    ),
                ).toEqual(["hard_limit"]);
            });
        } finally {
            await gate.shutdown();
        }
        expect(await db.select().from(phoneSmsBudgetAlertTable)).toHaveLength(
            1,
        );
    });

    it("keeps a failed alert pending and retries without sending duplicates", async () => {
        await configure();
        const gate = budget();
        await gate.reserve({ isRegistration: false });
        await gate.reserve({ isRegistration: false });
        sendAlert.mockRejectedValueOnce(new Error("SES unavailable"));
        await gate.drainAlerts();
        const firstPass = await db.select().from(phoneSmsBudgetAlertTable);
        expect(firstPass).toHaveLength(2);
        expect(firstPass.filter((alert) => alert.sentAt === null)).toHaveLength(
            1,
        );
        await db
            .update(phoneSmsBudgetAlertTable)
            .set({
                nextAttemptAt: sql`clock_timestamp() - interval '1 second'`,
            })
            .where(isNull(phoneSmsBudgetAlertTable.sentAt));
        await gate.drainAlerts();
        expect(
            (await db.select().from(phoneSmsBudgetAlertTable)).every(
                (alert) => alert.sentAt !== null,
            ),
        ).toBe(true);
        await gate.drainAlerts();
        expect(sendAlert).toHaveBeenCalledTimes(3);
    });

    it("honors an explicit zero monthly ceiling", async () => {
        await configure();
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ monthlyBudgetCents: 0 });
        expect(await budget().reserve({ isRegistration: false })).toBe(false);
        expect(await budget().getMode()).toBe("disabled");
    });

    it("serializes fixed-estimate sends across instances at the monthly ceiling", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ monthlyBudgetCents: 30 });
        const first = budget();
        const second = budget();
        const admitted = await Promise.all(
            Array.from(
                { length: 8 },
                async (_, index) =>
                    await (index % 2 === 0 ? first : second).reserve({
                        isRegistration: false,
                    }),
            ),
        );
        expect(admitted.filter(Boolean)).toHaveLength(3);
        expect(
            (await db.select().from(phoneSmsBudgetReservationTable)).map(
                (row) => row.estimatedCents,
            ),
        ).toEqual([10, 10, 10]);
        expect(await first.getMode()).toBe("disabled");
        expect(await second.reserve({ isRegistration: false })).toBe(false);
        expect(
            await db.transaction(
                async (tx) => await first.canRegister({ db: tx }),
            ),
        ).toBe(false);
    });

    it("counts the whole UTC month and releases previous-month reservations without reopening registration", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ monthlyBudgetCents: 20 });
        const gate = budget();
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        await db.update(phoneSmsBudgetReservationTable).set({
            reservedAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')`,
        });
        expect(await gate.getMode()).toBe("disabled");
        // The reservation timestamps are UTC; these rows belong to the previous month.
        await db.update(phoneSmsBudgetReservationTable).set({
            reservedAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC') - interval '1 millisecond'`,
        });
        expect(await gate.getMode()).toBe("login_only");
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
        expect(await gate.reserve({ isRegistration: true })).toBe(false);
    });

    it.each(["mode", "reservation", "registration check"])(
        "reopens an expired automatic pause during %s",
        async (entryPoint) => {
            const gate = budget();
            expect(await gate.getMode()).toBe("enabled");
            await db.insert(phoneSmsBudgetReservationTable).values({
                id: crypto.randomUUID(),
                reservedAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC') - interval '1 millisecond'`,
                estimatedCents: 3000,
            });
            await db.update(phoneSmsBudgetPolicyTable).set({
                registrationPausedAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC') - interval '1 month'`,
                registrationPauseExpiresAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')`,
            });
            if (entryPoint === "mode")
                expect(await gate.getMode()).toBe("enabled");
            else if (entryPoint === "reservation")
                expect(await gate.reserve({ isRegistration: true })).toBe(true);
            else
                expect(
                    await db.transaction(
                        async (tx) => await gate.canRegister({ db: tx }),
                    ),
                ).toBe(true);
            expect(
                await db.select().from(phoneSmsBudgetPolicyTable),
            ).toMatchObject([
                {
                    registrationPausedAt: null,
                    registrationPauseExpiresAt: null,
                },
            ]);
        },
    );

    it("keeps an operator pause without an expiry across monthly rollover", async () => {
        const gate = budget();
        expect(await gate.getMode()).toBe("enabled");
        await db.update(phoneSmsBudgetPolicyTable).set({
            registrationPausedAt: sql`clock_timestamp() - interval '40 days'`,
        });
        expect(await gate.getMode()).toBe("login_only");
        expect(await gate.reserve({ isRegistration: true })).toBe(false);
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
    });

    it.each([true, false])(
        "backfills legacy monthly policies while preserving sendingEnabled=%s",
        async (sendingEnabled) => {
            await db.transaction(async (tx) => {
                await tx.execute(sql`CREATE SCHEMA sms_budget_migration_test`);
                await tx.execute(
                    sql`SET LOCAL search_path TO sms_budget_migration_test`,
                );
                const runMigration = async (
                    fileName: string,
                ): Promise<void> => {
                    await tx.execute(
                        sql.raw(
                            readFileSync(
                                new URL(
                                    `../database/flyway/${fileName}`,
                                    import.meta.url,
                                ),
                                "utf-8",
                            ),
                        ),
                    );
                };
                await runMigration("V0095__rare_punisher.sql");
                await runMigration("V0097__outgoing_lifeguard.sql");
                await runMigration("V0098__smiling_ironclad.sql");
                // The current ORM schema needs V0098's columns. Seed the zero
                // monthly allowance legacy rows carried into the data backfill.
                await tx.insert(phoneSmsBudgetPolicyTable).values({
                    id: 1,
                    sendingEnabled,
                    hourlySendLimit: 50,
                    dailySendLimit: 100,
                    estimatedCentsPerSend: 12,
                    hourlyBudgetCents: 1000,
                    dailyBudgetCents: 2000,
                    monthlyBudgetCents: 0,
                });
                await runMigration(
                    "V0098.1__backfill_phone_sms_monthly_budget.sql",
                );
                await runMigration("V0099__nasty_namora.sql");
                const policies = await tx
                    .select({
                        sendingEnabled:
                            phoneSmsBudgetPolicyTable.sendingEnabled,
                        monthlyBudgetCents:
                            phoneSmsBudgetPolicyTable.monthlyBudgetCents,
                        estimatedCentsPerSend:
                            phoneSmsBudgetPolicyTable.estimatedCentsPerSend,
                        hourlySendLimit:
                            phoneSmsBudgetPolicyTable.hourlySendLimit,
                        dailySendLimit:
                            phoneSmsBudgetPolicyTable.dailySendLimit,
                    })
                    .from(phoneSmsBudgetPolicyTable);
                expect(policies).toEqual([
                    {
                        sendingEnabled,
                        monthlyBudgetCents: sendingEnabled ? 3000 : 0,
                        estimatedCentsPerSend: 12,
                        hourlySendLimit: 50,
                        dailySendLimit: 100,
                    },
                ]);
                await tx
                    .delete(phoneSmsBudgetPolicyTable)
                    .where(eq(phoneSmsBudgetPolicyTable.id, 1));
                const newPolicies = await tx
                    .insert(phoneSmsBudgetPolicyTable)
                    .values({ id: 1, estimatedCentsPerSend: 15 })
                    .returning({
                        sendingEnabled:
                            phoneSmsBudgetPolicyTable.sendingEnabled,
                        monthlyBudgetCents:
                            phoneSmsBudgetPolicyTable.monthlyBudgetCents,
                    });
                expect(newPolicies).toEqual([
                    { sendingEnabled: false, monthlyBudgetCents: 10000 },
                ]);
                await tx.execute(
                    sql`DROP SCHEMA sms_budget_migration_test CASCADE`,
                );
            });
        },
    );

    it("uses UTC calendar boundaries including year rollover and leap years", () => {
        expect(
            getPhoneSmsMonthStart(
                new Date("2026-12-31T23:59:59.999Z"),
            ).toISOString(),
        ).toBe("2026-12-01T00:00:00.000Z");
        expect(
            getPhoneSmsMonthStart(
                new Date("2027-01-01T00:00:00.000Z"),
            ).toISOString(),
        ).toBe("2027-01-01T00:00:00.000Z");
        expect(
            getPhoneSmsMonthStart(
                new Date("2028-02-29T23:59:59.999Z"),
            ).toISOString(),
        ).toBe("2028-02-01T00:00:00.000Z");
    });

    it("serializes destination-priced reservations and preserves historical estimates", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ monthlyBudgetCents: 30 });
        const first = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>([
                ["FR", 10],
                ["KG", 20],
            ]),
            logError: vi.fn(),
        });
        const second = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>([
                ["FR", 10],
                ["KG", 20],
            ]),
            logError: vi.fn(),
        });
        expect(
            await first.reserve({ isRegistration: false, country: "KG" }),
        ).toBe(true);
        expect(await first.getMode({ country: "KG" })).toBe("disabled");
        expect(await first.getMode({ country: "FR" })).toBe("enabled");
        const admitted = await Promise.all(
            Array.from(
                { length: 8 },
                async (_, index) =>
                    await (index % 2 === 0 ? first : second).reserve({
                        isRegistration: false,
                        country: "FR",
                    }),
            ),
        );
        expect(admitted.filter(Boolean)).toHaveLength(1);
        expect(
            (await db.select().from(phoneSmsBudgetReservationTable))
                .map((row) => row.estimatedCents)
                .sort(),
        ).toEqual([10, 20]);
        expect(await first.getMode()).toBe("disabled");
        const cheaper = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>([["FR", 1]]),
            logError: vi.fn(),
        });
        expect(
            await cheaper.reserve({ isRegistration: false, country: "FR" }),
        ).toBe(false);
        expect(
            await db.transaction(
                async (tx) => await first.canRegister({ db: tx }),
            ),
        ).toBe(false);
    });

    it("refuses unpriced destinations instead of admitting them at the policy floor", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        const gate = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>([["FR", 26]]),
            logError: vi.fn(),
        });
        expect(await gate.getMode({ country: "KG" })).toBe("disabled");
        expect(
            await gate.getMode({ country: "KG", forVerification: true }),
        ).toBe("login_only");
        expect(
            await gate.reserve({ isRegistration: false, country: "KG" }),
        ).toBe(false);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(0);
        expect(
            await gate.reserve({ isRegistration: false, country: "FR" }),
        ).toBe(true);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toMatchObject([{ estimatedCents: 26 }]);
    });

    it("keeps an empty pricing configuration closed for sending and new enrollment", async () => {
        const gate = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>(),
            logError: vi.fn(),
        });
        expect(await gate.getMode()).toBe("disabled");
        expect(await gate.getMode({ forVerification: true })).toBe(
            "login_only",
        );
        expect(
            await gate.reserve({ isRegistration: false, country: "US" }),
        ).toBe(false);
        expect(
            await db.transaction(
                async (tx) => await gate.canRegister({ db: tx }),
            ),
        ).toBe(false);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(0);
    });

    it("snapshots destination estimates so caller mutation cannot underprice sends", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        const costs = new Map<PhoneCountry, number>([["FR", 26]]);
        const gate = createPhoneSmsBudget({
            db,
            costEstimates: costs,
            logError: vi.fn(),
        });
        costs.set("FR", 1);
        expect(
            await gate.reserve({ isRegistration: false, country: "FR" }),
        ).toBe(true);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toMatchObject([{ estimatedCents: 26 }]);
    });

    it("excludes next-month reservations from current monthly and rolling windows", async () => {
        await configure();
        await db.insert(phoneSmsBudgetReservationTable).values({
            id: crypto.randomUUID(),
            estimatedCents: 3000,
            reservedAt: sql`date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC') + interval '1 month'`,
        });
        expect(await budget().getMode()).toBe("enabled");
        expect(await budget().reserve({ isRegistration: false })).toBe(true);
    });

    it("waits for an in-flight alert delivery during shutdown", async () => {
        let releaseDelivery = () => {};
        const blockedDelivery = new Promise<void>((resolve) => {
            releaseDelivery = resolve;
        });
        let deliveryStarted = false;
        sendAlert.mockImplementation(async () => {
            deliveryStarted = true;
            await blockedDelivery;
        });
        await configure();
        const gate = budget();
        await gate.reserve({ isRegistration: false });
        await gate.reserve({ isRegistration: false });
        gate.start();
        try {
            await vi.waitFor(() => expect(deliveryStarted).toBe(true));
            let stopped = false;
            const stop = async () => {
                await gate.shutdown();
                stopped = true;
            };
            const stopping = stop();
            await Promise.resolve();
            expect(stopped).toBe(false);
            releaseDelivery();
            await stopping;
            expect(stopped).toBe(true);
            expect(
                (await db.select().from(phoneSmsBudgetAlertTable)).every(
                    (alert) => alert.sentAt !== null,
                ),
            ).toBe(true);
        } finally {
            releaseDelivery();
            await gate.shutdown();
        }
    });

    it("preserves a higher operator estimate as the destination reservation floor", async () => {
        await configure({ hourlyLimit: 100, dailyLimit: 100 });
        await db
            .update(phoneSmsBudgetPolicyTable)
            .set({ estimatedCentsPerSend: 50 });
        const gate = createPhoneSmsBudget({
            db,
            costEstimates: new Map<PhoneCountry, number>([["FR", 26]]),
            logError: vi.fn(),
        });
        expect(
            await gate.reserve({ isRegistration: false, country: "FR" }),
        ).toBe(true);
        expect(
            (await db.select().from(phoneSmsBudgetReservationTable))[0]
                ?.estimatedCents,
        ).toBe(50);
    });
});
