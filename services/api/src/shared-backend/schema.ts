import {
    pgEnum,
    pgTable,
    timestamp,
    uuid,
    varchar,
    integer,
    boolean,
    customType,
    text,
    type AnyPgColumn,
    unique,
    uniqueIndex,
    index,
    jsonb,
    check,
    smallint,
    real,
    serial,
    foreignKey,
} from "drizzle-orm/pg-core";
import { isNotNull, isNull, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import {
    ZodSupportedDisplayLanguageCodes,
    ZodSupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { projectOrganizationAttributionRoleValues } from "@/shared/types/project.js";
// import { MAX_LENGTH_TITLE, MAX_LENGTH_OPINION, MAX_LENGTH_BODY } from "./shared/shared.js"; // unfortunately it breaks drizzle generate... :o TODO: find a way
// WARNING: when you modify these limits, change this in shared.ts as well
const MAX_LENGTH_TITLE = 140;
const MAX_LENGTH_BODY = 1000;
// const MAX_LENGTH_OPINION = 280;
const MAX_LENGTH_OPINION_HTML = 3000; // is lower now, kept this value For retro-compatibility
const MAX_LENGTH_SURVEY_QUESTION = 500;
const MAX_LENGTH_SURVEY_OPTION = 200;
const MAX_LENGTH_RANKING_ITEM_TITLE = 200;
const MAX_LENGTH_RANKING_ITEM_BODY = 3000;
const MAX_LENGTH_NAME_CREATOR = 65;
const MAX_LENGTH_DESCRIPTION_CREATOR = 280;
const MAX_LENGTH_USERNAME = 20;
const MAX_LENGTH_USER_REPORT_EXPLANATION = 260;

// Drizzle's variadic and()/or() return SQL | undefined because zero arguments are allowed.
// These schema helpers require at least two conditions, so index/check definitions stay typed as SQL.
function sqlAnd(first: SQL, second: SQL, ...rest: SQL[]): SQL {
    return sql`(${sql.join([first, second, ...rest], sql` AND `)})`;
}

function sqlOr(first: SQL, second: SQL, ...rest: SQL[]): SQL {
    return sql`(${sql.join([first, second, ...rest], sql` OR `)})`;
}

export const bytea = customType<{
    data: string;
    notNull: false;
    default: false;
}>({
    dataType() {
        return "bytea";
    },
    toDriver(val: string): Uint8Array {
        const buffer = Buffer.from(val, "base64url");
        return Uint8Array.from(buffer);
    },
    fromDriver(val): string {
        return Buffer.from(val as Uint8Array).toString("base64url");
    },
});

// 3 digits standard, because that's what passport use
// TODO: use that
// we don't want to reject users with an annoying error because this enum was misconfigured
// we start without, learn about the existing country code, and adapt
// export const countryCodeEnum = pgEnum("country_code", [
//     "AND",
//     "ARE",
//     "AFG",
//     "ATG",
//     "AIA",
//     "ALB",
//     "ARM",
//     "AGO",
//     "ATA",
//     "ARG",
//     "ASM",
//     "AUT",
//     "AUS",
//     "ABW",
//     "ALA",
//     "AZE",
//     "BIH",
//     "BRB",
//     "BGD",
//     "BEL",
//     "BFA",
//     "BGR",
//     "BHR",
//     "BDI",
//     "BEN",
//     "BLM",
//     "BMU",
//     "BRN",
//     "BOL",
//     "BES",
//     "BRA",
//     "BHS",
//     "BTN",
//     "BVT",
//     "BWA",
//     "BLR",
//     "BLZ",
//     "CAN",
//     "CCK",
//     "COD",
//     "CAF",
//     "COG",
//     "CHE",
//     "CIV",
//     "COK",
//     "CHL",
//     "CMR",
//     "CHN",
//     "COL",
//     "CRI",
//     "CUB",
//     "CPV",
//     "CUW",
//     "CXR",
//     "CYP",
//     "CZE",
//     "DEU",
//     "DJI",
//     "DNK",
//     "DMA",
//     "DOM",
//     "DZA",
//     "ECU",
//     "EST",
//     "EGY",
//     "ESH",
//     "ERI",
//     "ESP",
//     "ETH",
//     "FIN",
//     "FJI",
//     "FLK",
//     "FSM",
//     "FRO",
//     "FRA",
//     "GAB",
//     "GBR",
//     "GRD",
//     "GEO",
//     "GUF",
//     "GGY",
//     "GHA",
//     "GIB",
//     "GRL",
//     "GMB",
//     "GIN",
//     "GLP",
//     "GNQ",
//     "GRC",
//     "SGS",
//     "GTM",
//     "GUM",
//     "GNB",
//     "GUY",
//     "HKG",
//     "HMD",
//     "HND",
//     "HRV",
//     "HTI",
//     "HUN",
//     "IDN",
//     "IRL",
//     "ISR",
//     "IMN",
//     "IND",
//     "IOT",
//     "IRQ",
//     "IRN",
//     "ISL",
//     "ITA",
//     "JEY",
//     "JAM",
//     "JOR",
//     "JPN",
//     "KEN",
//     "KGZ",
//     "KHM",
//     "KIR",
//     "COM",
//     "KNA",
//     "PRK",
//     "KOR",
//     "KWT",
//     "CYM",
//     "KAZ",
//     "LAO",
//     "LBN",
//     "LCA",
//     "LIE",
//     "LKA",
//     "LBR",
//     "LSO",
//     "LTU",
//     "LUX",
//     "LVA",
//     "LBY",
//     "MAR",
//     "MCO",
//     "MDA",
//     "MNE",
//     "MAF",
//     "MDG",
//     "MHL",
//     "MKD",
//     "MLI",
//     "MMR",
//     "MNG",
//     "MAC",
//     "MNP",
//     "MTQ",
//     "MRT",
//     "MSR",
//     "MLT",
//     "MUS",
//     "MDV",
//     "MWI",
//     "MEX",
//     "MYS",
//     "MOZ",
//     "NAM",
//     "NCL",
//     "NER",
//     "NFK",
//     "NGA",
//     "NIC",
//     "NLD",
//     "NOR",
//     "NPL",
//     "NRU",
//     "NIU",
//     "NZL",
//     "OMN",
//     "PAN",
//     "PER",
//     "PYF",
//     "PNG",
//     "PHL",
//     "PAK",
//     "POL",
//     "SPM",
//     "PCN",
//     "PRI",
//     "PSE",
//     "PRT",
//     "PLW",
//     "PRY",
//     "QAT",
//     "REU",
//     "ROU",
//     "SRB",
//     "RUS",
//     "RWA",
//     "SAU",
//     "SLB",
//     "SYC",
//     "SDN",
//     "SWE",
//     "SGP",
//     "SHN",
//     "SVN",
//     "SJM",
//     "SVK",
//     "SLE",
//     "SMR",
//     "SEN",
//     "SOM",
//     "SUR",
//     "SSD",
//     "STP",
//     "SLV",
//     "SXM",
//     "SYR",
//     "SWZ",
//     "TCA",
//     "TCD",
//     "ATF",
//     "TGO",
//     "THA",
//     "TJK",
//     "TKL",
//     "TLS",
//     "TKM",
//     "TUN",
//     "TON",
//     "TUR",
//     "TTO",
//     "TUV",
//     "TWN",
//     "TZA",
//     "UKR",
//     "UGA",
//     "UMI",
//     "USA",
//     "URY",
//     "UZB",
//     "VAT",
//     "VCT",
//     "VEN",
//     "VGB",
//     "VIR",
//     "VNM",
//     "VUT",
//     "WLF",
//     "WSM",
//     "XKX",
//     "YEM",
//     "MYT",
//     "ZAF",
//     "ZMB",
//     "ZWE",
// ]); // warning: german passport has "D" instead of "DEU", so a mapping must be created
export const sexEnum = pgEnum("sex", ["F", "M", "X"]);

// slight differences from the standard:
// AC is not part of the official ISO 3166-1 alpha-2 standard, which is the primary reference for 2-character country codes. Instead, AC is commonly used as an IANA subtag to represent Ascension Island, a small territory in the South Atlantic Ocean that is part of the British Overseas Territories. It is recognized in contexts such as domain registrations and geocoding, but not officially in ISO 3166-1.
// XK - Used unofficially to represent Kosovo, which does not have an ISO-assigned code due to political reasons.
// TA - Refers to Tristan da Cunha, part of the British Overseas Territories, often treated separately from the main territory of Saint Helena (code SH).
// EU - Sometimes used to represent the European Union, though it's not an ISO country code.
export const phoneCountryCodeEnum = pgEnum("phone_country_code", [
    "AC",
    "AD",
    "AE",
    "AF",
    "AG",
    "AI",
    "AL",
    "AM",
    "AO",
    "AR",
    "AS",
    "AT",
    "AU",
    "AW",
    "AX",
    "AZ",
    "BA",
    "BB",
    "BD",
    "BE",
    "BF",
    "BG",
    "BH",
    "BI",
    "BJ",
    "BL",
    "BM",
    "BN",
    "BO",
    "BQ",
    "BR",
    "BS",
    "BT",
    "BW",
    "BY",
    "BZ",
    "CA",
    "CC",
    "CD",
    "CF",
    "CG",
    "CH",
    "CI",
    "CK",
    "CL",
    "CM",
    "CN",
    "CO",
    "CR",
    "CU",
    "CV",
    "CW",
    "CX",
    "CY",
    "CZ",
    "DE",
    "DJ",
    "DK",
    "DM",
    "DO",
    "DZ",
    "EC",
    "EE",
    "EG",
    "EH",
    "ER",
    "ES",
    "ET",
    "FI",
    "FJ",
    "FK",
    "FM",
    "FO",
    "FR",
    "GA",
    "GB",
    "GD",
    "GE",
    "GF",
    "GG",
    "GH",
    "GI",
    "GL",
    "GM",
    "GN",
    "GP",
    "GQ",
    "GR",
    "GT",
    "GU",
    "GW",
    "GY",
    "HK",
    "HN",
    "HR",
    "HT",
    "HU",
    "ID",
    "IE",
    "IL",
    "IM",
    "IN",
    "IO",
    "IQ",
    "IR",
    "IS",
    "IT",
    "JE",
    "JM",
    "JO",
    "JP",
    "KE",
    "KG",
    "KH",
    "KI",
    "KM",
    "KN",
    "KP",
    "KR",
    "KW",
    "KY",
    "KZ",
    "LA",
    "LB",
    "LC",
    "LI",
    "LK",
    "LR",
    "LS",
    "LT",
    "LU",
    "LV",
    "LY",
    "MA",
    "MC",
    "MD",
    "ME",
    "MF",
    "MG",
    "MH",
    "MK",
    "ML",
    "MM",
    "MN",
    "MO",
    "MP",
    "MQ",
    "MR",
    "MS",
    "MT",
    "MU",
    "MV",
    "MW",
    "MX",
    "MY",
    "MZ",
    "NA",
    "NC",
    "NE",
    "NF",
    "NG",
    "NI",
    "NL",
    "NO",
    "NP",
    "NR",
    "NU",
    "NZ",
    "OM",
    "PA",
    "PE",
    "PF",
    "PG",
    "PH",
    "PK",
    "PL",
    "PM",
    "PR",
    "PS",
    "PT",
    "PW",
    "PY",
    "QA",
    "RE",
    "RO",
    "RS",
    "RU",
    "RW",
    "SA",
    "SB",
    "SC",
    "SD",
    "SE",
    "SG",
    "SH",
    "SI",
    "SJ",
    "SK",
    "SL",
    "SM",
    "SN",
    "SO",
    "SR",
    "SS",
    "ST",
    "SV",
    "SX",
    "SY",
    "SZ",
    "TA",
    "TC",
    "TD",
    "TG",
    "TH",
    "TJ",
    "TK",
    "TL",
    "TM",
    "TN",
    "TO",
    "TR",
    "TT",
    "TV",
    "TW",
    "TZ",
    "UA",
    "UG",
    "US",
    "UY",
    "UZ",
    "VA",
    "VC",
    "VE",
    "VG",
    "VI",
    "VN",
    "VU",
    "WF",
    "WS",
    "XK",
    "YE",
    "YT",
    "ZA",
    "ZM",
    "ZW",
]);

export const voteEnum = pgEnum("vote_enum_all", ["agree", "disagree", "pass"]);
export const voteEnumSimple = pgEnum("vote_enum_simple", ["agree", "disagree"]);

export const ticketProviderEnum = pgEnum("ticket_provider", ["zupass"]);

export const eventSlugEnum = pgEnum("event_slug", ["devconnect-2025"]);

export const importMethodType = pgEnum("import_method", ["url", "csv"]);

export const participationModeEnum = pgEnum("participation_mode", [
    "account_required",
    "strong_verification",
    "email_verification",
    "guest",
]);

export const conversationTypeEnum = pgEnum("conversation_type", [
    "polis",
    "ranking",
]);
export const rankingModeEnum = pgEnum("ranking_mode", ["bws"]);
export const conversationLanguageSettingsSourceEnum = pgEnum(
    "conversation_language_settings_source",
    ["conversation_override", "project_inherited"],
);
export const languageDetectionProviderEnum = pgEnum(
    "language_detection_provider",
    ["lingua", "google_translate"],
);
export const displayLanguageCodeEnum = pgEnum(
    "display_language_code",
    ZodSupportedDisplayLanguageCodes.enum,
);
export const spokenLanguageCodeEnum = pgEnum(
    "spoken_language_code",
    ZodSupportedSpokenLanguageCodes.enum,
);
export const premiumFeatureEnum = pgEnum("premium_feature", [
    "survey",
    "event_ticket",
    "analysis_variants",
    "dynamic_translation",
]);
export const contentTranslationSourceKindEnum = pgEnum(
    "content_translation_source_kind",
    ["conversation", "opinion", "survey_question", "project", "ranking_item"],
);
export const projectContentTranslationSourceKindEnum = pgEnum(
    "project_content_translation_source_kind",
    ["manual", "machine"],
);
export const contentTranslationWorkStatusEnum = pgEnum(
    "content_translation_work_status",
    ["pending", "running", "completed", "failed"],
);

export const directoryVisibilityEnum = pgEnum("directory_visibility", [
    "listed",
    "unlisted",
]);

export const projectOrganizationAttributionRoleEnum = pgEnum(
    "project_organization_attribution_role",
    projectOrganizationAttributionRoleValues,
);

export const organizationMembershipCapabilityEnum = pgEnum(
    "organization_membership_capability_enum",
    [
        "organization_manage_members",
        "organization_manage_profile",
        "project_create",
    ],
);

export const organizationMembershipAllProjectCapabilityEnum = pgEnum(
    "organization_membership_all_project_capability_enum",
    [
        "project_update",
        "project_delete",
        "project_manage_owner_organizations",
        "conversation_create",
        "conversation_update",
        "conversation_delete",
        "conversation_view_private_results",
        "conversation_export_owner_data",
        "conversation_moderate",
        "conversation_manage_integrations",
    ],
);

export const surveyQuestionTypeEnum = pgEnum("survey_question_type", [
    "choice",
    "free_text",
]);

export const surveyChoiceDisplayEnum = pgEnum("survey_choice_display", [
    "auto",
    "list",
    "dropdown",
]);

export const rankingItemLifecycleStatusEnum = pgEnum(
    "ranking_item_lifecycle_status",
    ["active", "completed", "in_progress", "canceled"],
);

export const externalSourceTypeEnum = pgEnum("external_source_type", [
    "github_issue",
]);

// Export status for CSV exports
export const exportStatusEnum = pgEnum("export_status_enum", [
    "processing",
    "completed",
    "failed",
    "cancelled",
]);

export const exportGenerationStatusEnum = pgEnum(
    "export_generation_status_enum",
    ["collecting", "queued", "processing", "completed", "failed"],
);

export const exportArtifactStatusEnum = pgEnum("export_artifact_status_enum", [
    "queued",
    "processing",
    "completed",
    "failed",
]);

export const exportFileAudienceEnum = pgEnum("export_file_audience_enum", [
    "redacted",
    "owner",
    "requester",
]);

// Export cancellation reasons
export const exportCancellationReasonEnum = pgEnum(
    "export_cancellation_reason_enum",
    ["duplicate_in_batch", "cooldown_active"],
);

// Export failure reasons (for status="failed")
// Keep in sync with zodExportFailureReason in shared/src/types/zod.ts
export const exportFailureReasonEnum = pgEnum("export_failure_reason_enum", [
    "processing_error",
    "timeout",
    "server_restart",
]);

// Import failure reasons (for status="failed")
// Keep in sync with zodImportFailureReason in shared/src/types/zod.ts
export const importFailureReasonEnum = pgEnum("import_failure_reason_enum", [
    "processing_error",
    "timeout",
    "server_restart",
    "invalid_data_format",
]);

// Export file types
export const exportFileTypeEnum = pgEnum("export_file_type_enum", [
    "bundle",
    "comments",
    "votes",
    "participants",
    "summary",
    "stats",
    "survey_questions",
    "survey_question_options",
    "survey_participant_responses",
    "survey_public_aggregates",
    "survey_full_aggregates",
]);

// Import status for CSV imports (simplified - no files, no cooldown)
export const importStatusEnum = pgEnum("import_status_enum", [
    "processing",
    "completed",
    "failed",
]);

export const analysisFamilyEnum = pgEnum("analysis_family_enum", [
    "opinion_groups",
]);

export const analysisCompressionEnum = pgEnum("analysis_compression_enum", [
    "zstd",
]);

export const analysisWorkErrorKindEnum = pgEnum(
    "analysis_work_error_kind_enum",
    [
        "red_dwarf_exception",
        "red_dwarf_contract_violation",
        "database_error",
        "valkey_error",
        "transaction_error",
        "unknown_error",
    ],
);

export const analysisResultOutcomeEnum = pgEnum(
    "analysis_result_outcome_enum",
    ["success", "insufficient_data"],
);

export const analysisInsufficientDataReasonEnum = pgEnum(
    "analysis_insufficient_data_reason_enum",
    [
        "empty_vote_matrix",
        "not_enough_clusterable_participants",
        "not_enough_unique_points",
        "not_enough_samples_for_group_count",
        "other",
    ],
);

export const opinionGroupReducerEnum = pgEnum("opinion_group_reducer_enum", [
    "pca",
]);

export const opinionGroupClustererEnum = pgEnum(
    "opinion_group_clusterer_enum",
    ["kmeans"],
);

export const opinionGroupSelectionPolicyEnum = pgEnum(
    "opinion_group_selection_policy_enum",
    ["silhouette_size_balance"],
);

export const opinionGroupCandidateHiddenReasonEnum = pgEnum(
    "opinion_group_candidate_hidden_reason_enum",
    [
        "singleton_group",
        "duplicate_representative_opinions",
        "missing_representative_opinions",
        "invalid_candidate_output",
    ],
);

export const surveyAggregateScopeEnum = pgEnum("survey_aggregate_scope_enum", [
    "overall",
    "opinion_group",
]);

export const surveyAggregateSuppressionReasonEnum = pgEnum(
    "survey_aggregate_suppression_reason_enum",
    ["count_below_threshold", "cluster_deductive_disclosure"],
);

export const conversationViewSnapshotCheckpointReasonEnum = pgEnum(
    "conversation_view_snapshot_checkpoint_reason_enum",
    [
        "first_displayable_analysis",
        "first_group_count_available",
        "default_group_count_changed",
        "major_participation_milestone",
        "major_vote_milestone",
        "conversation_closed",
    ],
);

export const conversationViewSnapshotReasonEnum = pgEnum(
    "conversation_view_snapshot_reason_enum",
    [
        "analysis_completed",
        "survey_refreshed",
        "conversation_content_updated",
        "conversation_lifecycle_updated",
    ],
);

// One user == one account.
// Inserting a record in that table means that the user has been successfully registered.
// To one user can be associated multiple validated emails and devices.
// Emails and devices must only be associated with exactly one user.
// The association between users and devices/emails can change over time.
// A user must have at least 1 validated primary email and 1 device associated with it.
// The "at least one" conditon is not enforced directly in the SQL model yet. It is done in the application code.
/** @service scoring-worker, shared-analysis-worker, import-worker */
export const userTable = pgTable(
    "user",
    {
        id: uuid("id").primaryKey(), // enforce the same key for the user in the frontend across email changes
        polisParticipantId: serial("polis_participant_id"), // temporary work-around until reddwarf supports string ids
        username: varchar("username", { length: MAX_LENGTH_USERNAME })
            .notNull()
            .unique(),
        isSiteModerator: boolean("is_site_moderator").notNull().default(false),
        isSiteOrgAdmin: boolean("is_site_org_admin").notNull().default(false),
        isImported: boolean("is_imported").notNull().default(false),
        isDeleted: boolean("is_deleted").notNull().default(false),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }), // Track when soft-delete occurred (hard-deleted after 15 days)
        activeConversationCount: integer("active_conversation_count")
            .notNull()
            .default(0), // total conversations (without deleted conversations)
        totalConversationCount: integer("total_conversation_count")
            .notNull()
            .default(0), // total conversations created
        totalOpinionCount: integer("total_opinion_count").notNull().default(0), // total opinions created
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

export const organizationMembershipTable = pgTable(
    "organization_membership",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        organizationId: integer("organization_id")
            .references(() => organizationTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        uniqueIndex("organization_membership_active_unique")
            .on(t.userId, t.organizationId)
            .where(isNull(t.deletedAt)),
        index("organization_membership_organization_idx").on(t.organizationId),
    ],
);

export const conversationTopicTable = pgTable(
    "conversation_topic",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        topicId: integer("topic_id")
            .references(() => topicTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [unique("conversation_topic_unique").on(t.conversationId, t.topicId)],
);

export const topicTable = pgTable("topic", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").unique().notNull(),
    name: text("name").unique().notNull(),
    description: text("description").unique().notNull(),
    score_weight: integer("score_weight").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const followedTopicTable = pgTable(
    "followed_topic",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        topicId: integer("topic_id")
            .references(() => topicTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        uniqueIndex("followed_topic_active_unique")
            .on(t.userId, t.topicId)
            .where(isNull(t.deletedAt)),
    ],
);

export const userMutePreferenceTable = pgTable(
    "user_mute_preference",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        sourceUserId: uuid("source_user_id")
            .references(() => userTable.id)
            .notNull(),
        targetUserId: uuid("target_user_id")
            .references(() => userTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        uniqueIndex("user_mute_preference_active_unique")
            .on(t.sourceUserId, t.targetUserId)
            .where(isNull(t.deletedAt)),
    ],
);

// User spoken languages (BCP 47 format) - can have multiple
export const userSpokenLanguagesTable = pgTable(
    "user_spoken_languages",
    {
        id: serial("id").primaryKey(),
        userId: uuid("user_id")
            .references(() => userTable.id, { onDelete: "cascade" })
            .notNull(),
        languageCode: spokenLanguageCodeEnum("language_code").notNull(),
        isDeleted: boolean("is_deleted").notNull().default(false),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("user_spoken_languages_unique").on(t.userId, t.languageCode),
    ],
);

// Current user display language (UI language).
export const userDisplayLanguageTable = pgTable(
    "user_display_language",
    {
        userId: uuid("user_id")
            .primaryKey()
            .references(() => userTable.id, { onDelete: "cascade" }),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

/** @service import-worker */
export const organizationTable = pgTable(
    "organization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slug: varchar("slug", { length: MAX_LENGTH_NAME_CREATOR }).notNull(),
        displayName: varchar("display_name", { length: MAX_LENGTH_NAME_CREATOR })
            .notNull(),
        defaultLanguageCode:
            displayLanguageCodeEnum("default_language_code").notNull(),
        // Controls organization-facing exposure, such as directories and "post as organization" pickers.
        // Auto-provisioned personal backing orgs start unlisted; promoting one to a real org lists it.
        directoryVisibility: directoryVisibilityEnum("directory_visibility").notNull(),
        // Links the default personal organization provisioned for a user. This is also historical
        // provenance if the org is later promoted; do not use it as a visibility flag.
        autoProvisionedForUserId: uuid("auto_provisioned_for_user_id")
            .references(() => userTable.id)
            .unique(),
        imagePath: text("image_path"),
        isFullImagePath: boolean("is_full_image_path").notNull(),
        websiteUrl: text("website_url"),
        description: varchar("description", {
            length: MAX_LENGTH_DESCRIPTION_CREATOR,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        uniqueIndex("organization_active_slug_unique")
            .on(table.slug)
            .where(sql`${table.deletedAt} IS NULL`),
    ],
);

/** @service api */
export const organizationLocalizationTable = pgTable(
    "organization_localization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationId: integer("organization_id")
            .references(() => organizationTable.id)
            .notNull(),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        displayName: varchar("display_name", {
            length: MAX_LENGTH_NAME_CREATOR,
        }).notNull(),
        description: varchar("description", {
            length: MAX_LENGTH_DESCRIPTION_CREATOR,
        }).notNull(),
        websiteUrl: text("website_url"),
        imagePath: text("image_path"),
        isFullImagePath: boolean("is_full_image_path").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("organization_localization_organization_language_unique").on(
            table.organizationId,
            table.languageCode,
        ),
    ],
);

/** @service scoring-worker, api, math-updater, import-worker, content-translation-worker */
export const projectTable = pgTable(
    "project",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slug: varchar("slug", { length: MAX_LENGTH_NAME_CREATOR }).notNull(),
        title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
        directoryVisibility: directoryVisibilityEnum("directory_visibility").notNull(),
        autoProvisionedForOrganizationId: integer(
            "auto_provisioned_for_organization_id",
        )
            .references(() => organizationTable.id)
            .unique(),
        // Project creation inserts the project before its content row because project_content references project.
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => projectContentTable.id)
            .unique(),
        dynamicTranslationEnabled: boolean("dynamic_translation_enabled")
            .notNull()
            .default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_active_slug_unique")
            .on(table.slug)
            .where(sql`${table.deletedAt} IS NULL`),
    ],
);

/** @service api, content-translation-worker */
export const projectContentTable = pgTable(
    "project_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
        subtitle: varchar("subtitle", { length: MAX_LENGTH_TITLE }),
        body: text("body"),
        bodyPlainText: text("body_plain_text"),
        bannerPath: text("banner_path"),
        bannerIsFullPath: boolean("banner_is_full_path")
            .notNull()
            .default(false),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        check(
            "project_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
    ],
);

/** @service api */
export const projectContentBannerLocalizationTable = pgTable(
    "project_content_banner_localization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectContentId: integer("project_content_id")
            .notNull()
            .references(() => projectContentTable.id),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        bannerPath: text("banner_path").notNull(),
        bannerIsFullPath: boolean("banner_is_full_path")
            .notNull()
            .default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_content_banner_localization_active_unique")
            .on(table.projectContentId, table.languageCode)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service api, content-translation-worker */
export const projectTranslationTargetLanguageTable = pgTable(
    "project_translation_target_language",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_translation_target_language_active_unique")
            .on(table.projectId, table.languageCode)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service api */
export const projectExternalOrganizationTable = pgTable(
    "project_external_organization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        displayName: varchar("display_name", {
            length: MAX_LENGTH_NAME_CREATOR,
        }).notNull(),
        defaultLanguageCode: displayLanguageCodeEnum("default_language_code")
            .notNull(),
        description: varchar("description", {
            length: MAX_LENGTH_DESCRIPTION_CREATOR,
        }),
        imagePath: text("image_path"),
        isFullImagePath: boolean("is_full_image_path").notNull().default(false),
        websiteUrl: text("website_url"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        unique("project_external_organization_project_id_id_unique").on(
            table.projectId,
            table.id,
        ),
    ],
);

/** @service api */
export const projectExternalOrganizationLocalizationTable = pgTable(
    "project_external_organization_localization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        externalOrganizationId: integer("external_organization_id")
            .references(() => projectExternalOrganizationTable.id)
            .notNull(),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        displayName: varchar("display_name", {
            length: MAX_LENGTH_NAME_CREATOR,
        }).notNull(),
        description: varchar("description", {
            length: MAX_LENGTH_DESCRIPTION_CREATOR,
        }).notNull(),
        websiteUrl: text("website_url"),
        imagePath: text("image_path"),
        isFullImagePath: boolean("is_full_image_path").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_external_org_loc_active_unique")
            .on(table.externalOrganizationId, table.languageCode)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service api */
export const projectOrganizationAttributionTable = pgTable(
    "project_organization_attribution",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        role: projectOrganizationAttributionRoleEnum("role").notNull(),
        sortOrder: integer("sort_order").notNull().default(0),
        organizationId: integer("organization_id").references(
            () => organizationTable.id,
        ),
        externalOrganizationId: integer("external_organization_id"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        check(
            "project_organization_attribution_source_xor_check",
            sql`num_nonnulls(${table.organizationId}, ${table.externalOrganizationId}) = 1`,
        ),
        uniqueIndex("project_organization_attribution_order_active_unique")
            .on(table.projectId, table.role, table.sortOrder)
            .where(isNull(table.deletedAt)),
        uniqueIndex("project_organization_attribution_real_active_unique")
            .on(table.projectId, table.role, table.organizationId)
            .where(
                sqlAnd(isNotNull(table.organizationId), isNull(table.deletedAt)),
            ),
        uniqueIndex("project_organization_attribution_external_active_unique")
            .on(table.projectId, table.role, table.externalOrganizationId)
            .where(
                sqlAnd(
                    isNotNull(table.externalOrganizationId),
                    isNull(table.deletedAt),
                ),
            ),
        foreignKey({
            columns: [table.projectId, table.externalOrganizationId],
            foreignColumns: [
                projectExternalOrganizationTable.projectId,
                projectExternalOrganizationTable.id,
            ],
            name: "project_organization_attribution_external_project_fk",
        }),
    ],
);

/** @service api */
export const projectContactTable = pgTable(
    "project_contact",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        firstName: varchar("first_name", { length: MAX_LENGTH_NAME_CREATOR })
            .notNull(),
        lastName: varchar("last_name", { length: MAX_LENGTH_NAME_CREATOR }),
        roleLabel: varchar("role_label", { length: MAX_LENGTH_TITLE }),
        email: text("email"),
        websiteUrl: text("website_url"),
        imagePath: text("image_path"),
        isFullImagePath: boolean("is_full_image_path").notNull().default(false),
        organizationId: integer("organization_id").references(
            () => organizationTable.id,
        ),
        externalOrganizationId: integer("external_organization_id"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        check(
            "project_contact_affiliation_source_check",
            sql`num_nonnulls(${table.organizationId}, ${table.externalOrganizationId}) <= 1`,
        ),
        check(
            "project_contact_email_or_website_check",
            sql`num_nonnulls(${table.email}, ${table.websiteUrl}) >= 1`,
        ),
        foreignKey({
            columns: [table.projectId, table.externalOrganizationId],
            foreignColumns: [
                projectExternalOrganizationTable.projectId,
                projectExternalOrganizationTable.id,
            ],
            name: "project_contact_external_project_fk",
        }),
        uniqueIndex("project_contact_project_active_unique")
            .on(table.projectId)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service scoring-worker, api, math-updater, shared-analysis-worker, import-worker */
export const projectOrganizationOwnershipTable = pgTable(
    "project_organization_ownership",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        organizationId: integer("organization_id")
            .references(() => organizationTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_organization_ownership_active_unique")
            .on(table.projectId, table.organizationId)
            .where(isNull(table.deletedAt)),
        index("project_organization_ownership_organization_idx").on(
            table.organizationId,
        ),
    ],
);

/** @service api */
export const organizationMembershipCapabilityTable = pgTable(
    "organization_membership_capability",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationMembershipId: integer("organization_membership_id")
            .references(() => organizationMembershipTable.id)
            .notNull(),
        capability: organizationMembershipCapabilityEnum("capability").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("organization_membership_capability_unique").on(
            table.organizationMembershipId,
            table.capability,
        ),
    ],
);

/** @service api */
export const organizationMembershipAllProjectCapabilityTable = pgTable(
    "organization_membership_all_project_capability",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationMembershipId: integer("organization_membership_id")
            .references(() => organizationMembershipTable.id)
            .notNull(),
        capability:
            organizationMembershipAllProjectCapabilityEnum("capability").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("organization_membership_all_project_capability_unique").on(
            table.organizationMembershipId,
            table.capability,
        ),
    ],
);

/** @service api, math-updater, shared-analysis-worker */
export const premiumFeatureEntitlementTable = pgTable(
    "premium_feature_entitlement",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationId: integer("organization_id")
            .references(() => organizationTable.id)
            .notNull(),
        feature: premiumFeatureEnum("feature").notNull(),
        startsAt: timestamp("starts_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        expiresAt: timestamp("expires_at", {
            mode: "date",
            precision: 0,
        }),
        revokedAt: timestamp("revoked_at", {
            mode: "date",
            precision: 0,
        }),
        adminNote: text("admin_note"),
        createdByUserId: uuid("created_by_user_id").references(
            () => userTable.id,
        ),
        updatedByUserId: uuid("updated_by_user_id").references(
            () => userTable.id,
        ),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("premium_feature_entitlement_org_idx").on(
            table.organizationId,
            table.feature,
        ),
    ],
);

export const zkPassportTable = pgTable(
    "zk_passport",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        citizenship: varchar("citizenship", { length: 10 }).notNull(), // holds 3-digit country code, in theory but we play safe
        nullifier: text("nullifier").notNull(), // Uniqueness enforced by partial index (only for non-deleted users)
        sex: varchar("sex", { length: 50 }).notNull(), // change to enum at some point
        isDeleted: boolean("is_deleted").notNull().default(false), // Denormalized from user table for partial index
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Partial unique index: nullifier must be unique among non-deleted users only
        // This allows deleted users' nullifiers to be reused immediately upon soft-deletion
        uniqueIndex("zk_passport_nullifier_active_unique")
            .on(table.nullifier)
            .where(sql`${table.isDeleted} = false`),
        // Regular index for nullifier lookups
        index("zk_passport_nullifier_idx").on(table.nullifier),
    ],
);

export const eventTicketTable = pgTable(
    "event_ticket",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        provider: ticketProviderEnum("provider").notNull(),
        nullifier: text("nullifier").notNull(), // ZK nullifier - event-specific identifier
        eventSlug: eventSlugEnum("event_slug").notNull(),
        isDeleted: boolean("is_deleted").notNull().default(false), // Denormalized from user table for partial index
        verifiedAt: timestamp("verified_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        pcdType: text("pcd_type"),
        providerMetadata: jsonb("provider_metadata"), // Optional metadata (e.g., productId if revealed)
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Index for frequent gating checks: SELECT * FROM event_ticket
        // WHERE user_id = ? AND event_slug = ?
        // Used by hasEventTicket() on every vote/opinion in gated conversations
        index("user_event_idx").on(table.userId, table.eventSlug),
        // Partial unique index: nullifier+event must be unique among non-deleted users only
        uniqueIndex("event_ticket_nullifier_event_active_unique")
            .on(table.nullifier, table.eventSlug)
            .where(sql`${table.isDeleted} = false`),
        // Index for nullifier lookups when verifying tickets
        index("nullifier_idx").on(table.nullifier),
    ],
);

export const phoneTable = pgTable(
    "phone",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        lastTwoDigits: smallint("last_two_digits").notNull(),
        countryCallingCode: varchar("", { length: 10 }).notNull(),
        phoneCountryCode: phoneCountryCodeEnum("phone_country_code"),
        phoneHash: text("phone_hash").notNull(), // base64 encoded hash of phone + pepper
        pepperVersion: integer("pepper_version").notNull().default(0), // used pepper version - we rotate app-wide pepper one in a while
        isDeleted: boolean("is_deleted").notNull().default(false), // Denormalized from user table to enable partial unique index
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check("check_two_digits", sql`${table.lastTwoDigits} BETWEEN 0 and 99`),
        // Partial unique index: only enforce uniqueness for non-deleted users
        uniqueIndex("phone_hash_active_unique")
            .on(table.phoneHash)
            .where(sql`${table.isDeleted} = false`),
        // Regular index for lookups
        index("phone_hash_idx").on(table.phoneHash),
    ],
);

// if user explicity logs in with the primary or any backup emails, the validation email is sent to the specified address on login.
// if user logs in by entering a "secondary" or "other" type of email associated with their account, send validation email to the primary email associated with their account.
// once this passed, the backend will send one-time password to secondary email addresses and user will have to verify them (multi-factor)
// "other" emails are email addresses associated with the account but which are not used for login
// TODO this is not implemented yet, there is only primary - will be added together with other types of 2FA in the future
export const emailType = pgEnum("email_type", [
    "primary",
    "backup",
    "secondary",
    "other",
]);

export const emailReachabilityEnum = pgEnum("email_reachability", [
    "safe",
    "risky",
    "invalid",
    "unknown",
]);

// The process of changing emails, especially primary email, is stricly controlled.
// Emails cannot be shared among users. There is no plan to add "company" or "team" super-users at the moment.
// In a team, each individual has an account with their own email address, and a few of them can be admin of the group they created.
// Emails in that table have already been validated by the user at least once and are related to an existing registered user.
// Mirrors phoneTable pattern: auto-generated id PK + isDeleted + partial unique index on email.
// This supports user deletion + re-registration with the same email address.
export const emailTable = pgTable(
    "email",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        email: varchar("email", { length: 254 }).notNull(),
        type: emailType("type").notNull(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        isDeleted: boolean("is_deleted").notNull().default(false), // Denormalized from user table to enable partial unique index
        emailReachability: emailReachabilityEnum("email_reachability"), // Reacher verification result at registration time (null = not checked)
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "email_canonical_check",
            sql`${table.email} = lower(btrim(${table.email}))`,
        ),
        // Partial unique index: only enforce uniqueness for non-deleted emails
        uniqueIndex("email_active_unique")
            .on(table.email)
            .where(sql`${table.isDeleted} = false`),
        // Regular index for lookups
        index("email_idx").on(table.email),
    ],
);

