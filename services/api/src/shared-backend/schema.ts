/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
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
    bigint,
    serial,
    foreignKey,
    primaryKey,
    type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import {
    and,
    or,
    eq,
    ne,
    lte,
    desc,
    gt,
    gte,
    inArray,
    arrayContains,
    notInArray,
    isNotNull,
    isNull,
    type SQL,
} from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import {
    MAX_GATHERING_FIELDS,
    MAX_GATHERING_TEXT_LENGTH,
} from "@/shared/gatheringLimits.js";
import {
    participationModeSettingsSourceValues,
    participationModeValues,
} from "@/shared/participationMode.js";
import {
    ZodSupportedDisplayLanguageCodes,
    ZodSupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { projectOrganizationAttributionRoleValues } from "@/shared/types/project.js";
import { organizationRoleValues } from "@/shared/organizationAccess.js";
import {
    QV_CREDIT_BUDGET,
    QV_RULE_VERSION,
    QV_ALGORITHM_VERSION,
} from "@/shared/utils/qv.js";
import {
    MAX_PROJECT_DOCUMENT_FILE_SIZE,
    PROJECT_DOCUMENT_CONTENT_TYPES,
} from "@/shared/projectDocument.js";
import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import {
    MAX_LENGTH_TITLE,
    MAX_LENGTH_CONVERSATION_TITLE,
    MAX_LENGTH_BODY,
    MAX_BYTES_RICH_TEXT_HTML,
    MAX_LENGTH_SURVEY_QUESTION,
    MAX_LENGTH_SURVEY_OPTION,
    MAX_BYTES_SURVEY_OPTION_TEXT,
    MAX_BYTES_SURVEY_OPTION_HTML,
    MAX_LENGTH_NAME_CREATOR,
    MAX_LENGTH_DESCRIPTION_CREATOR,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_USER_REPORT_EXPLANATION,
    MAX_BYTES_CONVERSATION_EMAIL_UPDATE_HTML,
    MAX_LENGTH_CONVERSATION_EMAIL_UPDATE,
} from "@/shared/shared.js";

const MAX_LENGTH_CONVERSATION_EMAIL_UPDATE_SUBJECT = 140;

// Drizzle's variadic and()/or() return SQL | undefined because zero arguments are allowed.
// DDL cannot bind parameters. Inline schema-owned literals while requiring two
// conditions to narrow Drizzle's optional return type without an assertion.
function sqlAnd(first: SQL, second: SQL, ...rest: SQL[]): SQL {
    return sql`${and(first, second, ...rest)}`.inlineParams();
}

function sqlOr(first: SQL, second: SQL, ...rest: SQL[]): SQL {
    return sql`${or(first, second, ...rest)}`.inlineParams();
}

function hasNonBlankText(column: AnyPgColumn): SQL {
    // Match ECMAScript trim(), including Unicode spaces. A SQL literal keeps schema DDL free of bound parameters.
    return sqlAnd(
        isNotNull(column),
        sql`${column} ~ U&'[^\\0009-\\000d \\00a0\\1680\\2000-\\200a\\2028\\2029\\202f\\205f\\3000\\feff]'`,
    );
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

// Storage-only legacy enums: retired ticket records are retained, never used for access.
export const ticketProviderEnum = pgEnum("ticket_provider", ["zupass"]);

export const eventSlugEnum = pgEnum("event_slug", ["devconnect-2025"]);

export const importMethodType = pgEnum("import_method", ["url", "csv"]);

export const participationModeEnum = pgEnum(
    "participation_mode",
    participationModeValues,
);

export const conversationTypeEnum = pgEnum("conversation_type", [
    "gathering",
    "polis",
    "prioritizing",
]);
export const polisVotingPresentationEnum = pgEnum("polis_voting_presentation", [
    "list",
    "one_at_a_time",
]);
export const rankingModeEnum = pgEnum("ranking_mode", ["bws", "pairwise"]);
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
export const projectDocumentAudienceEnum = pgEnum("project_document_audience", [
    "participant",
    "owner",
]);
export const projectDocumentFileStatusEnum = pgEnum(
    "project_document_file_status",
    ["pending", "available"],
);
export const projectDocumentEncodingEnum = pgEnum("project_document_encoding", [
    "gzip",
    "br",
]);
export const projectDocumentRepresentationStatusEnum = pgEnum(
    "project_document_representation_status",
    ["pending", "available", "failed"],
);
export const projectDocumentContentTypeEnum = pgEnum(
    "project_document_content_type",
    PROJECT_DOCUMENT_CONTENT_TYPES,
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
    "conversation_email_update",
]);
export const contentTranslationSourceKindEnum = pgEnum(
    "content_translation_source_kind",
    [
        "conversation",
        "opinion",
        "survey_question",
        "project",
        "ranking_item",
        "gathering_field",
        "gathering_response",
    ],
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

export { projectCapabilityValues } from "@/shared/organizationAccess.js";

export const organizationRoleEnum = pgEnum(
    "organization_role",
    organizationRoleValues,
);

// Historical grant rows retain their enum labels. Only projectCapabilityValues
// are supported by application authorization and new grants.
export const organizationMembershipAllProjectCapabilityEnum = pgEnum(
    "organization_membership_all_project_capability_enum",
    [
        "project_update",
        "project_delete",
        "project_manage_owner_organizations",
        "conversation_create",
        "conversation_edit",
        "conversation_delete",
        "conversation_view_private_results",
        "conversation_export_owner_data",
        "conversation_moderate",
        "conversation_manage_integrations",
        "conversation_email_update",
    ],
);

export const conversationEmailUpdatePreferenceSourceEnum = pgEnum(
    "conversation_email_update_preference_source",
    ["onboarding", "menu", "settings", "unsubscribe", "support"],
);

export const conversationEmailUpdateEmailSuppressionReasonEnum = pgEnum(
    "conversation_email_update_email_suppression_reason",
    ["permanent_bounce", "complaint"],
);

export const conversationEmailUpdateSafetyTargetKindEnum = pgEnum(
    "conversation_email_update_safety_target_kind",
    ["organization", "project", "conversation", "facilitator"],
);

export const conversationEmailUpdateSafetyReasonEnum = pgEnum(
    "conversation_email_update_safety_reason",
    ["legal", "abuse"],
);

export const conversationEmailUpdateScopeKindEnum = pgEnum(
    "conversation_email_update_scope_kind",
    ["listed_project", "no_project"],
);

export const conversationEmailUpdateParticipantPreferenceScopeEnum = pgEnum(
    "conversation_email_update_participant_preference_scope",
    ["project", "conversation"],
);

export const conversationEmailUpdateTestAttemptStatusEnum = pgEnum(
    "conversation_email_update_test_attempt_status",
    [
        "pending",
        "claimed",
        "attempting",
        "provider_accepted",
        "retryable_rejected",
        "permanent_rejected",
        "unknown",
    ],
);

export const conversationEmailUpdateErrorCategoryEnum = pgEnum(
    "conversation_email_update_error_category",
    ["retryable", "permanent", "ambiguous"],
);

export const conversationEmailUpdateDeliveryStatusEnum = pgEnum(
    "conversation_email_update_delivery_status",
    [
        "preparing",
        "queued",
        "sending",
        "stopping",
        "stopped",
        "completed",
        "completed_with_failures",
        "failed",
    ],
);

export const conversationEmailUpdateFailureReasonEnum = pgEnum(
    "conversation_email_update_failure_reason",
    [
        "materialization_failed",
        "no_eligible_participants",
        "required_owner_copy_not_accepted",
        "no_participant_provider_accepted",
    ],
);

export const conversationEmailUpdateStopReasonEnum = pgEnum(
    "conversation_email_update_stop_reason",
    ["global_kill_switch", "legal_or_abuse_block"],
);

export const conversationEmailUpdateRecipientKindEnum = pgEnum(
    "conversation_email_update_recipient_kind",
    ["participant", "conversation_owner_copy"],
);

export const conversationEmailUpdateRecipientStatusEnum = pgEnum(
    "conversation_email_update_recipient_status",
    [
        "pending",
        "claimed",
        "attempting",
        "retry_wait",
        "provider_accepted",
        "skipped",
        "permanent_failed",
        "unknown",
    ],
);

export const conversationEmailUpdateSkipReasonEnum = pgEnum(
    "conversation_email_update_skip_reason",
    [
        "global_pause",
        "project_preference_disabled",
        "conversation_preference_disabled",
        "frequency_capped",
        "account_ineligible",
        "email_credential_changed",
        "user_complaint_suppressed",
        "email_suppressed",
        "scope_safety_blocked",
        "delivery_stopped",
    ],
);

export const conversationEmailUpdateDeliveryAttemptOutcomeEnum = pgEnum(
    "conversation_email_update_delivery_attempt_outcome",
    [
        "send_authorized",
        "provider_accepted",
        "retryable_rejected",
        "permanent_rejected",
        "unknown",
    ],
);

export const conversationEmailUpdateSnsEventInboxStatusEnum = pgEnum(
    "conversation_email_update_sns_event_inbox_status",
    ["pending", "processing", "retry_wait", "completed", "dead_letter"],
);

export const conversationEmailUpdateActionEnum = pgEnum(
    "conversation_email_update_action",
    [
        "unsubscribe_project",
        "unsubscribe_conversation",
        "manage_preferences",
        "report",
    ],
);

export const conversationEmailUpdateReportReasonEnum = pgEnum(
    "conversation_email_update_report_reason",
    ["spam", "abuse", "unrelated_content", "other"],
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

export const rankingStatsCheckpointReasonEnum = pgEnum(
    "ranking_stats_checkpoint_reason_enum",
    [
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
/** @service scoring-worker, shared-analysis-worker, import-worker, content-translation-worker, credit-voting-worker */
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
        contributionRevision: integer("contribution_revision")
            .notNull()
            .default(0),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
        // Legacy deletions remain unclassified; they must not gain recovery eligibility.
        deletionReason: text("deletion_reason", {
            enum: ["account_deletion", "guest_merge"],
        }),
        deletionRequestedAt: timestamp("deletion_requested_at", {
            mode: "date",
            precision: 3,
        }),
        recoverableUntil: timestamp("recoverable_until", {
            mode: "date",
            precision: 3,
        }),
        purgeStartedAt: timestamp("purge_started_at", {
            mode: "date",
            precision: 3,
        }),
        authRestrictedAt: timestamp("auth_restricted_at", {
            mode: "date",
            precision: 0,
        }),
        authRestrictionReason: text("auth_restriction_reason"),
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
    (table) => [
        check(
            "user_contribution_revision_check",
            gte(table.contributionRevision, 0).inlineParams(),
        ),
        check(
            "user_recovery_lifecycle_check",
            sqlAnd(
                sqlOr(
                    sqlAnd(
                        isNull(table.deletionRequestedAt),
                        isNull(table.recoverableUntil),
                    ),
                    sqlAnd(
                        eq(table.isDeleted, true),
                        isNotNull(table.deletionReason),
                        eq(table.deletionReason, "account_deletion"),
                        isNotNull(table.deletionRequestedAt),
                        isNotNull(table.recoverableUntil),
                        // PostgreSQL enforces the exact interval on stored DB timestamps.
                        eq(
                            table.recoverableUntil,
                            sql`${table.deletionRequestedAt} + interval '15 days'`,
                        ),
                    ),
                ),
                sqlOr(isNull(table.purgeStartedAt), eq(table.isDeleted, true)),
            ),
        ),
        check(
            "user_auth_restriction_reason_check",
            sql`(${table.authRestrictedAt} IS NULL) = (${table.authRestrictionReason} IS NULL)`,
        ),
        check(
            "user_deletion_reason_check",
            sqlOr(
                isNull(table.deletionReason),
                sqlAnd(
                    eq(table.isDeleted, true),
                    isNotNull(table.deletedAt),
                    inArray(table.deletionReason, [
                        "account_deletion",
                        "guest_merge",
                    ]),
                ),
            ),
        ),
    ],
);

/** @service import-worker */
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
        role: organizationRoleEnum("role").notNull(),
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
        index("organization_membership_active_admin_idx")
            .on(t.organizationId, t.userId)
            .where(sqlAnd(isNull(t.deletedAt), eq(t.role, "admin"))),
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
    (t) => [
        unique("conversation_topic_unique").on(t.conversationId, t.topicId),
    ],
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
export const userDisplayLanguageTable = pgTable("user_display_language", {
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
});

/** @service import-worker */
export const organizationTable = pgTable(
    "organization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slug: varchar("slug", { length: MAX_LENGTH_NAME_CREATOR }).notNull(),
        displayName: varchar("display_name", {
            length: MAX_LENGTH_NAME_CREATOR,
        }).notNull(),
        defaultLanguageCode: displayLanguageCodeEnum(
            "default_language_code",
        ).notNull(),
        // Controls organization-facing exposure, such as directories and "post as organization" pickers.
        // Auto-provisioned personal backing orgs start unlisted; promoting one to a real org lists it.
        directoryVisibility: directoryVisibilityEnum(
            "directory_visibility",
        ).notNull(),
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
        retiredForAccountDeletionAt: timestamp(
            "retired_for_account_deletion_at",
            {
                mode: "date",
                precision: 3,
            },
        ),
    },
    (table) => [
        uniqueIndex("organization_active_slug_unique")
            .on(table.slug)
            .where(sql`${table.deletedAt} IS NULL`),
        check(
            "organization_account_retirement_check",
            sqlOr(
                isNull(table.retiredForAccountDeletionAt),
                sqlAnd(
                    isNotNull(table.autoProvisionedForUserId),
                    isNotNull(table.deletedAt),
                    // Match legacy second-precision deletion timestamps without
                    // losing the account deletion cycle's millisecond identity.
                    eq(
                        table.deletedAt,
                        sql`${table.retiredForAccountDeletionAt}::timestamp(0)`,
                    ),
                ),
            ),
        ),
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

/** @service scoring-worker, api, math-updater, import-worker, content-translation-worker, credit-voting-worker */
export const projectTable = pgTable(
    "project",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slug: varchar("slug", { length: MAX_LENGTH_NAME_CREATOR }).notNull(),
        title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
        directoryVisibility: directoryVisibilityEnum(
            "directory_visibility",
        ).notNull(),
        autoProvisionedForOrganizationId: integer(
            "auto_provisioned_for_organization_id",
        ).references(() => organizationTable.id),
        // Project creation inserts the project before its content row because project_content references project.
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => projectContentTable.id)
            .unique(),
        dynamicTranslationEnabled: boolean("dynamic_translation_enabled")
            .notNull()
            .default(false),
        conversationEmailUpdateDefaultEnabled: boolean(
            "conversation_email_update_default_enabled",
        )
            .notNull()
            .default(false),
        participationMode: participationModeEnum("participation_mode")
            .notNull()
            .default("guest"),
        conversationEmailUpdateDefaultUpdatedAt: timestamp(
            "conversation_email_update_default_updated_at",
            { mode: "date", precision: 0 },
        ),
        conversationEmailUpdateDefaultUpdatedByUserId: uuid(
            "conversation_email_update_default_updated_by_user_id",
        ).references(() => userTable.id),
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
        retiredForAccountDeletionAt: timestamp(
            "retired_for_account_deletion_at",
            {
                mode: "date",
                precision: 3,
            },
        ),
    },
    (table) => [
        uniqueIndex("project_active_slug_unique")
            .on(table.slug)
            .where(isNull(table.deletedAt)),
        uniqueIndex("project_active_default_organization_unique")
            .on(table.autoProvisionedForOrganizationId)
            .where(isNull(table.deletedAt)),
        check(
            "project_account_retirement_check",
            sqlOr(
                isNull(table.retiredForAccountDeletionAt),
                sqlAnd(
                    isNotNull(table.autoProvisionedForOrganizationId),
                    isNotNull(table.deletedAt),
                    // The cycle marker retains account-level precision; the
                    // existing deleted_at column is rounded by PostgreSQL.
                    eq(
                        table.deletedAt,
                        sql`${table.retiredForAccountDeletionAt}::timestamp(0)`,
                    ),
                ),
            ),
        ),
        check(
            "project_email_update_default_audit_check",
            sqlOr(
                isNull(table.conversationEmailUpdateDefaultUpdatedByUserId),
                isNotNull(table.conversationEmailUpdateDefaultUpdatedAt),
            ),
        ),
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
export const projectDocumentTable = pgTable(
    "project_document",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        projectId: integer("project_id")
            .references(() => projectTable.id)
            .notNull(),
        createdByUsername: varchar("created_by_username", {
            length: MAX_LENGTH_USERNAME,
        }).notNull(),
        defaultLanguageCode: displayLanguageCodeEnum(
            "default_language_code",
        ).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        publishedAt: timestamp("published_at", {
            mode: "date",
            precision: 0,
        }),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [index("project_document_project_id_idx").on(table.projectId)],
);

/** @service api */
export const projectDocumentFileTable = pgTable(
    "project_document_file",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectDocumentId: integer("project_document_id")
            .references(() => projectDocumentTable.id)
            .notNull(),
        audience: projectDocumentAudienceEnum("audience").notNull(),
        status: projectDocumentFileStatusEnum("status")
            .notNull()
            .default("pending"),
        // PDF/legacy identity-object key; a prefix only for compressed-only uploads.
        objectKey: text("object_key").notNull().unique(),
        originalFileName: text("original_file_name").notNull(),
        contentType: projectDocumentContentTypeEnum("content_type").notNull(),
        htmlScriptsEnabled: boolean("html_scripts_enabled")
            .notNull()
            .default(false),
        byteSize: integer("byte_size").notNull(),
        // Cutover to gzip/Brotli delivery; no new grants may use the identity object.
        compressedAt: timestamp("compressed_at", {
            mode: "date",
            precision: 0,
        }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
        objectDeletedAt: timestamp("object_deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        uniqueIndex("project_document_file_audience_active_unique")
            .on(table.projectDocumentId, table.audience)
            .where(isNull(table.deletedAt)),
        index("project_document_file_deletion_queue_idx")
            .on(table.projectDocumentId)
            .where(
                sql`${table.deletedAt} IS NOT NULL AND ${table.objectDeletedAt} IS NULL`,
            ),
        index("project_document_file_pending_created_idx")
            .on(table.createdAt, table.projectDocumentId)
            .where(
                sql`${table.status} = 'pending' AND ${table.deletedAt} IS NULL`,
            ),
        index("project_document_file_original_retirement_idx")
            .on(table.compressedAt)
            .where(
                sql`${table.compressedAt} IS NOT NULL AND ${table.deletedAt} IS NULL AND ${table.objectDeletedAt} IS NULL`,
            ),
        check(
            "project_document_file_byte_size_check",
            sql`${table.byteSize} > 0 AND ${table.byteSize} <= ${sql.raw(String(MAX_PROJECT_DOCUMENT_FILE_SIZE))}`,
        ),
        check(
            "project_document_file_html_scripts_check",
            sql`NOT ${table.htmlScriptsEnabled} OR ${table.contentType} = 'text/html'`,
        ),
        check(
            "project_document_file_compressed_content_check",
            sql`${table.compressedAt} IS NULL OR ${table.contentType} <> 'application/pdf'`,
        ),
        check(
            "project_document_file_original_cleanup_check",
            sql`${table.objectDeletedAt} IS NULL OR ${table.deletedAt} IS NOT NULL OR ${table.compressedAt} IS NOT NULL`,
        ),
    ],
);

/** @service api */
export const projectDocumentRepresentationTable = pgTable(
    "project_document_representation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        fileId: integer("file_id")
            .references(() => projectDocumentFileTable.id)
            .notNull(),
        encoding: projectDocumentEncodingEnum("encoding").notNull(),
        status: projectDocumentRepresentationStatusEnum("status")
            .default("pending")
            .notNull(),
        objectKey: text("object_key").notNull().unique(),
        byteSize: integer("byte_size").notNull(),
        checksumSha256: text("checksum_sha256").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
        objectDeletedAt: timestamp("object_deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        uniqueIndex(
            "project_document_representation_file_encoding_active_unique",
        )
            .on(table.fileId, table.encoding)
            .where(isNull(table.deletedAt)),
        index("project_document_representation_cleanup_idx")
            .on(table.createdAt)
            .where(isNull(table.objectDeletedAt)),
        check(
            "project_document_representation_byte_size_check",
            gt(table.byteSize, 0).inlineParams(),
        ),
        check(
            "project_document_representation_failed_check",
            sql`${table.status} <> 'failed' OR ${table.deletedAt} IS NOT NULL`,
        ),
        check(
            "project_document_representation_deleted_object_check",
            sql`${table.objectDeletedAt} IS NULL OR ${table.deletedAt} IS NOT NULL`,
        ),
    ],
);

/** @service api */
export const projectDocumentLocalizationTable = pgTable(
    "project_document_localization",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        projectDocumentId: integer("project_document_id")
            .references(() => projectDocumentTable.id)
            .notNull(),
        languageCode: displayLanguageCodeEnum("language_code").notNull(),
        name: varchar("name", { length: MAX_LENGTH_TITLE }).notNull(),
        downloadFileName: varchar("download_file_name", {
            length: 255,
        }).notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex("project_document_localization_active_unique")
            .on(table.projectDocumentId, table.languageCode)
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
        defaultLanguageCode: displayLanguageCodeEnum(
            "default_language_code",
        ).notNull(),
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
        index("project_organization_attribution_organization_idx")
            .on(table.organizationId)
            .where(isNotNull(table.organizationId)),
        uniqueIndex("project_organization_attribution_real_active_unique")
            .on(table.projectId, table.role, table.organizationId)
            .where(
                sqlAnd(
                    isNotNull(table.organizationId),
                    isNull(table.deletedAt),
                ),
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
        firstName: varchar("first_name", {
            length: MAX_LENGTH_NAME_CREATOR,
        }),
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
            "project_contact_identity_or_email_check",
            sqlOr(
                hasNonBlankText(table.email),
                hasNonBlankText(table.firstName),
                hasNonBlankText(table.lastName),
                isNotNull(table.organizationId),
            ),
        ),
        check(
            "project_contact_affiliation_source_check",
            sql`num_nonnulls(${table.organizationId}, ${table.externalOrganizationId}) <= 1`,
        ),
        check(
            "project_contact_email_or_website_check",
            sqlOr(
                hasNonBlankText(table.email),
                hasNonBlankText(table.websiteUrl),
            ),
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
        index("project_contact_organization_idx")
            .on(table.organizationId)
            .where(isNotNull(table.organizationId)),
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
        capability:
            organizationMembershipCapabilityEnum("capability").notNull(),
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
/** @service import-worker */
export const organizationMembershipAllProjectCapabilityTable = pgTable(
    "organization_membership_all_project_capability",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        organizationMembershipId: integer("organization_membership_id")
            .references(() => organizationMembershipTable.id)
            .notNull(),
        capability:
            organizationMembershipAllProjectCapabilityEnum(
                "capability",
            ).notNull(),
        grantedByUserId: uuid("granted_by_user_id").references(
            () => userTable.id,
        ),
        revokedByUserId: uuid("revoked_by_user_id").references(
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
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        uniqueIndex(
            "organization_membership_all_project_capability_active_unique",
        )
            .on(table.organizationMembershipId, table.capability)
            .where(isNull(table.deletedAt)),
        check(
            "organization_membership_all_project_capability_revocation_check",
            sqlOr(isNull(table.revokedByUserId), isNotNull(table.deletedAt)),
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
        unique("premium_feature_entitlement_organization_id_id_unique").on(
            table.organizationId,
            table.id,
        ),
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
        reservedForRecovery: boolean("reserved_for_recovery")
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
        // Pending account deletion reserves credentials until irreversible cleanup.
        check(
            "zk_passport_recovery_reservation_check",
            sqlOr(
                eq(table.reservedForRecovery, false),
                eq(table.isDeleted, true),
            ),
        ),
        uniqueIndex("zk_passport_nullifier_active_unique")
            .on(table.nullifier)
            .where(
                sqlOr(
                    eq(table.isDeleted, false),
                    eq(table.reservedForRecovery, true),
                ),
            ),
        // Regular index for nullifier lookups
        index("zk_passport_nullifier_idx").on(table.nullifier),
        index("zk_passport_user_idx").on(table.userId),
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
        // Legacy indexes remain with the retained, inactive ticket records.
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
        reservedForRecovery: boolean("reserved_for_recovery")
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
        check("check_two_digits", sql`${table.lastTwoDigits} BETWEEN 0 and 99`),
        check(
            "phone_recovery_reservation_check",
            sqlOr(
                eq(table.reservedForRecovery, false),
                eq(table.isDeleted, true),
            ),
        ),
        // Partial unique index: only enforce uniqueness for non-deleted users
        uniqueIndex("phone_hash_active_unique")
            .on(table.phoneHash)
            .where(
                sqlOr(
                    eq(table.isDeleted, false),
                    eq(table.reservedForRecovery, true),
                ),
            ),
        // Regular index for lookups
        index("phone_hash_idx").on(table.phoneHash),
        index("phone_user_idx").on(table.userId),
    ],
);

/** @service api */
export const blockedPhoneNumberTable = pgTable(
    "blocked_phone_number",
    {
        phoneHash: text("phone_hash").notNull(),
        pepperVersion: integer("pepper_version").notNull(),
        reason: text("reason").notNull(),
        blockedAt: timestamp("blocked_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        revokedAt: timestamp("revoked_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        primaryKey({ columns: [table.phoneHash, table.pepperVersion] }),
        check(
            "blocked_phone_pepper_version_nonnegative_check",
            sql`${table.pepperVersion} >= 0`,
        ),
        check(
            "blocked_phone_reason_nonempty_check",
            sql`length(btrim(${table.reason})) > 0`,
        ),
    ],
);

/** @service api */
export const phoneSmsBudgetPolicyTable = pgTable(
    "phone_sms_budget_policy",
    {
        id: integer("id").primaryKey(),
        sendingEnabled: boolean("sending_enabled").notNull().default(false),
        hourlySendLimit: integer("hourly_send_limit"),
        dailySendLimit: integer("daily_send_limit"),
        estimatedCentsPerSend: integer("estimated_cents_per_send").notNull(),
        hourlyBudgetCents: integer("hourly_budget_cents"),
        dailyBudgetCents: integer("daily_budget_cents"),
        monthlyBudgetCents: integer("monthly_budget_cents")
            .notNull()
            .default(10000),
        warningPercent: integer("warning_percent").notNull().default(75),
        registrationPausedAt: timestamp("registration_paused_at", {
            mode: "date",
            precision: 3,
        }),
        registrationPauseExpiresAt: timestamp("registration_pause_expires_at", {
            mode: "date",
            precision: 3,
        }),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check("phone_sms_budget_single_policy_check", sql`${table.id} = 1`),
        check(
            "phone_sms_budget_positive_limits_check",
            sql`(${table.hourlySendLimit} IS NULL OR ${table.hourlySendLimit} > 0) AND (${table.dailySendLimit} IS NULL OR ${table.dailySendLimit} > 0) AND (${table.hourlySendLimit} IS NULL OR ${table.dailySendLimit} IS NULL OR ${table.dailySendLimit} >= ${table.hourlySendLimit}) AND ${table.estimatedCentsPerSend} > 0 AND (${table.hourlyBudgetCents} IS NULL OR ${table.hourlyBudgetCents} > 0) AND (${table.dailyBudgetCents} IS NULL OR ${table.dailyBudgetCents} > 0) AND (${table.hourlyBudgetCents} IS NULL OR ${table.dailyBudgetCents} IS NULL OR ${table.dailyBudgetCents} >= ${table.hourlyBudgetCents})`,
        ),
        check(
            "phone_sms_budget_warning_percent_check",
            sql`${table.warningPercent} BETWEEN 1 AND 99`,
        ),
        check(
            "phone_sms_budget_monthly_limit_check",
            sql`${table.monthlyBudgetCents} >= 0`,
        ),
        check(
            "phone_sms_budget_pause_expiry_check",
            sql`${table.registrationPauseExpiresAt} IS NULL OR (${table.registrationPausedAt} IS NOT NULL AND ${table.registrationPauseExpiresAt} > ${table.registrationPausedAt})`,
        ),
    ],
);

/** @service api */
export const phoneSmsBudgetReservationTable = pgTable(
    "phone_sms_budget_reservation",
    {
        id: uuid("id").primaryKey(),
        estimatedCents: integer("estimated_cents").notNull(),
        reservedAt: timestamp("reserved_at", {
            mode: "date",
            precision: 3,
        }).notNull(),
    },
    (table) => [
        index("phone_sms_budget_reservation_time_idx").on(table.reservedAt),
        check(
            "phone_sms_budget_reservation_cents_check",
            sql`${table.estimatedCents} > 0`,
        ),
    ],
);

/** @service api */
export const phoneSmsBudgetAlertTable = pgTable(
    "phone_sms_budget_alert",
    {
        id: uuid("id").primaryKey(),
        kind: varchar("kind", { length: 16 }).notNull(),
        day: varchar("day", { length: 10 }).notNull(),
        nextAttemptAt: timestamp("next_attempt_at", {
            mode: "date",
            precision: 3,
        }).notNull(),
        attemptCount: integer("attempt_count").notNull().default(0),
        sentAt: timestamp("sent_at", { mode: "date", precision: 3 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("phone_sms_budget_alert_day_kind_unique").on(
            table.day,
            table.kind,
        ),
        index("phone_sms_budget_alert_due_idx").on(
            table.sentAt,
            table.nextAttemptAt,
        ),
        check(
            "phone_sms_budget_alert_kind_check",
            sql`${table.kind} IN ('warning', 'hard_limit')`,
        ),
        check(
            "phone_sms_budget_alert_attempts_check",
            sql`${table.attemptCount} >= 0`,
        ),
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
        reservedForRecovery: boolean("reserved_for_recovery")
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
        check(
            "email_canonical_check",
            sql`${table.email} = lower(btrim(${table.email}))`,
        ),
        // Reservations prevent another account claiming a recovery credential.
        check(
            "email_recovery_reservation_check",
            sqlOr(
                eq(table.reservedForRecovery, false),
                eq(table.isDeleted, true),
            ),
        ),
        uniqueIndex("email_active_unique")
            .on(table.email)
            .where(
                sqlOr(
                    eq(table.isDeleted, false),
                    eq(table.reservedForRecovery, true),
                ),
            ),
        uniqueIndex("email_active_primary_user_unique")
            .on(table.userId)
            .where(
                sql`${table.type} = 'primary' AND ${table.isDeleted} = false`,
            ),
        unique("email_user_id_id_unique").on(table.userId, table.id),
        // Regular index for lookups
        index("email_idx").on(table.email),
    ],
);

/** Retired signing keys carry no account/credential association after purge. */
export const retiredDeviceKeyTable = pgTable("retired_device_key", {
    didWrite: varchar("did_write", { length: 1000 }).primaryKey(),
    retiredAt: timestamp("retired_at", { mode: "date", precision: 3 })
        .notNull()
        .defaultNow(),
});

export const deviceTable = pgTable(
    "device",
    {
        didWrite: varchar("did_write", { length: 1000 }).primaryKey(), // TODO: make sure of length
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        userAgent: text("user_agent").notNull(), // Retained for legacy rows; never expose it through session APIs.
        sessionStartedAt: timestamp("session_started_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        sessionExpiry: timestamp("session_expiry").notNull(),
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
        index("device_user_session_expiry_idx").on(
            table.userId,
            table.sessionExpiry,
        ),
    ],
);

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
        isSynthetic: boolean("is_synthetic").default(false).notNull(),
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
        wrongGuessAttemptAmount: integer("wrong_guess_attempt_amount")
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
            "otp_phone_wrong_guess_attempt_amount_nonnegative_check",
            sql`${table.wrongGuessAttemptAmount} >= 0`,
        ),
        index("otp_phone_destination_updated_idx").on(table.updatedAt),
    ],
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
        wrongGuessAttemptAmount: integer("wrong_guess_attempt_amount")
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
        check(
            "otp_email_wrong_guess_attempt_amount_nonnegative_check",
            sql`${table.wrongGuessAttemptAmount} >= 0`,
        ),
        index("otp_email_destination_updated_idx").on(table.updatedAt),
    ],
);

/** @service shared-analysis-worker, import-worker, content-translation-worker, scoring-worker, credit-voting-worker */
export const conversationContentTable = pgTable(
    "conversation_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        title: varchar("title", {
            length: MAX_LENGTH_CONVERSATION_TITLE,
        }).notNull(),
        body: text("body"),
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
        votingPresentation: polisVotingPresentationEnum("voting_presentation")
            .notNull()
            .default("list"),
        aiLabelingEnabled: boolean("ai_labeling_enabled")
            .notNull()
            .default(true),
        allowParticipantStatements: boolean("allow_participant_statements")
            .notNull()
            .default(true),
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
        allowParticipantStatements: boolean("allow_participant_statements")
            .notNull()
            .default(false),
        currentRankingScoreId: integer("current_ranking_score_id")
            .references((): AnyPgColumn => rankingScoreTable.id)
            .unique(),
        externalSourceConfig: jsonb("external_source_config"),
        itemCount: integer("item_count").notNull().default(0),
        totalItemCount: integer("total_item_count").notNull().default(0),
        voteCount: integer("vote_count").notNull().default(0),
        totalVoteCount: integer("total_vote_count").notNull().default(0),
        participantCount: integer("participant_count").notNull().default(0),
        totalParticipantCount: integer("total_participant_count")
            .notNull()
            .default(0),
        scoringInputRevision: bigint("scoring_input_revision", {
            mode: "number",
        })
            .notNull()
            .default(0),
        // New votes may lag publication; edits/removals invalidate older computations.
        scoringInvalidationRevision: bigint("scoring_invalidation_revision", {
            mode: "number",
        })
            .notNull()
            .default(0),
        processedScoringInputRevision: bigint(
            "processed_scoring_input_revision",
            {
                mode: "number",
            },
        )
            .notNull()
            .default(-1),
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
            "ranking_conversation_config_invalidation_revision_check",
            sql`${table.scoringInvalidationRevision} >= 0 AND ${table.scoringInvalidationRevision} <= ${table.scoringInputRevision}`,
        ),
        check(
            "ranking_conversation_config_counts_check",
            sql`${table.itemCount} >= 0 AND ${table.itemCount} <= ${table.totalItemCount} AND ${table.voteCount} >= 0 AND ${table.voteCount} <= ${table.totalVoteCount} AND ${table.participantCount} >= 0 AND ${table.participantCount} <= ${table.totalParticipantCount} AND ${table.scoringInputRevision} >= 0 AND ${table.processedScoringInputRevision} >= -1 AND ${table.processedScoringInputRevision} <= ${table.scoringInputRevision}`,
        ),
    ],
);

/** @service api, scoring-worker, shared-analysis-worker, import-worker, content-translation-worker, credit-voting-worker */
export const qvConfigTable = pgTable(
    "credit_voting_config",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        creditBudget: integer("credit_budget")
            .notNull()
            .default(QV_CREDIT_BUDGET),
        allowOpposition: boolean("allow_opposition").notNull().default(true),
        itemCount: integer("item_count").notNull().default(0),
        statementSetRevision: integer("statement_set_revision")
            .notNull()
            .default(0),
        statementsLockedAt: timestamp("statements_locked_at", {
            mode: "date",
            precision: 3,
        }),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "credit_voting_fixed_budget_check",
            sql`${table.creditBudget} = ${sql.raw(String(QV_CREDIT_BUDGET))}`,
        ),
        check(
            "credit_voting_statement_revision_check",
            sql`${table.statementSetRevision} >= 0`,
        ),
        check("credit_voting_item_count_check", sql`${table.itemCount} >= 0`),
    ],
);

/** @service api, content-translation-worker */
export const gatheringConfigTable = pgTable(
    "gathering_config",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        gatheringMode: text("gathering_mode", {
            enum: ["new", "amend"],
        }).notNull(),
        allowNewResponses: boolean("allow_new_responses").notNull(),
        responseVisibility: text("response_visibility", {
            enum: ["everyone", "facilitators"],
        }).notNull(),
    },
    (table) => [
        check(
            "gathering_mode_check",
            inArray(table.gatheringMode, ["new", "amend"]),
        ),
        check(
            "gathering_visibility_check",
            inArray(table.responseVisibility, ["everyone", "facilitators"]),
        ),
    ],
);

/** @service api, content-translation-worker */
export const gatheringFieldTable = pgTable(
    "gathering_field",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        configId: integer("config_id")
            .notNull()
            .references(() => gatheringConfigTable.id),
        position: smallint("position").notNull(),
        label: varchar("label", { length: 200 }).notNull(),
        required: boolean("required").notNull(),
        characterLimit: integer("character_limit").notNull(),
    },
    (table) => [
        unique("gathering_field_config_position_unique").on(
            table.configId,
            table.position,
        ),
        unique("gathering_field_config_id_unique").on(table.configId, table.id),
        check(
            "gathering_field_position_check",
            sqlAnd(
                gte(table.position, 1),
                lte(table.position, MAX_GATHERING_FIELDS),
            ),
        ),
        check(
            "gathering_field_limit_check",
            sqlAnd(
                gte(table.characterLimit, 1),
                lte(table.characterLimit, MAX_GATHERING_TEXT_LENGTH),
            ),
        ),
    ],
);

