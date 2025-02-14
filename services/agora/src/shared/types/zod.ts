/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import { validateDidKey, validateDidWeb } from "../did/util.js";
import {
    MAX_LENGTH_TITLE,
    MAX_LENGTH_OPTION,
    MIN_LENGTH_USERNAME,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_BODY,
    MAX_LENGTH_USER_REPORT_EXPLANATION,
} from "../shared.js";
import { isValidPhoneNumber } from "libphonenumber-js";

export const zodUserReportReason = z.enum([
    "misleading",
    "antisocial",
    "illegal",
    "doxing",
    "sexual",
    "spam",
]);
export const zodModerationReason = z.enum([
    "misleading",
    "antisocial",
    "illegal",
    "doxing",
    "sexual",
    "spam",
]);
export const zodConversationModerationAction = z.enum(["lock"]);
export const zodOpinionModerationAction = z.enum(["move", "hide"]);
export const zodPhoneNumber = z
    .string()
    .describe("Phone number")
    .refine(
        (val: string) => {
            return isValidPhoneNumber(val);
        },
        {
            message: "Please use valid mobile phone number",
        },
    );
export const zodDidKey = z
    .string()
    .describe("Decentralized Identifier with did:key method")
    .max(1000)
    .refine(
        (val: string) => {
            return validateDidKey(val);
        },
        {
            message: "Please use a base58-encoded DID formatted `did:key:z...`",
        },
    );
export const zodDidWeb = z
    .string()
    .describe("Decentralized Identifier with did:web method")
    .max(1000)
    .refine(
        (val: string) => {
            return validateDidWeb(val);
        },
        {
            message: "Please use a valid DID formatted `did:web:...`",
        },
    );
export const zodModerationExplanation = z.string().max(MAX_LENGTH_BODY);
export const zodCode = z.coerce.number().min(0).max(999999);
export const zodDigit = z.coerce.number().int().nonnegative().lte(9);
export const zodUserId = z.string().uuid().min(1);
export const zodDevice = z
    .object({
        didWrite: zodDidKey,
        userAgent: z.string(),
    })
    .strict();
export const zodDevices = z.array(zodDevice); // list of didWrite of all the devices belonging to a user
export const zodConversationTitle = z.string().max(MAX_LENGTH_TITLE).min(1);
export const zodConversationBody = z.string().optional(); // Cannot specify length due to HTML tags
export const zodPollOptionTitle = z.string().max(MAX_LENGTH_OPTION).min(1);
export const zodPollOptionWithResult = z
    .object({
        optionNumber: z.number().int().min(1).max(6),
        optionTitle: zodPollOptionTitle,
        numResponses: z.number().int().nonnegative(),
    })
    .strict();
export const zodConversationList = z.array(zodPollOptionWithResult).optional();
export const zodConversationDataWithResult = z
    .object({
        title: zodConversationTitle,
        body: zodConversationBody,
        poll: zodConversationList,
    })
    .strict();
export const zodPollResponse = z
    .object({
        conversationSlugId: z.string(),
        optionChosen: z.number().gte(0),
    })
    .strict();
export const zodSlugId = z.string().max(10);
export const zodCount = z.number().int().nonnegative();
export const zodCommentFeedFilter = z.enum([
    "moderated",
    "new",
    "discover",
    "cluster",
    "hidden",
]);
export const usernameRegex = new RegExp(
    `^[a-z0-9_]*$`, // {${MIN_LENGTH_USERNAME.toString()},${MAX_LENGTH_USERNAME.toString()}
);
export const zodUsername = z
    .string()
    .regex(
        usernameRegex,
        'Username may only contain lower-cased letters, numbers and "_"',
    )
    .refine((val) => /(?=.*[a-z])/.test(val) || /(?=.*[0-9])/.test(val), {
        message: "Username must contain at least one character or number",
    })
    .refine((val) => !/__+/.test(val), {
        message: "Username must not contain two consecutive underscores",
    })
    .refine((val) => val.length >= MIN_LENGTH_USERNAME, {
        message: `Username must contain at least ${MIN_LENGTH_USERNAME.toString()} characters`,
    })
    .refine((val) => val.length <= MAX_LENGTH_USERNAME, {
        message: `Username must cannot exceed ${MAX_LENGTH_USERNAME.toString()} characters`,
    });

