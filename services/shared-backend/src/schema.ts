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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
// import { MAX_LENGTH_OPTION, MAX_LENGTH_TITLE, MAX_LENGTH_OPINION, MAX_LENGTH_BODY } from "./shared/shared.js"; // unfortunately it breaks drizzle generate... :o TODO: find a way
// WARNING: when you modify these limits, change this in shared.ts as well
const MAX_LENGTH_OPTION = 30;
const MAX_LENGTH_TITLE = 140;
const MAX_LENGTH_BODY = 1000;
const MAX_LENGTH_BODY_HTML = 3000; // Reserve extra space for HTML tags
// const MAX_LENGTH_OPINION = 280;
const MAX_LENGTH_OPINION_HTML = 3000; // is lower now, kept this value For retro-compatibility
const MAX_LENGTH_NAME_CREATOR = 65;
const MAX_LENGTH_DESCRIPTION_CREATOR = 280;
const MAX_LENGTH_USERNAME = 20;
const MAX_LENGTH_USER_REPORT_EXPLANATION = 260;

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

export const polisKeyEnum = pgEnum("polis_key_enum", [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
]);

export const ticketProviderEnum = pgEnum("ticket_provider", ["zupass"]);

export const eventSlugEnum = pgEnum("event_slug", ["devconnect-2025"]);

export const importMethodType = pgEnum("import_method", ["url", "csv"]);

// Export status for CSV exports
export const exportStatusEnum = pgEnum("export_status_enum", [
    "processing",
    "completed",
    "failed",
    "cancelled",
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
    "comments",
    "votes",
    "participants",
    "summary",
    "stats",
]);

// Import status for CSV imports (simplified - no files, no cooldown)
export const importStatusEnum = pgEnum("import_status_enum", [
    "processing",
    "completed",
    "failed",
]);

// One user == one account.
// Inserting a record in that table means that the user has been successfully registered.
// To one user can be associated multiple validated emails and devices.
// Emails and devices must only be associated with exactly one user.
// The association between users and devices/emails can change over time.
// A user must have at least 1 validated primary email and 1 device associated with it.
// The "at least one" conditon is not enforced directly in the SQL model yet. It is done in the application code.
export const userTable = pgTable(
    "user",
    {
        id: uuid("id").primaryKey(), // enforce the same key for the user in the frontend across email changes
        polisParticipantId: serial("polis_participant_id"), // temporary work-around until reddwarf supports string ids
        username: varchar("username", { length: MAX_LENGTH_USERNAME })
            .notNull()
            .unique(),
        isModerator: boolean("is_moderator").notNull().default(false),
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
    (table) => [index("user_isDeleted_idx").on(table.isDeleted)],
);

export const userOrganizationMappingTable = pgTable(
    "user_organization_mapping",
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
    },
    (t) => [
        index("user_idx_organization").on(t.userId),
        unique("unique_user_orgaization_mapping").on(
            t.userId,
            t.organizationId,
        ),
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
        index("conversation_topic_index").on(t.conversationId),
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
    },
    (t) => [
        index("followed_topic_index").on(t.userId),
        unique("followed_topic_unique").on(t.userId, t.topicId),
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
    },
    (t) => [
        index("user_idx_mute").on(t.sourceUserId),
        unique("user_unique_mute").on(t.sourceUserId, t.targetUserId),
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
        languageCode: varchar("language_code", { length: 35 }).notNull(), // BCP 47 format
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
        index("user_spoken_languages_user_idx").on(t.userId),
        unique("user_spoken_languages_unique").on(t.userId, t.languageCode),
    ],
);

// User display language (UI language) - can have only one active
export const userDisplayLanguageTable = pgTable(
    "user_display_language",
    {
        id: serial("id").primaryKey(),
        userId: uuid("user_id")
            .references(() => userTable.id, { onDelete: "cascade" })
            .notNull(),
        languageCode: varchar("language_code", { length: 35 }).notNull(), // BCP 47 format
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
        index("user_display_language_user_idx").on(t.userId),
        unique("user_display_language_unique").on(t.userId, t.languageCode),
    ],
);