export const deviceTable = pgTable("device", {
    didWrite: varchar("did_write", { length: 1000 }).primaryKey(), // TODO: make sure of length
    userId: uuid("user_id")
        .references(() => userTable.id)
        .notNull(),
    userAgent: text("user_agent").notNull(), // user-agent length is not fixed
    // TODO: isTrusted: boolean("is_trusted").notNull(), // if set to true by user then, device should stay logged-in indefinitely until log out action
    sessionExpiry: timestamp("session_expiry").notNull(), // on register, a new login session is always started, hence the notNull. This column is updated to now + 15 minutes at each request when isTrusted == false. Otherwise, expiry will be now + 1000 years - meaning no expiry.
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// !WARNING: this contains a tuple that cannot easily be mapped to enum AuthenticateType. Change both manually.
// TODO: use zod or something to maintain one set of type only
export const authType = pgEnum("auth_type", [
    "register",
    "login_known_device",
    "login_new_device",
    "merge",
    "restore_deleted",
    "restore_and_merge",
]);

// This table serves as a transitory store of information between the intial register attempt and the validation of the one-time code sent to the email address (no multi-factor because it is register)
// the record will be first created as "register" or "login_new_device", and latter updated to "login_known_device" on next authenticate action
// TODO: this table may have to be broke down when introducing 2FA
export const authAttemptPhoneTable = pgTable(
    "auth_attempt_phone",
    {
        didWrite: varchar("did_write", { length: 1000 }).primaryKey(), // TODO: make sure of length
        type: authType("type").notNull(),
        lastTwoDigits: smallint("last_two_digits").notNull(),
        countryCallingCode: varchar("", { length: 10 }).notNull(),
        phoneCountryCode: phoneCountryCodeEnum("phone_country_code"),
        phoneHash: text("phone_hash").notNull(), // base64 encoded hash of phone + pepper
        pepperVersion: integer("pepper_version").notNull().default(0), // used pepper - we rotate app-wide pepper once in a while
        userId: uuid("user_id").notNull(),
        userAgent: text("user_agent").notNull(), // user-agent length is not fixed
        code: integer("code").notNull(), // one-time password sent to the email ("otp")
        codeExpiry: timestamp("code_expiry").notNull(),
        guessAttemptAmount: integer("guess_attempt_amount")
            .default(0)
            .notNull(),
        lastOtpSentAt: timestamp("last_otp_sent_at").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check("check_two_digits", sql`${table.lastTwoDigits} BETWEEN 0 and 99`),
    ],
);

// Same pattern as authAttemptPhoneTable but simplified for email (no hash/pepper/country code)
export const authAttemptEmailTable = pgTable(
    "auth_attempt_email",
    {
        didWrite: varchar("did_write", { length: 1000 }).primaryKey(),
        type: authType("type").notNull(),
        email: varchar("email", { length: 254 }).notNull(),
        userId: uuid("user_id").notNull(),
        userAgent: text("user_agent").notNull(),
        code: integer("code").notNull(), // one-time password sent to the email ("otp")
        emailReachability: emailReachabilityEnum("email_reachability"), // Reacher verification result (null = not checked)
        codeExpiry: timestamp("code_expiry").notNull(),
        guessAttemptAmount: integer("guess_attempt_amount")
            .default(0)
            .notNull(),
        lastOtpSentAt: timestamp("last_otp_sent_at").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "auth_attempt_email_canonical_check",
            sql`${table.email} = lower(btrim(${table.email}))`,
        ),
    ],
);

// Tracks OTP send/backoff state per phone destination across devices/challenges.
export const otpPhoneDestinationStateTable = pgTable(
    "otp_phone_destination_state",
    {
        phoneHash: text("phone_hash").primaryKey(),
        lastOtpSentAt: timestamp("last_otp_sent_at").notNull(),
        consecutiveFailedVerifyAttempts: integer(
            "consecutive_failed_verify_attempts",
        )
            .notNull()
            .default(0),
        backoffUntil: timestamp("backoff_until"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("otp_phone_destination_updated_idx").on(table.updatedAt)],
);

// Tracks OTP send/backoff state per canonical email destination across devices/challenges.
export const otpEmailDestinationStateTable = pgTable(
    "otp_email_destination_state",
    {
        email: varchar("email", { length: 254 }).primaryKey(),
        lastOtpSentAt: timestamp("last_otp_sent_at").notNull(),
        consecutiveFailedVerifyAttempts: integer(
            "consecutive_failed_verify_attempts",
        )
            .notNull()
            .default(0),
        backoffUntil: timestamp("backoff_until"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "otp_email_destination_canonical_check",
            sql`${table.email} = lower(btrim(${table.email}))`,
        ),
        index("otp_email_destination_updated_idx").on(table.updatedAt),
    ],
);

/** @service shared-analysis-worker, import-worker, content-translation-worker */
export const conversationContentTable = pgTable(
    "conversation_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
        body: text("body"),
        bodyPlainText: text("body_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", { length: 35 }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "conversation_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
    ],
);

/** @service api, shared-analysis-worker, import-worker */
export const polisConversationConfigTable = pgTable(
    "polis_conversation_config",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        aiLabelingEnabled: boolean("ai_labeling_enabled").notNull().default(true),
        analysisDataGeneration: integer("analysis_data_generation")
            .notNull()
            .default(0),
        preferredOpinionGroupCount: integer("preferred_opinion_group_count"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "polis_conversation_config_preferred_opinion_group_count_check",
            sql`${table.preferredOpinionGroupCount} IS NULL OR ${table.preferredOpinionGroupCount} >= 2`,
        ),
    ],
);

/** @service api, scoring-worker */
export const rankingConversationConfigTable = pgTable(
    "ranking_conversation_config",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingMode: rankingModeEnum("ranking_mode").notNull(),
        currentRankingScoreId: integer("current_ranking_score_id")
            .references((): AnyPgColumn => rankingScoreTable.id)
            .unique(),
        externalSourceConfig: jsonb("external_source_config"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

/** @service scoring-worker, api, shared-analysis-worker, import-worker, content-translation-worker */
export const conversationTable = pgTable(
    "conversation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(), // used for permanent URL
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => conversationContentTable.id)
            .unique(), // null if conversation was deleted
        polisConfigId: integer("polis_config_id")
            .references(() => polisConversationConfigTable.id)
            .unique(),
        rankingConfigId: integer("ranking_config_id")
            .references(() => rankingConversationConfigTable.id)
            .unique(),
        dynamicTranslationEnabled: boolean("dynamic_translation_enabled")
            .notNull()
            .default(false),
        languageSettingsSource: conversationLanguageSettingsSourceEnum(
            "language_settings_source",
        )
            .notNull()
            .default("conversation_override"),
        isIndexed: boolean("is_indexed").notNull().default(true), // if true, the conversation can be fetched in the feed and search engine, else it is hidden, unless users have the link
        participationMode: participationModeEnum("participation_mode")
            .notNull()
            .default("account_required"), // Determines who can vote/post opinions: "account_required" requires any account, "strong_verification" requires phone or Rarimo passport, "email_verification" requires email credential specifically, "guest" allows anyone.
        conversationType: conversationTypeEnum("conversation_type")
            .notNull()
            .default("polis"), // "polis" = standard agree/disagree/unsure voting with clustering, "ranking" = ranked-choice prioritization family
        isImporting: boolean("is_importing").notNull().default(false), // if true, the conversation is being imported from CSV and should not be visible in feed until import completes
        isClosed: boolean("is_closed").notNull().default(false), // if true, the conversation was closed by owner and users cannot post opinions or vote
        isEdited: boolean("is_edited").notNull().default(false), // if true, the conversation content was edited after creation. Used for "Edited" badge in UI. Use this field (not updatedAt) to determine if a conversation was edited — updatedAt can be accidentally bumped by migration scripts.
        requiresEventTicket: eventSlugEnum("requires_event_ticket"), // if set, only users with verified ticket for this event can participate (vote/post opinions)
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        // WARNING: Do NOT use updatedAt to determine if a conversation was edited in the UI.
        // Use isEdited instead. Migration scripts must NOT update this column.
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        lastReactedAt: timestamp("last_reacted_at", {
            // latest response to the conversation
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Partial index for feed query: filters isIndexed=true + isImporting=false, sorts by createdAt/id
        index("conversation_feed_idx")
            .using("btree", sql`${table.createdAt} DESC`, sql`${table.id} DESC`)
            .where(
                sql`${table.isIndexed} = true AND ${table.isImporting} = false`,
            ),
        // Composite for math-updater scan: filters on isImporting + conversationType
        index("conversation_type_importing_idx").on(
            table.isImporting,
            table.conversationType,
        ),
        index("conversation_project_id_idx").on(table.projectId),
        index("conversation_project_timeline_idx")
            .using(
                "btree",
                table.projectId,
                table.isImporting,
                sql`${table.createdAt} DESC`,
                sql`${table.id} DESC`,
            )
            .where(isNotNull(table.currentContentId)),
        check(
            "conversation_subtype_config_check",
            sql`((${table.conversationType} = 'polis' AND ${table.polisConfigId} IS NOT NULL AND ${table.rankingConfigId} IS NULL) OR (${table.conversationType} = 'ranking' AND ${table.rankingConfigId} IS NOT NULL AND ${table.polisConfigId} IS NULL))`,
        ),
    ],
);

/** @service api, shared-analysis-worker, content-translation-worker, import-worker */
export const conversationTranslationTargetLanguageTable = pgTable(
    "conversation_translation_target_language",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("conversation_translation_target_language_active_unique")
            .on(table.conversationId, table.languageCode)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service api, import-worker */
export const conversationImportSourceTable = pgTable(
    "conversation_import_source",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id)
            .unique(),
        importUrl: text("import_url"),
        importConversationUrl: text("import_conversation_url"),
        importExportUrl: text("import_export_url"),
        importCreatedAt: timestamp("import_created_at", {
            mode: "date",
            precision: 0,
        }),
        importAuthor: text("import_author"),
        importMethod: importMethodType("import_method"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

/** @service api, scoring-worker, shared-analysis-worker, content-translation-worker */
export const rankingItemContentTable = pgTable(
    "ranking_item_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        rankingItemId: integer("ranking_item_id")
            .notNull()
            .references((): AnyPgColumn => rankingItemTable.id),
        conversationContentId: integer("conversation_content_id")
            .notNull()
            .references(() => conversationContentTable.id),
        title: varchar("title", {
            length: MAX_LENGTH_RANKING_ITEM_TITLE,
        }).notNull(),
        body: varchar("body", { length: MAX_LENGTH_RANKING_ITEM_BODY }),
        bodyPlainText: text("body_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("ranking_item_content_id_item_unique").on(
            table.id,
            table.rankingItemId,
        ),
        check(
            "ranking_item_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        check(
            "ranking_item_content_body_plain_text_pair_check",
            sql`((${table.body} IS NULL AND ${table.bodyPlainText} IS NULL) OR (${table.body} IS NOT NULL AND ${table.bodyPlainText} IS NOT NULL))`,
        ),
    ],
);

/** @service api, scoring-worker, shared-analysis-worker, content-translation-worker */
export const rankingItemTable = pgTable(
    "ranking_item",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        currentContentId: integer("current_content_id"),
        isSeed: boolean("is_seed").notNull().default(false),
        lifecycleStatus: rankingItemLifecycleStatusEnum("lifecycle_status")
            .notNull()
            .default("active"),
        snapshotScore: real("snapshot_score"),
        snapshotRank: integer("snapshot_rank"),
        snapshotParticipantCount: integer("snapshot_participant_count"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("ranking_item_conversation_active_idx").on(
            table.conversationId,
            table.currentContentId,
        ),
        index("ranking_item_lifecycle_idx").on(
            table.conversationId,
            table.lifecycleStatus,
        ),
        foreignKey({
            columns: [table.currentContentId, table.id],
            foreignColumns: [
                rankingItemContentTable.id,
                rankingItemContentTable.rankingItemId,
            ],
            name: "ranking_item_current_content_owned_by_item_fk",
        }),
    ],
);

/** @service api */
export const rankingItemExternalSourceTable = pgTable(
    "ranking_item_external_source",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingItemId: integer("ranking_item_id")
            .notNull()
            .references(() => rankingItemTable.id)
            .unique(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        sourceType: externalSourceTypeEnum("source_type").notNull(),
        externalId: text("external_id").notNull(),
        externalUrl: text("external_url"),
        externalMetadata: jsonb("external_metadata"),
        lastSyncedAt: timestamp("last_synced_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("ranking_external_source_dedup_idx").on(
            table.externalId,
            table.conversationId,
        ),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker */
export const surveyConfigTable = pgTable(
    "survey_config",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        currentRevision: integer("current_revision").notNull().default(1),
        isOptional: boolean("is_optional").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        unique("survey_config_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        uniqueIndex("survey_config_active_conversation_uidx")
            .on(table.conversationId)
            .where(sql`${table.deletedAt} IS NULL`),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker */
export const surveyQuestionTable = pgTable(
    "survey_question",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        surveyConfigId: integer("survey_config_id")
            .notNull()
            .references(() => surveyConfigTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        questionType: surveyQuestionTypeEnum("question_type").notNull(),
        choiceDisplay: surveyChoiceDisplayEnum("choice_display")
            .notNull()
            .default("auto"),
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => surveyQuestionContentTable.id)
            .unique(),
        currentSemanticVersion: integer("current_semantic_version")
            .notNull()
            .default(1),
        displayOrder: smallint("display_order").notNull(),
        isRequired: boolean("is_required").notNull().default(true),
        isPublicAggregateSuppressionEnabled: boolean(
            "is_public_aggregate_suppression_enabled",
        )
            .notNull()
            .default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("survey_question_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        uniqueIndex("survey_question_active_config_display_order_uidx")
            .on(table.surveyConfigId, table.displayOrder)
            .where(sql`${table.currentContentId} IS NOT NULL`),
        foreignKey({
            columns: [table.surveyConfigId, table.conversationId],
            foreignColumns: [
                surveyConfigTable.id,
                surveyConfigTable.conversationId,
            ],
            name: "survey_question_config_conversation_fk",
        }),
        index("survey_question_config_idx").on(table.surveyConfigId),
    ],
);

/** @service api, content-translation-worker */
export const conversationContentTranslationTable = pgTable(
    "conversation_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationContentId: integer("conversation_content_id")
            .notNull()
            .references(() => conversationContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedTitle: text("translated_title").notNull(),
        translatedBody: text("translated_body"),
        translatedBodyPlainText: text("translated_body_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "conversation_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        check(
            "conversation_content_translation_body_plain_text_pair_check",
            sql`((${table.translatedBody} IS NULL AND ${table.translatedBodyPlainText} IS NULL) OR (${table.translatedBody} IS NOT NULL AND ${table.translatedBodyPlainText} IS NOT NULL))`,
        ),
        unique("conversation_content_translation_unique").on(
            table.conversationContentId,
            table.displayLanguageCode,
        ),
    ],
);

/** @service api, content-translation-worker */
export const projectContentTranslationTable = pgTable(
    "project_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectContentId: integer("project_content_id")
            .notNull()
            .references(() => projectContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedTitle: text("translated_title").notNull(),
        translatedSubtitle: text("translated_subtitle"),
        translatedBody: text("translated_body"),
        translatedBodyPlainText: text("translated_body_plain_text"),
        sourceKind: projectContentTranslationSourceKindEnum("source_kind")
            .notNull()
            .default("machine"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        check(
            "project_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        check(
            "project_content_translation_body_plain_text_pair_check",
            sql`((${table.translatedBody} IS NULL AND ${table.translatedBodyPlainText} IS NULL) OR (${table.translatedBody} IS NOT NULL AND ${table.translatedBodyPlainText} IS NOT NULL))`,
        ),
        uniqueIndex("project_content_translation_active_unique")
            .on(table.projectContentId, table.displayLanguageCode)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker */
export const surveyQuestionContentTable = pgTable(
    "survey_question_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        surveyQuestionId: integer("survey_question_id")
            .notNull()
            .references(() => surveyQuestionTable.id),
        questionText: varchar("question_text", {
            length: MAX_LENGTH_SURVEY_QUESTION,
        }).notNull(),
        constraints: jsonb("constraints").notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "survey_question_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
    ],
);

/** @service api, content-translation-worker */
export const surveyQuestionContentTranslationTable = pgTable(
    "survey_question_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyQuestionContentId: integer("survey_question_content_id")
            .notNull()
            .references(() => surveyQuestionContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedQuestionText: text("translated_question_text").notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "survey_question_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        unique("survey_question_content_translation_unique").on(
            table.surveyQuestionContentId,
            table.displayLanguageCode,
        ),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker */
export const surveyQuestionOptionTable = pgTable(
    "survey_question_option",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        surveyQuestionId: integer("survey_question_id")
            .notNull()
            .references(() => surveyQuestionTable.id),
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => surveyQuestionOptionContentTable.id)
            .unique(),
        displayOrder: smallint("display_order").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("survey_question_option_id_question_unique").on(
            table.id,
            table.surveyQuestionId,
        ),
        uniqueIndex("survey_question_option_active_question_display_order_uidx")
            .on(table.surveyQuestionId, table.displayOrder)
            .where(sql`${table.currentContentId} IS NOT NULL`),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker */
export const surveyQuestionOptionContentTable = pgTable(
    "survey_question_option_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        surveyQuestionOptionId: integer("survey_question_option_id")
            .notNull()
            .references(() => surveyQuestionOptionTable.id),
        optionText: varchar("option_text", {
            length: MAX_LENGTH_SURVEY_OPTION,
        }).notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "survey_question_option_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
    ],
);

/** @service api, content-translation-worker */
export const surveyQuestionOptionContentTranslationTable = pgTable(
    "survey_question_option_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyQuestionOptionContentId: integer(
            "survey_question_option_content_id",
        )
            .notNull()
            .references(() => surveyQuestionOptionContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedOptionText: text("translated_option_text").notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "survey_question_option_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        unique("survey_question_option_content_translation_unique").on(
            table.surveyQuestionOptionContentId,
            table.displayLanguageCode,
        ),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker */
export const surveyResponseTable = pgTable(
    "survey_response",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        participantId: uuid("participant_id")
            .notNull()
            .references(() => userTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        completedAt: timestamp("completed_at", {
            mode: "date",
            precision: 0,
        }),
        withdrawnAt: timestamp("withdrawn_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("survey_response_conversation_participant_unique").on(
            table.conversationId,
            table.participantId,
        ),
        unique("survey_response_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        index("survey_response_conversation_created_idx").on(
            table.conversationId,
            table.createdAt,
        ),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker */
export const surveyAnswerTable = pgTable(
    "survey_answer",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyResponseId: integer("survey_response_id")
            .notNull()
            .references(() => surveyResponseTable.id),
        conversationId: integer("conversation_id").notNull(),
        surveyQuestionId: integer("survey_question_id")
            .notNull()
            .references(() => surveyQuestionTable.id),
        answeredQuestionSemanticVersion: integer(
            "answered_question_semantic_version",
        ).notNull(),
        textValueHtml: text("text_value_html"),
        textValuePlainText: text("text_value_plain_text"),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("survey_answer_id_question_unique").on(
            table.id,
            table.surveyQuestionId,
        ),
        uniqueIndex("survey_answer_response_question_active_uidx")
            .on(table.surveyResponseId, table.surveyQuestionId)
            .where(sql`${table.deletedAt} IS NULL`),
        foreignKey({
            columns: [table.surveyResponseId, table.conversationId],
            foreignColumns: [
                surveyResponseTable.id,
                surveyResponseTable.conversationId,
            ],
            name: "survey_answer_response_conversation_fk",
        }),
        foreignKey({
            columns: [table.surveyQuestionId, table.conversationId],
            foreignColumns: [
                surveyQuestionTable.id,
                surveyQuestionTable.conversationId,
            ],
            name: "survey_answer_question_conversation_fk",
        }),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker */
export const surveyAnswerOptionTable = pgTable(
    "survey_answer_option",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyAnswerId: integer("survey_answer_id")
            .notNull()
            .references(() => surveyAnswerTable.id),
        surveyQuestionId: integer("survey_question_id").notNull(),
        surveyQuestionOptionId: integer("survey_question_option_id")
            .notNull()
            .references(() => surveyQuestionOptionTable.id),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        uniqueIndex("survey_answer_option_answer_option_active_uidx")
            .on(table.surveyAnswerId, table.surveyQuestionOptionId)
            .where(sql`${table.deletedAt} IS NULL`),
        foreignKey({
            columns: [table.surveyAnswerId, table.surveyQuestionId],
            foreignColumns: [
                surveyAnswerTable.id,
                surveyAnswerTable.surveyQuestionId,
            ],
            name: "survey_answer_option_answer_question_fk",
        }),
        foreignKey({
            columns: [table.surveyQuestionOptionId, table.surveyQuestionId],
            foreignColumns: [
                surveyQuestionOptionTable.id,
                surveyQuestionOptionTable.surveyQuestionId,
            ],
            name: "survey_answer_option_option_question_fk",
        }),
    ],
);

/** @service shared-analysis-worker, import-worker, content-translation-worker */
export const opinionTable = pgTable(
    "opinion",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(), // used for permanent URL
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        currentContentId: integer("current_content_id").references(
            (): AnyPgColumn => opinionContentTable.id,
        ), // null if opinion was deleted
        isSeed: boolean("is_seed").notNull().default(false),
        numAgrees: integer("num_agrees").notNull().default(0),
        numDisagrees: integer("num_disagrees").notNull().default(0),
        numPasses: integer("num_passes").notNull().default(0),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        lastReactedAt: timestamp("last_reacted_at", {
            // latest like or dislike
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("opinion_authorId_idx").on(table.authorId),
        index("opinion_author_active_created_id_idx")
            .using(
                "btree",
                table.authorId,
                sql`${table.createdAt} DESC`,
                sql`${table.id} DESC`,
            )
            .where(isNotNull(table.currentContentId)),
        // Composite for counter reconciliation: filters conversationId + non-deleted (currentContentId IS NOT NULL)
        index("opinion_conversation_active_idx").on(
            table.conversationId,
            table.currentContentId,
        ),
        index("opinion_conversation_active_created_id_idx")
            .using(
                "btree",
                table.conversationId,
                sql`${table.createdAt} DESC`,
                sql`${table.id} DESC`,
            )
            .where(isNotNull(table.currentContentId)),
    ],
);

/** @service shared-analysis-worker, import-worker, content-translation-worker */
export const opinionContentTable = pgTable(
    "opinion_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        opinionId: integer("opinion_id")
            .references(() => opinionTable.id)
            .notNull(), // used to delete all opinionContent when deleting an opinion
        conversationContentId: integer("conversation_content_id")
            .references(() => conversationContentTable.id)
            .notNull(), // used to cascade delete all opinionContent when deleting a conversation(content)
        content: varchar("content", { length: MAX_LENGTH_OPINION_HTML }).notNull(),
        contentPlainText: text("content_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", { length: 35 }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "opinion_content_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
    ],
);

/** @service api, content-translation-worker */
export const opinionContentTranslationTable = pgTable(
    "opinion_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        opinionContentId: integer("opinion_content_id")
            .notNull()
            .references(() => opinionContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedContent: text("translated_content").notNull(),
        translatedContentPlainText: text("translated_content_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "opinion_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        unique("opinion_content_translation_unique").on(
            table.opinionContentId,
            table.displayLanguageCode,
        ),
    ],
);

/** @service api, content-translation-worker */
export const rankingItemContentTranslationTable = pgTable(
    "ranking_item_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingItemContentId: integer("ranking_item_content_id")
            .notNull()
            .references(() => rankingItemContentTable.id),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        translatedTitle: text("translated_title").notNull(),
        translatedBodyHtml: text("translated_body_html"),
        translatedBodyPlainText: text("translated_body_plain_text"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", {
            length: 35,
        }),
        sourceLanguageProvider: languageDetectionProviderEnum(
            "source_language_provider",
        ),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "ranking_item_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        check(
            "ranking_item_content_translation_body_plain_text_pair_check",
            sql`((${table.translatedBodyHtml} IS NULL AND ${table.translatedBodyPlainText} IS NULL) OR (${table.translatedBodyHtml} IS NOT NULL AND ${table.translatedBodyPlainText} IS NOT NULL))`,
        ),
        unique("ranking_item_content_translation_unique").on(
            table.rankingItemContentId,
            table.displayLanguageCode,
        ),
    ],
);

/** @service api, content-translation-worker, import-worker */
export const contentTranslationWorkTable = pgTable(
    "content_translation_work",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id").references(
            () => conversationTable.id,
        ),
        sourceKind: contentTranslationSourceKindEnum("source_kind").notNull(),
        projectContentId: integer("project_content_id").references(
            () => projectContentTable.id,
        ),
        conversationContentId: integer("conversation_content_id").references(
            () => conversationContentTable.id,
        ),
        opinionContentId: integer("opinion_content_id").references(
            () => opinionContentTable.id,
        ),
        surveyQuestionContentId: integer(
            "survey_question_content_id",
        ).references(() => surveyQuestionContentTable.id),
        surveyQuestionOptionContentIds: integer(
            "survey_question_option_content_ids",
        ).array(),
        rankingItemContentId: integer("ranking_item_content_id").references(
            () => rankingItemContentTable.id,
        ),
        displayLanguageCode:
            displayLanguageCodeEnum("display_language_code").notNull(),
        status: contentTranslationWorkStatusEnum("status")
            .notNull()
            .default("pending"),
        priorityRank: integer("priority_rank").notNull().default(2),
        attemptCount: integer("attempt_count").notNull().default(0),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        lastErrorCode: varchar("last_error_code", { length: 100 }),
        lastErrorMessage: text("last_error_message"),
        requestedAt: timestamp("requested_at", {
            mode: "date",
            precision: 0,
        }),
        completedAt: timestamp("completed_at", {
            mode: "date",
            precision: 0,
        }),
        failedAt: timestamp("failed_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("content_translation_work_conversation_unique")
            .on(table.conversationContentId, table.displayLanguageCode)
            .where(
                sqlAnd(
                    sql`${table.sourceKind} = 'conversation'`,
                    isNotNull(table.conversationContentId),
                ),
            ),
        uniqueIndex("content_translation_work_project_unique")
            .on(table.projectContentId, table.displayLanguageCode)
            .where(
                sqlAnd(
                    sql`${table.sourceKind} = 'project'`,
                    isNotNull(table.projectContentId),
                ),
            ),
        uniqueIndex("content_translation_work_opinion_unique")
            .on(table.opinionContentId, table.displayLanguageCode)
            .where(
                sqlAnd(
                    sql`${table.sourceKind} = 'opinion'`,
                    isNotNull(table.opinionContentId),
                ),
            ),
        uniqueIndex("content_translation_work_survey_question_unique")
            .on(
                table.surveyQuestionContentId,
                table.surveyQuestionOptionContentIds,
                table.displayLanguageCode,
            )
            .where(
                sqlAnd(
                    sql`${table.sourceKind} = 'survey_question'`,
                    isNotNull(table.surveyQuestionContentId),
                    isNotNull(table.surveyQuestionOptionContentIds),
                ),
            ),
        uniqueIndex("content_translation_work_ranking_item_unique")
            .on(table.rankingItemContentId, table.displayLanguageCode)
            .where(
                sqlAnd(
                    sql`${table.sourceKind} = 'ranking_item'`,
                    isNotNull(table.rankingItemContentId),
                ),
            ),
        index("content_translation_work_claim_idx")
            .on(table.priorityRank, table.updatedAt, table.id)
            .where(sql`${table.status} = 'pending'`),
        index("content_translation_work_lease_expiry_idx")
            .on(table.leaseExpiresAt, table.id)
            .where(sql`${table.status} = 'running'`),
        check(
            "content_translation_work_source_check",
            sqlOr(
                sqlAnd(
                    sql`${table.sourceKind} = 'conversation'`,
                    isNotNull(table.conversationId),
                    isNull(table.projectContentId),
                    isNotNull(table.conversationContentId),
                    isNull(table.opinionContentId),
                    isNull(table.surveyQuestionContentId),
                    isNull(table.surveyQuestionOptionContentIds),
                    isNull(table.rankingItemContentId),
                ),
                sqlAnd(
                    sql`${table.sourceKind} = 'project'`,
                    isNull(table.conversationId),
                    isNotNull(table.projectContentId),
                    isNull(table.conversationContentId),
                    isNull(table.opinionContentId),
                    isNull(table.surveyQuestionContentId),
                    isNull(table.surveyQuestionOptionContentIds),
                    isNull(table.rankingItemContentId),
                ),
                sqlAnd(
                    sql`${table.sourceKind} = 'opinion'`,
                    isNotNull(table.conversationId),
                    isNull(table.projectContentId),
                    isNull(table.conversationContentId),
                    isNotNull(table.opinionContentId),
                    isNull(table.surveyQuestionContentId),
                    isNull(table.surveyQuestionOptionContentIds),
                    isNull(table.rankingItemContentId),
                ),
                sqlAnd(
                    sql`${table.sourceKind} = 'survey_question'`,
                    isNotNull(table.conversationId),
                    isNull(table.projectContentId),
                    isNull(table.conversationContentId),
                    isNull(table.opinionContentId),
                    isNotNull(table.surveyQuestionContentId),
                    isNotNull(table.surveyQuestionOptionContentIds),
                    isNull(table.rankingItemContentId),
                ),
                sqlAnd(
                    sql`${table.sourceKind} = 'ranking_item'`,
                    isNotNull(table.conversationId),
                    isNull(table.projectContentId),
                    isNull(table.conversationContentId),
                    isNull(table.opinionContentId),
                    isNull(table.surveyQuestionContentId),
                    isNull(table.surveyQuestionOptionContentIds),
                    isNotNull(table.rankingItemContentId),
                ),
            ),
        ),
        check(
            "content_translation_work_running_lease_check",
            sqlOr(
                sqlAnd(
                    sql`${table.status} <> 'running'`,
                    isNull(table.leaseOwner),
                    isNull(table.leaseToken),
                    isNull(table.leaseExpiresAt),
                ),
                sqlAnd(
                    sql`${table.status} = 'running'`,
                    isNotNull(table.leaseOwner),
                    isNotNull(table.leaseToken),
                    isNotNull(table.leaseExpiresAt),
                ),
            ),
        ),
        check(
            "content_translation_work_priority_rank_check",
            sql`${table.priorityRank} >= 0 AND ${table.priorityRank} <= 2`,
        ),
    ],
);

// like or dislike on opinions for each user
/** @service shared-analysis-worker, import-worker */
export const voteTable = pgTable(
    "vote",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        opinionId: integer("opinion_id")
            .notNull()
            .references(() => opinionTable.id),
        polisVoteId: integer("polis_vote_id"), // only used for importing
        currentContentId: integer("current_content_id").references(
            (): AnyPgColumn => voteContentTable.id,
        ), // not null if not deleted, else null
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique().on(t.authorId, t.opinionId),
        index("vote_authorId_idx").on(t.authorId),
        index("vote_author_active_updated_id_idx")
            .using(
                "btree",
                t.authorId,
                sql`${t.updatedAt} DESC`,
                sql`${t.id} DESC`,
            )
            .where(isNotNull(t.currentContentId)),
        // Composite for counter reconciliation: filters opinionId + non-deleted (currentContentId IS NOT NULL)
        index("vote_opinion_active_idx").on(t.opinionId, t.currentContentId),
    ],
);

/** @service shared-analysis-worker, import-worker */
export const voteContentTable = pgTable("vote_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    voteId: integer("vote_id") //
        .notNull()
        .references(() => voteTable.id),
    opinionContentId: integer("opinion_content_id")
        .references(() => opinionContentTable.id)
        .notNull(), // exact opinion content that existed when this vote was cast. Cascade delete from opinionContent if opinionContent was deleted.
    vote: voteEnum("vote").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// illegal = glaring violation of law (scam, terrorism, threat, etc)
export const reportReasons = pgEnum("report_reason_enum", [
    "illegal",
    "doxing",
    "sexual",
    "spam",
    "misleading",
    "antisocial",
]);
export const moderationReasonsEnum = pgEnum("moderation_reason_enum", [
    "misleading",
    "antisocial",
    "illegal",
    "doxing",
    "sexual",
    "spam",
]);

// todo: add suspend and ban
export const conversationModerationActionEnum = pgEnum(
    "conversation_moderation_action",
    ["lock"],
);

export const opinionModerationActionEnum = pgEnum("opinion_moderation_action", [
    "move",
    "hide",
]);

export const conversationReportTable = pgTable(
    "conversation_report",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        authorId: uuid("author_id")
            .references(() => userTable.id)
            .notNull(),
        reportReason: reportReasons("report_reason").notNull(),
        reportExplanation: varchar("report_explanation", {
            length: MAX_LENGTH_USER_REPORT_EXPLANATION,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("conversation_id_idx").on(table.conversationId)],
);

export const opinionReportTable = pgTable(
    "opinion_report",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        opinionId: integer("opinion_id")
            .references(() => opinionTable.id)
            .notNull(),
        authorId: uuid("author_id")
            .references(() => userTable.id)
            .notNull(),
        reportReason: reportReasons("report_reason").notNull(),
        reportExplanation: varchar("report_explanation", {
            length: MAX_LENGTH_USER_REPORT_EXPLANATION,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("opinion_id_idx").on(table.opinionId)],
);

export const conversationModerationTable = pgTable(
    "conversation_moderation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id") // one moderation action per conversation
            .references(() => conversationTable.id)
            .notNull(),
        authorId: uuid("author_id")
            .references(() => userTable.id)
            .notNull(),
        moderationAction:
            conversationModerationActionEnum("moderation_action").notNull(),
        moderationReason: moderationReasonsEnum("moderation_reason").notNull(),
        moderationExplanation: varchar("moderation_explanation", {
            length: MAX_LENGTH_BODY,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("conversation_moderation_active_conversation_unique")
            .on(table.conversationId)
            .where(isNull(table.deletedAt)),
    ],
);

/** @service shared-analysis-worker */
/** @service import-worker */
export const opinionModerationTable = pgTable(
    "opinion_moderation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        opinionId: integer("opinion_id") // one moderation action per opinion
            .references(() => opinionTable.id)
            .notNull(),
        authorId: uuid("author_id").references(() => userTable.id), // null if imported data
        moderationAction:
            opinionModerationActionEnum("moderation_action").notNull(),
        moderationReason: moderationReasonsEnum("moderation_reason").notNull(),
        moderationExplanation: varchar("moderation_explanation", {
            length: MAX_LENGTH_BODY,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("opinion_moderation_active_opinion_unique")
            .on(table.opinionId)
            .where(isNull(table.deletedAt)),
    ],
);

// WARNING: if you change this, also change this in shared/zod.ts!
export const notificationTypeEnum = pgEnum("notification_type_enum", [
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

export const notificationOpinionVoteTable = pgTable(
    "notification_opinion_vote",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        notificationId: integer("notification_id")
            .references(() => notificationTable.id)
            .notNull(),
        opinionId: integer("opinion_id")
            .references(() => opinionTable.id)
            .notNull(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        numVotes: integer("num_votes").notNull().default(1),
        isSeed: boolean("is_seed").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("notification_opinion_vote_notification_idx").on(
            t.notificationId,
        ),
    ],
);

export const notificationNewOpinionTable = pgTable(
    "notification_new_opinion",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        notificationId: integer("notification_id")
            .references(() => notificationTable.id)
            .notNull(),
        authorId: uuid("author_id")
            .references(() => userTable.id)
            .notNull(),
        opinionId: integer("opinion_id")
            .references(() => opinionTable.id)
            .notNull(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("notification_new_opinion_notification_idx").on(t.notificationId),
    ],
);

export const notificationExportTable = pgTable(
    "notification_export",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        notificationId: integer("notification_id")
            .references(() => notificationTable.id)
            .notNull(),
        exportRequestId: integer("export_request_id").references(
            (): AnyPgColumn => conversationExportRequestTable.id,
        ),
        exportSlugId: varchar("export_slug_id", { length: 8 }).notNull(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        failureReason: exportFailureReasonEnum("failure_reason"),
        cancellationReason: exportCancellationReasonEnum("cancellation_reason"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [index("notification_export_notification_idx").on(t.notificationId)],
);

/** @service import-worker */
export const notificationImportTable = pgTable(
    "notification_import",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        notificationId: integer("notification_id")
            .references(() => notificationTable.id)
            .notNull(),
        importId: integer("import_id")
            .references(() => conversationImportTable.id)
            .notNull(),
        conversationId: integer("conversation_id").references(
            () => conversationTable.id,
        ),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [index("notification_import_notification_idx").on(t.notificationId)],
);

/** @service import-worker */
export const notificationTable = pgTable(
    "notification",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        userId: uuid("user_id") // the user who owns this notification
            .references(() => userTable.id)
            .notNull(),
        isRead: boolean("is_read").notNull().default(false),
        notificationType: notificationTypeEnum("notification_type").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("notification_user_created_id_idx").using(
            "btree",
            t.userId,
            sql`${t.createdAt} DESC`,
            sql`${t.id} DESC`,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisSpecTable = pgTable("analysis_spec", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    analysisFamily: analysisFamilyEnum("analysis_family").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

/** @service api, shared-analysis-worker, import-worker */
export const opinionGroupSpecTable = pgTable(
    "opinion_group_spec",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        analysisSpecId: integer("analysis_spec_id")
            .notNull()
            .references(() => analysisSpecTable.id),
        key: varchar("key", { length: 100 }).notNull(),
        version: integer("version").notNull(),
        reducer: opinionGroupReducerEnum("reducer").notNull(),
        clusterer: opinionGroupClustererEnum("clusterer").notNull(),
        selectionPolicy:
            opinionGroupSelectionPolicyEnum("selection_policy").notNull(),
        minClusterableParticipants: integer(
            "min_clusterable_participants",
        ).notNull(),
        minVotesPerParticipant: integer("min_votes_per_participant").notNull(),
        maxGroupCount: integer("max_group_count").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_spec_key_version_unique").on(t.key, t.version),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupVariantTable = pgTable(
    "opinion_group_variant",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        opinionGroupSpecId: integer("opinion_group_spec_id")
            .notNull()
            .references(() => opinionGroupSpecTable.id),
        groupCount: integer("group_count").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_variant_spec_count_unique").on(
            t.opinionGroupSpecId,
            t.groupCount,
        ),
        check(
            "opinion_group_variant_group_count_check",
            sql`${t.groupCount} >= 2`,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisInputSnapshotTable = pgTable(
    "analysis_input_snapshot",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        dataGeneration: integer("data_generation").notNull(),
        inputHash: varchar("input_hash", { length: 64 }).notNull(),
        opinionCount: integer("opinion_count").notNull(),
        participantCount: integer("participant_count").notNull(),
        voteCount: integer("vote_count").notNull(),
        compression: analysisCompressionEnum("compression").notNull(),
        payload: bytea("payload").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("analysis_input_snapshot_hash_unique").on(
            t.conversationId,
            t.dataGeneration,
            t.inputHash,
        ),
        index("analysis_input_snapshot_conversation_idx").on(
            t.conversationId,
            t.dataGeneration,
        ),
        check(
            "analysis_input_snapshot_counts_check",
            sql`${t.opinionCount} >= 0 AND ${t.participantCount} >= 0 AND ${t.voteCount} >= 0`,
        ),
    ],
);

/** @service api, shared-analysis-worker, import-worker */
export const analysisWorkStateTable = pgTable(
    "analysis_work_state",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        opinionGroupSpecId: integer("opinion_group_spec_id")
            .notNull()
            .references(() => opinionGroupSpecTable.id),
        lastCompletedDataGeneration: integer("last_completed_data_generation")
            .notNull()
            .default(0),
        runningDataGeneration: integer("running_data_generation"),
        persistedAnalysisSnapshotId: integer(
            "persisted_analysis_snapshot_id",
        ).references(() => analysisSnapshotTable.id),
        dirtySince: timestamp("dirty_since", {
            mode: "date",
            precision: 0,
        }),
        attemptGeneration: integer("attempt_generation"),
        attemptCount: integer("attempt_count").notNull().default(0),
        nonRetryableGeneration: integer("non_retryable_generation"),
        nonRetryableAnalysisEngineEpoch: integer(
            "non_retryable_analysis_engine_epoch",
        ),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: varchar("lease_token", { length: 100 }),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        lastErrorKind: analysisWorkErrorKindEnum("last_error_kind"),
        lastErrorCode: varchar("last_error_code", { length: 100 }),
        lastErrorMessage: text("last_error_message"),
        lastErrorStackHash: varchar("last_error_stack_hash", { length: 64 }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("analysis_work_state_conversation_spec_unique").on(
            t.conversationId,
            t.opinionGroupSpecId,
        ),
        index("analysis_work_state_lease_expiry_idx")
            .on(t.leaseExpiresAt)
            .where(isNotNull(t.runningDataGeneration)),
        uniqueIndex("analysis_work_state_running_conversation_unique")
            .on(t.conversationId)
            .where(isNotNull(t.runningDataGeneration)),
        check(
            "analysis_work_state_running_lease_check",
            sqlOr(
                sqlAnd(
                    isNull(t.runningDataGeneration),
                    isNull(t.leaseOwner),
                    isNull(t.leaseToken),
                    isNull(t.leaseExpiresAt),
                ),
                sqlAnd(
                    isNotNull(t.runningDataGeneration),
                    isNotNull(t.leaseOwner),
                    isNotNull(t.leaseToken),
                    isNotNull(t.leaseExpiresAt),
                ),
            ),
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisSnapshotTable = pgTable(
    "analysis_snapshot",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        conversationContentId: integer("conversation_content_id").references(
            () => conversationContentTable.id,
            { onDelete: "set null" },
        ),
        inputSnapshotId: integer("input_snapshot_id")
            .notNull()
            .references(() => analysisInputSnapshotTable.id),
        dataGeneration: integer("data_generation").notNull(),
        computedAt: timestamp("computed_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("analysis_snapshot_latest_idx").on(
            t.conversationId,
            t.dataGeneration,
            t.createdAt,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisSnapshotResultTable = pgTable(
    "analysis_snapshot_result",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        analysisSnapshotId: integer("analysis_snapshot_id")
            .notNull()
            .references(() => analysisSnapshotTable.id),
        opinionGroupSpecId: integer("opinion_group_spec_id")
            .notNull()
            .references(() => opinionGroupSpecTable.id),
        outcome: analysisResultOutcomeEnum("outcome").notNull(),
        outcomeReason: analysisInsufficientDataReasonEnum("outcome_reason"),
        variantsEnabled: boolean("variants_enabled").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("analysis_snapshot_result_spec_unique").on(
            t.analysisSnapshotId,
            t.opinionGroupSpecId,
        ),
        check(
            "analysis_snapshot_result_reason_check",
            sql`(${t.outcome} = 'insufficient_data' AND ${t.outcomeReason} IS NOT NULL) OR (${t.outcome} = 'success' AND ${t.outcomeReason} IS NULL)`,
        ),
    ],
);

/** @service api, shared-analysis-worker, content-translation-worker */
export const analysisSnapshotOpinionTable = pgTable(
    "analysis_snapshot_opinion",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        analysisSnapshotId: integer("analysis_snapshot_id")
            .notNull()
            .references(() => analysisSnapshotTable.id),
        opinionId: integer("opinion_id")
            .notNull()
            .references(() => opinionTable.id),
        opinionContentId: integer("opinion_content_id").references(
            () => opinionContentTable.id,
            { onDelete: "set null" },
        ),
        localOpinionIndex: integer("local_opinion_index").notNull(),
        numAgrees: integer("num_agrees").notNull().default(0),
        numDisagrees: integer("num_disagrees").notNull().default(0),
        numPasses: integer("num_passes").notNull().default(0),
        routingPriority: real("routing_priority"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("analysis_snapshot_opinion_unique").on(
            t.analysisSnapshotId,
            t.opinionId,
        ),
        unique("analysis_snapshot_opinion_local_idx_unique").on(
            t.analysisSnapshotId,
            t.localOpinionIndex,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const surveyAggregateSnapshotTable = pgTable(
    "survey_aggregate_snapshot",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        analysisSnapshotId: integer("analysis_snapshot_id")
            .notNull()
            .references(() => analysisSnapshotTable.id),
        surveyConfigId: integer("survey_config_id")
            .notNull()
            .references(() => surveyConfigTable.id),
        surveyConfigRevision: integer("survey_config_revision").notNull(),
        suppressionThreshold: integer("suppression_threshold").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("survey_aggregate_snapshot_checkpoint_unique").on(
            t.analysisSnapshotId,
        ),
        index("survey_aggregate_snapshot_conversation_idx").on(
            t.conversationId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const surveyAggregateQuestionTable = pgTable(
    "survey_aggregate_question",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyAggregateSnapshotId: integer("survey_aggregate_snapshot_id")
            .notNull()
            .references(() => surveyAggregateSnapshotTable.id),
        surveyQuestionId: integer("survey_question_id").references(
            () => surveyQuestionTable.id,
            { onDelete: "set null" },
        ),
        questionSlugId: varchar("question_slug_id", { length: 8 }).notNull(),
        questionOrder: integer("question_order").notNull(),
        questionType: surveyQuestionTypeEnum("question_type").notNull(),
        questionText: varchar("question_text", {
            length: MAX_LENGTH_SURVEY_QUESTION,
        }).notNull(),
        isRequired: boolean("is_required").notNull(),
        isPublicAggregateSuppressionEnabled: boolean(
            "is_public_aggregate_suppression_enabled",
        )
            .notNull()
            .default(false),
        questionSemanticVersion: integer("question_semantic_version").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("survey_aggregate_question_snapshot_slug_unique").on(
            t.surveyAggregateSnapshotId,
            t.questionSlugId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const surveyAggregateOptionTable = pgTable(
    "survey_aggregate_option",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyAggregateQuestionId: integer("survey_aggregate_question_id")
            .notNull()
            .references(() => surveyAggregateQuestionTable.id),
        surveyQuestionOptionId: integer("survey_question_option_id").references(
            () => surveyQuestionOptionTable.id,
            { onDelete: "set null" },
        ),
        optionSlugId: varchar("option_slug_id", { length: 8 }).notNull(),
        optionOrder: integer("option_order").notNull(),
        optionText: varchar("option_text", { length: 200 }).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("survey_aggregate_option_question_slug_unique").on(
            t.surveyAggregateQuestionId,
            t.optionSlugId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const surveyAggregateResultTable = pgTable(
    "survey_aggregate_result",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        surveyAggregateSnapshotId: integer("survey_aggregate_snapshot_id")
            .notNull()
            .references(() => surveyAggregateSnapshotTable.id),
        candidateId: integer("candidate_id").references(
            () => opinionGroupCandidateTable.id,
        ),
        groupId: integer("group_id").references(() => opinionGroupTable.id),
        scope: surveyAggregateScopeEnum("scope").notNull(),
        surveyAggregateQuestionId: integer("survey_aggregate_question_id")
            .notNull()
            .references(() => surveyAggregateQuestionTable.id),
        surveyAggregateOptionId: integer("survey_aggregate_option_id")
            .notNull()
            .references(() => surveyAggregateOptionTable.id),
        suppressedCount: integer("suppressed_count"),
        suppressedPercentage: real("suppressed_percentage"),
        fullCount: integer("full_count").notNull(),
        fullPercentage: real("full_percentage"),
        isSuppressed: boolean("is_suppressed").notNull(),
        suppressionReason:
            surveyAggregateSuppressionReasonEnum("suppression_reason"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        check(
            "survey_aggregate_result_scope_check",
            sqlOr(
                sqlAnd(
                    sql`${t.scope} = 'overall'`,
                    isNull(t.candidateId),
                    isNull(t.groupId),
                ),
                sqlAnd(
                    sql`${t.scope} = 'opinion_group'`,
                    isNotNull(t.candidateId),
                    isNotNull(t.groupId),
                ),
            ),
        ),
        check(
            "survey_aggregate_result_suppression_check",
            sqlOr(
                sqlAnd(
                    sql`${t.isSuppressed} = true`,
                    isNull(t.suppressedCount),
                    isNull(t.suppressedPercentage),
                    isNotNull(t.suppressionReason),
                ),
                sqlAnd(
                    sql`${t.isSuppressed} = false`,
                    isNotNull(t.suppressedCount),
                    isNull(t.suppressionReason),
                ),
            ),
        ),
        index("survey_aggregate_result_snapshot_idx").on(
            t.surveyAggregateSnapshotId,
        ),
        index("survey_aggregate_result_group_idx").on(t.groupId),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupLineageScopeTable = pgTable(
    "opinion_group_lineage_scope",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        opinionGroupVariantId: integer("opinion_group_variant_id")
            .notNull()
            .references(() => opinionGroupVariantTable.id),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_lineage_scope_unique").on(
            t.conversationId,
            t.opinionGroupVariantId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupDescriptionTable = pgTable(
    "opinion_group_description",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        locale: displayLanguageCodeEnum("locale").notNull(),
        label: varchar("label", { length: 100 }).notNull(),
        summary: varchar("summary", { length: 1000 }).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

/** @service api, shared-analysis-worker */
export const opinionGroupDescriptionTranslationTable = pgTable(
    "opinion_group_description_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        descriptionId: integer("description_id")
            .notNull()
            .references(() => opinionGroupDescriptionTable.id),
        locale: displayLanguageCodeEnum("locale").notNull(),
        label: varchar("label", { length: 100 }).notNull(),
        summary: varchar("summary", { length: 1000 }).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_description_translation_unique").on(
            t.descriptionId,
            t.locale,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupDescriptionTranslationWorkTable = pgTable(
    "opinion_group_description_translation_work",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        descriptionId: integer("description_id")
            .notNull()
            .references(() => opinionGroupDescriptionTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        locale: displayLanguageCodeEnum("locale").notNull(),
        attemptCount: integer("attempt_count").notNull().default(0),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: varchar("lease_token", { length: 100 }),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        lastErrorAt: timestamp("last_error_at", {
            mode: "date",
            precision: 0,
        }),
        nonRetryableAiDescriptionEpoch: integer(
            "non_retryable_ai_description_epoch",
        ),
        lastErrorCode: varchar("last_error_code", { length: 100 }),
        lastErrorMessage: text("last_error_message"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_description_translation_work_unique").on(
            t.descriptionId,
            t.locale,
        ),
        index("opinion_group_description_translation_work_lease_expiry_idx")
            .on(t.leaseExpiresAt)
            .where(isNotNull(t.leaseToken)),
        index("opinion_group_description_translation_work_claim_idx")
            .on(t.conversationId, t.updatedAt, t.id)
            .where(isNull(t.leaseToken)),
        check(
            "opinion_group_description_translation_work_running_lease_check",
            sqlOr(
                sqlAnd(
                    isNull(t.leaseOwner),
                    isNull(t.leaseToken),
                    isNull(t.leaseExpiresAt),
                ),
                sqlAnd(
                    isNotNull(t.leaseOwner),
                    isNotNull(t.leaseToken),
                    isNotNull(t.leaseExpiresAt),
                ),
            ),
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupLineageTable = pgTable("opinion_group_lineage", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    scopeId: integer("scope_id")
        .notNull()
        .references(() => opinionGroupLineageScopeTable.id),
    systemDescriptionId: integer("system_description_id").references(
        () => opinionGroupDescriptionTable.id,
    ),
    adminDescriptionId: integer("admin_description_id").references(
        () => opinionGroupDescriptionTable.id,
    ),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

/** @service api, shared-analysis-worker */
export const opinionGroupCandidateTable = pgTable(
    "opinion_group_candidate",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        snapshotResultId: integer("snapshot_result_id")
            .notNull()
            .references(() => analysisSnapshotResultTable.id),
        opinionGroupVariantId: integer("opinion_group_variant_id")
            .notNull()
            .references(() => opinionGroupVariantTable.id),
        scopeId: integer("scope_id")
            .notNull()
            .references(() => opinionGroupLineageScopeTable.id),
        outcome: analysisResultOutcomeEnum("outcome").notNull(),
        outcomeReason: analysisInsufficientDataReasonEnum("outcome_reason"),
        rawOutput: jsonb("raw_output"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_candidate_variant_unique").on(
            t.snapshotResultId,
            t.opinionGroupVariantId,
        ),
        check(
            "opinion_group_candidate_reason_check",
            sql`(${t.outcome} = 'insufficient_data' AND ${t.outcomeReason} IS NOT NULL) OR (${t.outcome} = 'success' AND ${t.outcomeReason} IS NULL)`,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupCandidateDescriptionLocaleRequestTable = pgTable(
    "opinion_group_candidate_description_locale_request",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        candidateId: integer("candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id),
        locale: displayLanguageCodeEnum("locale").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_candidate_description_locale_request_unique").on(
            t.candidateId,
            t.locale,
        ),
        index("opinion_group_candidate_description_locale_request_updated_idx").on(
            t.updatedAt,
            t.id,
        ),
        index("og_candidate_desc_locale_request_translation_updated_idx")
            .on(t.updatedAt, t.id)
            .where(sql`${t.locale} <> 'en'`),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupLineageDescriptionWorkTable = pgTable(
    "opinion_group_lineage_description_work",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        lineageId: integer("lineage_id")
            .notNull()
            .references(() => opinionGroupLineageTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        sourceCandidateId: integer("source_candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id),
        attemptCount: integer("attempt_count").notNull().default(0),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: varchar("lease_token", { length: 100 }),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        lastErrorAt: timestamp("last_error_at", {
            mode: "date",
            precision: 0,
        }),
        nonRetryableAiDescriptionEpoch: integer(
            "non_retryable_ai_description_epoch",
        ),
        lastErrorCode: varchar("last_error_code", { length: 100 }),
        lastErrorMessage: text("last_error_message"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_lineage_description_work_unique").on(t.lineageId),
        index("opinion_group_lineage_description_work_lease_expiry_idx")
            .on(t.leaseExpiresAt)
            .where(isNotNull(t.leaseToken)),
        index("opinion_group_lineage_description_work_claim_idx")
            .on(t.conversationId, t.updatedAt, t.id)
            .where(isNull(t.leaseToken)),
        check(
            "opinion_group_lineage_description_work_running_lease_check",
            sqlOr(
                sqlAnd(
                    isNull(t.leaseOwner),
                    isNull(t.leaseToken),
                    isNull(t.leaseExpiresAt),
                ),
                sqlAnd(
                    isNotNull(t.leaseOwner),
                    isNotNull(t.leaseToken),
                    isNotNull(t.leaseExpiresAt),
                ),
            ),
        ),
    ],
);

// One row per (candidate, snapshot opinion). This is where candidate-specific
// opinion metrics live; the snapshot-opinion FK pins the exact frozen opinion
// row for this analysis snapshot rather than relying on live opinion state.
/** @service api, shared-analysis-worker */
export const opinionGroupCandidateOpinionMetricsTable = pgTable(
    "opinion_group_candidate_opinion_metrics",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        candidateId: integer("candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id),
        analysisSnapshotOpinionId: integer("analysis_snapshot_opinion_id")
            .notNull()
            .references(() => analysisSnapshotOpinionTable.id),
        groupAwareConsensusAgree: real("group_aware_consensus_agree"),
        groupAwareConsensusDisagree: real("group_aware_consensus_disagree"),
        divisiveness: real("divisiveness"),
        majorityType: voteEnumSimple("majority_type"),
        majorityProbabilitySuccess: real("majority_probability_success"),
        agreementRank: integer("agreement_rank"),
        disagreementRank: integer("disagreement_rank"),
        divisivenessRank: integer("divisiveness_rank"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_candidate_opinion_metrics_unique").on(
            t.candidateId,
            t.analysisSnapshotOpinionId,
        ),
        check(
            "opinion_group_candidate_opinion_metrics_majority_check",
            sql`(${t.majorityType} IS NULL AND ${t.majorityProbabilitySuccess} IS NULL) OR (${t.majorityType} IS NOT NULL AND ${t.majorityProbabilitySuccess} IS NOT NULL)`,
        ),
        check(
            "opinion_group_candidate_opinion_metrics_rank_check",
            sql`(${t.agreementRank} IS NULL OR ${t.agreementRank} > 0) AND (${t.disagreementRank} IS NULL OR ${t.disagreementRank} > 0) AND (${t.divisivenessRank} IS NULL OR ${t.divisivenessRank} > 0)`,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupCandidateAssessmentTable = pgTable(
    "opinion_group_candidate_assessment",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        candidateId: integer("candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id)
            .unique(),
        silhouetteScore: real("silhouette_score"),
        coefficientOfVariation: real("coefficient_of_variation"),
        balanceScore: real("balance_score"),
        selectionScore: real("selection_score"),
        hiddenReason: opinionGroupCandidateHiddenReasonEnum("hidden_reason"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

/** @service api, shared-analysis-worker, import-worker, content-translation-worker */
export const conversationViewSnapshotTable = pgTable(
    "conversation_view_snapshot",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        opinionGroupSpecId: integer("opinion_group_spec_id")
            .notNull()
            .references(() => opinionGroupSpecTable.id),
        analysisSnapshotId: integer("analysis_snapshot_id").references(
            () => analysisSnapshotTable.id,
        ),
        surveyAggregateSnapshotId: integer(
            "survey_aggregate_snapshot_id",
        ).references(() => surveyAggregateSnapshotTable.id),
        conversationContentId: integer("conversation_content_id").references(
            () => conversationContentTable.id,
            { onDelete: "set null" },
        ),
        viewReason: conversationViewSnapshotReasonEnum("view_reason").notNull(),
        preferredOpinionGroupCount: integer("preferred_opinion_group_count"),
        isClosed: boolean("is_closed").notNull(),
        opinionCount: integer("opinion_count").notNull(),
        voteCount: integer("vote_count").notNull(),
        participantCount: integer("participant_count").notNull(),
        totalOpinionCount: integer("total_opinion_count").notNull(),
        totalVoteCount: integer("total_vote_count").notNull(),
        totalParticipantCount: integer("total_participant_count").notNull(),
        moderatedOpinionCount: integer("moderated_opinion_count").notNull(),
        hiddenOpinionCount: integer("hidden_opinion_count").notNull(),
        activatedAt: timestamp("activated_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_view_snapshot_latest_idx").using(
            "btree",
            t.conversationId,
            sql`${t.createdAt} DESC`,
            sql`${t.id} DESC`,
        ),
        index("conversation_view_snapshot_latest_active_idx")
            .using(
                "btree",
                t.conversationId,
                sql`${t.createdAt} DESC`,
                sql`${t.id} DESC`,
            )
            .where(isNotNull(t.activatedAt)),
        index("conversation_view_snapshot_latest_spec_active_idx")
            .using(
                "btree",
                t.conversationId,
                t.opinionGroupSpecId,
                sql`${t.createdAt} DESC`,
                sql`${t.id} DESC`,
            )
            .where(isNotNull(t.activatedAt)),
        index("conversation_view_snapshot_analysis_snapshot_idx")
            .on(t.analysisSnapshotId)
            .where(isNotNull(t.analysisSnapshotId)),
        check(
            "conversation_view_snapshot_counts_check",
            sql`${t.opinionCount} >= 0 AND ${t.voteCount} >= 0 AND ${t.participantCount} >= 0 AND ${t.totalOpinionCount} >= 0 AND ${t.totalVoteCount} >= 0 AND ${t.totalParticipantCount} >= 0 AND ${t.moderatedOpinionCount} >= 0 AND ${t.hiddenOpinionCount} >= 0`,
        ),
        check(
            "conversation_view_snapshot_preferred_opinion_group_count_check",
            sql`${t.preferredOpinionGroupCount} IS NULL OR (${t.preferredOpinionGroupCount} >= 2 AND ${t.preferredOpinionGroupCount} <= 6)`,
        ),
    ],
);

/** @service api, shared-analysis-worker, content-translation-worker */
export const realtimeEventOutboxTable = pgTable(
    "realtime_event_outbox",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        eventType: varchar("event_type", { length: 100 }).notNull(),
        payload: jsonb("payload").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("realtime_event_outbox_created_at_idx").on(t.createdAt),
        index("realtime_event_outbox_conversation_replay_idx")
            .using("btree", sql`(${t.payload}->>'conversationSlugId')`, t.id)
            .where(
                sql`${t.eventType} IN ('conversation_analysis_updated', 'conversation_settings_updated')`,
            ),
    ],
);

/** @service api, content-translation-worker */
export const realtimeEventOutboxTopicTable = pgTable(
    "realtime_event_outbox_topic",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        eventId: integer("event_id")
            .notNull()
            .references(() => realtimeEventOutboxTable.id),
        topic: varchar("topic", { length: 255 }).notNull(),
    },
    (table) => [
        unique("realtime_event_outbox_topic_unique").on(
            table.eventId,
            table.topic,
        ),
        index("realtime_event_outbox_topic_replay_idx").on(
            table.topic,
            table.eventId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const conversationViewSnapshotCheckpointReasonTable = pgTable(
    "conversation_view_snapshot_checkpoint_reason",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationViewSnapshotId: integer("conversation_view_snapshot_id")
            .notNull()
            .references(() => conversationViewSnapshotTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        opinionGroupSpecId: integer("opinion_group_spec_id")
            .notNull()
            .references(() => opinionGroupSpecTable.id),
        reason: conversationViewSnapshotCheckpointReasonEnum(
            "reason",
        ).notNull(),
        groupCount: integer("group_count"),
        previousGroupCount: integer("previous_group_count"),
        participantCount: integer("participant_count"),
        participantMilestone: integer("participant_milestone"),
        voteCount: integer("vote_count"),
        voteMilestone: integer("vote_milestone"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_view_snapshot_checkpoint_reason_snapshot_idx").on(
            t.conversationViewSnapshotId,
        ),
        uniqueIndex(
            "conversation_view_snapshot_checkpoint_first_displayable_unique",
        )
            .on(t.conversationId, t.opinionGroupSpecId)
            .where(sql`${t.reason} = 'first_displayable_analysis'`),
        uniqueIndex("conversation_view_snapshot_checkpoint_group_count_unique")
            .on(t.conversationId, t.opinionGroupSpecId, t.groupCount)
            .where(sql`${t.reason} = 'first_group_count_available'`),
        uniqueIndex(
            "conversation_view_snapshot_checkpoint_default_change_unique",
        )
            .on(t.conversationViewSnapshotId)
            .where(sql`${t.reason} = 'default_group_count_changed'`),
        uniqueIndex("conversation_view_snapshot_checkpoint_participant_unique")
            .on(t.conversationId, t.opinionGroupSpecId, t.participantMilestone)
            .where(sql`${t.reason} = 'major_participation_milestone'`),
        uniqueIndex("conversation_view_snapshot_checkpoint_vote_unique")
            .on(t.conversationId, t.opinionGroupSpecId, t.voteMilestone)
            .where(sql`${t.reason} = 'major_vote_milestone'`),
        uniqueIndex("conversation_view_snapshot_checkpoint_closed_unique")
            .on(t.conversationViewSnapshotId)
            .where(sql`${t.reason} = 'conversation_closed'`),
        check(
            "conversation_view_snapshot_checkpoint_reason_group_count_check",
            sql`((${t.reason} IN ('first_group_count_available', 'default_group_count_changed') AND ${t.groupCount} IS NOT NULL AND ${t.groupCount} >= 2 AND (${t.previousGroupCount} IS NULL OR ${t.previousGroupCount} >= 2)) OR (${t.reason} NOT IN ('first_group_count_available', 'default_group_count_changed') AND ${t.groupCount} IS NULL AND ${t.previousGroupCount} IS NULL))`,
        ),
        check(
            "conversation_view_snapshot_checkpoint_reason_milestone_check",
            sql`((${t.reason} = 'major_participation_milestone' AND ${t.previousGroupCount} IS NULL AND ${t.participantCount} IS NOT NULL AND ${t.participantMilestone} IS NOT NULL AND ${t.voteCount} IS NULL AND ${t.voteMilestone} IS NULL AND ${t.participantCount} >= ${t.participantMilestone} AND ${t.participantMilestone} > 0) OR (${t.reason} = 'major_vote_milestone' AND ${t.previousGroupCount} IS NULL AND ${t.participantCount} IS NULL AND ${t.participantMilestone} IS NULL AND ${t.voteCount} IS NOT NULL AND ${t.voteMilestone} IS NOT NULL AND ${t.voteCount} >= ${t.voteMilestone} AND ${t.voteMilestone} > 0) OR (${t.reason} NOT IN ('major_participation_milestone', 'major_vote_milestone') AND ${t.participantCount} IS NULL AND ${t.participantMilestone} IS NULL AND ${t.voteCount} IS NULL AND ${t.voteMilestone} IS NULL))`,
        ),
        check(
            "conversation_view_snapshot_checkpoint_reason_previous_check",
            sql`((${t.reason} = 'default_group_count_changed' AND ${t.previousGroupCount} IS NOT NULL AND ${t.previousGroupCount} <> ${t.groupCount} AND ${t.participantCount} IS NULL AND ${t.participantMilestone} IS NULL AND ${t.voteCount} IS NULL AND ${t.voteMilestone} IS NULL) OR (${t.reason} <> 'default_group_count_changed' AND ${t.previousGroupCount} IS NULL))`,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupTable = pgTable(
    "opinion_group",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        candidateId: integer("candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id),
        scopeId: integer("scope_id")
            .notNull()
            .references(() => opinionGroupLineageScopeTable.id),
        lineageId: integer("lineage_id").references(
            () => opinionGroupLineageTable.id,
        ),
        key: varchar("key", { length: 20 }).notNull(),
        externalId: integer("external_id").notNull(),
        numUsers: integer("num_users").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_candidate_key_unique").on(t.candidateId, t.key),
        unique("opinion_group_candidate_lineage_unique").on(
            t.candidateId,
            t.lineageId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const opinionGroupUserTable = pgTable(
    "opinion_group_user",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        candidateId: integer("candidate_id")
            .notNull()
            .references(() => opinionGroupCandidateTable.id),
        groupId: integer("group_id")
            .notNull()
            .references(() => opinionGroupTable.id),
        userId: uuid("user_id")
            .notNull()
            .references(() => userTable.id),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_user_candidate_unique").on(
            t.candidateId,
            t.userId,
        ),
        unique("opinion_group_user_group_unique").on(t.groupId, t.userId),
    ],
);

// One row per (group, snapshot opinion). This stores group-local tallies for
// every opinion in the snapshot. The representative* columns are only populated
// when that opinion is a representative opinion for the group.
/** @service api, shared-analysis-worker */
export const opinionGroupOpinionStatsTable = pgTable(
    "opinion_group_opinion_stats",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        groupId: integer("group_id")
            .notNull()
            .references(() => opinionGroupTable.id),
        analysisSnapshotOpinionId: integer("analysis_snapshot_opinion_id")
            .notNull()
            .references(() => analysisSnapshotOpinionTable.id),
        numAgrees: integer("num_agrees").notNull().default(0),
        numDisagrees: integer("num_disagrees").notNull().default(0),
        numPasses: integer("num_passes").notNull().default(0),
        representativeAgreementType: voteEnumSimple(
            "representative_agreement_type",
        ),
        representativeProbabilityAgreement: real(
            "representative_probability_agreement",
        ),
        representativeNumAgreement: integer("representative_number_agreement"),
        rawRepness: jsonb("raw_repness"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique("opinion_group_opinion_stats_unique").on(
            t.groupId,
            t.analysisSnapshotOpinionId,
        ),
        index("opinion_group_opinion_stats_representative_idx")
            .on(
                t.groupId,
                t.representativeProbabilityAgreement.desc(),
                t.analysisSnapshotOpinionId,
            )
            .where(
                sqlAnd(
                    isNotNull(t.representativeAgreementType),
                    isNotNull(t.representativeProbabilityAgreement),
                ),
            ),
        check(
            "opinion_group_opinion_stats_counts_check",
            sql`${t.numAgrees} >= 0 AND ${t.numDisagrees} >= 0 AND ${t.numPasses} >= 0`,
        ),
        check(
            "opinion_group_opinion_stats_representative_check",
            sql`((${t.representativeAgreementType} IS NULL AND ${t.representativeProbabilityAgreement} IS NULL AND ${t.representativeNumAgreement} IS NULL AND ${t.rawRepness} IS NULL) OR (${t.representativeAgreementType} IS NOT NULL AND ${t.representativeProbabilityAgreement} IS NOT NULL AND ${t.representativeNumAgreement} IS NOT NULL AND ${t.rawRepness} IS NOT NULL))`,
        ),
    ],
);

export const conversationExportGenerationTable = pgTable(
    "conversation_export_generation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        status: exportGenerationStatusEnum("status")
            .notNull()
            .default("collecting"),
        collectingEndsAt: timestamp("collecting_ends_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        attempts: integer("attempts").notNull().default(0),
        nextAttemptAt: timestamp("next_attempt_at", {
            mode: "date",
            precision: 0,
        }),
        startedAt: timestamp("started_at", { mode: "date", precision: 0 }),
        heartbeatAt: timestamp("heartbeat_at", { mode: "date", precision: 0 }),
        completedAt: timestamp("completed_at", {
            mode: "date",
            precision: 0,
        }),
        failedAt: timestamp("failed_at", { mode: "date", precision: 0 }),
        failureReason: exportFailureReasonEnum("failure_reason"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_export_generation_conversation_idx").on(
            t.conversationId,
        ),
        index("conversation_export_generation_collecting_due_idx")
            .on(t.collectingEndsAt, t.createdAt)
            .where(sql`${t.status} = 'collecting'`),
        index("conversation_export_generation_queued_due_idx")
            .on(t.nextAttemptAt, t.createdAt)
            .where(sql`${t.status} = 'queued'`),
        uniqueIndex("conversation_export_generation_collecting_unique")
            .on(t.conversationId)
            .where(sql`${t.status} = 'collecting'`),
        uniqueIndex("conversation_export_generation_processing_unique")
            .on(t.conversationId)
            .where(sql`${t.status} = 'processing'`),
    ],
);

export const conversationExportRequestTable = pgTable(
    "conversation_export_request",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        generationId: integer("generation_id")
            .references(() => conversationExportGenerationTable.id)
            .notNull(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        status: exportStatusEnum("status").notNull().default("processing"),
        failureReason: exportFailureReasonEnum("failure_reason"),
        cancellationReason: exportCancellationReasonEnum("cancellation_reason"),
        expiresAt: timestamp("expires_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
        startedNotifiedAt: timestamp("started_notified_at", {
            mode: "date",
            precision: 0,
        }),
        completedNotifiedAt: timestamp("completed_notified_at", {
            mode: "date",
            precision: 0,
        }),
        failedNotifiedAt: timestamp("failed_notified_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_export_request_conversation_idx").on(
            t.conversationId,
        ),
        index("conversation_export_request_generation_idx").on(t.generationId),
        index("conversation_export_request_active_history_idx")
            .on(t.conversationId, t.userId, t.createdAt)
            .where(sql`${t.deletedAt} IS NULL`),
        index("conversation_export_request_expiry_idx")
            .on(t.expiresAt)
            .where(sql`${t.deletedAt} IS NULL`),
        uniqueIndex("conversation_export_request_active_unique")
            .on(t.conversationId, t.userId)
            .where(sql`${t.status} = 'processing' AND ${t.deletedAt} IS NULL`),
    ],
);

export const conversationExportArtifactTable = pgTable(
    "conversation_export_artifact",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        generationId: integer("generation_id")
            .references(() => conversationExportGenerationTable.id)
            .notNull(),
        fileType: exportFileTypeEnum("file_type").notNull(),
        audience: exportFileAudienceEnum("audience").notNull(),
        subjectUserId: uuid("subject_user_id").references(() => userTable.id),
        status: exportArtifactStatusEnum("status").notNull().default("queued"),
        fileName: varchar("file_name", { length: 160 }).notNull(),
        fileSize: integer("file_size"),
        recordCount: integer("record_count"),
        s3Key: text("s3_key"),
        failureReason: exportFailureReasonEnum("failure_reason"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_export_artifact_generation_idx").on(t.generationId),
        uniqueIndex("conversation_export_artifact_shared_unique")
            .on(t.generationId, t.fileType, t.audience)
            .where(sql`${t.subjectUserId} IS NULL`),
        uniqueIndex("conversation_export_artifact_requester_unique")
            .on(t.generationId, t.fileType, t.audience, t.subjectUserId)
            .where(sql`${t.subjectUserId} IS NOT NULL`),
    ],
);

export const conversationExportRequestFileTable = pgTable(
    "conversation_export_request_file",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        requestId: integer("request_id")
            .references(() => conversationExportRequestTable.id)
            .notNull(),
        artifactId: integer("artifact_id")
            .references(() => conversationExportArtifactTable.id)
            .notNull(),
        fileType: exportFileTypeEnum("file_type").notNull(),
        audience: exportFileAudienceEnum("audience").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_export_request_file_artifact_idx").on(t.artifactId),
        uniqueIndex("conversation_export_request_file_unique").on(
            t.requestId,
            t.fileType,
            t.audience,
        ),
    ],
);

// Conversation imports table for CSV import feature (simplified - no files, no cooldown)
/** @service import-worker */
export const conversationImportTable = pgTable(
    "conversation_import",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .unique(), // null until import completes successfully; unique constraint allows multiple NULLs
        userId: uuid("user_id") // User who requested the import
            .references(() => userTable.id)
            .notNull(),
        status: importStatusEnum("status").notNull().default("processing"),
        failureReason: importFailureReasonEnum("failure_reason"), // populated if status="failed"
        csvFileMetadata: jsonb("csv_file_metadata"), // Optional metadata (file sizes, row counts for transparency)
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_import_status_idx").on(t.status),
        index("conversation_import_created_idx").on(t.createdAt),
        index("conversation_import_user_idx").on(t.userId),
        uniqueIndex("conversation_import_active_user_unique")
            .on(t.userId)
            .where(sql`${t.status} = 'processing'`),
    ],
);

// MaxDiff (Best-Worst Scaling) results per user per conversation.
// Stores both the final ranking and the individual comparisons made,
// so the adaptive MaxDiff session can be resumed from saved state.
/** @service scoring-worker, api, shared-analysis-worker */
export const maxdiffResultTable = pgTable(
    "maxdiff_result",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        participantId: uuid("participant_id")
            .notNull()
            .references(() => userTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        // Final ordered ranking as JSON array of opinionSlugIds (best→worst).
        // Null while the session is in progress.
        ranking: jsonb("ranking"), // string[] | null
        // Individual comparisons made during the MaxDiff session.
        // Each entry: { best: slugId, worst: slugId, set: slugId[] }
        comparisons: jsonb("comparisons").notNull(), // MaxDiffComparison[]
        isComplete: boolean("is_complete").notNull().default(false),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        unique().on(t.participantId, t.conversationId),
        // Composite for aggregated results query: filters conversationId + isComplete
        index("maxdiff_result_complete_idx").on(t.conversationId, t.isComplete),
        // For JSONB aggregate query in computeGlobalUncertainty (routing)
        index("maxdiff_result_conversation_idx").on(t.conversationId),
    ],
);

// Computed Solidago scores for MaxDiff conversations.
// Multiple rows per conversation are kept over time,
// ranking_conversation_config.currentRankingScoreId points to the latest.
// Populated by the scoring worker's Valkey-driven queue loop.
/** @service scoring-worker, api */
export const rankingScoreTable = pgTable("ranking_score", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
        .notNull()
        .references(() => conversationTable.id),
    // --- Output: ranking scores (JSONB backup blob) ---
    // Array of { entityId, score, uncertaintyLeft, uncertaintyRight }.
    // Scores are stored in raw model units; API/UI may derive normalized display scores.
    // Kept as backup; canonical data is in ranking_score_entity table.
    scores: jsonb("scores").notNull(),
    // Record<entityId, participantCount> for display (JSONB backup blob)
    // Kept as backup; canonical data is in ranking_score_entity.participant_count.
    participantCounts: jsonb("participant_counts").notNull(),
    // --- Input context: what parameters produced these scores ---
    // Snapshot of group sources used for COCM voting rights (if any).
    // Null if no group weighting was applied.
    groupSourcesSnapshot: jsonb("group_sources_snapshot"),
    // Snapshot of user trust weights used (if any).
    // Null if all users had equal trust.
    userWeightsSnapshot: jsonb("user_weights_snapshot"),
    // Pipeline config: typed columns replace the old JSONB blob.
    // The old pipelineConfig JSONB is kept for backward compat during migration.
    pipelineConfig: jsonb("pipeline_config").notNull(),
    preferenceLearning: varchar("preference_learning", { length: 100 }),
    votingRights: varchar("voting_rights", { length: 100 }),
    aggregationConfig: varchar("aggregation_config", { length: 200 }),
    // --- Metadata ---
    computedAt: timestamp("computed_at", {
        mode: "date",
        precision: 0,
    }).notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// Canonical raw entity-level scores for one ranking_score computation.
// The JSONB `scores` column on ranking_score is kept as a backup blob.
// API/UI may derive normalized display scores from these raw values.
/** @service scoring-worker, api */
export const rankingScoreEntityTable = pgTable(
    "ranking_score_entity",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingScoreId: integer("ranking_score_id")
            .notNull()
            .references(() => rankingScoreTable.id),
        entitySlugId: varchar("entity_slug_id", { length: 8 }).notNull(),
        score: real("score").notNull(),
        uncertaintyLeft: real("uncertainty_left").notNull(),
        uncertaintyRight: real("uncertainty_right").notNull(),
        participantCount: integer("participant_count").notNull().default(0),
    },
    (t) => [
        index("ranking_score_entity_slug_idx").on(
            t.rankingScoreId,
            t.entitySlugId,
        ),
    ],
);

// Normalized comparisons from maxdiff_result.comparisons JSONB.
// Each row represents one BWS comparison made by a user.
// The JSONB `comparisons` column on maxdiff_result is kept as a backup blob.
/** @service scoring-worker, api */
export const maxdiffComparisonTable = pgTable(
    "maxdiff_comparison",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        maxdiffResultId: integer("maxdiff_result_id")
            .notNull()
            .references(() => maxdiffResultTable.id),
        position: integer("position").notNull(), // 0-based order within the session
        bestSlugId: varchar("best_slug_id", { length: 8 }).notNull(),
        worstSlugId: varchar("worst_slug_id", { length: 8 }).notNull(),
        candidateSet: text("candidate_set").array().notNull(), // slugIds of all items shown in this comparison
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        index("maxdiff_comparison_result_idx").on(t.maxdiffResultId),
        // Only one active comparison can exist per session position.
        // Soft-deleted historical rows remain allowed for audit/history.
        uniqueIndex("maxdiff_comparison_active_result_position_unique")
            .on(t.maxdiffResultId, t.position)
            .where(sql`${t.deletedAt} IS NULL`),
    ],
);

// Per-user Solidago scores, written by the scoring worker alongside global scores.
// One set of scores per user per conversation, upserted each scoring run.
/** @service scoring-worker, api */
export const maxdiffUserEntityScoreTable = pgTable(
    "maxdiff_user_entity_score",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        maxdiffResultId: integer("maxdiff_result_id")
            .notNull()
            .references(() => maxdiffResultTable.id),
        entitySlugId: varchar("entity_slug_id", { length: 8 }).notNull(),
        score: real("score").notNull(),
        uncertaintyLeft: real("uncertainty_left").notNull(),
        uncertaintyRight: real("uncertainty_right").notNull(),
    },
    (t) => [
        unique().on(t.maxdiffResultId, t.entitySlugId),
        index("maxdiff_user_entity_score_result_score_idx").using(
            "btree",
            t.maxdiffResultId,
            sql`${t.score} DESC`,
        ),
    ],
);
