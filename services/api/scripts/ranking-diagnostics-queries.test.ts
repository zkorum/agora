import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { buildRankingDiagnosticsQuery } from "./ranking-diagnostics-queries.js";
import { buildQueryStatisticsQuery } from "./ranking-diagnostics-postgres.js";

// postgres-js connects lazily; compiling a Drizzle query does not open a socket.
const db = drizzle(postgres("postgres://unused:unused@127.0.0.1:1/unused"));
describe("ranking diagnostics Drizzle queries", () => {
    it("queries existing PostgreSQL statistics views with typed selections and bound filters", () => {
        const query = buildQueryStatisticsQuery(db).toSQL();
        expect(query.sql).toContain('"pg_stat_statements"');
        expect(query.sql).toContain('"pg_catalog"."pg_database"');
        expect(query.sql).not.toContain("json_agg");
        expect(query.params).toContain("%ranking-performance-monitor%");
        expect(query.params).toContain(500);
    });
    it("uses shared table definitions and bound parameters for fixture reads", () => {
        const query = buildRankingDiagnosticsQuery({
            db,
            request: {
                id: 1,
                operation: "revisions",
                role: "primary",
                slugs: ["x';drop"],
            },
        }).toSQL();
        expect(query.sql).toContain('"ranking_conversation_config"');
        expect(query.sql).toContain("left join lateral");
        expect(query.sql).not.toContain("x';drop");
        expect(query.params).toContain("x';drop");
        expect(query.sql).toContain("ranking-performance-monitor");
    });
    it("filters current comparison rows and active published items through ORM expressions", () => {
        const history = buildRankingDiagnosticsQuery({
            db,
            request: {
                id: 1,
                operation: "history",
                role: "primary",
                slugs: ["fixture"],
            },
        }).toSQL();
        expect(history.sql).toContain(
            '"maxdiff_comparison"."deleted_at" is null',
        );
        expect(history.sql).toContain(
            '"maxdiff_comparison"."deleted_at" is not null',
        );
        const scores = buildRankingDiagnosticsQuery({
            db,
            request: {
                id: 2,
                operation: "scores",
                role: "replica",
                snapshotId: 7,
            },
        }).toSQL();
        expect(scores.params).toContain(7);
        expect(scores.params).toContain("active");
        expect(scores.params).toContain("in_progress");
    });
    it("builds SELECT-only plan inputs with parameterized conversation IDs", () => {
        for (const kind of ["uncertainty", "comparisons"] as const) {
            const query = buildRankingDiagnosticsQuery({
                db,
                request: {
                    id: 3,
                    operation: "plan",
                    role: "primary",
                    kind,
                    conversationId: 7,
                },
            }).toSQL();
            expect(query.sql).toMatch(/^select /);
            expect(query.params).toContain(7);
        }
    });
});
