// @ts-check
// Closed-world packaging of the reviewed prepared scripts, not a general SQL
// parser. Each CALL commits bounded keyset batches; no cleanup worker is added.
const separator = "\n--> statement-breakpoint\n";

/** @param {{ table: string, alias?: string }} root */
function range({ table, alias = table }) {
    return `${alias}.id >= mb_lower AND ${alias}.id <= mb_boundary`;
}

/**
 * @param {{ name: string, table: string, sql: string }} job
 */
export function boundedJob({ name, table, sql }) {
    const type = table === '"user"' ? "uuid" : "bigint";
    return [
        `CREATE OR REPLACE PROCEDURE public.${name}() LANGUAGE plpgsql AS $batch$
DECLARE
    mb_cursor ${type};
    mb_lower ${type};
    mb_boundary ${type};
    mb_high_water ${type};
    mb_size integer := coalesce(nullif(current_setting('agora.migration_batch_size', true), ''), '5000')::integer;
    mb_pause_ms integer := coalesce(nullif(current_setting('agora.migration_batch_pause_ms', true), ''), '0')::integer;
BEGIN
    IF mb_size < 1 OR mb_size > 5000 THEN
        RAISE EXCEPTION 'migration_batch_size must be between 1 and 5000';
    END IF;
    IF mb_pause_ms < 0 OR mb_pause_ms > 1000 THEN
        RAISE EXCEPTION 'migration_batch_pause_ms must be between 0 and 1000';
    END IF;
    SELECT id INTO mb_high_water FROM ${table} ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM ${table} WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM ${table}
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM ${table}
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        ${sql.trim()}
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;`,
        `CALL public.${name}();`,
        `DROP PROCEDURE public.${name}();`,
    ].join(separator);
}

/** @param {string} sql */
function statements(sql) {
    return sql
        .replace(/--[^\n]*(?:\n|$)/g, "\n")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
}

/** @param {{ sql: string, prefix: string, expected: number }} options */
export function boundedUpdates({ sql, prefix, expected }) {
    const updates = statements(sql);
    if (updates.length !== expected)
        throw new Error(`Unexpected prepared UPDATE count in ${prefix}`);
    return updates
        .map((update, index) => {
            const match =
                /^UPDATE\s+(?<table>"?\w+"?)(?:\s+(?<alias>\w+))?\s+SET\s+(?<set>[^]*?)\s+WHERE\s+(?<where>[^]*)$/.exec(
                    update,
                );
            const table = match?.groups?.table;
            const assignment = match?.groups?.set;
            const predicate = match?.groups?.where;
            if (
                table === undefined ||
                assignment === undefined ||
                predicate === undefined
            ) {
                throw new Error(`Unrecognized prepared UPDATE in ${prefix}`);
            }
            const alias = match?.groups?.alias ?? table;
            return boundedJob({
                name: `${prefix}_${index + 1}`,
                table,
                sql: `UPDATE ${table}${alias === table ? "" : ` ${alias}`} SET ${assignment}
WHERE (${predicate}) AND (${range({ table, alias })});`,
            });
        })
        .join(separator);
}

/** @param {string} sql */
export function boundedOwnership(sql) {
    const where = "WHERE content.vote_id <> v.id";
    if (!sql.includes(where))
        throw new Error("Ownership repair source changed.");
    const first = sql.indexOf("WITH replacements AS");
    if (first < 0)
        throw new Error(
            "Ownership repair source is missing its replacement CTE.",
        );
    return (
        sql.slice(0, first).trim() +
        separator +
        boundedJob({
            name: "agora_upgrade_0115_4",
            table: "vote",
            sql: sql
                .slice(first)
                .replace(
                    where,
                    `${where} AND (${range({ table: "vote", alias: "v" })})`,
                ),
        })
    );
}

/** @param {string} sql */
export function boundedReplay(sql) {
    const split = sql.indexOf("CREATE OR REPLACE FUNCTION");
    if (split < 0)
        throw new Error("Replay contract is missing its boundary function.");
    return (
        boundedUpdates({
            sql: sql.slice(0, split),
            prefix: "agora_upgrade_0115_6",
            expected: 2,
        }) +
        separator +
        sql.slice(split)
    );
}

/** @param {string} sql */
export function boundedLiveRefresh(sql) {
    const parts = statements(sql);
    const tallies = parts.at(0);
    const analysis = parts.at(1);
    const scoring = parts.at(2);
    if (
        parts.length !== 3 ||
        tallies === undefined ||
        analysis === undefined ||
        scoring === undefined
    ) {
        throw new Error(
            "Live-refresh source changed; review the three scoped jobs.",
        );
    }
    const tallyWhere =
        "WHERE voter.is_deleted AND v.current_content_id IS NOT NULL";
    const analysisWhere = "WHERE c.polis_config_id = config.id";
    const scoringWhere = "WHERE scope.ranking_config_id = config.id";
    if (
        !tallies.includes(tallyWhere) ||
        !analysis.includes(analysisWhere) ||
        !scoring.includes(scoringWhere)
    ) {
        throw new Error(
            "Live-refresh scope changed; refusing an unbounded rewrite.",
        );
    }
    let scopedAnalysis = analysis;
    for (const { predicate, alias } of [
        { predicate: "WHERE author.is_deleted", alias: "statement" },
        { predicate: "WHERE voter.is_deleted", alias: "statement" },
        { predicate: "WHERE respondent.is_deleted", alias: "response" },
    ]) {
        if (!scopedAnalysis.includes(predicate))
            throw new Error("Live-refresh input scope changed.");
        scopedAnalysis = scopedAnalysis.replace(
            predicate,
            `${predicate} AND ${alias}.conversation_id >= mb_lower AND ${alias}.conversation_id <= mb_boundary`,
        );
    }
    return [
        boundedJob({
            name: "agora_upgrade_0115_7_tallies",
            table: "opinion",
            sql:
                tallies.replace(
                    tallyWhere,
                    `${tallyWhere} AND v.opinion_id >= mb_lower AND v.opinion_id <= mb_boundary`,
                ) + ";",
        }),
        boundedJob({
            name: "agora_upgrade_0115_7_analysis",
            table: "conversation",
            sql:
                scopedAnalysis.replace(
                    analysisWhere,
                    `${analysisWhere} AND (${range({ table: "conversation", alias: "c" })})`,
                ) + ";",
        }),
        boundedJob({
            name: "agora_upgrade_0115_7_scoring",
            table: "conversation",
            sql:
                scoring.replace(
                    scoringWhere,
                    `${scoringWhere} AND (${range({ table: "conversation", alias: "scope" })})`,
                ) + ";",
        }),
    ].join(separator);
}
