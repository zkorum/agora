import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
    getHistoricalMigrationFinding,
    inspectPython,
    inspectTypeScript,
    isProductionSource,
    loadHistoricalMigrationHashes,
    type SourceFinding,
} from "./check-soft-deletes.js";
import { inspectSql } from "./soft-delete-sql.js";

function analyzeTypeScript(source: string): SourceFinding[] {
    const path = fileURLToPath(
        new URL("../soft-delete-fixture.ts", import.meta.url),
    );
    const sourceFile = ts.createSourceFile(
        path,
        `
        import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
        import { pgTable, integer } from "drizzle-orm/pg-core";
        declare const db: PostgresJsDatabase;
        const table = pgTable("score", { id: integer("id").primaryKey() });
        ${source}
    `,
        ts.ScriptTarget.Latest,
        true,
    );
    const options = {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (name, version, onError, fresh) =>
        name === path
            ? sourceFile
            : getSourceFile(name, version, onError, fresh);
    return inspectTypeScript({
        sourceFile,
        checker: ts.createProgram([path], options, host).getTypeChecker(),
    });
}

describe("database hard-delete source policy", () => {
    it("detects real Drizzle deletes and method aliases while allowing updates and collections keyed by tables", () => {
        expect(
            analyzeTypeScript(`
            const writer = db;
            writer.delete(table);
            const removeRows = db.delete;
            removeRows(table);
            db.update(table).set({ id: 2 });
            new Map<typeof table, number>().delete(table);
            new Set<typeof table>().delete(table);
        `).map((finding) => finding.operation),
        ).toEqual(["Drizzle delete", "Drizzle delete"]);
    });

    it.each([
        `const query = "DELE" + "TE FROM ranking_score";`,
        `const prefix = "DELE"; const query = prefix + "TE FROM ranking_score";`,
        'const query = `DELE${"TE"} FROM ranking_score`;',
        "const query = `DELETE FROM ${table}`;",
    ])("detects SQL constructed from literals: %s", (source) => {
        expect(
            analyzeTypeScript(source).some(
                (finding) => finding.operation === "SQL DELETE",
            ),
        ).toBe(true);
    });

    it("parses named Python records, aliases, concatenation and f-strings without executing sources", () => {
        const findings = inspectPython([
            {
                path: "worker.py",
                source: `
from sqlalchemy import delete as remove_rows, update
erase = remove_rows
erase(Score)
session.delete(score)
session.execute(update(Score))
session.execute("DELE" + "TE FROM ranking_score")
session.execute(f'{"DELE"}{""}TE FROM ranking_score')
`,
            },
        ]);
        expect(findings.map((finding) => finding.operation)).toEqual([
            "SQLAlchemy delete",
            "Python .delete",
            "SQL DELETE",
            "SQL DELETE",
        ]);
        expect(findings.every((finding) => finding.path === "worker.py")).toBe(
            true,
        );
    });

    it("does not mistake explicitly typed Valkey acknowledgments for SQL row deletion", () => {
        expect(
            inspectPython([
                {
                    path: "worker.py",
                    source: `
from valkey import Valkey
queue = Valkey()
queue.delete("queue:imports")
`,
                },
            ]),
        ).toEqual([]);
    });

    it.each([
        ["services/api/src/service/account.ts", true],
        ["services/api/src/service/account.test.ts", false],
        ["services/scoring-worker/tests/test_publication.py", false],
        [
            "services/conversation-email-update-worker/src/devExercise/fixtureStore.ts",
            false,
        ],
        ["services/api/src/devExercise/live.ts", true],
        ["services/api/src/drizzle/live.ts", true],
        ["services/deletion-worker/src/purge/ranking.ts", false],
    ])("scopes exceptions explicitly: %s", (path, production) => {
        expect(isProductionSource(path)).toBe(production);
    });

    it("pins the historical vote-submission removal without allowing edits", async () => {
        const path =
            "services/api/database/flyway/V0112__parallel_puppet_master.sql";
        const source = await readFile(
            new URL(
                "../database/flyway/V0112__parallel_puppet_master.sql",
                import.meta.url,
            ),
            "utf8",
        );
        const hashes = await loadHistoricalMigrationHashes();
        expect(hashes.has(path)).toBe(true);
        expect(
            getHistoricalMigrationFinding({ source: { path, source }, hashes }),
        ).toBeUndefined();
        expect(
            getHistoricalMigrationFinding({
                source: { path, source: source + "\n" },
                hashes,
            }),
        ).toMatchObject({ operation: "Historical migration modified" });
    });

    it("pins historical files even when an edit removes every destructive statement", async () => {
        const path =
            "services/api/database/flyway/V0028.1__cleanup_bad_zupass_nullifiers.sql";
        const source = await readFile(
            new URL(
                "../database/flyway/V0028.1__cleanup_bad_zupass_nullifiers.sql",
                import.meta.url,
            ),
            "utf8",
        );
        const hashes = await loadHistoricalMigrationHashes();
        expect(
            getHistoricalMigrationFinding({ source: { path, source }, hashes }),
        ).toBeUndefined();
        expect(
            getHistoricalMigrationFinding({
                source: { path, source: "SELECT 1;" },
                hashes,
            }),
        ).toMatchObject({ operation: "Historical migration modified" });
        expect(
            getHistoricalMigrationFinding({
                source: { path, source: source + "\nDELETE FROM user;" },
                hashes,
            }),
        ).toMatchObject({ operation: "Historical migration modified" });
        expect(
            hashes.has("services/api/database/flyway/V9999__new_cleanup.sql"),
        ).toBe(false);
    });
});

describe("PostgreSQL lexical policy", () => {
    it.each([
        "DELETE FROM ONLY ranking_score;",
        "DELETE /* outer /* nested */ comment */ FROM ranking_score;",
        "WITH old AS (DELETE FROM ranking_score RETURNING *) SELECT * FROM old;",
        "DO $$ BEGIN EXECUTE 'DELETE FROM ranking_score'; END $$;",
        "DO $code$ BEGIN EXECUTE 'DELE' || 'TE FROM ranking_score'; END $code$;",
        "CREATE FUNCTION f() RETURNS void AS $$ BEGIN DELETE FROM ranking_score; END $$ LANGUAGE plpgsql;",
        "DO $$ BEGIN EXECUTE FORMAT('DELETE FROM %I', target); END $$;",
    ])("detects physical deletion: %s", (source) => {
        expect(
            inspectSql(source).some(
                (finding) => finding.operation === "SQL DELETE",
            ),
        ).toBe(true);
    });

    it.each([
        "TRUNCATE ONLY ranking_score;",
        'DROP TABLE IF EXISTS "ranking_score";',
        "CREATE TEMP TABLE staging(id integer); TRUNCATE staging, ranking_score;",
        "CREATE TEMP TABLE staging(id integer); DROP TABLE staging, ranking_score;",
        'CREATE TEMP TABLE Foo(id integer); DELETE FROM "Foo";',
        "DELETE FROM staging; CREATE TEMP TABLE staging(id integer);",
        "CREATE TEMP TABLE staging(id integer); DELETE FROM public.staging;",
        "CREATE TEMP TABLE staging(id integer); DROP TABLE staging; DELETE FROM staging;",
        'CREATE TEMP TABLE u(id integer); DELETE FROM U&"ranking_score";',
        "DO $$ BEGIN EXECUTE command_text; END $$;",
    ])(
        "does not silently exempt unsafe or unproven operations: %s",
        (source) => {
            expect(inspectSql(source).length).toBeGreaterThan(0);
        },
    );

    it.each([
        "-- DELETE FROM ranking_score\nSELECT 1;",
        "SELECT 'DELETE FROM ranking_score';",
        "SELECT $$DROP TABLE ranking_score$$;",
        "CREATE TEMP TABLE Foo(id integer); DELETE FROM foo;",
        'CREATE TEMP TABLE "strange""--name"(id integer); TRUNCATE "strange""--name";',
        "CREATE TEMP TABLE staging(id integer); DELETE FROM ONLY (pg_temp.staging);",
        "CREATE TEMP TABLE staging(id integer); TRUNCATE staging; DROP TABLE staging;",
        "CREATE TRIGGER t AFTER UPDATE ON ranking_score EXECUTE FUNCTION refresh_score();",
        "DO $$ BEGIN EXECUTE 'LOCK TABLE ranking_score'; END $$;",
        "UPDATE ranking_score SET scores = '[]';",
    ])(
        "allows non-destructive operations and actual temporary tables: %s",
        (source) => {
            expect(inspectSql(source)).toEqual([]);
        },
    );
});
