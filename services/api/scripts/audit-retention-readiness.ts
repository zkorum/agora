import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { auditOptionsSchema, runRetentionAudit } from "./retention-audit.js";

export function parseAuditArguments(args: string[]) {
    const { values } = parseArgs({
        args,
        strict: true,
        options: {
            help: { type: "boolean", short: "h" },
            "row-limit": { type: "string" },
            "statement-timeout-ms": { type: "string" },
            "lock-timeout-ms": { type: "string" },
            "max-duration-ms": { type: "string" },
        },
    });
    return {
        help: values.help === true,
        options: auditOptionsSchema.parse({
            rowLimit:
                values["row-limit"] === undefined
                    ? undefined
                    : Number(values["row-limit"]),
            statementTimeoutMs:
                values["statement-timeout-ms"] === undefined
                    ? undefined
                    : Number(values["statement-timeout-ms"]),
            lockTimeoutMs:
                values["lock-timeout-ms"] === undefined
                    ? undefined
                    : Number(values["lock-timeout-ms"]),
            maxDurationMs:
                values["max-duration-ms"] === undefined
                    ? undefined
                    : Number(values["max-duration-ms"]),
        }),
    };
}

async function main(): Promise<void> {
    const { help, options } = parseAuditArguments(process.argv.slice(2));
    if (help) {
        process.stdout.write(
            "Read-only comparison-retention readiness audit.\nUse RETENTION_AUDIT_DATABASE_URL with a dedicated read-only role.\nOptions: --row-limit (1000), --statement-timeout-ms (2000), --lock-timeout-ms (250), --max-duration-ms (30000).\nCounts are capped; estimates may be stale. No DDL, migrations, backfills, ANALYZE or cleanup.\nSee doc/retention-rollout-readiness.md.\n",
        );
        return;
    }
    // Deliberately no .env loading or CONNECTION_STRING fallback: selecting an
    // environment is an explicit operator action, never an accidental API boot.
    const url = z
        .url()
        .refine((value) =>
            ["postgres:", "postgresql:"].includes(new URL(value).protocol),
        )
        .parse(process.env.RETENTION_AUDIT_DATABASE_URL);
    const client = postgres(url, {
        max: 1,
        prepare: false,
        connect_timeout: 5,
        idle_timeout: 5,
        onnotice: () => undefined,
        connection: {
            application_name: "agora_retention_readiness_audit",
            search_path: "pg_catalog, public",
            default_transaction_read_only: true,
            statement_timeout: options.statementTimeoutMs,
            lock_timeout: options.lockTimeoutMs,
        },
    });
    let result: Awaited<ReturnType<typeof runRetentionAudit>>;
    try {
        result = await runRetentionAudit({
            db: drizzle({ client }),
            options,
        });
    } finally {
        await client.end({ timeout: 5 });
    }
    // This is the CLI's counts-only report, not a backend event/logger. Never
    // serialize errors, connection information, IDs, JSON blobs or SQL here.
    process.stdout.write(
        `${JSON.stringify(
            {
                formatVersion: 1,
                scope: "comparison_retention",
                readOnly: true,
                observedAt: new Date().toISOString(),
                consistency: "independent_short_reads",
                options,
                ...result,
            },
            undefined,
            2,
        )}\n`,
    );
    process.exitCode =
        result.status === "blocked"
            ? 2
            : result.status === "incomplete"
              ? 3
              : 0;
}

const executable = process.argv.at(1);
if (
    executable !== undefined &&
    import.meta.url === pathToFileURL(executable).href
) {
    try {
        await main();
    } catch {
        process.stdout.write(
            `${JSON.stringify({ status: "failed", reason: "audit_setup_or_teardown_failed", readOnly: true })}\n`,
        );
        process.exitCode = 1;
    }
}
