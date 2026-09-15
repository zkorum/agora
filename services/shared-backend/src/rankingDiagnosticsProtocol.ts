import { z } from "zod";

const id = z.number().int().positive().max(2_147_483_647);
const common = z.object({ id, role: z.enum(["primary", "replica"]) });
const slugs = z.array(z.string().regex(/^[A-Za-z0-9_-]{1,10}$/)).min(1);
export const rankingDiagnosticsRequest = z.discriminatedUnion("operation", [
    common.extend({ operation: z.literal("revisions"), slugs }),
    common.extend({ operation: z.literal("history"), slugs }),
    common.extend({ operation: z.literal("scores"), snapshotId: id }),
    common.extend({ operation: z.literal("query-stats") }),
    common.extend({
        operation: z.literal("plan"),
        role: z.literal("primary"),
        conversationId: id,
        kind: z.enum(["uncertainty", "comparisons"]),
    }),
]);
export type RankingDiagnosticsRequest = z.infer<
    typeof rankingDiagnosticsRequest
>;
export const rankingDiagnosticsReply = z.discriminatedUnion("ok", [
    z.object({
        id: z.number().int().nonnegative(),
        ok: z.literal(true),
        data: z.json(),
    }),
    z.object({
        id: z.number().int().nonnegative(),
        ok: z.literal(false),
        error: z.enum([
            "invalid_request",
            "database_error",
            "configuration_error",
        ]),
    }),
]);
