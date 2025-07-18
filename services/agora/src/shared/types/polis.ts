/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const stringToJSONSchema = z
    .string()
    .transform((str, ctx): z.infer<ReturnType<typeof Object>> => {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("Invalid JSON", e);
            ctx.addIssue({ code: "custom", message: "Invalid JSON" });
            return z.NEVER;
        }
    });

export const zodStatement = z.object({
    statement_id: z.union([z.string(), z.number()]),
    x: z.number(),
    y: z.number(),
    to_zero: z.union([z.number(), z.boolean()]),
    is_meta: z.boolean(),
    mean: z.number(),
    pc1: z.nullable(z.number()),
    pc2: z.nullable(z.number()),
    pc3: z.nullable(z.number()),
    extremity: z.number(),
    n_agree: z.number(),
    n_disagree: z.number(),
    n_total: z.number(),
    priority: z.number(),
    "group-aware-consensus": z.number(),
    "group-aware-consensus-agree": z.number(),
    "group-aware-consensus-disagree": z.number(),
});

export const zodStatementsDf = z.array(zodStatement);

export const zodParticipant = z.object({
    participant_id: z.number(), // TODO: allow strings too!
    x: z.number(),
    y: z.number(),
    to_cluster: z.boolean(),
    cluster_id: z.nullable(z.number().or(z.string())),
});

export const zodParticipantsDf = z.array(zodParticipant);

export const zodRepnessStatement = z.object({
    tid: z.number(), // TODO: support string
    "n-success": z.number(),
    "n-trials": z.number(),
    "p-success": z.number(),
    "p-test": z.number(),
    repness: z.number(),
    "repness-test": z.number(),
    "repful-for": z.union([z.literal("agree"), z.literal("disagree")]),
    "best-agree": z.boolean().optional(),
    "n-agree": z.number().optional(),
});

export const zodRepness = z.record(
    z.union([z.string(), z.number()]),
    z.array(zodRepnessStatement),
);

export const zodGroupCommentStat = z.object({
    statement_id: z.number(), // TODO: support string
    na: z.number(), // agree count in group
    nd: z.number(), // disagree count in group
    ns: z.number(), // seen (total votes) in group
    pa: z.number(), // probability of agree
    pd: z.number(), // probability of disagree
    pat: z.number(), // z-score for agree prob
    pdt: z.number(), // z-score for disagree prob
    ra: z.number(), // representativeness of agree
    rd: z.number(), // representativeness of disagree
    rat: z.number(), // z-score for rep agree
    rdt: z.number(), // z-score for rep disagree
    repness_order: z.number().optional(), // repness order (int rank)
});

export const zodGroupCommentStats = z.record(
    z.union([z.string(), z.number()]), // group_id as key
    z.array(zodGroupCommentStat),
);

export const zodConsensusStatement = z.object({
    tid: z.number(), // TODO: support string
    "n-success": z.number(),
    "n-trials": z.number(),
    "p-success": z.number(),
    "p-test": z.number(),
});

export const zodConsensus = z.object({
    agree: z.array(zodConsensusStatement),
    disagree: z.array(zodConsensusStatement),
});

export const zodMathResults = z.object({
    statements_df: zodStatementsDf,
    participants_df: zodParticipantsDf,
    repness: zodRepness,
    group_comment_stats: zodGroupCommentStats,
    consensus: zodConsensus,
});

export type StatementsDf = z.infer<typeof zodStatementsDf>;
export type ParticipantsDf = z.infer<typeof zodParticipantsDf>;
export type Repness = z.infer<typeof zodRepness>;
export type GroupCommentStats = z.infer<typeof zodGroupCommentStats>;
// Polis consensus is actually "majority opinions", yeah, confusing. Real consensus is group-aware-consensus.
export type Majority = z.infer<typeof zodConsensus>;
export type MathResults = z.infer<typeof zodMathResults>;
