import { z } from "zod";
import { validateDidKey, validateDidWeb } from "../did/util.js";
import {
    MAX_LENGTH_TITLE,
    MAX_LENGTH_OPTION,
    MIN_LENGTH_USERNAME,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_BODY,
    MAX_LENGTH_USER_REPORT_EXPLANATION,
    validateHtmlStringCharacterCount,
} from "../shared.js";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { isValidPolisUrl } from "../utils/polis.js";
import {
    ZodSupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "../languages.js";

export const zodDateTimeFlexible = z.coerce.date();

export const zodEventSlug = z.enum(["devconnect-2025"]);

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
export const zodFeedSortAlgorithm = z.enum(["following", "new"]);
export const zodConversationModerationAction = z.enum(["lock"]);
export const zodOpinionModerationAction = z.enum(["move", "hide"]);
export const zodExportStatus = z.enum([
    "processing",
    "completed",
    "failed",
    "cancelled",
    "expired",
]);
export const zodExportFileType = z.enum([
    "comments",
    "votes",
    "participants",
    "summary",
    "stats",
]);
export const zodExportFileInfo = z
    .object({
        fileType: zodExportFileType,
        fileName: z.string(),
        fileSize: z.number().int().positive(),
        recordCount: z.number().int().nonnegative(),
        downloadUrl: z.string().url(),
        urlExpiresAt: zodDateTimeFlexible,
    })
    .strict();
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
export const zodOrganization = z
    .object({
        name: z.string(),
        imageUrl: z.string(),
        websiteUrl: z
            .string()
            .url({ message: "Invalid organization website url" }),
        description: z.string(),
    })
    .strict();
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
export const zodConversationBody = z
    .string()
    .refine(
        (val: string) => {
            return validateHtmlStringCharacterCount(val, "conversation")
                .isValid;
        },
        {
            message: "The HTML body's character count had exceeded the limit",
        },
    )
    .optional();
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
    "hidden",
    "moderated",
    "new",
    "discover",
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
    })
    .refine((val) => !val.startsWith("ext"), {
        message: "Username must not start with 'ext'",
    })
    .refine((val) => val.toLowerCase() !== "agora", {
        message: "Username must not be 'agora'",
    })
    .refine((val) => val.toLowerCase() !== "zkorum", {
        message: "Username must not be 'zkorum'",
    })
    .refine((val) => val.toLowerCase() !== "agoracitizennetwork", {
        message: "Username must not be 'agoracitizennetwork'",
    })
    .refine((val) => val.toLowerCase() !== "agora_citizen_network", {
        message: "Username must not be 'agora_citizen_network'",
    });

export const zodUserMuteAction = z.enum(["mute", "unmute"]);
export const zodUserMuteItem = z
    .object({
        createdAt: z.date(),
        username: z.string(),
    })
    .strict();

export const zodUserReportExplanation = z
    .string()
    .max(MAX_LENGTH_USER_REPORT_EXPLANATION)
    .optional();
export const zodUserReportItem = z.object({
    username: z.string(),
    reason: zodUserReportReason,
    explanation: zodUserReportExplanation.optional(),
    createdAt: z.date(),
    id: z.number(),
});

const zodOpinionRouteTarget = z
    .object({
        type: z.literal("opinion"),
        conversationSlugId: zodSlugId,
        opinionSlugId: zodSlugId,
    })
    .strict();

const zodExportRouteTarget = z
    .object({
        type: z.literal("export"),
        conversationSlugId: zodSlugId,
        exportSlugId: zodSlugId,
    })
    .strict();

const zodImportRouteTarget = z
    .object({
        type: z.literal("import"),
        importSlugId: zodSlugId,
        conversationSlugId: zodSlugId.optional(), // Optional: present when import completed
    })
    .strict();

export const zodRouteTarget = z.discriminatedUnion("type", [
    zodOpinionRouteTarget,
    zodExportRouteTarget,
    zodImportRouteTarget,
]);

export const zodTopicObject = z
    .object({
        code: z.string(),
        name: z.string(),
    })
    .strict();

// WARNING: change this together with the below values!
export const zodNotificationType = z.enum([
    "opinion_vote",
    "new_opinion",
    "export_started",
    "export_completed",
    "export_failed",
    "export_cancelled",
    "import_started",
    "import_completed",
    "import_failed",
]);

// Base notification schema with common fields
const zodNotificationBase = z.object({
    slugId: zodSlugId,
    isRead: z.boolean(),
    message: z.string(),
    createdAt: zodDateTimeFlexible,
});

