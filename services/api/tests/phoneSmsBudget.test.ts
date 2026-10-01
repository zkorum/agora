import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, isNull, sql } from "drizzle-orm";
import postgres from "postgres";
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
import { createPhoneSmsBudget } from "../src/service/phoneSmsBudget.js";
import {
    phoneSmsBudgetAlertTable,
    phoneSmsBudgetPolicyTable,
    phoneSmsBudgetReservationTable,
} from "../src/shared-backend/schema.js";
import { readDbFixtureSql } from "./dbFixture.js";
import { z } from "zod";

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
        db = drizzle(client);
        await client.unsafe(readDbFixtureSql("auth-otp.sql"));
    }, 120000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120000);

    beforeEach(async () => {
        await client.unsafe(
            `TRUNCATE TABLE phone_sms_budget_alert, phone_sms_budget_reservation, phone_sms_budget_policy`,
        );
        sendAlert.mockClear();
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
            warningPercent: 75,
        });
    }

    function budget() {
        return createPhoneSmsBudget({
            db,
            sendAlert,
            log: { error: vi.fn() },
        });
    }

    it("fails closed until the operator configures a policy", async () => {
        const gate = budget();
        expect(await gate.getMode()).toBe("disabled");
        expect(await gate.reserve({ isRegistration: false })).toBe(false);
        expect(
            await db.select().from(phoneSmsBudgetReservationTable),
        ).toHaveLength(0);
    });

    it("uses the database clock when reserving production sends", async () => {
        await configure();
        const gate = createPhoneSmsBudget({
            db,
            sendAlert,
            log: { error: vi.fn() },
        });
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
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
            .set({ registrationPausedAt: null })
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
        const gate = createPhoneSmsBudget({ db, log: { error: vi.fn() } });
        expect(await gate.reserve({ isRegistration: false })).toBe(true);
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
            gate.shutdown();
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
});
