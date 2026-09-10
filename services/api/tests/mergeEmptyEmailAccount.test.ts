// Run from services/api: pnpm vitest run tests/mergeEmptyEmailAccount.test.ts
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach, test } from "vitest";
import { authStateChangedPayload } from "../src/service/authSession.js";
import { readDbFixtureSql } from "./dbFixture.js";

const keepId = "00000000-0000-4000-8000-000000000001";
const sourceId = "00000000-0000-4000-8000-000000000002";
const script = await readFile(
    new URL("../../../scripts/merge-empty-email-account.sql", import.meta.url),
    "utf8",
);
const schema = readDbFixtureSql("auth-otp.sql");
let container: string | undefined;

function executeSql(input: string): { output: string; messages: string } {
    assert.ok(container);
    const result = spawnSync(
        "docker",
        [
            "exec",
            "-i",
            container,
            "psql",
            "-X",
            "-U",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-Atq",
        ],
        {
            input,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 20_000,
        },
    );
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr);
    return { output: result.stdout.trim(), messages: result.stderr };
}

function sql(input: string): string {
    return executeSql(input).output;
}

function merge({
    apply = false,
    maintenanceConfirmed = true,
    replacements = [],
}: {
    apply?: boolean;
    maintenanceConfirmed?: boolean;
    replacements?: readonly (readonly [string, string])[];
} = {}): ReturnType<typeof executeSql> {
    let query = script
        .replace("'REPLACE_WITH_USERNAME'", "'kept-test-account'")
        .replace("'REPLACE_WITH_EMAIL'", "'SOURCE@EXAMPLE.COM'")
        .replace(
            "dry_run boolean := true",
            `dry_run boolean := ${String(!apply)}`,
        )
        .replace(
            "writers_paused_and_buffers_drained boolean := false",
            `writers_paused_and_buffers_drained boolean := ${String(maintenanceConfirmed)}`,
        );
    for (const [from, to] of replacements) {
        assert.ok(query.includes(from));
        query = query.replace(from, to);
    }
    return executeSql(query);
}

function snapshot(): string {
    return sql(`
    SELECT jsonb_build_object(
      'users', (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM public."user" u),
      'emails', (SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM email e),
      'devices', (SELECT jsonb_agg(to_jsonb(d) ORDER BY did_write) FROM device d),
      'phones', (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM phone p),
      'attempts', (SELECT jsonb_agg(to_jsonb(a) ORDER BY did_write) FROM auth_attempt_email a),
      'phone_attempts', (SELECT jsonb_agg(to_jsonb(a) ORDER BY did_write) FROM auth_attempt_phone a),
      'events', (SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM realtime_event_outbox o)
    );
  `);
}