export const zodUserMuteAction = z.enum(["mute", "unmute"]);
export const zodUserMuteItem = z
    .object({
        createdAt: z.date(),
        username: zodUsername,
    })
    .strict();

export const zodUserReportExplanation = z
    .string()
    .max(MAX_LENGTH_USER_REPORT_EXPLANATION)
    .optional();
export const zodUserReportItem = z.object({
    username: zodUsername,
    reason: zodUserReportReason,
    explanation: zodUserReportExplanation.optional(),
    createdAt: z.date(),
    id: z.number(),
});

export const zodRouteTarget = z.discriminatedUnion("target", [
    z
        .object({
            target: z.literal("opinion"),
            conversationSlugId: zodSlugId,
            opinionSlugId: zodSlugId,
        })
        .strict(),
]);

export const zodNotificationItem = z.object({
    slugId: zodSlugId,
    isRead: z.boolean(),
    title: z.string(),
    message: z.string(),
    iconName: z.string().max(50),
    createdAt: z.date(),
    username: zodUsername.optional(),
    routeTarget: zodRouteTarget,
});

export type moderationStatusOptionsType = "moderated" | "unmoderated";
export const zodConversationModerationProperties = z.discriminatedUnion(
    "status",
    [
        z
            .object({
                status: z.literal("moderated"),
                action: zodConversationModerationAction,
                reason: zodModerationReason,
                explanation: zodModerationExplanation,
                createdAt: z.date(),
                updatedAt: z.date(),
            })
            .strict(),
        z
            .object({
                status: z.literal("unmoderated"),
            })
            .strict(),
    ],
);

export const zodOpinionModerationProperties = z.discriminatedUnion("status", [
    z
        .object({
            status: z.literal("moderated"),
            action: zodOpinionModerationAction,
            reason: zodModerationReason,
            explanation: zodModerationExplanation,
            createdAt: z.date(),
            updatedAt: z.date(),
        })
        .strict(),
    z
        .object({
            status: z.literal("unmoderated"),
        })
        .strict(),
]);

export const zodConversationMetadata = z
    .object({
        conversationSlugId: zodSlugId,
        createdAt: z.date(),
        updatedAt: z.date(),
        lastReactedAt: z.date(),
        opinionCount: zodCount,
        voteCount: zodCount,
        participantCount: zodCount,
        authorUsername: zodUsername,
        moderation: zodConversationModerationProperties,
    })
    .strict();
export const zodPolisKey = z.enum(["0", "1", "2", "3", "4", "5"]);
export const zodOpinionContent = z.string().min(1); // Cannot specify the max length here due to the HTML tags
export const zodClusterMetadata = z.object({
    key: zodPolisKey,
    numUsers: z.number().int().nonnegative(),
    aiLabel: z.string().optional(),
    aiSummary: z.string().optional(),
    isUserInCluster: z.boolean(),
});
export const zodConversationPolis = z
    .object({
        aiSummary: z.string().optional(),
        clusters: zodClusterMetadata.array(),
    })
    .strict();
export const zodClusterStats = z.object({
    key: zodPolisKey,
    aiLabel: z.string().optional(),
    isAuthorInCluster: z.boolean(),
    numUsers: z.number().int().nonnegative(),
    numAgrees: z.number().int().nonnegative(),
    numDisagrees: z.number().int().nonnegative(),
});
export const zodOpinionItem = z
    .object({
        opinionSlugId: zodSlugId,
        createdAt: z.date(),
        updatedAt: z.date(),
        opinion: zodOpinionContent,
        numParticipants: z.number().int().nonnegative(),
        numAgrees: z.number().int().nonnegative(),
        numDisagrees: z.number().int().nonnegative(),
        username: zodUsername,
        clustersStats: z.array(zodClusterStats),
        moderation: zodOpinionModerationProperties,
    })
    .strict();
export const zodOpinionItemPerSlugId = z.map(zodSlugId, zodOpinionItem);
export const zodUserInteraction = z
    .object({
        hasVoted: z.boolean(),
        votedIndex: z.number().int().nonnegative(),
    })
    .strict();
