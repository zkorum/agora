// unused
import { z } from "zod";
import { stringToJSONSchema, zodMathResults } from "./polis.js";

const zodUser = z.object({});

const zodNextComment = z.object({
    txt: z.string(),
    tid: z.number(),
    created: z.string(),
    tweet_id: z.nullable(z.any()),
    quote_src_url: z.nullable(z.any()),
    is_seed: z.boolean(),
    is_meta: z.boolean(),
    lang: z.string(),
    pid: z.number(),
    randomN: z.number(),
    remaining: z.number(),
    total: z.number(),
    translations: z.array(z.any()),
});

const zodConversation = z.object({
    topic: z.string(),
    description: z.string(),
    is_anon: z.boolean(),
    is_active: z.boolean(),
    is_draft: z.boolean(),
    is_public: z.boolean(),
    email_domain: z.nullable(z.any()),
    owner: z.number(),
    participant_count: z.number(),
    created: z.string(),
    strict_moderation: z.boolean(),
    profanity_filter: z.boolean(),
    spam_filter: z.boolean(),
    context: z.nullable(z.any()),
    modified: z.string(),
    owner_sees_participation_stats: z.boolean(),
    course_id: z.nullable(z.any()),
    link_url: z.nullable(z.any()),
    upvotes: z.number(),
    parent_url: z.nullable(z.any()),
    vis_type: z.number(),
    write_type: z.number(),
    bgcolor: z.nullable(z.any()),
    help_type: z.number(),
    socialbtn_type: z.number(),
    style_btn: z.nullable(z.any()),
    auth_needed_to_vote: z.boolean(),
    auth_needed_to_write: z.boolean(),
    auth_opt_fb: z.boolean(),
    auth_opt_tw: z.boolean(),
    auth_opt_allow_3rdparty: z.boolean(),
    help_bgcolor: z.nullable(z.any()),
    help_color: z.nullable(z.any()),
    is_data_open: z.boolean(),
    is_curated: z.boolean(),
    dataset_explanation: z.nullable(z.any()),
    write_hint_type: z.number(),
    subscribe_type: z.number(),
    org_id: z.number(),
    need_suzinvite: z.boolean(),
    use_xid_whitelist: z.boolean(),
    prioritize_seed: z.boolean(),
    importance_enabled: z.boolean(),
    site_id: z.string(),
    auth_opt_fb_computed: z.boolean(),
    auth_opt_tw_computed: z.boolean(),
    translations: z.array(z.any()),
    ownername: z.string(),
    is_mod: z.boolean(),
    is_owner: z.boolean(),
    conversation_id: z.string(),
});

const zodFamousEntry = z.object({
    priority: z.number(),
    tw__twitter_user_id: z.nullable(z.any()),
    tw__screen_name: z.nullable(z.any()),
    tw__name: z.nullable(z.any()),
    tw__followers_count: z.nullable(z.any()),
    tw__verified: z.nullable(z.any()),
    tw__location: z.nullable(z.any()),
    fb__fb_user_id: z.nullable(z.any()),
    fb__fb_name: z.nullable(z.any()),
    fb__fb_link: z.nullable(z.any()),
    fb__fb_public_profile: z.nullable(z.any()),
    fb__location: z.nullable(z.any()),
    x_profile_image_url: z.nullable(z.any()),
    xid: z.nullable(z.any()),
    x_name: z.nullable(z.any()),
    x_email: z.nullable(z.any()),
    pid: z.number(),
    votes: z.string(),
    bid: z.number(),
});

const zodFamous = z.record(z.string(), zodFamousEntry);

export const zodParticipationInit = z.object({
    user: zodUser,
    pca: stringToJSONSchema.pipe(zodMathResults), // see https://github.com/colinhacks/zod/discussions/2215#discussioncomment-5356286 and https://github.com/colinhacks/zod/discussions/2215#discussioncomment-7812655
    ptpt: z.nullable(z.any()),
    nextComment: zodNextComment,
    conversation: zodConversation,
    votes: z.array(z.any()),
    famous: zodFamous,
    acceptLanguage: z.string(),
});

export type PolisParticipationInit = z.infer<typeof zodParticipationInit>;