beforeAll(async () => {
    container = execFileSync(
        "docker",
        [
            "run",
            "--detach",
            "--rm",
            "-e",
            "POSTGRES_PASSWORD=test-only",
            "postgres:16",
        ],
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
    if (container)
        execFileSync("docker", ["stop", container], {
            stdio: "pipe",
            timeout: 30_000,
        });
}, 30_000);

beforeEach(() => {
    // The generated auth fixture omits FKs. Add the relationships needed to test
    // catalog discovery, including a future activity table and composite email FK.
    sql(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    ${schema}
    ALTER TABLE email ADD FOREIGN KEY (user_id) REFERENCES public."user"(id);
    ALTER TABLE device ADD FOREIGN KEY (user_id) REFERENCES public."user"(id);
    ALTER TABLE phone ADD FOREIGN KEY (user_id) REFERENCES public."user"(id);
    ALTER TABLE zk_passport ADD FOREIGN KEY (user_id) REFERENCES public."user"(id);
    ALTER TABLE user_display_language ADD FOREIGN KEY (user_id) REFERENCES public."user"(id);
    CREATE TABLE future_activity (author_id uuid REFERENCES public."user"(id));
    CREATE TABLE email_delivery (
      recipient_id uuid, email_id integer,
      FOREIGN KEY (recipient_id, email_id) REFERENCES email(user_id, id)
    );
    INSERT INTO public."user" (id, username) VALUES
      ('${keepId}', 'kept-test-account'), ('${sourceId}', 'source-test-account');
    INSERT INTO email (email, type, user_id, email_reachability)
      VALUES ('source@example.com', 'primary', '${sourceId}', 'safe');
    INSERT INTO phone (user_id, last_two_digits, "countryCallingCode", phone_hash)
      VALUES ('${keepId}', 23, '1', 'test-phone-hash');
    INSERT INTO device (did_write, user_id, user_agent, session_expiry) VALUES
      ('keep-device', '${keepId}', 'test', now() + interval '1 day'),
      ('source-device', '${sourceId}', 'test', now() + interval '1 day');
    INSERT INTO auth_attempt_email (did_write, type, email, user_id, user_agent, code, code_expiry, last_otp_sent_at)
      VALUES ('source-device', 'login_known_device', 'source@example.com', '${sourceId}', 'test', 123456, now() + interval '1 day', now());
    INSERT INTO auth_attempt_phone (did_write, type, user_id, user_agent, code, code_expiry, last_otp_sent_at, last_two_digits, "countryCallingCode", phone_hash)
      VALUES ('source-device', 'register', '${sourceId}', 'test', 123456, now() + interval '1 day', now(), 23, '1', 'pending-test-phone');
    INSERT INTO user_display_language (user_id, language_code) VALUES ('${sourceId}', 'fr');
  `);
});

test("dry run rolls back all merge writes", () => {
    const original = snapshot();
    merge();
    assert.equal(snapshot(), original);
});

test("apply retains identity, moves login, expires sessions and OTPs, and is repeatable", () => {
    const retained = sql(
        `SELECT to_jsonb(u) FROM public."user" u WHERE id = '${keepId}'`,
    );
    const keepSession = sql(
        "SELECT to_jsonb(d) FROM device d WHERE did_write = 'keep-device'",
    );
    merge({ apply: true });
    assert.equal(
        sql(`SELECT to_jsonb(u) FROM public."user" u WHERE id = '${keepId}'`),
        retained,
    );
    assert.equal(
        sql("SELECT to_jsonb(d) FROM device d WHERE did_write = 'keep-device'"),
        keepSession,
    );
    assert.equal(
        sql("SELECT user_id FROM email WHERE email = 'source@example.com'"),
        keepId,
    );
    assert.equal(sql("SELECT email_reachability FROM email"), "safe");
    assert.equal(
        sql(
            `SELECT is_deleted AND deleted_at IS NOT NULL FROM public."user" WHERE id = '${sourceId}'`,
        ),
        "t",
    );
    assert.equal(
        sql("SELECT user_id FROM device WHERE did_write = 'source-device'"),
        keepId,
    );
    assert.equal(
        sql(
            "SELECT session_expiry <= now() FROM device WHERE did_write = 'source-device'",
        ),
        "t",
    );
    assert.equal(
        sql("SELECT code_expiry <= now() FROM auth_attempt_email"),
        "t",
    );
    assert.equal(
        sql("SELECT code_expiry <= now() FROM auth_attempt_phone"),
        "t",
    );
    const rawPayload: unknown = JSON.parse(
        sql("SELECT payload FROM realtime_event_outbox"),
    );
    assert.deepEqual(authStateChangedPayload.parse(rawPayload), {
        reason: "identity_changed",
        userIds: [sourceId, keepId],
    });
    const merged = snapshot();
    merge({ apply: true });
    assert.equal(snapshot(), merged);
});

test("discovers activity in a new table even when content counters are zero", () => {
    sql(`INSERT INTO future_activity VALUES ('${sourceId}')`);
    const original = snapshot();
    assert.throws(
        () => merge({ apply: true }),
        /future_activity.author_id: 1 row/,
    );
    assert.equal(snapshot(), original);
});

test("rejects another credential on the source", () => {
    sql(`INSERT INTO phone (user_id, last_two_digits, "countryCallingCode", phone_hash)
    VALUES ('${sourceId}', 12, '33', 'another-phone')`);
    assert.throws(() => merge(), /phone.user_id: 1 row/);
});

test("rejects a destination email conflict", () => {
    sql(
        `INSERT INTO email (email, type, user_id) VALUES ('keep@example.com', 'primary', '${keepId}')`,
    );
    assert.throws(() => merge(), /already has an active email/);
});

test("checks configured identity and phone conditions", () => {
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "expected_source_user_id uuid := NULL",
                        `expected_source_user_id uuid := '${keepId}'`,
                    ],
                ],
            }),
        /do not match the configured IDs/,
    );
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "expected_phone_last_two_digits integer := NULL",
                        "expected_phone_last_two_digits integer := 24",
                    ],
                ],
            }),
        /no active phone matching/,
    );
    merge({
        replacements: [
            [
                "expected_phone_calling_code text := NULL",
                "expected_phone_calling_code text := '1'",
            ],
            [
                "expected_phone_last_two_digits integer := NULL",
                "expected_phone_last_two_digits integer := 23",
            ],
        ],
    });
});

test("can require language preferences to be absent", () => {
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "'user_display_language', 'user_spoken_languages'\n    ]",
                        "]::text[]",
                    ],
                ],
            }),
        /user_display_language.user_id: 1 row/,
    );
});

test("dry run exercises composite email constraints and rolls back on failure", () => {
    sql(`INSERT INTO email_delivery SELECT user_id, id FROM email`);
    const original = snapshot();
    assert.throws(() => merge(), /violates foreign key constraint/);
    assert.equal(snapshot(), original);
});

test("a late failure rolls back email, device, OTP and soft-delete writes", () => {
    sql(
        "ALTER TABLE realtime_event_outbox ADD CHECK (event_type <> 'auth_state_changed')",
    );
    const original = snapshot();
    assert.throws(() => merge({ apply: true }), /violates check constraint/);
    assert.equal(snapshot(), original);
});

test("requires explicit maintenance confirmation in both modes", () => {
    const original = snapshot();
    assert.throws(
        () => merge({ maintenanceConfirmed: false }),
        /Maintenance required/,
    );
    assert.throws(
        () => merge({ apply: true, maintenanceConfirmed: false }),
        /Maintenance required/,
    );
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "writers_paused_and_buffers_drained boolean := true",
                        "writers_paused_and_buffers_drained boolean := NULL",
                    ],
                ],
            }),
        /Maintenance required/,
    );
    assert.equal(snapshot(), original);
});

test.each(["Asia/Tokyo", "America/Los_Angeles"])(
    "expires sessions and OTPs in API UTC time from %s",
    (timezone) => {
        merge({
            apply: true,
            replacements: [
                ["DO $merge$", `SET TIME ZONE '${timezone}'; DO $merge$`],
            ],
        });
        const utcNow =
            "date_trunc('second', clock_timestamp() AT TIME ZONE 'UTC')";
        assert.equal(
            sql(
                `SELECT session_expiry <= ${utcNow} FROM device WHERE did_write = 'source-device'`,
            ),
            "t",
        );
        assert.equal(
            sql(`SELECT code_expiry <= ${utcNow} FROM auth_attempt_email`),
            "t",
        );
        assert.equal(
            sql(`SELECT code_expiry <= ${utcNow} FROM auth_attempt_phone`),
            "t",
        );
        assert.equal(
            sql(`SELECT created_at <= ${utcNow} FROM realtime_event_outbox`),
            "t",
        );
        assert.equal(
            sql(
                "SELECT session_expiry = date_trunc('second', session_expiry) FROM device WHERE did_write = 'source-device'",
            ),
            "t",
        );
    },
);

test("already-linked still checks configured IDs, phone and active status", () => {
    merge({ apply: true });
    const merged = snapshot();
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "expected_keep_user_id uuid := NULL",
                        `expected_keep_user_id uuid := '${sourceId}'`,
                    ],
                ],
            }),
        /do not match the configured IDs/,
    );
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "expected_source_user_id uuid := NULL",
                        `expected_source_user_id uuid := '${sourceId}'`,
                    ],
                ],
            }),
        /do not match the configured IDs/,
    );
    assert.throws(
        () =>
            merge({
                replacements: [
                    [
                        "expected_phone_last_two_digits integer := NULL",
                        "expected_phone_last_two_digits integer := 24",
                    ],
                ],
            }),
        /no active phone matching/,
    );
    merge({
        replacements: [
            [
                "expected_keep_user_id uuid := NULL",
                `expected_keep_user_id uuid := '${keepId}'`,
            ],
            [
                "expected_source_user_id uuid := NULL",
                `expected_source_user_id uuid := '${keepId}'`,
            ],
        ],
    });
    assert.equal(snapshot(), merged);
    sql(`UPDATE public."user" SET is_deleted = true WHERE id = '${keepId}'`);
    assert.throws(() => merge(), /Both accounts must be active/);
});

test("already-linked still requires an active primary email", () => {
    merge({ apply: true });
    sql("UPDATE email SET type = 'backup'");
    assert.throws(() => merge(), /active primary credential/);
});

test("checks deferred constraints before reporting dry-run success", () => {
    sql(
        "ALTER TABLE email_delivery ALTER CONSTRAINT email_delivery_recipient_id_email_id_fkey DEFERRABLE INITIALLY DEFERRED",
    );
    sql("INSERT INTO email_delivery SELECT user_id, id FROM email");
    const original = snapshot();
    assert.throws(() => merge(), /violates foreign key constraint/);
    assert.throws(
        () => merge({ apply: true }),
        /violates foreign key constraint/,
    );
    assert.equal(snapshot(), original);
});

test("utility notices do not print account identifiers", () => {
    const results = [merge(), merge({ apply: true }), merge()];
    for (const result of results) {
        for (const identifier of [
            "kept-test-account",
            "source-test-account",
            "source@example.com",
            keepId,
            sourceId,
            "test-phone-hash",
        ]) {
            assert.equal(result.messages.includes(identifier), false);
        }
    }
});