export const zodExtendedConversationData = z
    .object({
        metadata: zodConversationMetadata,
        payload: zodConversationDataWithResult,
        interaction: zodUserInteraction,
        polis: zodConversationPolis,
    })
    .strict();
export const zodExtendedConversationPerSlugId = z.map(
    zodSlugId,
    zodExtendedConversationData,
); // we use map because order is important, and we don't want list because fast access is also important
export const zodExtendedOpinionData = z
    .object({
        conversationData: zodExtendedConversationData,
        opinionItem: zodOpinionItem,
    })
    .strict();
export const zodVotingOption = z.enum(["agree", "disagree"]);
export const zodVotingAction = z.enum(["agree", "disagree", "cancel"]);
export const zodLanguageNameOption = z.enum(["English", "Spanish", "Chinese"]);
export interface LanguageObject {
    name: string;
    lang: string;
}
export const languageObjectList: LanguageObject[] = [
    { lang: "en", name: "English" },
    { lang: "es", name: "Spanish" },
    { lang: "fr", name: "French" },
    { lang: "zh", name: "Chinese" },
];
export const zodRarimoStatusAttributes = z.enum([
    "not_verified",
    "verified",
    "failed_verification",
    "uniqueness_check_failed",
]);
export const zodCountryCodeEnum = z.enum([
    "AND",
    "ARE",
    "AFG",
    "ATG",
    "AIA",
    "ALB",
    "ARM",
    "AGO",
    "ATA",
    "ARG",
    "ASM",
    "AUT",
    "AUS",
    "ABW",
    "ALA",
    "AZE",
    "BIH",
    "BRB",
    "BGD",
    "BEL",
    "BFA",
    "BGR",
    "BHR",
    "BDI",
    "BEN",
    "BLM",
    "BMU",
    "BRN",
    "BOL",
    "BES",
    "BRA",
    "BHS",
    "BTN",
    "BVT",
    "BWA",
    "BLR",
    "BLZ",
    "CAN",
    "CCK",
    "COD",
    "CAF",
    "COG",
    "CHE",
    "CIV",
    "COK",
    "CHL",
    "CMR",
    "CHN",
    "COL",
    "CRI",
    "CUB",
    "CPV",
    "CUW",
    "CXR",
    "CYP",
    "CZE",
    "DEU",
    "DJI",
    "DNK",
    "DMA",
    "DOM",
    "DZA",
    "ECU",
    "EST",
    "EGY",
    "ESH",
    "ERI",
    "ESP",
    "ETH",
    "FIN",
    "FJI",
    "FLK",
    "FSM",
    "FRO",
    "FRA",
    "GAB",
    "GBR",
    "GRD",
    "GEO",
    "GUF",
    "GGY",
    "GHA",
    "GIB",
    "GRL",
    "GMB",
    "GIN",
    "GLP",
    "GNQ",
    "GRC",
    "SGS",
    "GTM",
    "GUM",
    "GNB",
    "GUY",
    "HKG",
    "HMD",
    "HND",
    "HRV",
    "HTI",
    "HUN",
    "IDN",
    "IRL",
    "ISR",
    "IMN",
    "IND",
    "IOT",
    "IRQ",
    "IRN",
    "ISL",
    "ITA",
    "JEY",
    "JAM",
    "JOR",
    "JPN",
    "KEN",
    "KGZ",
    "KHM",
    "KIR",
    "COM",
    "KNA",
    "PRK",
    "KOR",
    "KWT",
    "CYM",
    "KAZ",
    "LAO",
    "LBN",
    "LCA",
    "LIE",
    "LKA",
    "LBR",
    "LSO",
    "LTU",
    "LUX",
    "LVA",
    "LBY",
    "MAR",
    "MCO",
    "MDA",
    "MNE",
    "MAF",
    "MDG",
    "MHL",
    "MKD",
    "MLI",
    "MMR",
    "MNG",
    "MAC",
    "MNP",
    "MTQ",
    "MRT",
    "MSR",
    "MLT",
    "MUS",
    "MDV",
    "MWI",
    "MEX",
    "MYS",
    "MOZ",
    "NAM",
    "NCL",
    "NER",
    "NFK",
    "NGA",
    "NIC",
    "NLD",
    "NOR",
    "NPL",
    "NRU",
    "NIU",
    "NZL",
    "OMN",
    "PAN",
    "PER",
    "PYF",
    "PNG",
    "PHL",
    "PAK",
    "POL",
    "SPM",
    "PCN",
    "PRI",
    "PSE",
    "PRT",
    "PLW",
    "PRY",
    "QAT",
    "REU",
    "ROU",
    "SRB",
    "RUS",
    "RWA",
    "SAU",
    "SLB",
    "SYC",
    "SDN",
    "SWE",
    "SGP",
    "SHN",
    "SVN",
    "SJM",
    "SVK",
    "SLE",
    "SMR",
    "SEN",
    "SOM",
    "SUR",
    "SSD",
    "STP",
    "SLV",
    "SXM",
    "SYR",
    "SWZ",
    "TCA",
    "TCD",
    "ATF",
    "TGO",
    "THA",
    "TJK",
    "TKL",
    "TLS",
    "TKM",
    "TUN",
    "TON",
    "TUR",
    "TTO",
    "TUV",
    "TWN",
    "TZA",
    "UKR",
    "UGA",
    "UMI",
    "USA",
    "URY",
    "UZB",
    "VAT",
    "VCT",
    "VEN",
    "VGB",
    "VIR",
    "VNM",
    "VUT",
    "WLF",
    "WSM",
    "XKX",
    "YEM",
    "MYT",
    "ZAF",
    "ZMB",
    "ZWE",
]);
export type Device = z.infer<typeof zodDevice>;
export type Devices = z.infer<typeof zodDevices>;
export type ExtendedConversation = z.infer<typeof zodExtendedConversationData>;
export type ExtendedConversationPerSlugId = z.infer<
    typeof zodExtendedConversationPerSlugId
