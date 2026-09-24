import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, test } from "vitest";
import {
    ensureAddEmailSecurityNotification,
    getNotifications,
    markAllNotificationsAsRead,
} from "../src/service/notification.js";
import { readDbFixtureSql } from "./dbFixture.js";

const schema = readDbFixtureSql("auth-otp.sql");
const schemaMigration = await readFile(
    new URL("../database/flyway/V0092__empty_micromax.sql", import.meta.url),
    "utf8",
);
const backfill = await readFile(
    new URL(
        "../database/flyway/V0092.1__backfill_add_email_security_notifications.sql",
        import.meta.url,
    ),
    "utf8",
);
let container: string | undefined;

function sql(input: string): string {
    assert.ok(container);
    const result = spawnSync(
        "docker",
        ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq"],
        { input, encoding: "utf8", timeout: 20_000 },
    );
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
}

beforeAll(async () => {
    container = execFileSync(
        "docker",
        ["run", "--detach", "--rm", "-e", "POSTGRES_PASSWORD=test-only", "-p", "127.0.0.1::5432", "postgres:16"],
        { encoding: "utf8", timeout: 120_000 },
    ).trim();
    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            sql("SELECT 1");
            return;
        } catch {
            await setTimeout(500);
        }
    }
    throw new Error("Isolated PostgreSQL container did not become ready");
}, 120_000);

afterAll(() => {
    if (container) {
        execFileSync("docker", ["stop", container], {
            stdio: "pipe",
            timeout: 30_000,
        });
    }
}, 30_000);

test("backfills and maintains one sticky security notification until email verification", async () => {
    sql(`
        ${schema}
        CREATE TYPE notification_type_enum AS ENUM ('new_opinion');
        CREATE TABLE notification (
            id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            slug_id varchar(8) NOT NULL UNIQUE,
            user_id uuid NOT NULL,
            notification_type notification_type_enum NOT NULL,
            is_read boolean NOT NULL DEFAULT false,
            created_at timestamp NOT NULL DEFAULT now()
        );
    `);
    sql(schemaMigration);
    sql(`
        INSERT INTO "user" (id, username, is_deleted) VALUES
            ('00000000-0000-4000-8000-000000000001', 'phone-only', false),
            ('00000000-0000-4000-8000-000000000002', 'passport-only', false),
            ('00000000-0000-4000-8000-000000000003', 'both-credentials', false),
            ('00000000-0000-4000-8000-000000000004', 'already-email', false),
            ('00000000-0000-4000-8000-000000000005', 'deleted-user', true),
            ('00000000-0000-4000-8000-000000000006', 'guest-only', false),
            ('00000000-0000-4000-8000-000000000007', 'former-phone', false),
            ('00000000-0000-4000-8000-000000000008', 'former-email', false);
        INSERT INTO phone (user_id, last_two_digits, "countryCallingCode", phone_hash) VALUES
            ('00000000-0000-4000-8000-000000000001', 11, '1', 'phone-one'),
            ('00000000-0000-4000-8000-000000000003', 33, '1', 'phone-three'),
            ('00000000-0000-4000-8000-000000000004', 44, '1', 'phone-four'),
            ('00000000-0000-4000-8000-000000000005', 55, '1', 'phone-five'),
            ('00000000-0000-4000-8000-000000000007', 77, '1', 'phone-seven'),
            ('00000000-0000-4000-8000-000000000008', 88, '1', 'phone-eight');
        UPDATE phone SET is_deleted = true WHERE phone_hash = 'phone-seven';
        INSERT INTO zk_passport (user_id, citizenship, nullifier, sex) VALUES
            ('00000000-0000-4000-8000-000000000002', 'USA', 'passport-two', 'X'),
            ('00000000-0000-4000-8000-000000000003', 'USA', 'passport-three', 'X');
        INSERT INTO email (email, type, user_id) VALUES
            ('verified@example.com', 'primary', '00000000-0000-4000-8000-000000000004'),
            ('former@example.com', 'primary', '00000000-0000-4000-8000-000000000008');
        UPDATE email SET is_deleted = true WHERE email = 'former@example.com';
    `);

    sql(backfill);
    sql(backfill);
    assert.equal(
        sql("SELECT string_agg(u.username, ',' ORDER BY u.username) FROM notification n JOIN \"user\" u ON u.id = n.user_id"),
        "both-credentials,former-email,passport-only,phone-only",
    );
    assert.equal(
        sql("SELECT count(*) FROM notification WHERE security_key = 'add_email' AND is_read = false AND length(slug_id) = 8"),
        "4",
    );

    assert.ok(container);
    const address = execFileSync("docker", ["port", container, "5432/tcp"], {
        encoding: "utf8",
    }).trim();
    const mappedPort = Number(new URL(`http://${address}`).port);
    const client = postgres({
        host: "127.0.0.1",
        port: mappedPort,
        database: "postgres",
        username: "postgres",
        password: "test-only",
    });
    const db = drizzle(client);
    try {
        const phoneUserId = "00000000-0000-4000-8000-000000000001";
        await ensureAddEmailSecurityNotification({ db, userId: phoneUserId });
        await ensureAddEmailSecurityNotification({ db, userId: phoneUserId });
        assert.equal(sql("SELECT count(*) FROM notification"), "4");

        const newPhoneUserId = "00000000-0000-4000-8000-000000000006";
        sql(`INSERT INTO phone (user_id, last_two_digits, "countryCallingCode", phone_hash)
            VALUES ('${newPhoneUserId}', 66, '1', 'phone-six')`);
        await ensureAddEmailSecurityNotification({ db, userId: newPhoneUserId });
        await ensureAddEmailSecurityNotification({ db, userId: newPhoneUserId });
        assert.equal(sql("SELECT count(*) FROM notification"), "5");
        await ensureAddEmailSecurityNotification({
            db,
            userId: "00000000-0000-4000-8000-000000000004",
        });
        assert.equal(sql("SELECT count(*) FROM notification"), "5");

        const pending = await getNotifications({
            db,
            userId: phoneUserId,
            lastSlugId: undefined,
        });
        assert.equal(pending.stickyNotificationList.length, 1);
        assert.equal(pending.stickyNotificationList[0]?.isSticky, true);
        assert.equal(pending.notificationList.length, 0);
        await markAllNotificationsAsRead({ db, userId: phoneUserId });
        assert.equal(
            sql(`SELECT is_read FROM notification WHERE user_id = '${phoneUserId}'`),
            "f",
        );

        sql(`INSERT INTO email (email, type, user_id) VALUES ('added@example.com', 'primary', '${phoneUserId}')`);
        const resolved = await getNotifications({
            db,
            userId: phoneUserId,
            lastSlugId: undefined,
        });
        assert.deepEqual(resolved.stickyNotificationList, []);
        await ensureAddEmailSecurityNotification({ db, userId: phoneUserId });
        assert.equal(sql("SELECT count(*) FROM notification"), "5");
    } finally {
        await client.end();
    }
});