// Opinion notification schemas
const zodOpinionVoteNotification = zodNotificationBase
    .extend({
        type: z.literal("opinion_vote"),
        routeTarget: zodOpinionRouteTarget,
        numVotes: z.number().int().min(1),
    })
    .strict();

const zodNewOpinionNotification = zodNotificationBase
    .extend({
        type: z.literal("new_opinion"),
        routeTarget: zodOpinionRouteTarget,
        username: z.string(),
    })
    .strict();

// Export notification schemas
const zodExportStartedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_started"),
        routeTarget: zodExportRouteTarget,
    })
    .strict();

const zodExportCompletedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_completed"),
        routeTarget: zodExportRouteTarget,
    })
    .strict();

const zodExportFailedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_failed"),
        routeTarget: zodExportRouteTarget,
        errorMessage: z.string().optional(),
    })
    .strict();

const zodExportCancelledNotification = zodNotificationBase
    .extend({
        type: z.literal("export_cancelled"),
        routeTarget: zodExportRouteTarget,
        cancellationReason: z.string(),
    })
    .strict();

// Import notification schemas
const zodImportStartedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_started"),
        routeTarget: zodImportRouteTarget,
    })
    .strict();

const zodImportCompletedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_completed"),
        routeTarget: zodImportRouteTarget,
    })
    .strict();

const zodImportFailedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_failed"),
        routeTarget: zodImportRouteTarget,
        errorMessage: z.string().optional(),
    })
    .strict();

export const zodNotificationItem = z.discriminatedUnion("type", [
    zodOpinionVoteNotification,
    zodNewOpinionNotification,
    zodExportStartedNotification,
    zodExportCompletedNotification,
    zodExportFailedNotification,
    zodExportCancelledNotification,
    zodImportStartedNotification,
    zodImportCompletedNotification,
    zodImportFailedNotification,
]);

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
        authorUsername: z.string(),
        isLoginRequired: z.boolean(),
        isIndexed: z.boolean(),
        organization: zodOrganization.optional(),
        moderation: zodConversationModerationProperties,
        requiresEventTicket: zodEventSlug.optional(),
    })
    .strict();
export const zodConversationMetadataWithId = z
    .object({
        conversationId: z.number().int().nonnegative(),
        conversationSlugId: zodSlugId,
        createdAt: z.date(),
        updatedAt: z.date(),
        lastReactedAt: z.date(),
        opinionCount: zodCount,
        voteCount: zodCount,
        participantCount: zodCount,
        authorUsername: z.string(),
        isLoginRequired: z.boolean(),
        isIndexed: z.boolean(),
        organization: zodOrganization.optional(),
        moderation: zodConversationModerationProperties,
        requiresEventTicket: zodEventSlug.optional(),
    })
    .strict();
export const zodPolisKey = z.enum(["0", "1", "2", "3", "4", "5"]);
export const zodOpinionContent = z
    .string()
    .min(1)
    .refine(
        (val: string) => {
            return validateHtmlStringCharacterCount(val, "opinion").isValid;
        },
        {
            message: "The HTML body's character count had exceeded the limit",
        },
    );
export const zodAgreementType = z.enum(["agree", "disagree"]);
export const zodVotingOption = z.enum(["agree", "disagree", "pass"]);
export const zodVotingAction = z.enum(["agree", "disagree", "pass", "cancel"]);
export const zodClusterStats = z.object({
    key: zodPolisKey,
    isAuthorInCluster: z.boolean(),
    numUsers: z.number().int().nonnegative(),
    numAgrees: z.number().int().nonnegative(),
    numDisagrees: z.number().int().nonnegative(),
    numPasses: z.number().int().nonnegative(),
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
        numPasses: z.number().int().nonnegative(),
        username: z.string(),
        moderation: zodOpinionModerationProperties,
        isSeed: z.boolean(),
    })
    .strict();
export const zodAnalysisOpinionItem = zodOpinionItem.extend({
    clustersStats: z.array(zodClusterStats),
});
export const zodClusterMetadata = z
    .object({
        id: z.number().int().nonnegative(),
        key: zodPolisKey,
        numUsers: z.number().int().nonnegative(),
        aiLabel: z.string().optional(),
        aiSummary: z.string().optional(),
        isUserInCluster: z.boolean(),
    })
    .strict();

export const zodPolisClusters = z.record(
    zodPolisKey,
    z
        .object({
            key: zodPolisKey,
            numUsers: z.number().int().nonnegative(),
            aiLabel: z.string().optional(),
            aiSummary: z.string().optional(),
            isUserInCluster: z.boolean(),
            representative: z.array(zodAnalysisOpinionItem),
        })
        .strict(),
);
export const zodPolisClustersMetadata = z.record(
    zodPolisKey,
    zodClusterMetadata,
);

