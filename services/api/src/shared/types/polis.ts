/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
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

export const zodPolisStatementsDf = z.array(zodStatement);

export const zodParticipant = z.object({
    participant_id: z.number(), // TODO: allow strings too!
    x: z.number(),
    y: z.number(),
    to_cluster: z.boolean(),
    cluster_id: z.nullable(z.number().or(z.string())),
});

export const zodPolisParticipantsDf = z.array(zodParticipant);

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

export const zodPolisRepness = z.record(
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

export const zodPolisGroupCommentStats = z.record(
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

export const zodPolisConsensus = z.object({
    agree: z.array(zodConsensusStatement),
    disagree: z.array(zodConsensusStatement),
});

export const zodMathResults = z.object({
    statements_df: zodPolisStatementsDf,
    participants_df: zodPolisParticipantsDf,
    repness: zodPolisRepness,
    group_comment_stats: zodPolisGroupCommentStats,
    consensus: zodPolisConsensus,
});

// Math Results AND Import API

export const zodPolisVoteRecord = z.object({
    participant_id: z.number(), // TODO: support string too
    statement_id: z.number(), // TODO: support string too
    vote: z.number(),
    conversation_id: z.string().or(z.number()).nullable(),
    datetime: z.string().nullable(),
    modified: z.number().nullable(),
    weight_x_32767: z.number().nullable(),
});

// Import API

const zodPolisComment = z.object({
    active: z.boolean().nullable(),
    agree_count: z.number().nullable(),
    conversation_id: z.string().or(z.number()).nullable(),
    count: z.number().nullable(),
    created: z.string().nullable(), // ISO date string
    datetime: z.string().nullable(), // can be null or a date, unknown format
    disagree_count: z.number().nullable(),
    is_meta: z.boolean().nullable(),
    is_seed: z.boolean().nullable(),
    lang: z.string().nullable(),
    moderated: z.number().nullable(), // -1 is moderated, anything else is not. I think 0 means that no decision has ever been made, while 1 has been explicitely seen and considered accepbable by a mod.  I think Null should not happen, but we want to be permissive with the external API we don't control. See https://github.com/nicobao/red-dwarf/blob/main/docs/notebooks/polis-implementation-demo.ipynb#L129-L129
    participant_id: z.number(),
    pass_count: z.number().nullable(),
    quote_src_url: z.string().nullable(),
    statement_id: z.number(), // important bit
    tweet_id: z.string().or(z.number()).nullable(),
    txt: z.string(),
    velocity: z.number().nullable(),
});

const zodPolisConversation = z.object({
    auth_needed_to_vote: z.boolean().nullable(),
    auth_needed_to_write: z.boolean().nullable(),
    auth_opt_allow_3rdparty: z.boolean().nullable(),
    auth_opt_fb: z.boolean().nullable(),
    auth_opt_tw: z.boolean().nullable(),
    bgcolor: z.any().nullable(),
    context: z.string().nullable(),
    conversation_id: z.string().or(z.number()).nullable(),
    course_id: z.union([z.string(), z.number()]).nullable(),
    created: z.coerce.number().nullable(), // timestamp
    dataset_explanation: z.any().nullable(),
    description: z.string(), // "body" in agora
    email_domain: z.any().nullable(),
    help_bgcolor: z.any().nullable(),
    help_color: z.any().nullable(),
    help_type: z.number().nullable(),
    importance_enabled: z.boolean().nullable(),
    is_active: z.boolean().nullable(),
    is_anon: z.boolean().nullable(),
    is_curated: z.boolean().nullable(),
    is_data_open: z.boolean().nullable(),
    is_draft: z.boolean().nullable(),
    is_mod: z.boolean().nullable(),
    is_owner: z.boolean().nullable(),
    is_public: z.boolean().nullable(),
    link_url: z.string().nullable(),
    modified: z.union([z.number(), z.string()]).nullable(),
    need_suzinvite: z.boolean().nullable(),
    org_id: z.number().nullable(),
    owner: z.number().nullable(),
    owner_sees_participation_stats: z.boolean().nullable(),
    ownername: z.string().nullable(),
    parent_url: z.string().nullable(),
    participant_count: z.number().nullable(),
    prioritize_seed: z.boolean().nullable(),
    profanity_filter: z.boolean().nullable(),
    site_id: z.string().nullable(),
    socialbtn_type: z.number().nullable(),
    spam_filter: z.boolean().nullable(),
    strict_moderation: z.boolean().nullable(),
    style_btn: z.any().nullable(),
    subscribe_type: z.number().nullable(),
    topic: z.string(), // "title" in agora
    translations: z.array(z.any()).nullable(),
    upvotes: z.number().nullable(),
    use_xid_whitelist: z.boolean().nullable(),
    vis_type: z.number().nullable(),
    write_hint_type: z.number().nullable(),
    write_type: z.number().nullable(),
});

export const zodImportPolisResults = z.object({
    comments_data: z.array(zodPolisComment),
    conversation_data: zodPolisConversation,
    conversation_id: z.string().or(z.number()).nullable(),
    report_id: z.string().nullable(),
    votes_data: z.array(zodPolisVoteRecord),
});

//
//

export type StatementsDf = z.infer<typeof zodPolisStatementsDf>;
export type ParticipantsDf = z.infer<typeof zodPolisParticipantsDf>;
export type Repness = z.infer<typeof zodPolisRepness>;
export type GroupCommentStats = z.infer<typeof zodPolisGroupCommentStats>;
// Polis consensus is actually "majority opinions", yeah, confusing. Real consensus is group-aware-consensus.
export type Majority = z.infer<typeof zodPolisConsensus>;
export type PolisConversation = z.infer<typeof zodPolisConversation>;
export type PolisComment = z.infer<typeof zodPolisComment>;
export type PolisVoteRecord = z.infer<typeof zodPolisVoteRecord>;
export type MathResults = z.infer<typeof zodMathResults>;
export type ImportPolisResults = z.infer<typeof zodImportPolisResults>;
