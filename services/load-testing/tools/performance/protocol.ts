import { z } from "zod";
import { rankingStrategySchema } from "../../src/utils/rankingStrategies.ts";

const count = z.number().int().nonnegative();
const duration = z.number().nonnegative();
const revision = z.string().regex(/^(?:0|[1-9]\d*|-1)$/);
const json = z.json();
type Metadata = Partial<Record<string, z.infer<typeof json>>>;
export const slugSchema = z.string().regex(/^[A-Za-z0-9_-]{1,10}$/);

export const revisionSchema = z.object({
    id: z.number().int().positive(),
    slug_id: slugSchema,
    scoring_input_revision: z.string().regex(/^(?:0|[1-9]\d*)$/),
    processed_scoring_input_revision: revision,
    vote_count: count,
    participant_count: count,
    snapshot_id: z.number().int().positive().nullable(),
    published_at: z.iso.datetime({ offset: true }).nullable(),
});
export const revisionsSchema = z
    .array(revisionSchema)
    .refine(
        (rows) => new Set(rows.map((row) => row.slug_id)).size === rows.length,
        "Duplicate conversations in revision data",
    );
export type Revision = z.infer<typeof revisionSchema>;

export const scoreSchema = z.object({
    itemSlugId: z.string().min(1),
    score: z.number().nullable(),
    participantCount: count,
});
export const scoresSchema = z
    .array(scoreSchema)
    .refine(
        (rows) =>
            new Set(rows.map((row) => row.itemSlugId)).size === rows.length,
        "Duplicate items in score data",
    );
export type Score = z.infer<typeof scoreSchema>;
export const rankingResponseSchema = z.object({ rankings: scoresSchema });

export const queryCountersSchema = z.object({
    calls: count,
    total_exec_time: duration,
    rows: count,
    shared_blks_hit: count,
    shared_blks_read: count,
    temp_blks_written: count,
    wal_bytes: duration,
    blk_read_time: duration,
    blk_write_time: duration,
});
export const querySchema = queryCountersSchema.extend({
    user_id: z.string(),
    toplevel: z.boolean(),
    queryid: z.string(),
    query: z.string(),
});
export const querySnapshotSchema = z.object({
    reset: z.string().nullable(),
    dealloc: count,
    queries: z.array(querySchema).max(500),
});
export type QuerySnapshot = z.infer<typeof querySnapshotSchema>;

export const historySchema = z.array(
    z.object({
        slug_id: slugSchema,
        active_comparisons: count,
        soft_deleted_comparisons: count,
    }),
);
export const settingsSchema = z.object({
    database: z.string(),
    serverVersion: z.string(),
    extensionInstalled: z.boolean(),
    settings: z.record(z.string(), z.string()),
});
export const databaseSampleSchema = z.object({
    timestamp: z.iso.datetime({ offset: true }),
    activity: z.array(z.json()),
    blockers: z.array(z.json()),
    database: z.json(),
    tables: z.array(z.json()),
    replication: z.array(z.json()),
});
export const eventSchema = z.object({
    schemaVersion: z.literal(1),
    timestamp: z.iso.datetime({ offset: true }),
    scenario: z.literal("solidago-ranking"),
    phase: z.string(),
    action: z.string(),
    outcome: z.string().optional(),
    conversationSlugId: slugSchema.nullable().optional(),
    userId: z.string().optional(),
    count: count.optional(),
    responseTimeMs: duration.nullable().optional(),
    metadata: z
        .record(z.string(), json)
        .default({})
        .transform((value): Metadata => value),
});
export type PerformanceEvent = z.infer<typeof eventSchema>;
export const loggingConfigSchema = z.object({
    pid: z.number().int().positive(),
    performanceEnabled: z.boolean(),
    logLevel: z.string(),
    sqlQueries: z.boolean().optional(),
    maxWorkers: count.optional(),
    batchSize: count.optional(),
    pollSeconds: duration.optional(),
    reconcileSeconds: duration.optional(),
});
export const itemManifestSchema = z.object({
    itemOrder: z.string().transform((text, context): string[] => {
        try {
            return z
                .array(z.string().min(1))
                .min(4)
                .refine((ids) => new Set(ids).size === ids.length)
                .parse(JSON.parse(text));
        } catch {
            context.addIssue({
                code: "custom",
                message: "Invalid frozen item manifest",
            });
            return z.NEVER;
        }
    }),
    strategy: rankingStrategySchema,
    seed: z.string(),
});
export const summarySchema = z.object({
    metrics: z.record(
        z.string(),
        z.object({ count: count.optional() }).catchall(z.json()),
    ),
});
export type Summary = z.infer<typeof summarySchema>;

export function parseJson<T>({
    text,
    schema,
    label,
}: {
    text: string;
    schema: z.ZodType<T>;
    label: string;
}): T {
    try {
        return schema.parse(JSON.parse(text));
    } catch {
        throw new Error(`Invalid ${label} data`);
    }
}

export function errorMessage(error: unknown): string {
    if (error instanceof z.ZodError)
        return "Invalid monitoring data (schema validation failed)";
    if (error instanceof SyntaxError) return "Invalid JSON in monitoring data";
    return error instanceof Error
        ? error.message
        : "Unknown monitoring failure";
}