export const organizationTable = pgTable("organization", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: MAX_LENGTH_NAME_CREATOR })
        .notNull()
        .unique(),
    imagePath: text("image_path").notNull(),
    isFullImagePath: boolean("is_full_image_path").notNull(),
    websiteUrl: text("website_url").unique(),
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
});

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

// The process of changing emails, especially primary email, is stricly controlled.
// Emails cannot be shared among users. There is no plan to add "company" or "team" super-users at the moment.
// In a team, each individual has an account with their own email address, and a few of them can be admin of the group they created.
// That's why email is primaryKey even though it can change from a user's perspective: changing an email is considered adding another record to this table, and removing the old one.
// Emails in that table have already been validated by the user at least once and are related to an existing registered user.
export const emailTable = pgTable("email", {
    email: varchar("email", { length: 254 }).notNull().primaryKey(),
    type: emailType("type").notNull(),
    userId: uuid("user_id")
        .references(() => userTable.id)
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
});

export const deviceTable = pgTable("device", {
    didWrite: varchar("did_write", { length: 1000 }).primaryKey(), // TODO: make sure of length
    userId: uuid("user_id")
        .references(() => userTable.id)
        .notNull(),
    idProofId: integer("id_proof_id").references(() => idProofTable.id), // if null, then the corresponding user is not a citizen or the pub key hasn't been associated with an id proof yet
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

export const proofType = pgEnum("proof_type", [
    "root", // proof of passport from rarimo - may be associated with multiple pub keys
    "delegation", // ucan - delegates rights to potentially multiple other pub keys
]);

// each proof corresponds to at least one device
export const idProofTable = pgTable("id_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
        .references(() => userTable.id)
        .notNull(),
    proofType: proofType("proof_type").notNull(),
    proof: text("proof").notNull(), // base64 encoded proof - rarimo proof if root, else delegation proof
    proofVersion: integer("proof_version").notNull(),
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

// conceptually, it is a "pollContentTable"
export const pollTable = pgTable("poll", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationContentId: integer("conversation_content_id")
        .notNull()
        .unique()
        .references(() => conversationContentTable.id),
    option1: varchar("option1", { length: MAX_LENGTH_OPTION }).notNull(),
    option2: varchar("option2", { length: MAX_LENGTH_OPTION }).notNull(),
    option3: varchar("option3", { length: MAX_LENGTH_OPTION }),
    option4: varchar("option4", { length: MAX_LENGTH_OPTION }),
    option5: varchar("option5", { length: MAX_LENGTH_OPTION }),
    option6: varchar("option6", { length: MAX_LENGTH_OPTION }),
    // only there for read-speed
    option1Response: integer("option1_response").default(0).notNull(),
    option2Response: integer("option2_response").default(0).notNull(),
    option3Response: integer("option3_response"),
    option4Response: integer("option4_response"),
    option5Response: integer("option5_response"),
    option6Response: integer("option6_response"),
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

export const proofTypeEnum = pgEnum("proof_type", [
    "creation",
    "edit",
    "deletion",
]);

export const conversationProofTable = pgTable("conversation_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    conversationId: integer("conversation_id")
        .notNull()
        .references(() => conversationTable.id), // the conversationTable never gets deleted
    authorDid: varchar("author_did", { length: 1000 }) // TODO: make sure of length
        .notNull()
        .references(() => deviceTable.didWrite),
    proof: text("proof").notNull(), // base64 encoded proof
    proofVersion: integer("proof_version").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const conversationContentTable = pgTable("conversation_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
        .references(() => conversationTable.id)
        .notNull(),
    conversationProofId: integer("conversation_proof_id")
        // .notNull() // => may be null for external seed conversation
        .unique()
        .references(() => conversationProofTable.id), // cannot point to deletion proof
    title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
    body: varchar("body", { length: MAX_LENGTH_BODY_HTML }),
    pollId: integer("poll_id").references((): AnyPgColumn => pollTable.id), // for now there is only one poll per conversation at most
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const conversationTable = pgTable(
    "conversation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(), // used for permanent URL
        authorId: uuid("author_id") // "postAs"
            .notNull()
            .references(() => userTable.id), // the author of the poll
        organizationId: integer("organization_id").references(
            () => organizationTable.id,
        ),
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => conversationContentTable.id)
            .unique(), // null if conversation was deleted
        currentPolisContentId: integer("current_polis_content_id")
            .references((): AnyPgColumn => polisContentTable.id)
            .unique(), // null if conversation was deleted or if conversation was just started (no opinion/vote was cast)
        indexConversationAt: timestamp("index_conversation_at", {
            mode: "date",
            precision: 0,
        }),
        isIndexed: boolean("is_indexed").notNull().default(true), // if true, the conversation can be fetched in the feed and search engine, else it is hidden, unless users have the link
        isLoginRequired: boolean("is_login_required").notNull().default(true), // if true, the conversation requires users to sign up to participate -- this field is ignored if the conversation is indexed; in this case, sign-up is always required
        isImporting: boolean("is_importing").notNull().default(false), // if true, the conversation is being imported from CSV and should not be visible in feed until import completes
        isClosed: boolean("is_closed").notNull().default(false), // if true, the conversation was closed by owner and users cannot post opinions or vote
        requiresEventTicket: eventSlugEnum("requires_event_ticket"), // if set, only users with verified ticket for this event can participate (vote/post opinions)
        opinionCount: integer("opinion_count").notNull().default(0),
        voteCount: integer("vote_count").notNull().default(0),
        participantCount: integer("participant_count").notNull().default(0),
        importUrl: text("import_url"), // originally used for importing
        importConversationUrl: text("import_conversation_url"),
        importExportUrl: text("import_export_url"),
        importCreatedAt: timestamp("import_created_at", {
            // original creatoin date
            mode: "date",
            precision: 0,
        }),
        importAuthor: text("import_author"),
        importMethod: importMethodType("import_method").default("url"),
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
            // latest response to poll or opinion
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("conversation_createdAt_idx").on(table.createdAt),
        index("conversation_authorId_idx").on(table.authorId),
    ],
);

export const pollResponseTable = pgTable(
    "poll_response",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        pollId: integer("poll_id") // poll response belongs to a specific poll
            .notNull()
            .references(() => pollTable.id),
        currentContentId: integer("current_content_id")
            .references((): AnyPgColumn => pollResponseContentTable.id)
            .unique(),
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
    (t) => [unique().on(t.authorId, t.pollId)],
);

export const pollResponseProofTable = pgTable("poll_response_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    conversationId: integer("conversation_id")
        .notNull()
        .references(() => conversationTable.id), // the conversationTable never gets deleted
    authorDid: varchar("author_did", { length: 1000 }) // TODO: make sure of length
        .notNull()
        .references(() => deviceTable.didWrite),
    proof: text("proof").notNull(), // base64 encoded proof
    proofVersion: integer("proof_version").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const pollResponseContentTable = pgTable("poll_response_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    pollResponseId: integer("poll_response_id") //
        .notNull()
        .references(() => pollResponseTable.id),
    pollResponseProofId: integer("poll_response_proof_id")
        .notNull()
        .unique()
        .references((): AnyPgColumn => pollResponseProofTable.id),
    conversationContentId: integer("conversation_content_id")
        .references(() => conversationContentTable.id)
        .notNull(), // exact conversation content and associated poll that existed when this poll was responded.
    optionChosen: integer("option_chosen").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const opinionProofTable = pgTable("opinion_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    opinionId: integer("opinion_id")
        .notNull()
        .references(() => opinionTable.id), // the opinionTable never gets deleted
    authorDid: varchar("author_did", { length: 1000 }) // TODO: make sure of length
        .notNull()
        .references(() => deviceTable.didWrite),
    proof: text("proof").notNull(), // base64 encoded proof
    proofVersion: integer("proof_version").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

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
        polisGroupAwareConsensusProbabilityAgree: real("polis_ga_consensus_pa")
            .notNull()
            .default(0), // will contain pol.is group-aware-consensus probabilities for "agree"
        polisGroupAwareConsensusProbabilityDisagree: real(
            "polis_ga_consensus_pd",
        )
            .notNull()
            .default(0), // will contain pol.is group-aware-consensus probabilities for "agree"
        polisPriority: real("polis_priority").notNull().default(0), // contains pol.is comment-priorities
        polisDivisiveness: real("polis_divisiveness").notNull().default(0), // contains pol.is comment-extremities, the higher the most divisive
        // cache polis values to optimize fetch queries
        polisCluster0Id: integer("cluster_0_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster0NumAgrees: integer("cluster_0_num_agrees"),
        polisCluster0NumDisagrees: integer("cluster_0_num_disagrees"),
        polisCluster0NumPasses: integer("cluster_0_num_passes"),
        polisCluster1Id: integer("cluster_1_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster1NumAgrees: integer("cluster_1_num_agrees"),
        polisCluster1NumDisagrees: integer("cluster_1_num_disagrees"),
        polisCluster1NumPasses: integer("cluster_1_num_passes"),
        polisCluster2Id: integer("cluster_2_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster2NumAgrees: integer("cluster_2_num_agrees"),
        polisCluster2NumDisagrees: integer("cluster_2_num_disagrees"),
        polisCluster2NumPasses: integer("cluster_2_num_passes"),
        polisCluster3Id: integer("cluster_3_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster3NumAgrees: integer("cluster_3_num_agrees"),
        polisCluster3NumDisagrees: integer("cluster_3_num_disagrees"),
        polisCluster3NumPasses: integer("cluster_3_num_passes"),
        polisCluster4Id: integer("cluster_4_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster4NumAgrees: integer("cluster_4_num_agrees"),
        polisCluster4NumDisagrees: integer("cluster_4_num_disagrees"),
        polisCluster4NumPasses: integer("cluster_4_num_passes"),
        polisCluster5Id: integer("cluster_5_id").references(
            () => polisClusterTable.id,
        ),
        polisCluster5NumAgrees: integer("cluster_5_num_agrees"),
        polisCluster5NumDisagrees: integer("cluster_5_num_disagrees"),
        polisCluster5NumPasses: integer("cluster_5_num_passes"),
        polisMajorityType: voteEnumSimple("polis_majority_type"),
        polisMajorityProbabilitySuccess: real("polis_majority_ps"),
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
        index("opinion_createdAt_idx").on(table.createdAt),
        index("opinion_slugId_idx").on(table.slugId),
        index("opinion_conversationId_idx").on(table.conversationId),
        index("opinion_authorId_idx").on(table.authorId),
        check(
            "check_polis_majority",
            sql`(
            (${table.polisMajorityType} IS NOT NULL AND ${table.polisMajorityProbabilitySuccess} IS NOT NULL)
            OR
            (${table.polisMajorityType} IS NULL AND ${table.polisMajorityProbabilitySuccess} IS NULL)
            )`,
        ),
        check(
            "check_polis_null",
            sql`((${table.polisCluster0Id} IS NOT NULL AND ${table.polisCluster0NumAgrees} IS NOT NULL AND ${table.polisCluster0NumDisagrees} IS NOT NULL AND ${table.polisCluster0NumPasses} IS NOT NULL) OR (${table.polisCluster0Id} IS NULL AND ${table.polisCluster0NumAgrees} IS NULL AND ${table.polisCluster0NumDisagrees} IS NULL AND ${table.polisCluster0NumPasses} IS NULL))
                AND
                ((${table.polisCluster1Id} IS NOT NULL AND ${table.polisCluster1NumAgrees} IS NOT NULL AND ${table.polisCluster1NumDisagrees} IS NOT NULL AND ${table.polisCluster1NumPasses} IS NOT NULL) OR (${table.polisCluster1Id} IS NULL AND ${table.polisCluster1NumAgrees} IS NULL AND ${table.polisCluster1NumDisagrees} IS NULL AND ${table.polisCluster1NumPasses} IS NULL))
                AND
                ((${table.polisCluster2Id} IS NOT NULL AND ${table.polisCluster2NumAgrees} IS NOT NULL AND ${table.polisCluster2NumDisagrees} IS NOT NULL AND ${table.polisCluster2NumPasses} IS NOT NULL) OR (${table.polisCluster2Id} IS NULL AND ${table.polisCluster2NumAgrees} IS NULL AND ${table.polisCluster2NumDisagrees} IS NULL AND ${table.polisCluster2NumPasses} IS NULL))
                AND
                ((${table.polisCluster3Id} IS NOT NULL AND ${table.polisCluster3NumAgrees} IS NOT NULL AND ${table.polisCluster3NumDisagrees} IS NOT NULL AND ${table.polisCluster3NumPasses} IS NOT NULL) OR (${table.polisCluster3Id} IS NULL AND ${table.polisCluster3NumAgrees} IS NULL AND ${table.polisCluster3NumDisagrees} IS NULL AND ${table.polisCluster3NumPasses} IS NULL))
                AND
                ((${table.polisCluster4Id} IS NOT NULL AND ${table.polisCluster4NumAgrees} IS NOT NULL AND ${table.polisCluster4NumDisagrees} IS NOT NULL AND ${table.polisCluster4NumPasses} IS NOT NULL) OR (${table.polisCluster4Id} IS NULL AND ${table.polisCluster4NumAgrees} IS NULL AND ${table.polisCluster4NumDisagrees} IS NULL AND ${table.polisCluster4NumPasses} IS NULL))
                AND
                ((${table.polisCluster5Id} IS NOT NULL AND ${table.polisCluster5NumAgrees} IS NOT NULL AND ${table.polisCluster5NumDisagrees} IS NOT NULL AND ${table.polisCluster5NumPasses} IS NOT NULL) OR (${table.polisCluster5Id} IS NULL AND ${table.polisCluster5NumAgrees} IS NULL AND ${table.polisCluster5NumDisagrees} IS NULL AND ${table.polisCluster5NumPasses} IS NULL))`,
        ),
    ],
);

export const opinionContentTable = pgTable("opinion_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    opinionId: integer("opinion_id")
        .references(() => opinionTable.id)
        .notNull(), // used to delete all opinionContent when deleting an opinion
    conversationContentId: integer("conversation_content_id")
        .references(() => conversationContentTable.id)
        .notNull(), // used to cascade delete all opinionContent when deleting a conversation(content)
    opinionProofId: integer("opinion_proof_id")
        // .notNull() // => null if the opinion is created from a seed user
        .references(() => opinionProofTable.id), // cannot point to deletion proof
    content: varchar("content", { length: MAX_LENGTH_OPINION_HTML }).notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// like or dislike on opinions for each user
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
        index("vote_opinionId_idx").on(t.opinionId),
        index("vote_authorId_idx").on(t.authorId),
    ],
);

export const voteProofTable = pgTable("vote_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    voteId: integer("vote_id")
        .notNull()
        .references(() => voteTable.id), // the conversationTable never gets deleted
    authorDid: varchar("author_did", { length: 1000 }) // TODO: make sure of length
        .notNull()
        .references(() => deviceTable.didWrite),
    proof: text("proof").notNull(), // base64 encoded proof
    proofVersion: integer("proof_version").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const voteContentTable = pgTable("vote_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    voteId: integer("vote_id") //
        .notNull()
        .references(() => voteTable.id),
    voteProofId: integer("vote_proof_id")
        // .notNull() // => may be null if generated by seed user
        .references((): AnyPgColumn => voteProofTable.id),
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
            .unique()
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
    },
    (table) => [
        index(
            "conversation_moderation_conversation_id_moderation_action_idx",
        ).on(table.conversationId, table.moderationAction),
    ],
);

export const opinionModerationTable = pgTable("opinion_moderation", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    opinionId: integer("opinion_id") // one moderation action per opinion
        .references(() => opinionTable.id)
        .unique()
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
});

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
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
);

export const notificationNewOpinionTable = pgTable("notification_new_opinion", {
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
});

export const notificationExportTable = pgTable("notification_export", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    notificationId: integer("notification_id")
        .references(() => notificationTable.id)
        .notNull(),
    exportId: integer("export_id")
        .references(() => conversationExportTable.id)
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
});

export const notificationImportTable = pgTable("notification_import", {
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
});

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
        index("user_idx_notification").on(t.userId),
        index("notification_createdAt_idx").on(t.createdAt),
    ],
);

// content changes over time as much as the conversation receives opinions and votes
export const polisContentTable = pgTable("polis_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer("conversation_id")
        .references(() => conversationTable.id)
        .notNull(), // not unique, there will be multiple rows over the life of the conversation
    rawData: jsonb("raw_data").notNull(), // from external polis system
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {
        // aiSummary may be set at a later data
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// one polisContent has many polisClusters
export const polisClusterTable = pgTable("polis_cluster", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    polisContentId: integer("polis_content_id")
        .notNull()
        .references(() => polisContentTable.id), // the conversationTable never gets deleted
    key: polisKeyEnum("key").notNull(), // arbitrary id created by external polis system
    externalId: integer("external_id").notNull(),
    numUsers: integer("num_users").notNull(),
    aiLabel: varchar("ai_label", { length: 100 }), // TODO: set max-length appropriately
    aiSummary: varchar("ai_summary", { length: 1000 }), // TODO: set max-length appropriately
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {
        // aiSummary and aiLabel may be set at a later data
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// Translations for cluster labels and summaries in different display languages
// English version is stored in polisClusterTable.aiLabel/aiSummary
// Other languages are stored here for permanent reference
export const polisClusterTranslationTable = pgTable(
    "polis_cluster_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        polisClusterId: integer("polis_cluster_id")
            .notNull()
            .references(() => polisClusterTable.id),
        languageCode: varchar("language_code", { length: 10 }).notNull(), // BCP 47 format
        aiLabel: varchar("ai_label", { length: 100 }),
        aiSummary: varchar("ai_summary", { length: 1000 }),
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
        unique("unique_cluster_language").on(t.polisClusterId, t.languageCode),
        index("polis_cluster_translation_lookup_idx").on(
            t.polisClusterId,
            t.languageCode,
        ),
    ],
);

// one user can belong to only one cluster per polisContent
// one user can belong to many cluster across conversations (across polisContent)
// many users can belong to one cluster per polisContent
// => many-to-many relationship with a user uniquely belonging to a unique cluster per conversation at a time (= per polisContent.id)
export const polisClusterUserTable = pgTable(
    "polis_cluster_user",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        polisContentId: integer("polis_content_id")
            .notNull()
            .references(() => polisContentTable.id), // must match with polisContentId of polisClusterId's entity
        polisClusterId: integer("polis_cluster_id")
            .notNull()
            .references(() => polisClusterTable.id),
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
        unique("unique_belong_per_conv_at_a_time").on(
            t.polisContentId,
            t.userId,
        ),
    ],
);

// representative opinions for each cluster
export const polisClusterOpinionTable = pgTable(
    "polis_cluster_opinion",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        polisContentId: integer("polis_content_id")
            // .notNull() // TODO: add notNull after deployment
            .references(() => polisContentTable.id),
        polisClusterId: integer("polis_cluster_id")
            .notNull()
            .references(() => polisClusterTable.id),
        opinionId: integer("opinion_id")
            .notNull()
            .references(() => opinionTable.id),
        agreementType: voteEnumSimple("agreement_type").notNull(),
        probabilityAgreement: real("probability_agreement").notNull(), // example: 0.257, 0.013, 0, 1, 0.876 -- in practice should be larger than 0.5
        numAgreement: integer("number_agreement").notNull(), // example: 0, 1, 2...etc (number or agrees or disagrees)
        rawRepness: jsonb("raw_repness").notNull(), // from external polis system
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("polis_cluster_opinion_opinionId_idx").on(table.opinionId),
        index("polis_cluster_opinion_polisClusterId_idx").on(
            table.polisClusterId,
        ),
        check(
            "check_perc_btwn_0_and_1",
            sql`${table.probabilityAgreement} BETWEEN 0 and 1`,
        ),
    ],
);

// Queue table for signaling that a conversation needs math update
// This eliminates the need to UPDATE conversation table (which causes row locks)
export const conversationUpdateQueueTable = pgTable(
    "conversation_update_queue",
    {
        conversationId: integer("conversation_id")
            .primaryKey()
            .notNull()
            .references(() => conversationTable.id, { onDelete: "cascade" }),
        requestedAt: timestamp("requested_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
        processedAt: timestamp("processed_at", {
            mode: "date",
            precision: 0,
        }), // NULL = pending, NOT NULL = processed
        lastMathUpdateAt: timestamp("last_math_update_at", {
            mode: "date",
            precision: 0,
        }), // Timestamp of last successful math calculation (used for rate limiting)
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Partial index for scanner query: finds conversations needing math updates
        // Only indexes rows where requestedAt > lastMathUpdateAt (fresh data) or never processed (NULL)
        // This keeps the index small (only conversations needing updates) and very fast
        // Composite (requestedAt, lastMathUpdateAt) supports all scanner conditions efficiently
        index("idx_conversation_update_queue_pending")
            .on(table.requestedAt, table.lastMathUpdateAt)
            .where(
                sql`${table.requestedAt} > ${table.lastMathUpdateAt} OR ${table.lastMathUpdateAt} IS NULL`,
            ),
    ],
);

// Conversation exports table for CSV export feature
export const conversationExportTable = pgTable(
    "conversation_export",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
        conversationId: integer("conversation_id")
            .references(() => conversationTable.id)
            .notNull(),
        userId: uuid("user_id") // User who requested the export
            .references(() => userTable.id)
            .notNull(),
        status: exportStatusEnum("status").notNull().default("processing"),
        totalFileSize: integer("total_file_size"), // null until completed
        totalFileCount: integer("total_file_count"), // null until completed
        failureReason: exportFailureReasonEnum("failure_reason"), // populated if status="failed"
        cancellationReason: exportCancellationReasonEnum("cancellation_reason"), // populated if status="cancelled"
        expiresAt: timestamp("expires_at", {
            mode: "date",
            precision: 0,
        }).notNull(), // export record expiry (30 days)
        isDeleted: boolean("is_deleted").notNull().default(false),
        deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }),
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
        index("conversation_export_conversation_idx").on(t.conversationId),
        index("conversation_export_status_idx").on(t.status),
        index("conversation_export_deleted_idx").on(t.isDeleted),
        index("conversation_export_created_idx").on(t.createdAt),
        index("conversation_export_user_idx").on(t.userId),
    ],
);

// Individual files within a conversation export
export const conversationExportFileTable = pgTable(
    "conversation_export_file",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        exportId: integer("export_id")
            .references(() => conversationExportTable.id)
            .notNull(),
        fileType: exportFileTypeEnum("file_type").notNull(),
        fileName: varchar("file_name", { length: 100 }).notNull(),
        fileSize: integer("file_size").notNull(),
        recordCount: integer("record_count").notNull(),
        s3Key: text("s3_key").notNull(), // Presigned URLs are generated on-demand in getConversationExportStatus
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("conversation_export_file_export_idx").on(t.exportId),
        index("conversation_export_file_type_idx").on(t.fileType),
    ],
);

// Conversation imports table for CSV import feature (simplified - no files, no cooldown)
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
        index("conversation_import_conversation_idx").on(t.conversationId),
    ],
);