/** @service api, content-translation-worker */
export const gatheringResponseTable = pgTable(
    "gathering_response",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        conversationId: integer("conversation_id").notNull(),
        configId: integer("config_id").notNull(),
        authorId: uuid("author_id").references(() => userTable.id),
        isSeed: boolean("is_seed").notNull().default(false),
        currentContentId: integer("current_content_id"),
        baselineContentId: integer("baseline_content_id"),
        sourceConversationId: integer("source_conversation_id").references(
            (): AnyPgColumn => conversationTable.id,
            { onDelete: "set null" },
        ),
        sourceResponseContentId: integer(
            "source_response_content_id",
        ).references((): AnyPgColumn => gatheringResponseContentTable.id, {
            onDelete: "set null",
        }),
        sourceConversationSlugId: varchar("source_conversation_slug_id", {
            length: 8,
        }),
        sourceConversationType: text("source_conversation_type", {
            enum: ["gathering"],
        }),
        moderation: text("moderation", { enum: ["hide", "move"] }),
        accountHiddenAt: timestamp("account_hidden_at", {
            mode: "date",
            precision: 3,
        }),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (table): PgTableExtraConfigValue[] => [
        foreignKey({
            columns: [table.conversationId, table.configId],
            foreignColumns: [
                conversationTable.id,
                conversationTable.gatheringConfigId,
            ],
        }),
        unique("gathering_response_config_id_unique").on(
            table.configId,
            table.id,
        ),
        uniqueIndex("gathering_response_author_unique")
            .on(table.conversationId, table.authorId)
            .where(eq(table.isSeed, false)),
        index("gathering_response_author_idx").on(table.authorId),
        foreignKey({
            name: "gathering_response_current_fk",
            columns: [table.id, table.currentContentId],
            foreignColumns: [
                gatheringResponseContentTable.responseId,
                gatheringResponseContentTable.id,
            ],
        }),
        foreignKey({
            name: "gathering_response_baseline_fk",
            columns: [table.id, table.baselineContentId],
            foreignColumns: [
                gatheringResponseContentTable.responseId,
                gatheringResponseContentTable.id,
            ],
        }),
        check(
            "gathering_response_seed_author_check",
            sqlOr(eq(table.isSeed, false), isNull(table.authorId)),
        ),
        check(
            "gathering_response_author_check",
            sqlOr(
                eq(table.isSeed, true),
                isNotNull(table.authorId),
                isNotNull(table.accountHiddenAt),
            ),
        ),
        check(
            "gathering_response_deletion_check",
            sqlOr(isNull(table.deletedAt), isNull(table.currentContentId)),
        ),
        check(
            "gathering_response_moderation_check",
            sqlOr(
                isNull(table.moderation),
                inArray(table.moderation, ["hide", "move"]),
            ),
        ),
        check(
            "gathering_response_provenance_check",
            sqlOr(
                sqlAnd(
                    isNull(table.sourceConversationSlugId),
                    isNull(table.sourceConversationType),
                    isNull(table.baselineContentId),
                    isNull(table.sourceConversationId),
                    isNull(table.sourceResponseContentId),
                ),
                sqlAnd(
                    isNotNull(table.sourceConversationSlugId),
                    isNotNull(table.sourceConversationType),
                    eq(table.sourceConversationType, "gathering"),
                    isNotNull(table.baselineContentId),
                ),
            ),
        ),
    ],
);

