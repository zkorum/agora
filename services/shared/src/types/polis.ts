import { z } from "zod";

export const stringToJSONSchema = z
    .string()
    .transform((str, ctx): z.infer<ReturnType<typeof Object>> => {
        try {
            return JSON.parse(str);
        } catch (e) {
            ctx.addIssue({ code: "custom", message: "Invalid JSON" });
            return z.NEVER;
        }
    });

export const zodPCA = z.object({
    comps: z.array(z.array(z.number())),
    center: z.array(z.number()),
    "comment-extremity": z.array(z.number()),
    "comment-projection": z.array(z.array(z.number())),
});

export const zodRepnessEntry = z.object({
    tid: z.number(),
    "p-test": z.number(),
    repness: z.number(),
    "n-trials": z.number(),
    "n-success": z.number(),
    "p-success": z.number(),
    "repful-for": z.enum(["agree", "disagree"]),
    "repness-test": z.number(),
});

export const zodRepness = z.record(z.array(zodRepnessEntry));

export const zodConsensusEntry = z.object({
    tid: z.number(),
    "p-test": z.number(),
    "n-trials": z.number(),
    "n-success": z.number(),
    "p-success": z.number(),
});

export const zodConsensus = z.object({
    agree: z.array(zodConsensusEntry),
    disagree: z.array(zodConsensusEntry),
});

const zodVotesBase = z.object({
    A: z.array(z.number()),
    D: z.array(z.number()),
    S: z.array(z.number()),
});

export const zodVotesBaseMap = z.record(zodVotesBase);

export const zodGroupVotesMap = z.record(
    z.object({
        votes: z.record(
            z.object({
                A: z.number(),
                D: z.number(),
                S: z.number(),
            }),
        ),
        "n-members": z.number(),
        id: z.number(),
    }),
);

export const zodBaseClusters = z.object({
    x: z.array(z.number()),
    y: z.array(z.number()),
    id: z.array(z.number()),
    count: z.array(z.number()),
    members: z.array(z.array(z.number())),
});

export const zodGroupCluster = z.object({
    id: z.number(),
    center: z.array(z.number()),
    members: z.array(z.number()),
});

export const zodUserVoteCounts = z.record(z.number());

export const zodCommentPriorities = z.record(z.number());

export const zodGroupAwareConsensus = z.record(z.number());

export const zodMathResults = z.object({
    n: z.number(),
    pca: zodPCA.nullish(),
    tids: z.array(z.number()),
    "mod-in": z.array(z.unknown()).nullish(),
    "n-cmts": z.number(),
    "in-conv": z.array(z.number()),
    "mod-out": z.array(z.unknown()).nullish(),
    repness: zodRepness,
    consensus: zodConsensus,
    "meta-tids": z.array(z.number()).nullish(),
    "votes-base": zodVotesBaseMap,
    "group-votes": zodGroupVotesMap,
    "base-clusters": zodBaseClusters,
    "group-clusters": z.array(zodGroupCluster),
    lastModTimestamp: z.union([z.number(), z.null()]),
    "user-vote-counts": zodUserVoteCounts,
    lastVoteTimestamp: z.number(),
    "comment-priorities": zodCommentPriorities,
    "group-aware-consensus": zodGroupAwareConsensus,
    math_tick: z.number(),
});

export const zodPolisMathAndMetadata = z.object({
    pca: stringToJSONSchema.pipe(zodMathResults), // see https://github.com/colinhacks/zod/discussions/2215#discussioncomment-5356286 and https://github.com/colinhacks/zod/discussions/2215#discussioncomment-7812655
    pidToHnames: z.record(z.string()),
    tidToTxts: z.record(z.string()),
});

export type PolisMathAndMetadata = z.infer<typeof zodPolisMathAndMetadata>;
export type CommentPriorities = z.infer<typeof zodCommentPriorities>;
