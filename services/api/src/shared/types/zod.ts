/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import { validateDidKey, validateDidWeb } from "../did/util.js";
import {
    MAX_LENGTH_TITLE,
    MAX_LENGTH_OPTION,
    MIN_LENGTH_USERNAME,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_BODY,
} from "../shared.js";
import { isValidPhoneNumber } from "libphonenumber-js";

export const zodReportReason = z.union([
    z.literal("off-topic"),
    z.literal("spam"),
    z.literal("misleading"),
    z.literal("privacy"),
    z.literal("sexual"),
    z.literal("toxic"),
    z.literal("illegal"),
]);
export const zodModerationReason = z.enum([
    "off-topic",
    "spam",
    "misleading",
    "privacy",
    "sexual",
    "toxic",
    "illegal",
]);
export const zodModerationActionPosts = z.enum(["lock"]);
export const zodModerationActionComments = z.enum(["lock", "hide"]);
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
export const zodPostTitle = z.string().max(MAX_LENGTH_TITLE).min(1);
export const zodPostBody = z.string().optional(); // Cannot specify length due to HTML tags
export const zodPollOptionTitle = z.string().max(MAX_LENGTH_OPTION).min(1);
export const zodPollOptionWithResult = z
    .object({
        optionNumber: z.number().int().min(1).max(6),
        optionTitle: zodPollOptionTitle,
        numResponses: z.number().int().nonnegative(),
    })
    .strict();
export const zodPollList = z.array(zodPollOptionWithResult).optional();
export const zodPostDataWithResult = z
    .object({
        title: zodPostTitle,
        body: zodPostBody,
        poll: zodPollList,
    })
    .strict();
export const zodPollResponse = z
    .object({
        postSlugId: z.string(),
        optionChosen: z.number().gte(0),
    })
    .strict();
export const zodSlugId = z.string().max(10);
export const zodCommentCount = z.number().int().nonnegative();
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
export const zodModerationPropertiesPosts = z
    .object({
        isModerated: z.boolean(),
        moderationAction: zodModerationActionPosts.optional(),
        moderationReason: zodModerationReason.optional(),
        moderationExplanation: zodModerationExplanation.optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
    })
    .strict();
export const zodModerationPropertiesComments = z
    .object({
        isModerated: z.boolean(),
        moderationAction: zodModerationActionComments.optional(),
        moderationReason: zodModerationReason.optional(),
        moderationExplanation: zodModerationExplanation.optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
    })
    .strict();
export const zodPostMetadata = z
    .object({
        postSlugId: zodSlugId,
        isHidden: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
        lastReactedAt: z.date(),
        commentCount: zodCommentCount,
        authorUsername: zodUsername,
        moderation: zodModerationPropertiesPosts,
    })
    .strict();
export const zodCommentContent = z.string().min(1); // Cannot specify the max length here due to the HTML tags
export const zodCommentItem = z
    .object({
        commentSlugId: zodSlugId,
        createdAt: z.date(),
        updatedAt: z.date(),
        comment: zodCommentContent,
        numLikes: z.number().int().nonnegative(),
        numDislikes: z.number().int().nonnegative(),
        username: zodUsername,
        moderation: zodModerationPropertiesComments,
    })
    .strict();
export const zodUserInteraction = z
    .object({
        hasVoted: z.boolean(),
        votedIndex: z.number().int().nonnegative(),
    })
    .strict();
export const zodExtendedPostData = z
    .object({
        metadata: zodPostMetadata,
        payload: zodPostDataWithResult,
        interaction: zodUserInteraction,
    })
    .strict();
export const zodExtendedCommentData = z
    .object({
        postData: zodExtendedPostData,
        commentItem: zodCommentItem,
    })
    .strict();
export const zodVotingOption = z.enum(["like", "dislike"]);
export const zodVotingAction = z.enum(["like", "dislike", "cancel"]);
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
export type ExtendedPost = z.infer<typeof zodExtendedPostData>;
export type UserInteraction = z.infer<typeof zodUserInteraction>;
export type PostMetadata = z.infer<typeof zodPostMetadata>;
export type ExtendedPostPayload = z.infer<typeof zodPostDataWithResult>;
export type PollOptionWithResult = z.infer<typeof zodPollOptionWithResult>;
export type CommentContent = z.infer<typeof zodCommentContent>;
export type CommentItem = z.infer<typeof zodCommentItem>;
export type ExtendedComment = z.infer<typeof zodExtendedCommentData>;
export type SlugId = z.infer<typeof zodSlugId>;
export type VotingOption = z.infer<typeof zodVotingOption>;
export type VotingAction = z.infer<typeof zodVotingAction>;
export type PollList = z.infer<typeof zodPollList>;
export type RarimoStatusAttributes = z.infer<typeof zodRarimoStatusAttributes>;
export type CountryCodeEnum = z.infer<typeof zodCountryCodeEnum>;
export type ModerationReason = z.infer<typeof zodModerationReason>;
export type ModerationActionPosts = z.infer<typeof zodModerationActionPosts>;
export type ModerationActionComments = z.infer<
    typeof zodModerationActionComments
>;
export type ModerationPropertiesPosts = z.infer<
    typeof zodModerationPropertiesPosts
>;
export type zodModerationPropertiesComments = z.infer<
    typeof zodModerationPropertiesComments
>;