/** @service api, content-translation-worker */
export const gatheringResponseContentTable = pgTable(
    "gathering_response_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").notNull().defaultRandom().unique(),
        responseId: integer("response_id").notNull(),
        configId: integer("config_id").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (table): PgTableExtraConfigValue[] => [
        foreignKey({
            columns: [table.configId, table.responseId],
            foreignColumns: [
                gatheringResponseTable.configId,
                gatheringResponseTable.id,
            ],
        }),
        unique("gathering_content_response_id_unique").on(
            table.responseId,
            table.id,
        ),
        unique("gathering_content_config_id_unique").on(
            table.configId,
            table.id,
        ),
    ],
);

/** @service api, content-translation-worker */
export const gatheringAnswerTable = pgTable(
    "gathering_answer",
    {
        configId: integer("config_id").notNull(),
        contentId: integer("content_id").notNull(),
        fieldId: uuid("field_id").notNull(),
        value: text("value").notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.contentId, table.fieldId] }),
        foreignKey({
            columns: [table.configId, table.contentId],
            foreignColumns: [
                gatheringResponseContentTable.configId,
                gatheringResponseContentTable.id,
            ],
        }),
        foreignKey({
            columns: [table.configId, table.fieldId],
            foreignColumns: [
                gatheringFieldTable.configId,
                gatheringFieldTable.id,
            ],
        }),
        // PostgreSQL character length is needed here; Drizzle has no text-length helper.
        check(
            "gathering_answer_length_check",
            sql`char_length(${table.value}) <= ${sql.raw(String(MAX_GATHERING_TEXT_LENGTH))}`,
        ),
    ],
);