>;
export type UserInteraction = z.infer<typeof zodUserInteraction>;
export type ConversationMetadata = z.infer<typeof zodConversationMetadata>;
export type ExtendedConversationPayload = z.infer<
    typeof zodConversationDataWithResult
>;
export type ExtendedConversationPolis = z.infer<typeof zodConversationPolis>;
export type PollOptionWithResult = z.infer<typeof zodPollOptionWithResult>;
export type CommentContent = z.infer<typeof zodOpinionContent>;
export type OpinionItem = z.infer<typeof zodOpinionItem>;
export type OpinionItemPerSlugId = z.infer<typeof zodOpinionItemPerSlugId>;
export type ClusterMetadata = z.infer<typeof zodClusterMetadata>;
export type ExtendedOpinion = z.infer<typeof zodExtendedOpinionData>;
export type SlugId = z.infer<typeof zodSlugId>;
export type VotingOption = z.infer<typeof zodVotingOption>;
export type VotingAction = z.infer<typeof zodVotingAction>;
export type PollList = z.infer<typeof zodConversationList>;
export type RarimoStatusAttributes = z.infer<typeof zodRarimoStatusAttributes>;
export type CountryCodeEnum = z.infer<typeof zodCountryCodeEnum>;
export type ModerationReason = z.infer<typeof zodModerationReason>;
export type UserReportReason = z.infer<typeof zodUserReportReason>;
export type UserReportExplanation = z.infer<typeof zodUserReportExplanation>;
export type UserReportItem = z.infer<typeof zodUserReportItem>;
export type ConversationModerationAction = z.infer<
    typeof zodConversationModerationAction
>;
export type OpinionModerationAction = z.infer<
    typeof zodOpinionModerationAction
>;
export type ConversationModerationProperties = z.infer<
    typeof zodConversationModerationProperties
>;
export type OpinionModerationProperties = z.infer<
    typeof zodOpinionModerationProperties
>;
export type CommentFeedFilter = z.infer<typeof zodCommentFeedFilter>;
export type UserMuteAction = z.infer<typeof zodUserMuteAction>;
export type UserMuteItem = z.infer<typeof zodUserMuteItem>;
export type Username = z.infer<typeof zodUsername>;
export type NotificationItem = z.infer<typeof zodNotificationItem>;
export type RouteTarget = z.infer<typeof zodRouteTarget>;
export type ClusterStats = z.infer<typeof zodClusterStats>;
export type PolisKey = z.infer<typeof zodPolisKey>;