export const zodOpinionItemPerSlugId = z.map(zodSlugId, zodOpinionItem);
export const zodAnalysisOpinionItemPerSlugId = z.map(
    zodSlugId,
    zodAnalysisOpinionItem,
);
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
    })
    .strict();
export const zodExtendedConversationDataWithId = z
    .object({
        metadata: zodConversationMetadataWithId,
        payload: zodConversationDataWithResult,
        interaction: zodUserInteraction,
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
export const zodExtendedOpinionDataWithConvId = z
    .object({
        conversationData: zodExtendedConversationDataWithId,
        opinionItem: zodOpinionItem,
    })
    .strict();
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

export const zodSupportedCountryCallingCode = z.enum([
    "297",
    "5993",
    "1",
    "299",
    "590",
    "596",
    "599",
    "508",
    "1721",
    "1284",
    "1340",
    "374",
    "995",
    "972",
    "81",
    "82",
    "65",
    "886",
    "35818",
    "355",
    "376",
    "43",
    "375",
    "32",
    "387",
    "359",
    "385",
    "420",
    "45",
    "372",
    "298",
    "358",
    "33",
    "49",
    "350",
    "30",
    "441481",
    "3906698",
    "36",
    "354",
    "353",
    "441624",
    "39",
    "441534",
    "383",
    "371",
    "423",
    "370",
    "352",
    "356",
    "373",
    "377",
    "382",
    "31",
    "389",
    "47",
    "48",
    "351",
    "40",
    "378",
    "381",
    "421",
    "386",
    "34",
    "4779",
    "46",
    "41",
    "90",
    "380",
    "44",
    "38",
    "262",
    "1684",
    "61",
    "5999",
    "689",
    "687",
    "64",
    "971",
    "260",
    "962",
    "967",
    "963",
    "961",
    "7",
    "91",
    "20",
    "63",
    "966",
    "880",
    "212",
    "57",
    "213",
    "55",
    "27",
    "256",
    "977",
    "51",
    "86",
    "54",
    "855",
    "216",
    "221",
    "60",
    "84",
    "225",
    "66",
    "98",
    "56",
    "852",
    "252",
    "218",
    "593",
    "974",
    "509",
    "968",
    "224",
    "970",
    "227",
    "93",
    "243",
    "249",
    "254",
    "211",
    "257",
    "223",
    "234",
    "226",
    "229",
    "964",
    "92",
    "996",
    "998",
    "95",
    "94",
    "250",
    "236",
    "237",
    "62",
    "255",
    "258",
    "58",
    "502",
    "52",
    "251",
    "992",
    "235",
    "246",
    "240",
    "675",
    "245",
    "242",
]);

const zodGenLabelSummaryOutputClusterValue = z.object({
    label: z
        .string()
        .max(100)
        .regex(/^\S+(?:\s\S+)?$/, "Label must be exactly 1 or 2 words"),
    summary: z.string().max(1000),
});

const zodGenLabelSummaryOutputClusterKey = z.enum([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
]);

export const zodGenLabelSummaryOutputClusterStrict = z.record(
    zodGenLabelSummaryOutputClusterKey,
    zodGenLabelSummaryOutputClusterValue,
);

export const zodGenLabelSummaryOutputClusterLoose = z.record(
    zodGenLabelSummaryOutputClusterKey,
    z.object({
        label: z.string(),
        summary: z.string(),
    }),
);

export const zodGenLabelSummaryOutputStrict = z.object({
    clusters: zodGenLabelSummaryOutputClusterStrict,
});

export const zodGenLabelSummaryOutputLoose = z.object({
    clusters: zodGenLabelSummaryOutputClusterLoose,
});

const zodIsKnownTrueLoginStatus = z
    .object({
        isKnown: z.literal(true),
        isRegistered: z.boolean(),
        isLoggedIn: z.boolean(),
        userId: z.string(), // User ID for tracking identity changes (account merges)
    })
    .strict();

const zodIsKnownFalseLoginStatus = z.object({
    isKnown: z.literal(false),
    isRegistered: z.literal(false),
    isLoggedIn: z.literal(false),
});

export const zodGetDeviceStatusResponse = z.discriminatedUnion("isKnown", [
    zodIsKnownFalseLoginStatus,
    zodIsKnownTrueLoginStatus,
]);

export const zodDeviceLoginStatus = z.discriminatedUnion("isKnown", [
    zodIsKnownFalseLoginStatus,
    zodIsKnownTrueLoginStatus, // Include userId so frontend can watch for user identity changes
]);

export const zodLanguagePreferences = z
    .object({
        spokenLanguages: z.array(ZodSupportedSpokenLanguageCodes).min(1),
        displayLanguage: ZodSupportedDisplayLanguageCodes,
    })
    .strict();

export const zodLinkType = z.enum(["http", "deep"]);
export const zodPolisUrl = z
    .string()
    .url({
        message: "Invalid url",
    })
    .refine(
        (val: string) => {
            return isValidPolisUrl(val);
        },
        {
            message: "Please use valid polis url",
        },
    );
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
export type PollOptionWithResult = z.infer<typeof zodPollOptionWithResult>;
export type CommentContent = z.infer<typeof zodOpinionContent>;
export type OpinionItem = z.infer<typeof zodOpinionItem>;
export type AnalysisOpinionItem = z.infer<typeof zodAnalysisOpinionItem>;
export type OpinionItemPerSlugId = z.infer<typeof zodOpinionItemPerSlugId>;
export type AnalysisOpinionItemPerSlugId = z.infer<
    typeof zodAnalysisOpinionItemPerSlugId
>;
export type ExtendedOpinion = z.infer<typeof zodExtendedOpinionData>;
export type ExtendedOpinionWithConvId = z.infer<
    typeof zodExtendedOpinionDataWithConvId
>;
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
export type NotificationType = z.infer<typeof zodNotificationType>;
export type RouteTarget = z.infer<typeof zodRouteTarget>;
export type OpinionRouteTarget = z.infer<typeof zodOpinionRouteTarget>;
export type ExportRouteTarget = z.infer<typeof zodExportRouteTarget>;
export type ImportRouteTarget = z.infer<typeof zodImportRouteTarget>;
export type ClusterStats = z.infer<typeof zodClusterStats>;
export type PolisKey = z.infer<typeof zodPolisKey>;
export type SupportedCountryCallingCode = z.infer<
    typeof zodSupportedCountryCallingCode
>;
export type GenLabelSummaryOutputStrict = z.infer<
    typeof zodGenLabelSummaryOutputStrict
>;
export type GenLabelSummaryOutputLoose = z.infer<
    typeof zodGenLabelSummaryOutputLoose
>;
export type GenLabelSummaryOutputClusterStrict = z.infer<
    typeof zodGenLabelSummaryOutputClusterStrict
>;
export type GenLabelSummaryOutputClusterLoose = z.infer<
    typeof zodGenLabelSummaryOutputClusterLoose
>;
export type OrganizationProperties = z.infer<typeof zodOrganization>;
export type DeviceLoginStatus = z.infer<typeof zodDeviceLoginStatus>;
export type DeviceLoginStatusExtended = z.infer<
    typeof zodGetDeviceStatusResponse
>;
export type DeviceIsKnownTrueLoginStatus = z.infer<
    typeof zodIsKnownTrueLoginStatus
>;
export type ZodTopicObject = z.infer<typeof zodTopicObject>;
export type FeedSortAlgorithm = z.infer<typeof zodFeedSortAlgorithm>;
export type LanguagePreferences = z.infer<typeof zodLanguagePreferences>;
export type LinkType = z.infer<typeof zodLinkType>;
export type PolisUrl = z.infer<typeof zodPolisUrl>;
export type AgreementType = z.infer<typeof zodAgreementType>;
export type PolisClusters = z.infer<typeof zodPolisClusters>;
export type PolisClustersMetadata = z.infer<typeof zodPolisClustersMetadata>;
export type ClusterMetadata = z.infer<typeof zodClusterMetadata>;
export type EventSlug = z.infer<typeof zodEventSlug>;
export type ExportStatus = z.infer<typeof zodExportStatus>;
export type ExportFileType = z.infer<typeof zodExportFileType>;
export type ExportFileInfo = z.infer<typeof zodExportFileInfo>;

// Rarimo ZK Proof Validation Schemas
// Based on Rarimo circuit spec: https://github.com/rarimo/passport-zk-circuits
export const zodProofData = z
    .object({
        pi_a: z.array(z.string()).min(2).max(3),
        pi_b: z.array(z.array(z.string()).min(2).max(2)).min(3).max(3),
        pi_c: z.array(z.string()).min(2).max(3),
        protocol: z.string(),
    })
    .strict();

export const zodZKProof = z
    .object({
        proof: zodProofData,
        pub_signals: z.array(z.string()).min(8), // Requires at least 8 elements
    })
    .strict();

export const zodStatusResponse = z.object({
    data: z.object({
        attributes: z.object({
            status: zodRarimoStatusAttributes,
        }),
    }),
});

export type ProofData = z.infer<typeof zodProofData>;
export type ZKProof = z.infer<typeof zodZKProof>;
export type StatusResponse = z.infer<typeof zodStatusResponse>;