/** @service api */
export const gatheringModerationTable = pgTable(
    "gathering_moderation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        responseId: integer("response_id")
            .notNull()
            .references(() => gatheringResponseTable.id),
        action: text("action", { enum: ["hide", "move", "restore"] }).notNull(),
        moderatorId: uuid("moderator_id").references(() => userTable.id),
        reason: varchar("reason", { length: 1000 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        check(
            "gathering_moderation_action_check",
            inArray(table.action, ["hide", "move", "restore"]),
        ),
        index("gathering_moderation_response_idx").on(table.responseId),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, import-worker, content-translation-worker, credit-voting-worker */
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
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        polisConfigId: integer("polis_config_id")
            .references(() => polisConversationConfigTable.id)
            .unique(),
        rankingConfigId: integer("ranking_config_id")
            .references(() => rankingConversationConfigTable.id)
            .unique(),
        creditVotingConfigId: integer("credit_voting_config_id")
            .references(() => qvConfigTable.id)
            .unique(),
        gatheringConfigId: integer("gathering_config_id")
            .references((): AnyPgColumn => gatheringConfigTable.id)
            .unique(),
        prioritizationType: text("prioritization_type", {
            enum: ["comparisons", "qv"],
        }),
        dynamicTranslationEnabled: boolean("dynamic_translation_enabled")
            .notNull()
            .default(false),
        conversationEmailUpdateEnabledOverride: boolean(
            "conversation_email_update_enabled_override",
        ),
        conversationEmailUpdateOverrideUpdatedAt: timestamp(
            "conversation_email_update_override_updated_at",
            { mode: "date", precision: 0 },
        ),
        conversationEmailUpdateOverrideUpdatedByUserId: uuid(
            "conversation_email_update_override_updated_by_user_id",
        ).references(() => userTable.id),
        languageSettingsSource: conversationLanguageSettingsSourceEnum(
            "language_settings_source",
        )
            .notNull()
            .default("conversation_override"),
        isIndexed: boolean("is_indexed").notNull().default(true), // if true, the conversation can be fetched in the feed and search engine, else it is hidden, unless users have the link
        participationMode: participationModeEnum("participation_mode")
            .notNull()
            .default("account_required"), // Determines who can vote/post opinions: "account_required" requires any account, "strong_verification" requires phone or Rarimo passport, "email_verification" requires email credential specifically, "guest" allows anyone.
        participationModeSettingsSource: text(
            "participation_mode_settings_source",
            { enum: participationModeSettingsSourceValues },
        )
            .notNull()
            .default("conversation_override"),
        conversationType: conversationTypeEnum("conversation_type")
            .notNull()
            .default("polis"),
        isImporting: boolean("is_importing").notNull().default(false), // if true, the conversation is being imported from CSV and should not be visible in feed until import completes
        isClosed: boolean("is_closed").notNull().default(false), // if true, the conversation was closed by owner and users cannot post opinions or vote
        voteBufferEpoch: uuid("vote_buffer_epoch").notNull().defaultRandom(),
        voteBufferDrained: boolean("vote_buffer_drained")
            .notNull()
            .default(true),
        closingTargetRevision: bigint("closing_target_revision", {
            mode: "number",
        }),
        closedFinalizedAt: timestamp("closed_finalized_at", {
            mode: "date",
            precision: 0,
        }),
        isEdited: boolean("is_edited").notNull().default(false), // if true, the conversation content was edited after creation. Used for "Edited" badge in UI. Use this field (not updatedAt) to determine if a conversation was edited — updatedAt can be accidentally bumped by migration scripts.
        requiresEventTicket: eventSlugEnum("requires_event_ticket"), // Retired storage column; application access never consults it.
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
        check(
            "conversation_participation_mode_settings_source_check",
            inArray(
                table.participationModeSettingsSource,
                participationModeSettingsSourceValues,
            ),
        ),
        check(
            "conversation_deletion_intent_check",
            sqlOr(isNull(table.deletedAt), isNull(table.currentContentId)),
        ),
        index("conversation_deleted_idx")
            .on(table.deletedAt, table.id)
            .where(isNotNull(table.deletedAt)),
        unique("conversation_project_id_id_unique").on(
            table.projectId,
            table.id,
        ),
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
        // Buffer maintenance polls this rare lifecycle state on every flush.
        index("conversation_vote_buffer_drain_idx")
            .on(table.id)
            .where(
                sql`${table.conversationType} = 'polis' AND ${table.isClosed} = true AND ${table.voteBufferDrained} = false AND ${table.closedFinalizedAt} IS NULL`,
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
            "conversation_closing_state_check",
            sql`(${table.isClosed} OR (${table.closingTargetRevision} IS NULL AND ${table.closedFinalizedAt} IS NULL)) AND (${table.closedFinalizedAt} IS NULL OR ${table.closingTargetRevision} IS NOT NULL)`,
        ),
        check(
            "conversation_subtype_config_check",
            sqlOr(
                sqlAnd(
                    eq(table.conversationType, "gathering"),
                    isNotNull(table.gatheringConfigId),
                    isNull(table.polisConfigId),
                    isNull(table.rankingConfigId),
                    isNull(table.creditVotingConfigId),
                    isNull(table.prioritizationType),
                ),
                sqlAnd(
                    isNull(table.gatheringConfigId),
                    sqlOr(
                        sqlAnd(
                            eq(table.conversationType, "polis"),
                            isNotNull(table.polisConfigId),
                            isNull(table.rankingConfigId),
                            isNull(table.creditVotingConfigId),
                            isNull(table.prioritizationType),
                        ),
                        sqlAnd(
                            eq(table.conversationType, "prioritizing"),
                            isNull(table.polisConfigId),
                            isNotNull(table.prioritizationType),
                            sqlOr(
                                sqlAnd(
                                    eq(table.prioritizationType, "comparisons"),
                                    isNotNull(table.rankingConfigId),
                                    isNull(table.creditVotingConfigId),
                                ),
                                sqlAnd(
                                    eq(table.prioritizationType, "qv"),
                                    isNotNull(table.creditVotingConfigId),
                                    isNull(table.rankingConfigId),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
        unique("conversation_gathering_config_unique").on(
            table.id,
            table.gatheringConfigId,
        ),
        check(
            "conversation_email_update_override_audit_check",
            sqlOr(
                isNull(table.conversationEmailUpdateOverrideUpdatedByUserId),
                isNotNull(table.conversationEmailUpdateOverrideUpdatedAt),
            ),
        ),
    ],
);

/** @service api */
export const conversationDraftTable = pgTable(
    "conversation_draft",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        projectId: integer("project_id")
            .notNull()
            .references(() => projectTable.id, { onDelete: "cascade" }),
        createdByUserId: uuid("created_by_user_id").references(
            () => userTable.id,
            { onDelete: "set null" },
        ),
        conversationType: conversationTypeEnum("conversation_type").notNull(),
        content: jsonb("content").default({}).notNull(),
        revision: integer("revision").default(0).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        publishedAt: timestamp("published_at", { mode: "date", precision: 3 }),
        publishedConversationId: integer("published_conversation_id")
            .references(() => conversationTable.id, { onDelete: "set null" })
            .unique(),
    },
    (table) => [
        index("conversation_draft_project_idx").on(table.projectId),
        index("conversation_draft_active_list_idx")
            .on(table.projectId, table.createdAt, table.id)
            .where(sqlAnd(isNull(table.deletedAt), isNull(table.publishedAt))),
        index("conversation_draft_created_by_idx")
            .on(table.createdByUserId)
            .where(isNotNull(table.createdByUserId)),
        check("conversation_draft_revision_check", gte(table.revision, 0)),
        check(
            "conversation_draft_published_link_check",
            sqlOr(
                isNull(table.publishedConversationId),
                isNotNull(table.publishedAt),
            ),
        ),
        check(
            "conversation_draft_terminal_state_check",
            sqlOr(isNull(table.deletedAt), isNull(table.publishedAt)),
        ),
    ],
);

/**
 * Persistent project/conversation associations keep historical snapshots scoped
 * after the current project changes. Returning to a project reuses its association.
 * @service api
 */
export const conversationProjectAssignmentTable = pgTable(
    "conversation_project_assignment",
    {
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        projectId: integer("project_id")
            .notNull()
            .references(() => projectTable.id),
        firstAssignedAt: timestamp("first_assigned_at", {
            mode: "date",
            precision: 0,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.projectId, table.conversationId] }),
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

/** @service api, scoring-worker, shared-analysis-worker, content-translation-worker, credit-voting-worker */
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
        title: text("title").notNull(),
        body: text("body"),
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

/** @service api, scoring-worker, shared-analysis-worker, content-translation-worker, credit-voting-worker */
export const rankingItemTable = pgTable(
    "ranking_item",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        authorId: uuid("author_id").references(() => userTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        currentContentId: integer("current_content_id"),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        accountHiddenAt: timestamp("account_hidden_at", {
            mode: "date",
            precision: 3,
        }),
        accountHiddenContentRetained: boolean("account_hidden_content_retained")
            .notNull()
            .default(false),
        isSeed: boolean("is_seed").notNull().default(false),
        lifecycleStatus: rankingItemLifecycleStatusEnum("lifecycle_status")
            .notNull()
            .default("active"),
        moderation: text("moderation", { enum: ["move", "hide"] }),
        position: integer("position").notNull().default(0),
        snapshotScore: real("snapshot_score"),
        snapshotRankingScoreId: integer("snapshot_ranking_score_id"),
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
        check(
            "ranking_item_source_owner_check",
            sqlOr(
                isNotNull(table.authorId),
                eq(table.isSeed, true),
                isNotNull(table.deletedAt),
                isNotNull(table.accountHiddenAt),
            ),
        ),
        check(
            "ranking_item_participant_moderation_check",
            sqlOr(
                isNull(table.moderation),
                sqlAnd(
                    eq(table.isSeed, false),
                    inArray(table.moderation, ["move", "hide"]),
                ),
            ),
        ),
        check(
            "ranking_item_deletion_intent_check",
            sqlOr(isNull(table.deletedAt), isNull(table.currentContentId)),
        ),
        foreignKey({
            columns: [table.snapshotRankingScoreId, table.conversationId],
            foreignColumns: [
                rankingScoreTable.id,
                rankingScoreTable.conversationId,
            ],
            name: "ranking_item_snapshot_score_conversation_fk",
        }),
        unique("ranking_item_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        index("ranking_item_conversation_active_idx").on(
            table.conversationId,
            table.currentContentId,
        ),
        index("ranking_item_lifecycle_idx").on(
            table.conversationId,
            table.lifecycleStatus,
        ),
        index("comparison_moderation_history_idx")
            .on(table.conversationId, table.id)
            .where(isNotNull(table.moderation)),
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
export const comparisonItemModerationTable = pgTable(
    "comparison_item_moderation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingItemId: integer("ranking_item_id")
            .notNull()
            .references(() => rankingItemTable.id),
        moderatorId: uuid("moderator_id").references(() => userTable.id),
        action: text("action", { enum: ["move", "hide", "restore"] }).notNull(),
        reason: varchar("reason", { length: 1000 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        check(
            "comparison_item_moderation_action_check",
            inArray(t.action, ["move", "hide", "restore"]),
        ),
        index("comparison_item_moderation_item_idx").on(t.rankingItemId, t.id),
    ],
);

/** @service api, scoring-worker */
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

/** @service scoring-worker, api, shared-analysis-worker, credit-voting-worker */
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

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker, credit-voting-worker */
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker, credit-voting-worker */
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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

/** @service scoring-worker, api, shared-analysis-worker, content-translation-worker, credit-voting-worker */
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
        allowsText: boolean("allows_text").notNull().default(false),
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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

/** @service scoring-worker, api, shared-analysis-worker, credit-voting-worker */
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
        index("survey_response_participant_idx").on(table.participantId),
    ],
);

/** @service scoring-worker, api, shared-analysis-worker, credit-voting-worker */
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

/** @service scoring-worker, api, shared-analysis-worker, credit-voting-worker */
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
        textValueHtml: text("text_value_html"),
        textValuePlainText: text("text_value_plain_text"),
        deletedAt: timestamp("deleted_at", {
            mode: "date",
            precision: 0,
        }),
    },
    (table) => [
        check(
            "survey_answer_option_text_byte_length_check",
            sql`octet_length(${table.textValuePlainText}) <= ${sql.raw(String(MAX_BYTES_SURVEY_OPTION_TEXT))}`,
        ),
        check(
            "survey_answer_option_html_byte_length_check",
            sql`octet_length(${table.textValueHtml}) <= ${sql.raw(String(MAX_BYTES_SURVEY_OPTION_HTML))}`,
        ),
        check(
            "survey_answer_option_text_pair_check",
            sql`(${table.textValueHtml} IS NULL) = (${table.textValuePlainText} IS NULL)`,
        ),
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
        authorId: uuid("author_id").references(() => userTable.id),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        currentContentId: integer("current_content_id").references(
            (): AnyPgColumn => opinionContentTable.id,
        ), // null if opinion was deleted
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        accountHiddenAt: timestamp("account_hidden_at", {
            mode: "date",
            precision: 3,
        }),
        accountHiddenContentRetained: boolean("account_hidden_content_retained")
            .notNull()
            .default(false),
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
        check(
            "opinion_source_owner_check",
            sqlOr(
                isNotNull(table.authorId),
                eq(table.isSeed, true),
                isNotNull(table.deletedAt),
                isNotNull(table.accountHiddenAt),
            ),
        ),
        check(
            "opinion_deletion_intent_check",
            sqlOr(isNull(table.deletedAt), isNull(table.currentContentId)),
        ),
        index("opinion_deleted_idx")
            .on(table.deletedAt, table.id)
            .where(isNotNull(table.deletedAt)),
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
        content: text("content").notNull(),
        isEdited: boolean("is_edited").notNull().default(false),
        editedByUserId: uuid("edited_by_user_id").references(
            () => userTable.id,
        ),
        contentPlainText: text("content_plain_text"),
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
            "opinion_content_edit_attribution_check",
            sqlOr(isNull(table.editedByUserId), eq(table.isEdited, true)),
        ),
        check(
            "opinion_content_content_byte_length_check",
            sql`octet_length(${table.content}) <= ${sql.raw(String(MAX_BYTES_RICH_TEXT_HTML))}`,
        ),
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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

/** Frozen field labels have no mutable revision separate from their UUID. */
/** @service api, content-translation-worker */
export const gatheringFieldTranslationTable = pgTable(
    "gathering_field_translation",
    {
        fieldId: uuid("field_id")
            .notNull()
            .references(() => gatheringFieldTable.id),
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
        translatedLabel: text("translated_label").notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
    },
    (table) => [
        primaryKey({ columns: [table.fieldId, table.displayLanguageCode] }),
    ],
);

/** Complete response bundles are published atomically; field IDs remain target-owned. */
/** @service api, content-translation-worker */
export const gatheringAnswerTranslationTable = pgTable(
    "gathering_answer_translation",
    {
        contentId: integer("content_id").notNull(),
        fieldId: uuid("field_id").notNull(),
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
        translatedValue: text("translated_value").notNull(),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
    },
    (table) => [
        primaryKey({
            columns: [
                table.contentId,
                table.fieldId,
                table.displayLanguageCode,
            ],
        }),
        foreignKey({
            columns: [table.contentId, table.fieldId],
            foreignColumns: [
                gatheringAnswerTable.contentId,
                gatheringAnswerTable.fieldId,
            ],
        }),
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
        gatheringFieldId: uuid("gathering_field_id").references(
            () => gatheringFieldTable.id,
        ),
        gatheringResponseContentId: integer(
            "gathering_response_content_id",
        ).references(() => gatheringResponseContentTable.id),
        displayLanguageCode: displayLanguageCodeEnum(
            "display_language_code",
        ).notNull(),
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
        uniqueIndex("content_translation_work_gathering_field_unique")
            .on(table.gatheringFieldId, table.displayLanguageCode)
            .where(eq(table.sourceKind, "gathering_field")),
        uniqueIndex("content_translation_work_gathering_response_unique")
            .on(table.gatheringResponseContentId, table.displayLanguageCode)
            .where(eq(table.sourceKind, "gathering_response")),
        check(
            "content_translation_work_gathering_source_check",
            sqlOr(
                sqlAnd(
                    eq(table.sourceKind, "gathering_field"),
                    isNotNull(table.gatheringFieldId),
                    isNull(table.gatheringResponseContentId),
                ),
                sqlAnd(
                    eq(table.sourceKind, "gathering_response"),
                    isNull(table.gatheringFieldId),
                    isNotNull(table.gatheringResponseContentId),
                ),
                sqlAnd(
                    notInArray(table.sourceKind, [
                        "gathering_field",
                        "gathering_response",
                    ]),
                    isNull(table.gatheringFieldId),
                    isNull(table.gatheringResponseContentId),
                ),
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
                sqlAnd(
                    inArray(table.sourceKind, [
                        "gathering_field",
                        "gathering_response",
                    ]),
                    isNotNull(table.conversationId),
                    isNull(table.projectContentId),
                    isNull(table.conversationContentId),
                    isNull(table.opinionContentId),
                    isNull(table.surveyQuestionContentId),
                    isNull(table.surveyQuestionOptionContentIds),
                    isNull(table.rankingItemContentId),
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

/**
 * Stable conversation-local identity. Account association is separately removable;
 * different detached participants must never share a placeholder account.
 */
/** @service api, shared-analysis-worker, import-worker, credit-voting-worker */
export const conversationParticipantTable = pgTable(
    "conversation_participant",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        userId: uuid("user_id").references(() => userTable.id),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        unique("conversation_participant_id_account_unique").on(
            table.id,
            table.userId,
        ),
        unique("conversation_participant_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        unique("conversation_participant_account_unique").on(
            table.conversationId,
            table.userId,
        ),
        index("conversation_participant_user_idx").on(table.userId),
    ],
);

/** Current accepted response only; frontend-local edits have no database representation. */
/** @service api, credit-voting-worker */
export const qvResponseTable = pgTable(
    "qv_response",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        participantId: uuid("participant_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        revision: integer("revision").notNull().default(0),
        currentVersionId: uuid("current_version_id"),
        accountHiddenAt: timestamp("account_hidden_at", {
            mode: "date",
            precision: 3,
        }),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (t): PgTableExtraConfigValue[] => [
        unique("qv_response_participant_unique").on(t.participantId),
        unique("qv_response_id_conversation_unique").on(t.id, t.conversationId),
        foreignKey({
            columns: [t.participantId, t.conversationId],
            foreignColumns: [
                conversationParticipantTable.id,
                conversationParticipantTable.conversationId,
            ],
            name: "qv_response_participant_conversation_fk",
        }),
        foreignKey({
            columns: [t.currentVersionId, t.id],
            foreignColumns: [
                qvResponseVersionTable.id,
                qvResponseVersionTable.responseId,
            ],
            name: "qv_response_current_version_owner_fk",
        }),
        check("qv_response_revision_check", gte(t.revision, sql`0`)),
        check(
            "qv_response_deleted_pointer_check",
            sqlOr(isNull(t.deletedAt), isNull(t.currentVersionId)),
        ),
        index("qv_response_conversation_active_idx")
            .on(t.conversationId)
            .where(
                sqlAnd(
                    isNotNull(t.currentVersionId),
                    isNull(t.deletedAt),
                    isNull(t.accountHiddenAt),
                ),
            ),
    ],
);

/** Immutable accepted numerical input; only deletion markers may change. */
/** @service api, credit-voting-worker */
export const qvResponseVersionTable = pgTable(
    "qv_response_version",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        responseId: uuid("response_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        statementSetRevision: integer("statement_set_revision").notNull(),
        creditBudget: integer("credit_budget")
            .notNull()
            .default(QV_CREDIT_BUDGET),
        creditPricing: varchar("credit_pricing", {
            enum: ["quadratic"],
            length: 16,
        })
            .notNull()
            .default("quadratic"),
        allowOpposition: boolean("allow_opposition").notNull(),
        ruleVersion: integer("rule_version").notNull().default(QV_RULE_VERSION),
        creditsSpent: integer("credits_spent").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
    },
    (t): PgTableExtraConfigValue[] => [
        unique("qv_version_id_response_unique").on(t.id, t.responseId),
        unique("qv_version_id_conversation_unique").on(t.id, t.conversationId),
        foreignKey({
            columns: [t.responseId, t.conversationId],
            foreignColumns: [
                qvResponseTable.id,
                qvResponseTable.conversationId,
            ],
            name: "qv_version_response_conversation_fk",
        }),
        check("qv_version_revision_check", gte(t.statementSetRevision, sql`0`)),
        // DDL cannot bind parameters; inline only source-controlled rule constants.
        check(
            "qv_version_budget_check",
            sqlAnd(
                eq(t.creditBudget, sql.raw(String(QV_CREDIT_BUDGET))),
                eq(t.creditPricing, sql`'quadratic'`),
                eq(t.ruleVersion, sql.raw(String(QV_RULE_VERSION))),
                gte(t.creditsSpent, sql`1`),
                lte(t.creditsSpent, t.creditBudget),
            ),
        ),
        index("qv_version_response_idx").on(t.responseId),
        index("qv_version_deleted_idx")
            .on(t.deletedAt)
            .where(isNotNull(t.deletedAt)),
    ],
);

/** Sparse, version-owned allocations. */
/** @service api, credit-voting-worker */
export const qvAllocationTable = pgTable(
    "qv_allocation",
    {
        versionId: uuid("version_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        itemId: integer("item_id").notNull(),
        contentId: integer("content_id").notNull(),
        votes: smallint("votes").notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
    },
    (t) => [
        primaryKey({ columns: [t.versionId, t.itemId] }),
        foreignKey({
            columns: [t.versionId, t.conversationId],
            foreignColumns: [
                qvResponseVersionTable.id,
                qvResponseVersionTable.conversationId,
            ],
            name: "qv_allocation_version_conversation_fk",
        }),
        foreignKey({
            columns: [t.itemId, t.conversationId],
            foreignColumns: [
                rankingItemTable.id,
                rankingItemTable.conversationId,
            ],
            name: "qv_allocation_item_conversation_fk",
        }),
        foreignKey({
            columns: [t.contentId, t.itemId],
            foreignColumns: [
                rankingItemContentTable.id,
                rankingItemContentTable.rankingItemId,
            ],
            name: "qv_allocation_content_owner_fk",
        }),
        check(
            "qv_allocation_votes_check",
            sqlAnd(
                ne(t.votes, sql`0`),
                gte(
                    t.votes,
                    sql.raw(String(-Math.floor(Math.sqrt(QV_CREDIT_BUDGET)))),
                ),
                lte(
                    t.votes,
                    sql.raw(String(Math.floor(Math.sqrt(QV_CREDIT_BUDGET)))),
                ),
            ),
        ),
        index("qv_allocation_deleted_idx")
            .on(t.deletedAt)
            .where(isNotNull(t.deletedAt)),
    ],
);

/**
 * One current live projection, independent of close generations and frozen results.
 * Only Python publishes counts; readers may see zero until the initial refresh.
 */
/** @service api, credit-voting-worker */
export const qvLiveStatsTable = pgTable(
    "qv_live_stats",
    {
        conversationId: integer("conversation_id")
            .primaryKey()
            .references(() => conversationTable.id),
        participantCount: integer("participant_count").notNull().default(0),
        revision: bigint("revision", { mode: "number" }).notNull().default(0),
        refreshedAt: timestamp("refreshed_at", { mode: "date", precision: 3 }),
        retryAfter: timestamp("retry_after", { mode: "date", precision: 3 }),
    },
    (t) => [
        check("qv_live_stats_count_check", gte(t.participantCount, sql`0`)),
        check("qv_live_stats_revision_check", gte(t.revision, sql`0`)),
        index("qv_live_stats_refresh_idx").on(t.refreshedAt, t.conversationId),
    ],
);

/**
 * Append-only wakeups avoid a hot conversation row in concurrent Saves. Processing
 * and publication commit together; processed signals are later cleanup candidates.
 */
/** @service api, credit-voting-worker */
export const qvStatsRefreshTable = pgTable(
    "qv_stats_refresh",
    {
        id: bigint("id", { mode: "number" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
        processedAt: timestamp("processed_at", { mode: "date", precision: 3 }),
    },
    (t) => [
        index("qv_stats_refresh_pending_idx")
            .on(t.conversationId, t.id)
            .where(isNull(t.processedAt)),
    ],
);

/** Lifecycle generation is independent of the live statistics revision. */
/** @service api, credit-voting-worker, content-translation-worker */
export const qvCalculationStateTable = pgTable(
    "qv_calculation_state",
    {
        conversationId: integer("conversation_id")
            .primaryKey()
            .references(() => conversationTable.id),
        generation: integer("generation").notNull().default(0),
        currentCalculationId: uuid("current_calculation_id"),
    },
    (t): PgTableExtraConfigValue[] => [
        check(
            "qv_calculation_state_generation_check",
            gte(t.generation, sql`0`),
        ),
        foreignKey({
            columns: [t.currentCalculationId, t.conversationId],
            foreignColumns: [
                qvCalculationTable.id,
                qvCalculationTable.conversationId,
            ],
            name: "qv_current_calculation_conversation_fk",
        }),
    ],
);

/** Durable calculation work and publication record; never a public history. */
/** @service api, credit-voting-worker, content-translation-worker */
export const qvCalculationTable = pgTable(
    "qv_calculation",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        generation: integer("generation").notNull(),
        status: text("status", {
            enum: ["queued", "running", "ready", "failed"],
        })
            .notNull()
            .default("queued"),
        inputSnapshotId: uuid("input_snapshot_id"),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 3,
        }),
        attemptCount: integer("attempt_count").notNull().default(0),
        nextAttemptAt: timestamp("next_attempt_at", {
            mode: "date",
            precision: 3,
        })
            .notNull()
            .defaultNow(),
        errorCode: text("error_code", { enum: ["transient", "invalid_input"] }),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
        readyAt: timestamp("ready_at", { mode: "date", precision: 3 }),
    },
    (t): PgTableExtraConfigValue[] => [
        unique("qv_calculation_generation_unique").on(
            t.conversationId,
            t.generation,
        ),
        unique("qv_calculation_id_conversation_unique").on(
            t.id,
            t.conversationId,
        ),
        check("qv_calculation_generation_check", gte(t.generation, sql`1`)),
        check("qv_calculation_attempt_check", gte(t.attemptCount, sql`0`)),
        check(
            "qv_calculation_status_check",
            inArray(t.status, [
                "queued",
                "running",
                "ready",
                "failed",
            ]).inlineParams(),
        ),
        check(
            "qv_calculation_lease_check",
            sqlOr(
                sqlAnd(
                    eq(t.status, sql`'running'`),
                    isNotNull(t.leaseToken),
                    isNotNull(t.leaseExpiresAt),
                ),
                sqlAnd(
                    ne(t.status, sql`'running'`),
                    isNull(t.leaseToken),
                    isNull(t.leaseExpiresAt),
                ),
            ),
        ),
        check(
            "qv_calculation_ready_check",
            sqlOr(
                sqlAnd(
                    eq(t.status, sql`'ready'`),
                    isNotNull(t.inputSnapshotId),
                    isNotNull(t.readyAt),
                ),
                sqlAnd(ne(t.status, sql`'ready'`), isNull(t.readyAt)),
            ),
        ),
        foreignKey({
            columns: [t.inputSnapshotId, t.id],
            foreignColumns: [
                qvInputSnapshotTable.id,
                qvInputSnapshotTable.calculationId,
            ],
            name: "qv_calculation_input_owner_fk",
        }),
        index("qv_calculation_claim_idx")
            .on(t.nextAttemptAt, t.createdAt)
            .where(inArray(t.status, ["queued", "running"]).inlineParams()),
    ],
);

/** Complete captures commit before tallying; no FK to a private response/account. */
/** @service api, credit-voting-worker, content-translation-worker */
export const qvInputSnapshotTable = pgTable(
    "qv_input_snapshot",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        calculationId: uuid("calculation_id")
            .notNull()
            .unique()
            .references(() => qvCalculationTable.id),
        creditBudget: integer("credit_budget").notNull(),
        creditPricing: text("credit_pricing").notNull(),
        allowOpposition: boolean("allow_opposition").notNull(),
        statementSetRevision: integer("statement_set_revision").notNull(),
        ruleVersion: integer("rule_version").notNull(),
        algorithmVersion: integer("algorithm_version").notNull(),
        participantCount: integer("participant_count").notNull(),
        capturedAt: timestamp("captured_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        unique("qv_input_snapshot_id_calculation_unique").on(
            t.id,
            t.calculationId,
        ),
        check(
            "qv_input_snapshot_provenance_check",
            sqlAnd(
                eq(t.creditBudget, sql.raw(String(QV_CREDIT_BUDGET))),
                eq(t.creditPricing, sql`'quadratic'`),
                eq(t.ruleVersion, sql.raw(String(QV_RULE_VERSION))),
                eq(t.algorithmVersion, sql.raw(String(QV_ALGORITHM_VERSION))),
                gte(t.participantCount, sql`0`),
                gte(t.statementSetRevision, sql`0`),
            ),
        ),
    ],
);

/** Frozen public statement versions are independent of working-source retirement. */
/** @service api, credit-voting-worker, content-translation-worker */
export const qvInputItemTable = pgTable(
    "qv_input_item",
    {
        snapshotId: uuid("snapshot_id")
            .notNull()
            .references(() => qvInputSnapshotTable.id),
        itemSlugId: varchar("item_slug_id", { length: 8 }).notNull(),
        sourceVersion: uuid("source_version").notNull(),
        position: integer("position").notNull(),
        title: text("title").notNull(),
        body: text("body"),
    },
    (t) => [
        primaryKey({ columns: [t.snapshotId, t.itemSlugId] }),
        check("qv_input_item_position_check", gte(t.position, sql`0`)),
    ],
);

/** Snapshot-local participants cannot be reattached to an account or become live ballots. */
/** @service credit-voting-worker */
export const qvInputBallotTable = pgTable(
    "qv_input_ballot",
    {
        snapshotId: uuid("snapshot_id")
            .notNull()
            .references(() => qvInputSnapshotTable.id),
        ballotIndex: integer("ballot_index").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.snapshotId, t.ballotIndex] }),
        check("qv_input_ballot_index_check", gte(t.ballotIndex, sql`0`)),
    ],
);

/** Mutable account eligibility sits outside sealed numerical evidence.
 * Account links are private recovery data and must be cleared at permanent purge.
 */
/** @service api, credit-voting-worker */
export const qvInputBallotEligibilityTable = pgTable(
    "qv_input_ballot_eligibility",
    {
        snapshotId: uuid("snapshot_id").notNull(),
        ballotIndex: integer("ballot_index").notNull(),
        userId: uuid("user_id").references(() => userTable.id),
        isAccountHidden: boolean("is_account_hidden").notNull().default(false),
    },
    (t) => [
        primaryKey({ columns: [t.snapshotId, t.ballotIndex] }),
        unique("qv_input_ballot_eligibility_account_unique").on(
            t.snapshotId,
            t.userId,
        ),
        foreignKey({
            columns: [t.snapshotId, t.ballotIndex],
            foreignColumns: [
                qvInputBallotTable.snapshotId,
                qvInputBallotTable.ballotIndex,
            ],
            name: "qv_input_ballot_eligibility_ballot_fk",
        }),
        check(
            "qv_input_ballot_eligibility_detached_check",
            sqlOr(isNotNull(t.userId), eq(t.isAccountHidden, true)),
        ),
        index("qv_input_ballot_eligibility_user_idx").on(t.userId),
    ],
);

/** @service credit-voting-worker */
export const qvInputAllocationTable = pgTable(
    "qv_input_allocation",
    {
        snapshotId: uuid("snapshot_id").notNull(),
        ballotIndex: integer("ballot_index").notNull(),
        itemSlugId: varchar("item_slug_id", { length: 8 }).notNull(),
        votes: smallint("votes").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.snapshotId, t.ballotIndex, t.itemSlugId] }),
        foreignKey({
            columns: [t.snapshotId, t.ballotIndex],
            foreignColumns: [
                qvInputBallotTable.snapshotId,
                qvInputBallotTable.ballotIndex,
            ],
            name: "qv_input_allocation_ballot_fk",
        }),
        foreignKey({
            columns: [t.snapshotId, t.itemSlugId],
            foreignColumns: [
                qvInputItemTable.snapshotId,
                qvInputItemTable.itemSlugId,
            ],
            name: "qv_input_allocation_item_fk",
        }),
        check(
            "qv_input_allocation_votes_check",
            sqlAnd(
                ne(t.votes, sql`0`),
                gte(
                    t.votes,
                    sql.raw(String(-Math.floor(Math.sqrt(QV_CREDIT_BUDGET)))),
                ),
                lte(
                    t.votes,
                    sql.raw(String(Math.floor(Math.sqrt(QV_CREDIT_BUDGET)))),
                ),
            ),
        ),
    ],
);

/** One result per captured statement, including untouched zero-score statements. */
/** @service api, credit-voting-worker */
export const qvResultItemTable = pgTable(
    "qv_result_item",
    {
        snapshotId: uuid("snapshot_id").notNull(),
        itemSlugId: varchar("item_slug_id", { length: 8 }).notNull(),
        supportUnits: bigint("support_units", { mode: "number" }).notNull(),
        oppositionUnits: bigint("opposition_units", {
            mode: "number",
        }).notNull(),
        netUnits: bigint("net_units", { mode: "number" }).notNull(),
        supportingParticipantCount: integer(
            "supporting_participant_count",
        ).notNull(),
        opposingParticipantCount: integer(
            "opposing_participant_count",
        ).notNull(),
        rank: integer("rank").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.snapshotId, t.itemSlugId] }),
        foreignKey({
            columns: [t.snapshotId, t.itemSlugId],
            foreignColumns: [
                qvInputItemTable.snapshotId,
                qvInputItemTable.itemSlugId,
            ],
            name: "qv_result_input_item_fk",
        }),
        check(
            "qv_result_item_totals_check",
            sqlAnd(
                gte(t.supportUnits, sql`0`),
                gte(t.oppositionUnits, sql`0`),
                eq(t.netUnits, sql`${t.supportUnits} - ${t.oppositionUnits}`),
                gte(t.supportingParticipantCount, sql`0`),
                gte(t.opposingParticipantCount, sql`0`),
                gte(t.rank, sql`1`),
            ),
        ),
    ],
);

/** Accepted command receipts, not drafts or a public history. @service api */
export const qvResponseCommandTable = pgTable(
    "qv_response_command",
    {
        responseId: uuid("response_id")
            .notNull()
            .references(() => qvResponseTable.id),
        commandId: uuid("command_id").notNull(),
        requestHash: varchar("request_hash", { length: 64 }).notNull(),
        resultRevision: integer("result_revision").notNull(),
        resultVersionId: uuid("result_version_id"),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
    },
    (t) => [
        primaryKey({ columns: [t.responseId, t.commandId] }),
        foreignKey({
            columns: [t.resultVersionId, t.responseId],
            foreignColumns: [
                qvResponseVersionTable.id,
                qvResponseVersionTable.responseId,
            ],
            name: "qv_command_result_owner_fk",
        }),
        check("qv_command_revision_check", gte(t.resultRevision, sql`0`)),
        index("qv_command_deleted_idx")
            .on(t.deletedAt)
            .where(isNotNull(t.deletedAt)),
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
        participantId: uuid("participant_id").references(
            () => conversationParticipantTable.id,
        ),
        opinionId: integer("opinion_id")
            .notNull()
            .references(() => opinionTable.id),
        polisVoteId: integer("polis_vote_id"), // only used for importing
        bufferEpoch: uuid("buffer_epoch"),
        bufferSequence: bigint("buffer_sequence", { mode: "number" })
            .notNull()
            .default(0),
        currentContentId: integer("current_content_id"), // null for inactive votes or during construction
        withdrawnAt: timestamp("withdrawn_at", { mode: "date", precision: 3 }),
        retiredAt: timestamp("retired_at", { mode: "date", precision: 3 }),
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
        check(
            "vote_inactive_intent_check",
            sqlOr(
                sqlAnd(isNull(t.withdrawnAt), isNull(t.retiredAt)),
                isNull(t.currentContentId),
            ),
        ),
        foreignKey({
            name: "vote_participant_account_fk",
            columns: [t.participantId, t.authorId],
            foreignColumns: [
                conversationParticipantTable.id,
                conversationParticipantTable.userId,
            ],
        }),
        unique().on(t.authorId, t.opinionId),
        unique("vote_participant_opinion_unique").on(
            t.participantId,
            t.opinionId,
        ),
        foreignKey({
            name: "vote_current_content_owner_fk",
            columns: [t.currentContentId, t.id],
            foreignColumns: [voteContentTable.id, voteContentTable.voteId],
        }),
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
export const voteContentTable = pgTable(
    "vote_content",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        voteId: integer("vote_id")
            .notNull()
            .references((): AnyPgColumn => voteTable.id),
        opinionContentId: integer("opinion_content_id")
            .references(() => opinionContentTable.id)
            .notNull(), // Exact statement version when cast; preserved across edits.
        vote: voteEnum("vote").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("vote_content_id_owner_unique").on(table.id, table.voteId),
    ],
);

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
    "off_topic",
    "other",
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
        authorId: uuid("author_id").references(() => userTable.id),
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
        authorId: uuid("author_id").references(() => userTable.id),
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
        authorId: uuid("author_id").references(() => userTable.id),
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

/** @service shared-analysis-worker, import-worker, content-translation-worker */
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
    "security_add_email",
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
        unique("notification_opinion_vote_notification_unique").on(
            t.notificationId,
        ),
        check(
            "notification_opinion_vote_positive_count",
            sql`${t.numVotes} >= 1`,
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
        unique("notification_new_opinion_notification_unique").on(
            t.notificationId,
        ),
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
    (t) => [
        unique("notification_export_notification_unique").on(t.notificationId),
    ],
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
    (t) => [
        unique("notification_import_notification_unique").on(t.notificationId),
    ],
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
        securityKey: varchar("security_key", { length: 64 }),
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
        uniqueIndex("notification_user_security_key_unique").on(
            t.userId,
            t.securityKey,
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
        payloadVersion: integer("payload_version").notNull().default(1),
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
        unique("analysis_input_snapshot_scope_unique").on(
            t.id,
            t.conversationId,
        ),
        check(
            "analysis_input_snapshot_version_check",
            inArray(t.payloadVersion, [1, 2]),
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

/** Direct, immutable evidence reference. Projections map effective local indices
 * to complete-baseline indices, without retaining account identity in the graph.
 */
/** @service api, shared-analysis-worker */
export const analysisInputBaselineTable = pgTable(
    "analysis_input_baseline",
    {
        inputSnapshotId: integer("input_snapshot_id").primaryKey(),
        baselineInputSnapshotId: integer(
            "baseline_input_snapshot_id",
        ).notNull(),
        conversationId: integer("conversation_id").notNull(),
        participantIndices: integer("participant_indices").array().notNull(),
        opinionIndices: integer("opinion_indices").array().notNull(),
        // Broader pre-survey source totals captured with the eligible matrix.
        sourceVoteCount: integer("source_vote_count").notNull(),
        sourceParticipantCount: integer("source_participant_count").notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
        foreignKey({
            columns: [t.baselineInputSnapshotId],
            foreignColumns: [analysisInputBaselineTable.inputSnapshotId],
            name: "analysis_baseline_certificate_fk",
        }),
        foreignKey({
            columns: [t.inputSnapshotId, t.conversationId],
            foreignColumns: [
                analysisInputSnapshotTable.id,
                analysisInputSnapshotTable.conversationId,
            ],
            name: "analysis_baseline_input_scope_fk",
        }),
        foreignKey({
            columns: [t.baselineInputSnapshotId, t.conversationId],
            foreignColumns: [
                analysisInputSnapshotTable.id,
                analysisInputSnapshotTable.conversationId,
            ],
            name: "analysis_baseline_source_scope_fk",
        }),
        index("analysis_input_baseline_source_idx").on(
            t.baselineInputSnapshotId,
        ),
        check(
            "analysis_input_baseline_source_counts_check",
            sqlAnd(
                gte(t.sourceVoteCount, 0),
                gte(t.sourceParticipantCount, 0),
                lte(t.sourceParticipantCount, t.sourceVoteCount),
            ),
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisInputParticipantEligibilityTable = pgTable(
    "analysis_input_participant_eligibility",
    {
        inputSnapshotId: integer("input_snapshot_id")
            .notNull()
            .references(() => analysisInputSnapshotTable.id),
        participantIndex: integer("participant_index").notNull(),
        userId: uuid("user_id").references(() => userTable.id),
        isAccountHidden: boolean("is_account_hidden").notNull().default(false),
    },
    (t) => [
        primaryKey({ columns: [t.inputSnapshotId, t.participantIndex] }),
        unique("analysis_input_participant_eligibility_account_unique").on(
            t.inputSnapshotId,
            t.userId,
        ),
        check(
            "analysis_input_participant_eligibility_index_check",
            gte(t.participantIndex, 0),
        ),
        check(
            "analysis_input_participant_eligibility_detached_check",
            sqlOr(isNotNull(t.userId), eq(t.isAccountHidden, true)),
        ),
        index("analysis_input_participant_eligibility_user_idx").on(t.userId),
    ],
);

export const analysisInputModeEnum = pgEnum("analysis_input_mode", [
    "closing",
    "live",
]);

/** @service api, shared-analysis-worker, scoring-worker, credit-voting-worker */
export const conversationAnalysisCloseTable = pgTable(
    "conversation_analysis_close",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        // Reopening rotates this epoch; historical closes do not follow it.
        closeEpoch: uuid("close_epoch").notNull(),
        sourceRevision: bigint("source_revision", { mode: "number" }).notNull(),
        selectedInputMode: analysisInputModeEnum("selected_input_mode")
            .notNull()
            .default("closing"),
        // Native revisions are scoped to this close. Null means its original result.
        requestedResultRevision: bigint("requested_result_revision", {
            mode: "number",
        }),
        servedInputMode: analysisInputModeEnum("served_input_mode")
            .notNull()
            .default("closing"),
        servedResultRevision: bigint("served_result_revision", {
            mode: "number",
        }),
        selectionRevision: bigint("selection_revision", { mode: "number" })
            .notNull()
            .default(0),
        // First native result revision that can include the latest input change.
        minimumClosingResultRevision: bigint(
            "minimum_closing_result_revision",
            { mode: "number" },
        )
            .notNull()
            .default(0),
        finalizedAt: timestamp("finalized_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
    },
    (t) => [
        unique("conversation_analysis_close_epoch_unique").on(
            t.conversationId,
            t.closeEpoch,
        ),
        unique("conversation_analysis_close_scope_unique").on(
            t.id,
            t.conversationId,
        ),
        check(
            "conversation_analysis_close_revision_check",
            sqlAnd(
                gte(t.sourceRevision, 0),
                gte(t.selectionRevision, 0),
                gte(t.minimumClosingResultRevision, 0),
                sqlOr(
                    isNull(t.requestedResultRevision),
                    gt(t.requestedResultRevision, 0),
                ),
                sqlOr(
                    isNull(t.servedResultRevision),
                    gt(t.servedResultRevision, 0),
                ),
                sqlOr(
                    eq(t.servedInputMode, "closing"),
                    isNotNull(t.servedResultRevision),
                ),
            ),
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const polisAnalysisCloseTable = pgTable(
    "polis_analysis_close",
    {
        closeId: integer("close_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        opinionGroupSpecId: integer("opinion_group_spec_id").notNull(),
        // The stable checkpoint ID and original survey provenance never move.
        originalViewSnapshotId: integer("original_view_snapshot_id").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.closeId, t.opinionGroupSpecId] }),
        foreignKey({
            name: "polis_analysis_close_scope_fk",
            columns: [t.closeId, t.conversationId],
            foreignColumns: [
                conversationAnalysisCloseTable.id,
                conversationAnalysisCloseTable.conversationId,
            ],
        }),
        foreignKey({
            name: "polis_analysis_close_original_view_fk",
            columns: [
                t.originalViewSnapshotId,
                t.conversationId,
                t.opinionGroupSpecId,
            ],
            foreignColumns: [
                conversationViewSnapshotTable.id,
                conversationViewSnapshotTable.conversationId,
                conversationViewSnapshotTable.opinionGroupSpecId,
            ],
        }),
        index("polis_analysis_close_original_view_idx").on(
            t.originalViewSnapshotId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const polisAnalysisCloseGenerationTable = pgTable(
    "polis_analysis_close_generation",
    {
        conversationId: integer("conversation_id").notNull(),
        dataGeneration: integer("data_generation").notNull(),
        closeId: integer("close_id").notNull(),
        inputSnapshotId: integer("input_snapshot_id"),
        // An accepted generation remains published after it is superseded.
        publishedAt: timestamp("published_at", { mode: "date" }),
    },
    (t) => [
        primaryKey({ columns: [t.conversationId, t.dataGeneration] }),
        foreignKey({
            name: "polis_analysis_close_generation_scope_fk",
            columns: [t.closeId, t.conversationId],
            foreignColumns: [
                conversationAnalysisCloseTable.id,
                conversationAnalysisCloseTable.conversationId,
            ],
        }),
        index("polis_analysis_close_generation_close_idx").on(t.closeId),
        index("polis_analysis_close_generation_published_idx")
            .on(t.closeId, t.dataGeneration.desc())
            .where(isNotNull(t.publishedAt)),
        foreignKey({
            name: "polis_analysis_close_generation_capture_fk",
            columns: [t.inputSnapshotId, t.conversationId],
            foreignColumns: [
                analysisInputSnapshotTable.id,
                analysisInputSnapshotTable.conversationId,
            ],
        }),
        check(
            "polis_analysis_close_generation_published_capture",
            sqlOr(isNull(t.publishedAt), isNotNull(t.inputSnapshotId)),
        ),
        check(
            "polis_analysis_close_generation_positive",
            gte(t.dataGeneration, 1),
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
        usesClosingInputs: boolean("uses_closing_inputs")
            .notNull()
            .default(false),
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
        unique("analysis_work_state_input_spec_unique").on(
            t.conversationId,
            t.opinionGroupSpecId,
            t.usesClosingInputs,
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
        // Regrouped Closing results reuse the original question/option catalogue.
        sourceSurveyAggregateSnapshotId: integer(
            "source_survey_aggregate_snapshot_id",
        ),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t): PgTableExtraConfigValue[] => [
        unique("survey_aggregate_snapshot_checkpoint_unique").on(
            t.analysisSnapshotId,
        ),
        index("survey_aggregate_snapshot_conversation_idx").on(
            t.conversationId,
        ),
        foreignKey({
            name: "survey_aggregate_snapshot_source_fk",
            columns: [t.sourceSurveyAggregateSnapshotId],
            foreignColumns: [surveyAggregateSnapshotTable.id],
        }),
        index("survey_aggregate_snapshot_source_idx")
            .on(t.sourceSurveyAggregateSnapshotId)
            .where(isNotNull(t.sourceSurveyAggregateSnapshotId)),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisSurveyChoiceCaptureTable = pgTable(
    "analysis_survey_choice_capture",
    {
        surveyAggregateSnapshotId: integer("survey_aggregate_snapshot_id")
            .primaryKey()
            .references(() => surveyAggregateSnapshotTable.id),
        baselineInputSnapshotId: integer("baseline_input_snapshot_id")
            .notNull()
            .references(() => analysisInputBaselineTable.inputSnapshotId),
    },
    (t) => [
        index("analysis_survey_choice_capture_input_idx").on(
            t.baselineInputSnapshotId,
        ),
    ],
);

/** @service api, shared-analysis-worker */
export const analysisSurveyChoiceTable = pgTable(
    "analysis_survey_choice",
    {
        surveyAggregateSnapshotId: integer("survey_aggregate_snapshot_id")
            .notNull()
            .references(
                () =>
                    analysisSurveyChoiceCaptureTable.surveyAggregateSnapshotId,
            ),
        participantIndex: integer("participant_index").notNull(),
        questionSlugId: varchar("question_slug_id", { length: 8 }).notNull(),
        optionSlugIds: text("option_slug_ids").array().notNull(),
    },
    (t) => [
        primaryKey({
            columns: [
                t.surveyAggregateSnapshotId,
                t.participantIndex,
                t.questionSlugId,
            ],
        }),
        check(
            "analysis_survey_choice_bounds",
            sqlAnd(
                gte(t.participantIndex, 0),
                sql`cardinality(${t.optionSlugIds}) > 0`,
            ),
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
        index(
            "opinion_group_candidate_description_locale_request_updated_idx",
        ).on(t.updatedAt, t.id),
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
        sourcesBlocked: boolean("sources_blocked").notNull().default(false),
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
        closeReplacementGeneration: integer("close_replacement_generation"),
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
        unique("conversation_view_snapshot_scope_unique").on(
            t.id,
            t.conversationId,
            t.opinionGroupSpecId,
        ),
        foreignKey({
            name: "conversation_view_snapshot_close_generation_fk",
            columns: [t.conversationId, t.closeReplacementGeneration],
            foreignColumns: [
                polisAnalysisCloseGenerationTable.conversationId,
                polisAnalysisCloseGenerationTable.dataGeneration,
            ],
        }),
        unique("conversation_view_snapshot_close_generation_spec_unique").on(
            t.conversationId,
            t.closeReplacementGeneration,
            t.opinionGroupSpecId,
        ),
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

/** @service api, shared-analysis-worker, content-translation-worker, scoring-worker, credit-voting-worker */
export const realtimeEventOutboxTable = pgTable(
    "realtime_event_outbox",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        eventType: varchar("event_type", { length: 100 }).notNull(),
        payload: jsonb("payload").notNull(),
        deliveryId: integer("delivery_id").unique(),
        deliveredAt: timestamp("delivered_at", { mode: "date", precision: 3 }),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("realtime_event_outbox_created_at_idx").on(t.createdAt),
        index("realtime_event_outbox_pending_delivery_idx")
            .on(t.id)
            .where(isNull(t.deliveryId)),
        index("realtime_event_outbox_conversation_replay_idx")
            .using(
                "btree",
                sql`(${t.payload}->>'conversationSlugId')`,
                t.deliveryId,
            )
            .where(
                inArray(t.eventType, [
                    "conversation_analysis_updated",
                    "conversation_settings_updated",
                    "conversation_survey_updated",
                    "opinion_updated",
                    "opinion_source_changed",
                    "conversation_comment_stats_updated",
                    "conversation_qv_stats_updated",
                    "conversation_qv_calculation_updated",
                    "opinion_vote_counts_updated",
                ]).inlineParams(),
            ),
        index("realtime_event_outbox_ranking_replay_idx")
            .using(
                "btree",
                sql`(${t.payload}->>'conversationSlugId')`,
                t.deliveryId,
            )
            .where(
                eq(
                    t.eventType,
                    "conversation_ranking_stats_updated",
                ).inlineParams(),
            ),
    ],
);

/** @service api */
export const realtimeEventDispatchStateTable = pgTable(
    "realtime_event_dispatch_state",
    {
        id: integer("id").primaryKey(),
        lastDeliveryId: integer("last_delivery_id").notNull().default(0),
        replayFloorDeliveryId: integer("replay_floor_delivery_id")
            .notNull()
            .default(0),
    },
    (t) => [
        check(
            "realtime_event_dispatch_state_singleton_check",
            eq(t.id, 1).inlineParams(),
        ),
        check(
            "realtime_event_dispatch_state_sequence_check",
            sqlAnd(
                gte(t.replayFloorDeliveryId, 0),
                gte(t.lastDeliveryId, t.replayFloorDeliveryId),
            ),
        ),
    ],
);

/** @service api, content-translation-worker, credit-voting-worker */
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
        index("opinion_group_scope_latest_lineage_idx")
            .on(t.scopeId, t.candidateId.desc())
            .where(isNotNull(t.lineageId)),
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
        userId: uuid("user_id").references(() => userTable.id),
        participantId: uuid("participant_id").references(
            () => conversationParticipantTable.id,
        ),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        check(
            "opinion_group_user_identity_check",
            sqlOr(isNotNull(t.userId), isNotNull(t.participantId)),
        ),
        foreignKey({
            name: "opinion_group_participant_account_fk",
            columns: [t.participantId, t.userId],
            foreignColumns: [
                conversationParticipantTable.id,
                conversationParticipantTable.userId,
            ],
        }),
        unique("opinion_group_user_candidate_unique").on(
            t.candidateId,
            t.userId,
        ),
        unique("opinion_group_user_group_unique").on(t.groupId, t.userId),
        unique("opinion_group_participant_candidate_unique").on(
            t.candidateId,
            t.participantId,
        ),
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
        sourceDataGeneration: integer("source_data_generation"),
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

/** Exact per-upload addresses survive failures and stale generation attempts. */
export const conversationExportObjectTable = pgTable(
    "conversation_export_object",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        artifactId: integer("artifact_id")
            .notNull()
            .references(() => conversationExportArtifactTable.id),
        generationAttempt: integer("generation_attempt").notNull(),
        bucketName: text("bucket_name").notNull(),
        region: text("region").notNull(),
        s3Key: text("s3_key").notNull(),
        uploadExpiresAt: timestamp("upload_expires_at", {
            mode: "date",
            precision: 3,
        }).notNull(),
        uploadFinishedAt: timestamp("upload_finished_at", {
            mode: "date",
            precision: 3,
        }),
        cleanupRequestedAt: timestamp("cleanup_requested_at", {
            mode: "date",
            precision: 3,
        }),
        objectDeletedAt: timestamp("object_deleted_at", {
            mode: "date",
            precision: 3,
        }),
        deleteAttempts: integer("delete_attempts").notNull().default(0),
        lastDeleteAttemptAt: timestamp("last_delete_attempt_at", {
            mode: "date",
            precision: 3,
        }),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 3,
        }),
    },
    (table) => [
        unique("conversation_export_object_address_unique").on(
            table.bucketName,
            table.s3Key,
        ),
        index("conversation_export_object_artifact_idx").on(table.artifactId),
        index("conversation_export_object_cleanup_idx")
            .on(table.cleanupRequestedAt, table.id)
            .where(isNull(table.objectDeletedAt)),
        check(
            "conversation_export_object_lease_check",
            sqlOr(
                sqlAnd(isNull(table.leaseToken), isNull(table.leaseExpiresAt)),
                sqlAnd(
                    isNotNull(table.leaseToken),
                    isNotNull(table.leaseExpiresAt),
                ),
            ),
        ),
        check(
            "conversation_export_object_attempts_check",
            sqlAnd(
                gte(table.deleteAttempts, 0),
                gte(table.generationAttempt, 0),
            ),
        ),
        check(
            "conversation_export_object_deleted_check",
            sqlOr(
                isNull(table.objectDeletedAt),
                isNotNull(table.cleanupRequestedAt),
            ),
        ),
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
        userId: uuid("user_id").references(() => userTable.id),
        requesterPurgedAt: timestamp("requester_purged_at", {
            mode: "date",
            precision: 3,
        }),
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
        check(
            "conversation_import_requester_check",
            sqlOr(
                sqlAnd(isNotNull(t.userId), isNull(t.requesterPurgedAt)),
                sqlAnd(
                    isNull(t.userId),
                    isNotNull(t.requesterPurgedAt),
                    isNotNull(t.conversationId),
                ),
            ),
        ),
        index("conversation_import_status_idx").on(t.status),
        index("conversation_import_created_idx").on(t.createdAt),
        index("conversation_import_user_idx").on(t.userId),
        uniqueIndex("conversation_import_active_user_unique")
            .on(t.userId)
            .where(sql`${t.status} = 'processing'`),
    ],
);

// One resumable response per participant and comparison conversation (BWS or pairwise).
// Answer rows are canonical; JSON history is retained for session serialization.
/** @service scoring-worker, api, shared-analysis-worker */
export const comparisonResponseTable = pgTable(
    "comparison_response",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        // Historical name: this is the private account link, not a local index.
        participantId: uuid("participant_id").references(() => userTable.id),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        // Final ordered ranking as JSON array of opinionSlugIds (best→worst).
        // Null while the session is in progress.
        ranking: jsonb("ranking"), // string[] | null
        // Serialized answer history, synchronized with comparison_answer.
        // Each entry: { best: slugId, worst: slugId, set: slugId[] }
        comparisons: jsonb("comparisons").notNull(), // ComparisonAnswer[]
        detachedAt: timestamp("detached_at", { mode: "date", precision: 3 }),
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
        index("comparison_response_conversation_idx").on(t.conversationId),
        check(
            "comparison_response_account_binding_check",
            sqlOr(
                sqlAnd(isNotNull(t.participantId), isNull(t.detachedAt)),
                sqlAnd(isNull(t.participantId), isNotNull(t.detachedAt)),
            ),
        ),
    ],
);

// Computed Solidago scores for comparison conversations.
// Multiple rows per conversation are kept over time,
// ranking_conversation_config.currentRankingScoreId points to the latest.
// Populated by the scoring worker's Valkey-driven queue loop.
/** @service scoring-worker, api */
export const rankingScoreTable = pgTable(
    "ranking_score",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        // --- Output: ranking scores (JSONB backup blob) ---
        // Array of { entityId, score, uncertaintyLeft, uncertaintyRight }.
        // Raw model units; the worker stores fixed-scale display values separately.
        // Kept as backup; canonical data is in ranking_score_entity table.
        scores: jsonb("scores").notNull(),
        // Record<entityId, participantCount> for display (JSONB backup blob)
        // Kept as backup; canonical data is in ranking_score_entity.participant_count.
        participantCounts: jsonb("participant_counts").notNull(),
        // --- Input context: what parameters produced these scores ---
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
    },
    (table) => [
        index("ranking_score_conversation_idx").on(
            table.conversationId,
            table.id,
        ),
        index("ranking_score_unclassified_context_idx")
            .on(table.id)
            .where(
                sqlAnd(
                    isNotNull(table.userWeightsSnapshot),
                    ne(table.userWeightsSnapshot, sql`'null'::jsonb`),
                ),
            ),
        unique("ranking_score_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
    ],
);

/** Numerical evidence owned by an existing score/checkpoint, never a live ballot.
 * No account, source response, answer or personal-score FK belongs in this graph.
 */
/** @service scoring-worker, api */
export const rankingInputSnapshotTable = pgTable(
    "ranking_input_snapshot",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        statsSnapshotId: integer("stats_snapshot_id").unique(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        comparisonMethod: rankingModeEnum("comparison_method").notNull(),
        scoringInputRevision: bigint("scoring_input_revision", {
            mode: "number",
        }).notNull(),
        algorithmVersion: integer("algorithm_version").notNull(),
        solidagoVersion: varchar("solidago_version", { length: 100 }).notNull(),
        pipelineConfig: jsonb("pipeline_config").notNull(),
        participantCount: integer("participant_count").notNull(),
        itemCount: integer("item_count").notNull(),
        answerCount: integer("answer_count").notNull(),
        sealedAt: timestamp("sealed_at", { mode: "date", precision: 3 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("ranking_input_snapshot_conversation_idx").on(
            t.conversationId,
            t.statsSnapshotId,
        ),
        index("ranking_input_snapshot_prepared_idx")
            .on(t.conversationId, t.scoringInputRevision, t.createdAt, t.id)
            .where(sqlAnd(isNull(t.statsSnapshotId), isNotNull(t.sealedAt))),
        foreignKey({
            columns: [t.statsSnapshotId, t.conversationId],
            foreignColumns: [
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsSnapshotTable.conversationId,
            ],
            name: "ranking_input_stats_conversation_fk",
        }),
        unique("ranking_input_id_conversation_unique").on(
            t.id,
            t.conversationId,
        ),
        check(
            "ranking_input_snapshot_bounds_check",
            sqlAnd(
                gte(t.participantCount, 0),
                gte(t.scoringInputRevision, 0),
                gte(t.algorithmVersion, 1),
                gte(t.itemCount, 0),
                gte(t.answerCount, 0),
            ),
        ),
        check(
            "ranking_input_published_sealed_check",
            sqlOr(isNull(t.statsSnapshotId), isNotNull(t.sealedAt)),
        ),
    ],
);

/** @service scoring-worker, api */
export const rankingInputParticipantTable = pgTable(
    "ranking_input_participant",
    {
        inputSnapshotId: uuid("input_snapshot_id")
            .notNull()
            .references(() => rankingInputSnapshotTable.id),
        participantIndex: integer("participant_index").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.inputSnapshotId, t.participantIndex] }),
        check(
            "ranking_input_participant_index_check",
            gte(t.participantIndex, 0).inlineParams(),
        ),
    ],
);

/** @service api, scoring-worker */
export const rankingInputParticipantEligibilityTable = pgTable(
    "ranking_input_participant_eligibility",
    {
        inputSnapshotId: uuid("input_snapshot_id").notNull(),
        participantIndex: integer("participant_index").notNull(),
        userId: uuid("user_id").references(() => userTable.id),
        isAccountHidden: boolean("is_account_hidden").notNull().default(false),
    },
    (t) => [
        primaryKey({ columns: [t.inputSnapshotId, t.participantIndex] }),
        unique("ranking_input_participant_eligibility_account_unique").on(
            t.inputSnapshotId,
            t.userId,
        ),
        foreignKey({
            columns: [t.inputSnapshotId, t.participantIndex],
            foreignColumns: [
                rankingInputParticipantTable.inputSnapshotId,
                rankingInputParticipantTable.participantIndex,
            ],
            name: "ranking_input_participant_eligibility_participant_fk",
        }),
        check(
            "ranking_input_participant_eligibility_detached_check",
            sqlOr(isNotNull(t.userId), eq(t.isAccountHidden, true)),
        ),
        index("ranking_input_participant_eligibility_user_idx").on(t.userId),
    ],
);

/** The ordered effective entity catalogue used by this computation. */
/** @service scoring-worker, api */
export const rankingInputItemTable = pgTable(
    "ranking_input_item",
    {
        inputSnapshotId: uuid("input_snapshot_id")
            .notNull()
            .references(() => rankingInputSnapshotTable.id),
        itemSlugId: varchar("item_slug_id", { length: 8 }).notNull(),
        position: integer("position").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.inputSnapshotId, t.itemSlugId] }),
        unique("ranking_input_item_position_unique").on(
            t.inputSnapshotId,
            t.position,
        ),
        check(
            "ranking_input_item_position_check",
            gte(t.position, 0).inlineParams(),
        ),
    ],
);

/** Preserve accepted candidate order and its effective subset after source filtering. */
/** @service scoring-worker, api */
export const rankingInputAnswerTable = pgTable(
    "ranking_input_answer",
    {
        inputSnapshotId: uuid("input_snapshot_id").notNull(),
        participantIndex: integer("participant_index").notNull(),
        position: integer("position").notNull(),
        bestSlugId: varchar("best_slug_id", { length: 8 }).notNull(),
        worstSlugId: varchar("worst_slug_id", { length: 8 }).notNull(),
        candidateSet: text("candidate_set").array().notNull(),
        effectiveCandidateSet: text("effective_candidate_set")
            .array()
            .notNull(),
    },
    (t) => [
        primaryKey({
            columns: [t.inputSnapshotId, t.participantIndex, t.position],
        }),
        foreignKey({
            columns: [t.inputSnapshotId, t.participantIndex],
            foreignColumns: [
                rankingInputParticipantTable.inputSnapshotId,
                rankingInputParticipantTable.participantIndex,
            ],
            name: "ranking_input_answer_participant_fk",
        }),
        foreignKey({
            columns: [t.inputSnapshotId, t.bestSlugId],
            foreignColumns: [
                rankingInputItemTable.inputSnapshotId,
                rankingInputItemTable.itemSlugId,
            ],
            name: "ranking_input_answer_best_item_fk",
        }),
        foreignKey({
            columns: [t.inputSnapshotId, t.worstSlugId],
            foreignColumns: [
                rankingInputItemTable.inputSnapshotId,
                rankingInputItemTable.itemSlugId,
            ],
            name: "ranking_input_answer_worst_item_fk",
        }),
        check(
            "ranking_input_answer_choices_check",
            sqlAnd(gte(t.position, 0), ne(t.bestSlugId, t.worstSlugId)),
        ),
        // PostgreSQL arrays have no typed cardinality/correlated-array construction helper.
        check(
            "ranking_input_answer_candidates_check",
            sqlAnd(
                sql`cardinality(${t.candidateSet}) BETWEEN 2 AND 4`,
                sql`cardinality(${t.effectiveCandidateSet}) BETWEEN 2 AND 4`,
                arrayContains(t.candidateSet, t.effectiveCandidateSet),
                arrayContains(
                    t.effectiveCandidateSet,
                    sql`ARRAY[${t.bestSlugId}::text, ${t.worstSlugId}::text]`,
                ),
            ),
        ),
    ],
);

/** Complete live-eligible input before item lifecycle filtering, captured together
 * with the effective input. Identical datasets share one graph via a self-reference.
 * This certificate is immutable; legacy publications are not backfilled from live data.
 */
/** @service scoring-worker, api */
export const comparisonInputBaselineTable = pgTable(
    "comparison_input_baseline",
    {
        inputSnapshotId: uuid("input_snapshot_id").primaryKey(),
        baselineInputSnapshotId: uuid("baseline_input_snapshot_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 3 })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        foreignKey({
            columns: [t.inputSnapshotId, t.conversationId],
            foreignColumns: [
                rankingInputSnapshotTable.id,
                rankingInputSnapshotTable.conversationId,
            ],
            name: "comparison_baseline_input_conversation_fk",
        }),
        foreignKey({
            columns: [t.baselineInputSnapshotId, t.conversationId],
            foreignColumns: [
                rankingInputSnapshotTable.id,
                rankingInputSnapshotTable.conversationId,
            ],
            name: "comparison_baseline_source_conversation_fk",
        }),
        index("comparison_input_baseline_source_idx").on(
            t.baselineInputSnapshotId,
            t.conversationId,
        ),
    ],
);

/** @service scoring-worker, api, content-translation-worker */
export const rankingConversationStatsSnapshotTable = pgTable(
    "ranking_conversation_stats_snapshot",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        conversationId: integer("conversation_id")
            .notNull()
            .references(() => conversationTable.id),
        // Null for legacy checkpoints without a recorded raw-score provenance.
        rankingScoreId: integer("ranking_score_id"),
        // Closure can reuse sealed evidence without moving its original binding.
        reusedInputSnapshotId: uuid("reused_input_snapshot_id"),
        derivedFromCloseId: integer("derived_from_close_id"),
        itemCount: integer("item_count").notNull(),
        totalItemCount: integer("total_item_count").notNull(),
        voteCount: integer("vote_count").notNull(),
        totalVoteCount: integer("total_vote_count").notNull(),
        participantCount: integer("participant_count").notNull(),
        totalParticipantCount: integer("total_participant_count").notNull(),
        scoringInputRevision: bigint("scoring_input_revision", {
            mode: "number",
        }).notNull(),
        isClosed: boolean("is_closed").notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table): PgTableExtraConfigValue[] => [
        foreignKey({
            columns: [table.rankingScoreId, table.conversationId],
            foreignColumns: [
                rankingScoreTable.id,
                rankingScoreTable.conversationId,
            ],
            name: "ranking_stats_snapshot_score_conversation_fk",
        }),
        foreignKey({
            columns: [table.reusedInputSnapshotId, table.conversationId],
            foreignColumns: [
                rankingInputSnapshotTable.id,
                rankingInputSnapshotTable.conversationId,
            ],
            name: "ranking_stats_reused_input_conversation_fk",
        }),
        foreignKey({
            name: "ranking_stats_derived_close_fk",
            columns: [table.derivedFromCloseId, table.conversationId],
            foreignColumns: [
                conversationAnalysisCloseTable.id,
                conversationAnalysisCloseTable.conversationId,
            ],
        }),
        index("ranking_stats_reused_input_idx")
            .on(table.reusedInputSnapshotId)
            .where(isNotNull(table.reusedInputSnapshotId)),
        uniqueIndex("comparison_closing_result_revision_unique")
            .on(table.derivedFromCloseId, table.scoringInputRevision)
            .where(isNotNull(table.derivedFromCloseId)),
        check(
            "comparison_derived_closing_result_check",
            sqlOr(
                isNull(table.derivedFromCloseId),
                sqlAnd(
                    eq(table.isClosed, true),
                    isNull(table.reusedInputSnapshotId),
                ),
            ),
        ),
        check(
            "ranking_stats_reused_input_closed_check",
            sqlOr(
                isNull(table.reusedInputSnapshotId),
                eq(table.isClosed, true),
            ),
        ),
        unique("ranking_stats_snapshot_id_conversation_unique").on(
            table.id,
            table.conversationId,
        ),
        index("ranking_conversation_stats_snapshot_latest_idx")
            .using(
                "btree",
                table.conversationId,
                sql`${table.createdAt} DESC`,
                sql`${table.id} DESC`,
            )
            .where(sql`${table.deletedAt} IS NULL`),
        index("ranking_stats_snapshot_deleted_idx")
            .on(table.deletedAt, table.id)
            .where(sql`${table.deletedAt} IS NOT NULL`),
        check(
            "ranking_conversation_stats_snapshot_counts_check",
            sql`${table.itemCount} >= 0 AND ${table.itemCount} <= ${table.totalItemCount} AND ${table.voteCount} >= 0 AND ${table.voteCount} <= ${table.totalVoteCount} AND ${table.participantCount} >= 0 AND ${table.participantCount} <= ${table.totalParticipantCount} AND ${table.scoringInputRevision} >= 0`,
        ),
    ],
);

/** @service scoring-worker, api, content-translation-worker */
export const rankingConversationStatsItemTable = pgTable(
    "ranking_conversation_stats_item",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        statsSnapshotId: integer("stats_snapshot_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        rankingItemId: integer("ranking_item_id").notNull(),
        rankingItemContentId: integer("ranking_item_content_id"),
        lifecycleStatus:
            rankingItemLifecycleStatusEnum("lifecycle_status").notNull(),
        excludedByModeration: boolean("excluded_by_moderation")
            .default(false)
            .notNull(),
        score: real("score"),
        rank: integer("rank"),
        participantCount: integer("participant_count").notNull(),
        externalUrl: text("external_url"),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        foreignKey({
            columns: [table.statsSnapshotId, table.conversationId],
            foreignColumns: [
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsSnapshotTable.conversationId,
            ],
            name: "ranking_stats_item_snapshot_conversation_fk",
        }),
        foreignKey({
            columns: [table.rankingItemId, table.conversationId],
            foreignColumns: [
                rankingItemTable.id,
                rankingItemTable.conversationId,
            ],
            name: "ranking_stats_item_item_conversation_fk",
        }),
        foreignKey({
            columns: [table.rankingItemContentId, table.rankingItemId],
            foreignColumns: [
                rankingItemContentTable.id,
                rankingItemContentTable.rankingItemId,
            ],
            name: "ranking_stats_item_content_item_fk",
        }),
        check(
            "ranking_stats_item_redacted_source_check",
            sqlOr(
                isNotNull(table.rankingItemContentId),
                isNull(table.externalUrl),
            ),
        ),
        uniqueIndex("ranking_stats_item_snapshot_item_unique").on(
            table.statsSnapshotId,
            table.rankingItemId,
        ),
        index("ranking_stats_item_deleted_idx")
            .on(table.deletedAt, table.id)
            .where(sql`${table.deletedAt} IS NOT NULL`),
        check(
            "ranking_stats_item_score_rank_check",
            sql`((${table.score} IS NULL AND ${table.rank} IS NULL) OR (${table.score} IS NOT NULL AND ${table.rank} IS NOT NULL AND ${table.score} >= 0 AND ${table.score} <= 1 AND ${table.rank} > 0))`,
        ),
        check(
            "ranking_stats_item_participant_count_check",
            sql`${table.participantCount} >= 0`,
        ),
    ],
);

/** @service scoring-worker, api, content-translation-worker */
export const rankingConversationStatsCheckpointTable = pgTable(
    "ranking_conversation_stats_checkpoint",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        statsSnapshotId: integer("stats_snapshot_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        reason: rankingStatsCheckpointReasonEnum("reason").notNull(),
        participantMilestone: integer("participant_milestone"),
        voteMilestone: integer("vote_milestone"),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.statsSnapshotId, table.conversationId],
            foreignColumns: [
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsSnapshotTable.conversationId,
            ],
            name: "ranking_stats_checkpoint_snapshot_conversation_fk",
        }),
        index("ranking_stats_checkpoint_snapshot_idx").on(
            table.statsSnapshotId,
        ),
        uniqueIndex("ranking_stats_checkpoint_participant_unique")
            .on(table.conversationId, table.participantMilestone)
            .where(sql`${table.reason} = 'major_participation_milestone'`),
        uniqueIndex("ranking_stats_checkpoint_vote_unique")
            .on(table.conversationId, table.voteMilestone)
            .where(sql`${table.reason} = 'major_vote_milestone'`),
        uniqueIndex("ranking_stats_checkpoint_closed_unique")
            .on(table.statsSnapshotId)
            .where(sql`${table.reason} = 'conversation_closed'`),
        check(
            "ranking_stats_checkpoint_milestone_check",
            sql`((${table.reason} = 'major_participation_milestone' AND ${table.participantMilestone} IS NOT NULL AND ${table.voteMilestone} IS NULL AND ${table.participantMilestone} > 0) OR (${table.reason} = 'major_vote_milestone' AND ${table.participantMilestone} IS NULL AND ${table.voteMilestone} IS NOT NULL AND ${table.voteMilestone} > 0) OR (${table.reason} = 'conversation_closed' AND ${table.participantMilestone} IS NULL AND ${table.voteMilestone} IS NULL))`,
        ),
    ],
);

/** @service api, scoring-worker */
export const comparisonAnalysisCloseTable = pgTable(
    "comparison_analysis_close",
    {
        closeId: integer("close_id").primaryKey(),
        conversationId: integer("conversation_id").notNull(),
        originalStatsSnapshotId: integer("original_stats_snapshot_id")
            .notNull()
            .unique(),
        closingStatsSnapshotId: integer("closing_stats_snapshot_id").notNull(),
        liveStatsSnapshotId: integer("live_stats_snapshot_id").notNull(),
        servedStatsSnapshotId: integer("served_stats_snapshot_id").notNull(),
        processedClosingRevision: bigint("processed_closing_revision", {
            mode: "number",
        })
            .notNull()
            .default(0),
        failedClosingRevision: bigint("failed_closing_revision", {
            mode: "number",
        }),
        failedLiveRevision: bigint("failed_live_revision", { mode: "number" }),
    },
    (t) => [
        foreignKey({
            name: "comparison_analysis_close_scope_fk",
            columns: [t.closeId, t.conversationId],
            foreignColumns: [
                conversationAnalysisCloseTable.id,
                conversationAnalysisCloseTable.conversationId,
            ],
        }),
        foreignKey({
            name: "comparison_analysis_close_original_stats_fk",
            columns: [t.originalStatsSnapshotId, t.conversationId],
            foreignColumns: [
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsSnapshotTable.conversationId,
            ],
        }),
        ...[
            t.closingStatsSnapshotId,
            t.liveStatsSnapshotId,
            t.servedStatsSnapshotId,
        ].map((column) =>
            foreignKey({
                name: `comparison_close_${column.name}_fk`,
                columns: [column, t.conversationId],
                foreignColumns: [
                    rankingConversationStatsSnapshotTable.id,
                    rankingConversationStatsSnapshotTable.conversationId,
                ],
            }),
        ),
    ],
);

// Canonical raw entity-level scores for one ranking_score computation.
// The JSONB `scores` column on ranking_score is kept as a backup blob.
// The API reads the worker's stored display scores alongside these raw values.
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
        // Solidago Squash, shifted to 0–1. Null until a legacy raw score is backfilled.
        displayScore: real("display_score"),
        uncertaintyLeft: real("uncertainty_left").notNull(),
        uncertaintyRight: real("uncertainty_right").notNull(),
        participantCount: integer("participant_count").notNull().default(0),
    },
    (t) => [
        index("ranking_score_entity_slug_idx").on(
            t.rankingScoreId,
            t.entitySlugId,
        ),
        check(
            "ranking_score_entity_display_score_check",
            sql`${t.displayScore} IS NULL OR (${t.displayScore} >= 0 AND ${t.displayScore} <= 1)`,
        ),
    ],
);

// A factual answered task: two candidates for pairwise, up to four for BWS.
// Withdrawn/replaced answers remain available as soft-deleted history.
/** @service scoring-worker, api */
export const comparisonAnswerTable = pgTable(
    "comparison_answer",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        comparisonResponseId: integer("comparison_response_id").notNull(),
        position: integer("position").notNull(), // 0-based order within the session
        bestSlugId: varchar("best_slug_id", { length: 8 }).notNull(),
        worstSlugId: varchar("worst_slug_id", { length: 8 }).notNull(),
        candidateSet: text("candidate_set").array().notNull(), // slugIds of all items shown in this comparison
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        foreignKey({
            name: "comparison_answer_response_fk",
            columns: [t.comparisonResponseId],
            foreignColumns: [comparisonResponseTable.id],
        }),
        index("comparison_answer_response_idx").on(t.comparisonResponseId),
        // Only one active comparison can exist per session position.
        // Soft-deleted historical rows remain allowed for audit/history.
        uniqueIndex("comparison_answer_active_response_position_unique")
            .on(t.comparisonResponseId, t.position)
            .where(isNull(t.deletedAt)),
        check(
            "comparison_answer_position_check",
            gte(t.position, 0).inlineParams(),
        ),
        check(
            "comparison_answer_distinct_choices_check",
            ne(t.bestSlugId, t.worstSlugId),
        ),
        // PostgreSQL array cardinality and correlated construction need expressions.
        check(
            "comparison_answer_candidates_check",
            sqlAnd(
                sql`cardinality(${t.candidateSet}) BETWEEN 2 AND 4`,
                arrayContains(
                    t.candidateSet,
                    sql`ARRAY[${t.bestSlugId}::text, ${t.worstSlugId}::text]`,
                ),
            ),
        ),
    ],
);

// Per-user Solidago scores, written by the scoring worker alongside global scores.
// One set of scores per user per conversation, upserted each scoring run.
/** @service scoring-worker, api */
export const comparisonUserEntityScoreTable = pgTable(
    "comparison_user_entity_score",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        comparisonResponseId: integer("comparison_response_id").notNull(),
        entitySlugId: varchar("entity_slug_id", { length: 8 }).notNull(),
        score: real("score").notNull(),
        displayScore: real("display_score"),
        uncertaintyLeft: real("uncertainty_left").notNull(),
        uncertaintyRight: real("uncertainty_right").notNull(),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (t) => [
        foreignKey({
            name: "comparison_user_entity_score_response_fk",
            columns: [t.comparisonResponseId],
            foreignColumns: [comparisonResponseTable.id],
        }),
        unique("comparison_user_entity_score_response_entity_unique").on(
            t.comparisonResponseId,
            t.entitySlugId,
        ),
        check(
            "comparison_user_entity_score_display_score_check",
            sqlOr(
                isNull(t.displayScore),
                sqlAnd(gte(t.displayScore, 0), lte(t.displayScore, 1)),
            ),
        ),
        index("comparison_user_entity_score_response_score_idx")
            .on(t.comparisonResponseId, desc(t.score))
            .where(isNull(t.deletedAt)),
        index("comparison_user_entity_score_deleted_idx")
            .on(t.deletedAt, t.id)
            .where(isNotNull(t.deletedAt)),
    ],
);

/** @service api */
export const conversationEmailUpdateUserGlobalSettingTable = pgTable(
    "conversation_email_update_user_global_setting",
    {
        userId: uuid("user_id")
            .primaryKey()
            .references(() => userTable.id),
        pausedAt: timestamp("paused_at", { mode: "date", precision: 0 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
);

/** @service api */
export const conversationEmailUpdateUserProjectPreferenceTable = pgTable(
    "conversation_email_update_user_project_preference",
    {
        userId: uuid("user_id").notNull(),
        projectId: integer("project_id").notNull(),
        enabled: boolean("enabled").notNull(),
        choiceAt: timestamp("choice_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        choiceSource:
            conversationEmailUpdatePreferenceSourceEnum(
                "choice_source",
            ).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.projectId] }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [userTable.id],
            name: "email_update_project_preference_user_fk",
        }),
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projectTable.id],
            name: "email_update_project_preference_project_fk",
        }),
        index("conversation_email_update_project_preference_project_idx").on(
            table.projectId,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateUserConversationPreferenceTable = pgTable(
    "conversation_email_update_user_conversation_preference",
    {
        userId: uuid("user_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        enabled: boolean("enabled").notNull(),
        choiceAt: timestamp("choice_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        choiceSource:
            conversationEmailUpdatePreferenceSourceEnum(
                "choice_source",
            ).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.conversationId] }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [userTable.id],
            name: "email_update_conversation_preference_user_fk",
        }),
        foreignKey({
            columns: [table.conversationId],
            foreignColumns: [conversationTable.id],
            name: "email_update_conversation_preference_conversation_fk",
        }),
        index("conversation_email_update_conversation_preference_scope_idx").on(
            table.conversationId,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateUserComplaintSuppressionTable = pgTable(
    "conversation_email_update_user_complaint_suppression",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .notNull()
            .references(() => userTable.id),
        sourceSnsTopicArn: text("source_sns_topic_arn").notNull(),
        sourceSnsMessageId: varchar("source_sns_message_id", {
            length: 191,
        }).notNull(),
        sourceSesMessageId: text("source_ses_message_id").notNull(),
        sourceEventOccurredAt: timestamp("source_event_occurred_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        liftedAt: timestamp("lifted_at", { mode: "date", precision: 0 }),
        liftedByUserId: uuid("lifted_by_user_id").references(
            () => userTable.id,
        ),
    },
    (table) => [
        uniqueIndex("conversation_email_update_user_complaint_active_unique")
            .on(table.userId)
            .where(isNull(table.liftedAt)),
        unique("conversation_email_update_user_complaint_source_unique").on(
            table.sourceSnsTopicArn,
            table.sourceSnsMessageId,
        ),
        check(
            "conversation_email_update_user_complaint_lift_audit_check",
            sqlOr(isNull(table.liftedByUserId), isNotNull(table.liftedAt)),
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateEmailSuppressionTable = pgTable(
    "conversation_email_update_email_suppression",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        canonicalEmail: varchar("canonical_email", { length: 254 }).notNull(),
        emailCredentialId: integer("email_credential_id").references(
            () => emailTable.id,
            { onDelete: "set null" },
        ),
        reason: conversationEmailUpdateEmailSuppressionReasonEnum(
            "reason",
        ).notNull(),
        sourceSnsTopicArn: text("source_sns_topic_arn").notNull(),
        sourceSnsMessageId: varchar("source_sns_message_id", {
            length: 191,
        }).notNull(),
        sourceSesMessageId: text("source_ses_message_id").notNull(),
        sourceEventOccurredAt: timestamp("source_event_occurred_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        liftedAt: timestamp("lifted_at", { mode: "date", precision: 0 }),
        liftedByUserId: uuid("lifted_by_user_id").references(
            () => userTable.id,
        ),
    },
    (table) => [
        uniqueIndex("conversation_email_update_email_suppression_active_unique")
            .on(table.canonicalEmail, table.reason)
            .where(isNull(table.liftedAt)),
        unique("conversation_email_update_email_suppression_source_unique").on(
            table.sourceSnsTopicArn,
            table.sourceSnsMessageId,
        ),
        index("conversation_email_update_email_suppression_credential_idx").on(
            table.emailCredentialId,
        ),
        check(
            "conversation_email_update_email_suppression_canonical_check",
            sql`${table.canonicalEmail} = lower(btrim(${table.canonicalEmail}))`,
        ),
        check(
            "conversation_email_update_email_suppression_lift_audit_check",
            sqlOr(isNull(table.liftedByUserId), isNotNull(table.liftedAt)),
        ),
    ],
);

// Emergency blocks are managed through audited operator intervention.
/** @service api */
export const conversationEmailUpdateScopeSafetyBlockTable = pgTable(
    "conversation_email_update_scope_safety_block",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        targetKind:
            conversationEmailUpdateSafetyTargetKindEnum(
                "target_kind",
            ).notNull(),
        organizationId: integer("organization_id").references(
            () => organizationTable.id,
        ),
        projectId: integer("project_id").references(() => projectTable.id),
        conversationId: integer("conversation_id").references(
            () => conversationTable.id,
        ),
        facilitatorUserId: uuid("facilitator_user_id").references(
            () => userTable.id,
        ),
        reason: conversationEmailUpdateSafetyReasonEnum("reason").notNull(),
        createdByUserId: uuid("created_by_user_id").references(
            () => userTable.id,
        ),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        liftedAt: timestamp("lifted_at", { mode: "date", precision: 0 }),
        liftedByUserId: uuid("lifted_by_user_id").references(
            () => userTable.id,
        ),
    },
    (table) => [
        uniqueIndex(
            "conversation_email_update_safety_organization_active_unique",
        )
            .on(table.organizationId)
            .where(
                sql`${table.targetKind} = 'organization' AND ${table.liftedAt} IS NULL`,
            ),
        uniqueIndex("conversation_email_update_safety_project_active_unique")
            .on(table.projectId)
            .where(
                sql`${table.targetKind} = 'project' AND ${table.liftedAt} IS NULL`,
            ),
        uniqueIndex(
            "conversation_email_update_safety_conversation_active_unique",
        )
            .on(table.conversationId)
            .where(
                sql`${table.targetKind} = 'conversation' AND ${table.liftedAt} IS NULL`,
            ),
        uniqueIndex(
            "conversation_email_update_safety_facilitator_active_unique",
        )
            .on(table.facilitatorUserId)
            .where(
                sql`${table.targetKind} = 'facilitator' AND ${table.liftedAt} IS NULL`,
            ),
        check(
            "conversation_email_update_safety_target_check",
            sql`((${table.targetKind} = 'organization' AND ${table.organizationId} IS NOT NULL AND num_nonnulls(${table.projectId}, ${table.conversationId}, ${table.facilitatorUserId}) = 0) OR (${table.targetKind} = 'project' AND ${table.projectId} IS NOT NULL AND num_nonnulls(${table.organizationId}, ${table.conversationId}, ${table.facilitatorUserId}) = 0) OR (${table.targetKind} = 'conversation' AND ${table.conversationId} IS NOT NULL AND num_nonnulls(${table.organizationId}, ${table.projectId}, ${table.facilitatorUserId}) = 0) OR (${table.targetKind} = 'facilitator' AND ${table.facilitatorUserId} IS NOT NULL AND num_nonnulls(${table.organizationId}, ${table.projectId}, ${table.conversationId}) = 0))`,
        ),
        check(
            "conversation_email_update_safety_lift_audit_check",
            sqlOr(isNull(table.liftedByUserId), isNotNull(table.liftedAt)),
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateTable = pgTable(
    "conversation_email_update",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        projectId: integer("project_id").notNull(),
        scopeKind: conversationEmailUpdateScopeKindEnum("scope_kind").notNull(),
        createdByUserId: uuid("created_by_user_id").references(
            () => userTable.id,
        ),
        authorizingOrganizationId: integer(
            "authorizing_organization_id",
        ).notNull(),
        authorizingPremiumFeatureId: integer(
            "authorizing_premium_feature_id",
        ).notNull(),
        projectTitleSnapshot: varchar("project_title_snapshot", {
            length: MAX_LENGTH_TITLE,
        }).notNull(),
        replyToNameSnapshot: varchar("reply_to_name_snapshot", {
            length: MAX_LENGTH_TITLE,
        }).notNull(),
        replyToEmailSnapshot: varchar("reply_to_email_snapshot", {
            length: 254,
        }).notNull(),
        subject: varchar("subject", {
            length: MAX_LENGTH_CONVERSATION_EMAIL_UPDATE_SUBJECT,
        }).notNull(),
        bodyHtml: text("body_html").notNull(),
        bodyPlainText: text("body_plain_text").notNull(),
        cancelledAt: timestamp("cancelled_at", { mode: "date", precision: 0 }),
        reviewExpiresAt: timestamp("review_expires_at", {
            mode: "date",
            precision: 0,
        }),
        templateVersion: varchar("template_version", { length: 100 }),
        participantPreferenceScopeSnapshot:
            conversationEmailUpdateParticipantPreferenceScopeEnum(
                "participant_preference_scope_snapshot",
            ),
        brandingSnapshot: jsonb("branding_snapshot").$type<EmailBranding>(),
        reviewTestEmailCredentialId: integer("review_test_email_credential_id"),
        reviewTestEmailSnapshot: varchar("review_test_email_snapshot", {
            length: 254,
        }),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("conversation_email_update_project_id_id_unique").on(
            table.projectId,
            table.id,
        ),
        index("conversation_email_update_creator_created_idx").on(
            table.createdByUserId,
            table.createdAt,
        ),
        check(
            "conversation_email_update_review_fields_check",
            sqlAnd(
                sqlOr(
                    sqlAnd(
                        isNull(table.reviewExpiresAt),
                        isNull(table.templateVersion),
                        isNull(table.participantPreferenceScopeSnapshot),
                        isNull(table.brandingSnapshot),
                    ),
                    sqlAnd(
                        isNotNull(table.reviewExpiresAt),
                        isNotNull(table.templateVersion),
                        isNotNull(table.participantPreferenceScopeSnapshot),
                        isNotNull(table.brandingSnapshot),
                    ),
                ),
                sqlOr(
                    isNull(table.cancelledAt),
                    isNotNull(table.reviewExpiresAt),
                ),
                sqlOr(
                    sqlAnd(
                        isNull(table.reviewExpiresAt),
                        isNull(table.reviewTestEmailCredentialId),
                        isNull(table.reviewTestEmailSnapshot),
                    ),
                    sqlAnd(
                        isNotNull(table.reviewExpiresAt),
                        sqlOr(
                            sqlAnd(
                                isNotNull(table.createdByUserId),
                                isNotNull(table.reviewTestEmailCredentialId),
                                isNotNull(table.reviewTestEmailSnapshot),
                            ),
                            sqlAnd(
                                isNull(table.createdByUserId),
                                isNull(table.reviewTestEmailCredentialId),
                                isNull(table.reviewTestEmailSnapshot),
                            ),
                        ),
                    ),
                ),
            ),
        ),
        check(
            "conversation_email_update_review_expiry_check",
            sql`${table.reviewExpiresAt} IS NULL OR (${table.reviewExpiresAt} = ${table.createdAt} + interval '24 hours' AND length(btrim(${table.templateVersion})) > 0)`,
        ),
        check(
            "conversation_email_update_review_scope_check",
            sql`${table.scopeKind} <> 'no_project' OR ${table.participantPreferenceScopeSnapshot} IS NULL OR ${table.participantPreferenceScopeSnapshot} = 'conversation'`,
        ),
        check(
            "conversation_email_update_branding_check",
            sql`${table.brandingSnapshot} IS NULL OR (jsonb_typeof(${table.brandingSnapshot}) = 'object' AND ${table.brandingSnapshot} ?& array['name', 'palette'] AND jsonb_typeof(${table.brandingSnapshot}->'name') = 'string' AND length(btrim(${table.brandingSnapshot}->>'name')) BETWEEN 1 AND 500 AND jsonb_typeof(${table.brandingSnapshot}->'palette') = 'string' AND ${table.brandingSnapshot}->>'palette' IN ('blue', 'purple', 'green') AND (NOT ${table.brandingSnapshot} ? 'imageUrl' OR jsonb_typeof(${table.brandingSnapshot}->'imageUrl') = 'string') AND (NOT ${table.brandingSnapshot} ? 'bannerImageUrl' OR jsonb_typeof(${table.brandingSnapshot}->'bannerImageUrl') = 'string'))`,
        ),
        foreignKey({
            columns: [
                table.authorizingOrganizationId,
                table.authorizingPremiumFeatureId,
            ],
            foreignColumns: [
                premiumFeatureEntitlementTable.organizationId,
                premiumFeatureEntitlementTable.id,
            ],
            name: "email_update_authorizing_entitlement_fk",
        }),
        foreignKey({
            columns: [table.createdByUserId, table.reviewTestEmailCredentialId],
            foreignColumns: [emailTable.userId, emailTable.id],
            name: "email_update_review_test_destination_owner_fk",
        }),
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [projectTable.id],
            name: "email_update_project_fk",
        }),
        check(
            "conversation_email_update_subject_check",
            sql`length(btrim(${table.subject})) > 0`,
        ),
        check(
            "conversation_email_update_body_html_check",
            sql`octet_length(${table.bodyHtml}) > 0 AND octet_length(${table.bodyHtml}) <= ${sql.raw(String(MAX_BYTES_CONVERSATION_EMAIL_UPDATE_HTML))}`,
        ),
        check(
            "conversation_email_update_body_plain_text_check",
            sql`length(btrim(${table.bodyPlainText})) > 0 AND length(${table.bodyPlainText}) <= ${sql.raw(String(MAX_LENGTH_CONVERSATION_EMAIL_UPDATE))}`,
        ),
        check(
            "conversation_email_update_reply_to_email_canonical_check",
            sql`${table.replyToEmailSnapshot} = lower(btrim(${table.replyToEmailSnapshot}))`,
        ),
        check(
            "conversation_email_update_review_test_email_canonical_check",
            sql`${table.reviewTestEmailSnapshot} IS NULL OR (length(btrim(${table.reviewTestEmailSnapshot})) > 0 AND ${table.reviewTestEmailSnapshot} = lower(btrim(${table.reviewTestEmailSnapshot})))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateConversationTable = pgTable(
    "conversation_email_update_conversation",
    {
        updateId: integer("update_id").notNull(),
        projectId: integer("project_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        conversationTitleSnapshot: varchar("conversation_title_snapshot", {
            length: MAX_LENGTH_CONVERSATION_TITLE,
        }).notNull(),
        conversationUrlSnapshot: text("conversation_url_snapshot"),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.updateId, table.conversationId] }),
        foreignKey({
            columns: [table.projectId, table.updateId],
            foreignColumns: [
                conversationEmailUpdateTable.projectId,
                conversationEmailUpdateTable.id,
            ],
            name: "email_update_scope_update_project_fk",
        }),
        foreignKey({
            columns: [table.projectId, table.conversationId],
            foreignColumns: [
                conversationProjectAssignmentTable.projectId,
                conversationProjectAssignmentTable.conversationId,
            ],
            name: "email_update_scope_conversation_project_fk",
        }),
        index("conversation_email_update_scope_conversation_idx").on(
            table.conversationId,
            table.updateId,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateTestAttemptTable = pgTable(
    "conversation_email_update_test_attempt",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        updateId: integer("update_id")
            .notNull()
            .references(() => conversationEmailUpdateTable.id),
        requestedByUserId: uuid("requested_by_user_id").references(
            () => userTable.id,
        ),
        destinationEmailCredentialId: integer(
            "destination_email_credential_id",
        ),
        destinationEmailSnapshot: varchar("destination_email_snapshot", {
            length: 254,
        }),
        senderPurgedAt: timestamp("sender_purged_at", {
            mode: "date",
            precision: 3,
        }),
        status: conversationEmailUpdateTestAttemptStatusEnum(
            "status",
        ).notNull(),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        providerMessageId: text("provider_message_id"),
        errorCategory:
            conversationEmailUpdateErrorCategoryEnum("error_category"),
        errorCode: varchar("error_code", { length: 100 }),
        errorDetails: text("error_details"),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        authorizedAt: timestamp("authorized_at", {
            mode: "date",
            precision: 0,
        }),
        finishedAt: timestamp("finished_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        check(
            "email_update_test_sender_provenance_check",
            sqlOr(
                sqlAnd(
                    isNull(table.senderPurgedAt),
                    isNotNull(table.requestedByUserId),
                    isNotNull(table.destinationEmailCredentialId),
                    isNotNull(table.destinationEmailSnapshot),
                ),
                sqlAnd(
                    isNotNull(table.senderPurgedAt),
                    isNull(table.requestedByUserId),
                    isNull(table.destinationEmailCredentialId),
                    isNull(table.destinationEmailSnapshot),
                    notInArray(table.status, [
                        "pending",
                        "claimed",
                        "attempting",
                    ]),
                ),
            ),
        ),
        unique("conversation_email_update_test_update_id_id_unique").on(
            table.updateId,
            table.id,
        ),
        foreignKey({
            columns: [
                table.requestedByUserId,
                table.destinationEmailCredentialId,
            ],
            foreignColumns: [emailTable.userId, emailTable.id],
            name: "email_update_test_destination_owner_fk",
        }),
        index("conversation_email_update_test_requester_created_idx").on(
            table.requestedByUserId,
            table.createdAt,
        ),
        index("conversation_email_update_test_claim_idx").on(
            table.status,
            table.createdAt,
        ),
        index("conversation_email_update_test_lease_expiry_idx")
            .on(table.leaseExpiresAt)
            .where(sql`${table.status} IN ('claimed', 'attempting')`),
        uniqueIndex("conversation_email_update_test_provider_message_unique")
            .on(table.providerMessageId)
            .where(isNotNull(table.providerMessageId)),
        check(
            "conversation_email_update_test_lease_check",
            sql`((${table.leaseOwner} IS NULL AND ${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL) OR (${table.leaseOwner} IS NOT NULL AND ${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_test_status_lease_check",
            sql`((${table.status} IN ('claimed', 'attempting') AND ${table.leaseToken} IS NOT NULL) OR (${table.status} NOT IN ('claimed', 'attempting') AND ${table.leaseToken} IS NULL))`,
        ),
        check(
            "conversation_email_update_test_outcome_check",
            sql`((${table.status} IN ('pending', 'claimed') AND ${table.authorizedAt} IS NULL AND ${table.finishedAt} IS NULL AND ${table.providerMessageId} IS NULL) OR (${table.status} = 'attempting' AND ${table.authorizedAt} IS NOT NULL AND ${table.finishedAt} IS NULL AND ${table.providerMessageId} IS NULL) OR (${table.status} = 'provider_accepted' AND ${table.authorizedAt} IS NOT NULL AND ${table.finishedAt} IS NOT NULL AND ${table.providerMessageId} IS NOT NULL) OR (${table.status} IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.authorizedAt} IS NOT NULL AND ${table.finishedAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_test_error_check",
            sql`((${table.status} IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.errorCategory} IS NOT NULL AND ${table.errorCode} IS NOT NULL AND length(btrim(${table.errorCode})) > 0 AND ${table.errorDetails} IS NOT NULL AND length(btrim(${table.errorDetails})) > 0) OR (${table.status} NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.errorCategory} IS NULL AND ${table.errorCode} IS NULL AND ${table.errorDetails} IS NULL))`,
        ),
        check(
            "conversation_email_update_test_email_canonical_check",
            sql`${table.destinationEmailSnapshot} = lower(btrim(${table.destinationEmailSnapshot}))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateDeliveryTable = pgTable(
    "conversation_email_update_delivery",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        updateId: integer("update_id").notNull().unique(),
        projectId: integer("project_id").notNull(),
        acceptedTestAttemptId: integer("accepted_test_attempt_id")
            .notNull()
            .unique(),
        acceptedByUserId: uuid("accepted_by_user_id").references(
            () => userTable.id,
        ),
        status: conversationEmailUpdateDeliveryStatusEnum("status").notNull(),
        participantPreferenceScope:
            conversationEmailUpdateParticipantPreferenceScopeEnum(
                "participant_preference_scope",
            ).notNull(),
        failureReason:
            conversationEmailUpdateFailureReasonEnum("failure_reason"),
        stopReason: conversationEmailUpdateStopReasonEnum("stop_reason"),
        audienceCutoffAt: timestamp("audience_cutoff_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        displayedParticipantEstimate: integer(
            "displayed_participant_estimate",
        ).notNull(),
        acceptanceParticipantEstimate: integer(
            "acceptance_participant_estimate",
        ).notNull(),
        materializedParticipantCount: integer("materialized_participant_count")
            .notNull()
            .default(0),
        requiredOwnerCopyCount: integer("required_owner_copy_count").notNull(),
        frequencyCappedCount: integer("frequency_capped_count")
            .notNull()
            .default(0),
        ineligibleCount: integer("ineligible_count").notNull().default(0),
        materializationCursorUserId: uuid("materialization_cursor_user_id"),
        materializationAttemptCount: integer("materialization_attempt_count")
            .notNull()
            .default(0),
        materializationLastError: text("materialization_last_error"),
        dispatchTurnAt: timestamp("dispatch_turn_at", {
            mode: "date",
            precision: 0,
        }),
        acceptedAt: timestamp("accepted_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        materializedAt: timestamp("materialized_at", {
            mode: "date",
            precision: 0,
        }),
        sendingStartedAt: timestamp("sending_started_at", {
            mode: "date",
            precision: 0,
        }),
        stoppingAt: timestamp("stopping_at", { mode: "date", precision: 0 }),
        completedAt: timestamp("completed_at", { mode: "date", precision: 0 }),
        failedAt: timestamp("failed_at", { mode: "date", precision: 0 }),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("conversation_email_update_delivery_id_update_unique").on(
            table.id,
            table.updateId,
        ),
        foreignKey({
            columns: [table.projectId, table.updateId],
            foreignColumns: [
                conversationEmailUpdateTable.projectId,
                conversationEmailUpdateTable.id,
            ],
            name: "email_update_delivery_update_project_fk",
        }),
        foreignKey({
            columns: [table.updateId, table.acceptedTestAttemptId],
            foreignColumns: [
                conversationEmailUpdateTestAttemptTable.updateId,
                conversationEmailUpdateTestAttemptTable.id,
            ],
            name: "email_update_delivery_test_update_fk",
        }),
        uniqueIndex("conversation_email_update_delivery_project_active_unique")
            .on(table.projectId)
            .where(
                sql`${table.status} IN ('preparing', 'queued', 'sending', 'stopping')`,
            ),
        index("conversation_email_update_delivery_materialization_idx").on(
            table.status,
            table.updatedAt,
            table.id,
        ),
        index("conversation_email_update_delivery_dispatch_idx").on(
            table.status,
            table.dispatchTurnAt,
            table.id,
        ),
        index("conversation_email_update_delivery_project_history_idx").on(
            table.projectId,
            table.acceptedAt.desc(),
            table.updateId.desc(),
        ),
        index("conversation_email_update_delivery_history_idx").on(
            table.acceptedAt.desc(),
            table.updateId.desc(),
        ),
        check(
            "conversation_email_update_delivery_counts_check",
            sql`${table.displayedParticipantEstimate} >= 0 AND ${table.acceptanceParticipantEstimate} >= 0 AND ${table.materializedParticipantCount} >= 0 AND ${table.requiredOwnerCopyCount} > 0 AND ${table.frequencyCappedCount} >= 0 AND ${table.ineligibleCount} >= 0 AND ${table.materializationAttemptCount} BETWEEN 0 AND 5`,
        ),
        check(
            "conversation_email_update_delivery_failure_reason_check",
            sql`(${table.status} = 'failed') = (${table.failureReason} IS NOT NULL)`,
        ),
        check(
            "conversation_email_update_delivery_stop_reason_check",
            sql`(${table.status} IN ('stopping', 'stopped')) = (${table.stopReason} IS NOT NULL)`,
        ),
        check(
            "conversation_email_update_delivery_timestamps_check",
            sql`((${table.status} = 'preparing' AND ${table.materializedAt} IS NULL AND ${table.sendingStartedAt} IS NULL AND ${table.stoppingAt} IS NULL AND ${table.completedAt} IS NULL AND ${table.failedAt} IS NULL) OR (${table.status} = 'queued' AND ${table.materializedAt} IS NOT NULL AND ${table.sendingStartedAt} IS NULL AND ${table.stoppingAt} IS NULL AND ${table.completedAt} IS NULL AND ${table.failedAt} IS NULL) OR (${table.status} = 'sending' AND ${table.materializedAt} IS NOT NULL AND ${table.sendingStartedAt} IS NOT NULL AND ${table.stoppingAt} IS NULL AND ${table.completedAt} IS NULL AND ${table.failedAt} IS NULL) OR (${table.status} = 'stopping' AND ${table.stoppingAt} IS NOT NULL AND ${table.completedAt} IS NULL AND ${table.failedAt} IS NULL) OR (${table.status} = 'stopped' AND ${table.stoppingAt} IS NOT NULL AND ${table.completedAt} IS NOT NULL AND ${table.failedAt} IS NULL) OR (${table.status} IN ('completed', 'completed_with_failures') AND ${table.materializedAt} IS NOT NULL AND ${table.completedAt} IS NOT NULL AND ${table.stoppingAt} IS NULL AND ${table.failedAt} IS NULL) OR (${table.status} = 'failed' AND ${table.failedAt} IS NOT NULL AND ${table.completedAt} IS NULL))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateRecipientTable = pgTable(
    "conversation_email_update_recipient",
    {
        id: bigint("id", { mode: "bigint" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        deliveryId: integer("delivery_id")
            .notNull()
            .references(() => conversationEmailUpdateDeliveryTable.id),
        userId: uuid("user_id")
            .notNull()
            .references(() => userTable.id),
        kind: conversationEmailUpdateRecipientKindEnum("kind").notNull(),
        status: conversationEmailUpdateRecipientStatusEnum("status").notNull(),
        materializedEmailCredentialId: integer(
            "materialized_email_credential_id",
        ).notNull(),
        materializedEmailSnapshot: varchar("materialized_email_snapshot", {
            length: 254,
        }).notNull(),
        displayLanguage: displayLanguageCodeEnum("display_language").notNull(),
        attemptCount: integer("attempt_count").notNull().default(0),
        nextAttemptAt: timestamp("next_attempt_at", {
            mode: "date",
            precision: 0,
        }),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        skipReason: conversationEmailUpdateSkipReasonEnum("skip_reason"),
        failureCode: varchar("failure_code", { length: 100 }),
        failureDetails: text("failure_details"),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        claimedAt: timestamp("claimed_at", { mode: "date", precision: 0 }),
        attemptingAt: timestamp("attempting_at", {
            mode: "date",
            precision: 0,
        }),
        providerAcceptedAt: timestamp("provider_accepted_at", {
            mode: "date",
            precision: 0,
        }),
        skippedAt: timestamp("skipped_at", { mode: "date", precision: 0 }),
        permanentFailedAt: timestamp("permanent_failed_at", {
            mode: "date",
            precision: 0,
        }),
        unknownAt: timestamp("unknown_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        unique("conversation_email_update_recipient_delivery_user_unique").on(
            table.deliveryId,
            table.userId,
        ),
        unique("conversation_email_update_recipient_delivery_id_unique").on(
            table.deliveryId,
            table.id,
        ),
        unique("conversation_email_update_recipient_credential_id_unique").on(
            table.materializedEmailCredentialId,
            table.id,
        ),
        foreignKey({
            columns: [table.userId, table.materializedEmailCredentialId],
            foreignColumns: [emailTable.userId, emailTable.id],
            name: "email_update_recipient_credential_owner_fk",
        }),
        index("conversation_email_update_recipient_dispatch_idx").on(
            table.status,
            table.nextAttemptAt,
            table.deliveryId,
            table.id,
        ),
        index("conversation_email_update_recipient_lease_expiry_idx").on(
            table.leaseExpiresAt,
        ),
        index("conversation_email_update_recipient_frequency_idx").on(
            table.userId,
            table.status,
            table.providerAcceptedAt,
            table.deliveryId,
        ),
        check(
            "conversation_email_update_recipient_attempt_count_check",
            sql`${table.attemptCount} BETWEEN 0 AND 3`,
        ),
        check(
            "conversation_email_update_recipient_lease_check",
            sql`((${table.leaseOwner} IS NULL AND ${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL) OR (${table.leaseOwner} IS NOT NULL AND ${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_recipient_status_lease_check",
            sql`((${table.status} IN ('claimed', 'attempting') AND ${table.leaseToken} IS NOT NULL) OR (${table.status} NOT IN ('claimed', 'attempting') AND ${table.leaseToken} IS NULL))`,
        ),
        check(
            "conversation_email_update_recipient_status_check",
            sql`((${table.status} = 'pending' AND ${table.nextAttemptAt} IS NULL) OR (${table.status} = 'claimed' AND ${table.claimedAt} IS NOT NULL) OR (${table.status} = 'attempting' AND ${table.claimedAt} IS NOT NULL AND ${table.attemptingAt} IS NOT NULL) OR (${table.status} = 'retry_wait' AND ${table.nextAttemptAt} IS NOT NULL) OR (${table.status} = 'provider_accepted' AND ${table.providerAcceptedAt} IS NOT NULL) OR (${table.status} = 'skipped' AND ${table.skippedAt} IS NOT NULL AND ${table.skipReason} IS NOT NULL) OR (${table.status} = 'permanent_failed' AND ${table.permanentFailedAt} IS NOT NULL) OR (${table.status} = 'unknown' AND ${table.unknownAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_recipient_skip_reason_check",
            sql`(${table.status} = 'skipped') = (${table.skipReason} IS NOT NULL)`,
        ),
        check(
            "conversation_email_update_recipient_failure_check",
            sql`((${table.status} IN ('retry_wait', 'permanent_failed', 'unknown') AND ${table.failureCode} IS NOT NULL AND length(btrim(${table.failureCode})) > 0 AND ${table.failureDetails} IS NOT NULL AND length(btrim(${table.failureDetails})) > 0) OR (${table.status} NOT IN ('retry_wait', 'permanent_failed', 'unknown') AND ${table.failureCode} IS NULL AND ${table.failureDetails} IS NULL))`,
        ),
        check(
            "conversation_email_update_recipient_email_canonical_check",
            sql`${table.materializedEmailSnapshot} = lower(btrim(${table.materializedEmailSnapshot}))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateRecipientConversationTable = pgTable(
    "conversation_email_update_recipient_conversation",
    {
        recipientId: bigint("recipient_id", { mode: "bigint" }).notNull(),
        deliveryId: integer("delivery_id").notNull(),
        updateId: integer("update_id").notNull(),
        conversationId: integer("conversation_id").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.recipientId, table.conversationId] }),
        foreignKey({
            columns: [table.deliveryId, table.recipientId],
            foreignColumns: [
                conversationEmailUpdateRecipientTable.deliveryId,
                conversationEmailUpdateRecipientTable.id,
            ],
            name: "email_update_recipient_scope_recipient_fk",
        }),
        foreignKey({
            columns: [table.deliveryId, table.updateId],
            foreignColumns: [
                conversationEmailUpdateDeliveryTable.id,
                conversationEmailUpdateDeliveryTable.updateId,
            ],
            name: "email_update_recipient_scope_delivery_fk",
        }),
        foreignKey({
            columns: [table.updateId, table.conversationId],
            foreignColumns: [
                conversationEmailUpdateConversationTable.updateId,
                conversationEmailUpdateConversationTable.conversationId,
            ],
            name: "email_update_recipient_scope_update_fk",
        }),
        index("conversation_email_update_recipient_scope_delivery_idx").on(
            table.deliveryId,
            table.updateId,
        ),
        index("conversation_email_update_recipient_scope_update_idx").on(
            table.updateId,
            table.conversationId,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateDeliveryAttemptTable = pgTable(
    "conversation_email_update_delivery_attempt",
    {
        id: bigint("id", { mode: "bigint" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        publicId: uuid("public_id").defaultRandom().notNull().unique(),
        recipientId: bigint("recipient_id", { mode: "bigint" }).notNull(),
        attemptNumber: integer("attempt_number").notNull(),
        leaseToken: uuid("lease_token").notNull(),
        emailCredentialId: integer("email_credential_id").notNull(),
        emailSnapshot: varchar("email_snapshot", { length: 254 }).notNull(),
        outcome:
            conversationEmailUpdateDeliveryAttemptOutcomeEnum(
                "outcome",
            ).notNull(),
        providerMessageId: text("provider_message_id"),
        errorCategory:
            conversationEmailUpdateErrorCategoryEnum("error_category"),
        errorCode: varchar("error_code", { length: 100 }),
        errorDetails: text("error_details"),
        deliveredAt: timestamp("delivered_at", { mode: "date", precision: 0 }),
        deliveryDelayedAt: timestamp("delivery_delayed_at", {
            mode: "date",
            precision: 0,
        }),
        providerFailedAt: timestamp("provider_failed_at", {
            mode: "date",
            precision: 0,
        }),
        permanentBouncedAt: timestamp("permanent_bounced_at", {
            mode: "date",
            precision: 0,
        }),
        complainedAt: timestamp("complained_at", {
            mode: "date",
            precision: 0,
        }),
        authorizedAt: timestamp("authorized_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        finishedAt: timestamp("finished_at", { mode: "date", precision: 0 }),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        unique("conversation_email_update_attempt_recipient_number_unique").on(
            table.recipientId,
            table.attemptNumber,
        ),
        unique("conversation_email_update_attempt_public_recipient_unique").on(
            table.publicId,
            table.recipientId,
        ),
        uniqueIndex("conversation_email_update_attempt_provider_message_unique")
            .on(table.providerMessageId)
            .where(isNotNull(table.providerMessageId)),
        foreignKey({
            columns: [table.emailCredentialId, table.recipientId],
            foreignColumns: [
                conversationEmailUpdateRecipientTable.materializedEmailCredentialId,
                conversationEmailUpdateRecipientTable.id,
            ],
            name: "email_update_attempt_recipient_credential_fk",
        }),
        check(
            "conversation_email_update_attempt_number_check",
            sql`${table.attemptNumber} BETWEEN 1 AND 3`,
        ),
        check(
            "conversation_email_update_attempt_outcome_check",
            sql`((${table.outcome} = 'send_authorized' AND ${table.finishedAt} IS NULL AND ${table.providerMessageId} IS NULL) OR (${table.outcome} = 'provider_accepted' AND ${table.finishedAt} IS NOT NULL AND ${table.providerMessageId} IS NOT NULL) OR (${table.outcome} IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.finishedAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_attempt_error_check",
            sql`((${table.outcome} IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.errorCategory} IS NOT NULL AND ${table.errorCode} IS NOT NULL AND length(btrim(${table.errorCode})) > 0 AND ${table.errorDetails} IS NOT NULL AND length(btrim(${table.errorDetails})) > 0) OR (${table.outcome} NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND ${table.errorCategory} IS NULL AND ${table.errorCode} IS NULL AND ${table.errorDetails} IS NULL))`,
        ),
        check(
            "conversation_email_update_attempt_email_canonical_check",
            sql`${table.emailSnapshot} = lower(btrim(${table.emailSnapshot}))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateDeliveryAttemptConversationTable = pgTable(
    "conversation_email_update_delivery_attempt_conversation",
    {
        attemptPublicId: uuid("attempt_public_id").notNull(),
        recipientId: bigint("recipient_id", { mode: "bigint" }).notNull(),
        conversationId: integer("conversation_id").notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.attemptPublicId, table.conversationId],
        }),
        foreignKey({
            columns: [table.attemptPublicId, table.recipientId],
            foreignColumns: [
                conversationEmailUpdateDeliveryAttemptTable.publicId,
                conversationEmailUpdateDeliveryAttemptTable.recipientId,
            ],
            name: "email_update_attempt_scope_attempt_fk",
        }),
        foreignKey({
            columns: [table.recipientId, table.conversationId],
            foreignColumns: [
                conversationEmailUpdateRecipientConversationTable.recipientId,
                conversationEmailUpdateRecipientConversationTable.conversationId,
            ],
            name: "email_update_attempt_scope_recipient_fk",
        }),
        index("conversation_email_update_attempt_scope_recipient_idx").on(
            table.recipientId,
            table.conversationId,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateSnsEventInboxTable = pgTable(
    "conversation_email_update_sns_event_inbox",
    {
        id: bigint("id", { mode: "bigint" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        snsTopicArn: text("sns_topic_arn").notNull(),
        snsMessageId: varchar("sns_message_id", { length: 191 }).notNull(),
        rawPayload: jsonb("raw_payload"),
        status: conversationEmailUpdateSnsEventInboxStatusEnum(
            "status",
        ).notNull(),
        leaseOwner: varchar("lease_owner", { length: 100 }),
        leaseToken: uuid("lease_token"),
        leaseExpiresAt: timestamp("lease_expires_at", {
            mode: "date",
            precision: 0,
        }),
        processingAttemptCount: integer("processing_attempt_count")
            .notNull()
            .default(0),
        nextAttemptAt: timestamp("next_attempt_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        lastError: text("last_error"),
        receivedAt: timestamp("received_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        completedAt: timestamp("completed_at", { mode: "date", precision: 0 }),
        deadLetteredAt: timestamp("dead_lettered_at", {
            mode: "date",
            precision: 0,
        }),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        unique("conversation_email_update_sns_source_unique").on(
            table.snsTopicArn,
            table.snsMessageId,
        ),
        index("conversation_email_update_sns_claim_idx").on(
            table.status,
            table.nextAttemptAt,
            table.id,
        ),
        index("conversation_email_update_sns_lease_expiry_idx").on(
            table.leaseExpiresAt,
        ),
        check(
            "conversation_email_update_sns_attempt_count_check",
            sql`${table.processingAttemptCount} BETWEEN 0 AND 10`,
        ),
        check(
            "conversation_email_update_sns_lease_check",
            sql`((${table.leaseOwner} IS NULL AND ${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL) OR (${table.leaseOwner} IS NOT NULL AND ${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL))`,
        ),
        check(
            "conversation_email_update_sns_status_lease_check",
            sql`((${table.status} = 'processing' AND ${table.leaseToken} IS NOT NULL) OR (${table.status} <> 'processing' AND ${table.leaseToken} IS NULL))`,
        ),
        check(
            "conversation_email_update_sns_terminal_check",
            sql`((${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL AND ${table.deletedAt} IS NOT NULL AND ${table.rawPayload} IS NULL AND ${table.lastError} IS NULL AND ${table.deadLetteredAt} IS NULL) OR (${table.status} = 'dead_letter' AND ${table.deadLetteredAt} IS NOT NULL AND ${table.completedAt} IS NULL) OR (${table.status} IN ('pending', 'processing', 'retry_wait') AND ${table.rawPayload} IS NOT NULL AND ${table.completedAt} IS NULL AND ${table.deadLetteredAt} IS NULL AND ${table.deletedAt} IS NULL))`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateActionTokenTable = pgTable(
    "conversation_email_update_action_token",
    {
        id: bigint("id", { mode: "bigint" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
        attemptPublicId: uuid("attempt_public_id")
            .notNull()
            .references(
                () => conversationEmailUpdateDeliveryAttemptTable.publicId,
            ),
        action: conversationEmailUpdateActionEnum("action").notNull(),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
        expiresAt: timestamp("expires_at", {
            mode: "date",
            precision: 0,
        }).notNull(),
        lastUsedAt: timestamp("last_used_at", { mode: "date", precision: 0 }),
    },
    (table) => [
        index("conversation_email_update_action_attempt_idx").on(
            table.attemptPublicId,
        ),
        check(
            "conversation_email_update_action_expiry_check",
            sql`${table.expiresAt} > ${table.createdAt}`,
        ),
        check(
            "conversation_email_update_action_token_hash_check",
            sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
        ),
    ],
);

/** @service api */
export const conversationEmailUpdateReportTable = pgTable(
    "conversation_email_update_report",
    {
        id: bigint("id", { mode: "bigint" })
            .primaryKey()
            .generatedAlwaysAsIdentity(),
        recipientId: bigint("recipient_id", { mode: "bigint" })
            .notNull()
            .unique()
            .references(() => conversationEmailUpdateRecipientTable.id),
        reason: conversationEmailUpdateReportReasonEnum("reason").notNull(),
        details: text("details"),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        check(
            "conversation_email_update_report_details_check",
            sql`${table.details} IS NULL OR (length(btrim(${table.details})) > 0 AND length(${table.details}) <= 2000)`,
        ),
    ],
);
