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
    index,
} from "drizzle-orm/pg-core";
// import { MAX_LENGTH_OPTION, MAX_LENGTH_TITLE, MAX_LENGTH_COMMENT, MAX_LENGTH_BODY } from "./shared/shared.js"; // unfortunately it breaks drizzle generate... :o TODO: find a way
// WARNING - change this in shared.ts as well
const MAX_LENGTH_OPTION = 30;
const MAX_LENGTH_TITLE = 130;
const MAX_LENGTH_BODY = 260;
const MAX_LENGTH_NAME_CREATOR = 65;
const MAX_LENGTH_DESCRIPTION_CREATOR = 280;
const MAX_LENGTH_USERNAME = 40;
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

// One user == one account.
// Inserting a record in that table means that the user has been successfully registered.
// To one user can be associated multiple validated emails and devices.
// Emails and devices must only be associated with exactly one user.
// The association between users and devices/emails can change over time.
// A user must have at least 1 validated primary email and 1 device associated with it.
// The "at least one" conditon is not enforced directly in the SQL model yet. It is done in the application code.
export const userTable = pgTable("user", {
    id: uuid("id").primaryKey(), // enforce the same key for the user in the frontend across email changes
    organisationId: integer("organisation_id").references(
        () => organisationTable.id,
    ), // for now a user can belong to at most 1 organisation
    username: varchar("username", { length: MAX_LENGTH_USERNAME })
        .notNull()
        .unique(),
    isModerator: boolean("is_moderator").notNull().default(false),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    showFlaggedContent: boolean("show_flagged_content")
        .notNull()
        .default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    activePostCount: integer("active_post_count").notNull().default(0), // total posts (without deleted posts)
    totalPostCount: integer("total_post_count").notNull().default(0), // total posts created
    totalCommentCount: integer("total_comment_count").notNull().default(0), // total comments created
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
    (t) => {
        return {
            userIdx: index("user_idx_mute").on(t.sourceUserId),
            unqPreference: unique("user_unique_mute").on(
                t.sourceUserId,
                t.targetUserId,
            ),
        };
    },
);

export const userLanguagePreferenceTable = pgTable(
    "user_language_preference",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        langId: integer("lang_id")
            .references(() => userLanguageTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => {
        return {
            userIdx: index("user_idx_lang").on(t.userId),
            unqPreference: unique("user_unique_language").on(
                t.userId,
                t.langId,
            ),
        };
    },
);

export const userLanguageTable = pgTable("user_language", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name"),
    code: text("code"),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const postTopicTable = pgTable("post_topic", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name"),
    code: text("code"),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const userPostTopicPreferenceTable = pgTable(
    "user_post_topic_preference",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: uuid("user_id")
            .references(() => userTable.id)
            .notNull(),
        postTagId: integer("post_tag_id")
            .references(() => postTopicTable.id)
            .notNull(),
        createdAt: timestamp("created_at", {
            mode: "date",
            precision: 0,
        })
            .defaultNow()
            .notNull(),
    },
    (t) => {
        return {
            userIdx: index("user_idx_topic").on(t.userId),
            unqPreference: unique("user_unique_topic").on(
                t.userId,
                t.postTagId,
            ),
        };
    },
);

export const organisationTable = pgTable("organisation", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: MAX_LENGTH_NAME_CREATOR }).notNull(),
    imageUrl: text("image_url"),
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
});

export const zkPassportTable = pgTable("zk_passport", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
        .references(() => userTable.id)
        .notNull(),
    citizenship: varchar("citizenship", { length: 10 }).notNull(), // holds 3-digit country code, in theory but we play safe
    nullifier: text("nullifier").notNull().unique(),
    sex: varchar("sex", { length: 50 }).notNull(), // change to enum at some point
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

export const phoneTable = pgTable("phone", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
        .references(() => userTable.id)
        .notNull(),
    lastTwoDigits: varchar("last_two_digits", { length: 2 }).notNull(), // add check for it to be numbers?
    countryCallingCode: varchar("", { length: 10 }).notNull(),
    phoneCountryCode: phoneCountryCodeEnum("phone_country_code"),
    phoneHash: text("phone_hash").notNull(), // base64 encoded hash of phone + pepper
    pepperVersion: integer("pepper_version").notNull().default(0), // used pepper version - we rotate app-wide pepper one in a while
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
]);

// This table serves as a transitory store of information between the intial register attempt and the validation of the one-time code sent to the email address (no multi-factor because it is register)
// the record will be first created as "register" or "login_new_device", and latter updated to "login_known_device" on next authenticate action
// TODO: this table may have to be broke down when introducing 2FA
export const authAttemptPhoneTable = pgTable("auth_attempt_phone", {
    didWrite: varchar("did_write", { length: 1000 }).primaryKey(), // TODO: make sure of length
    type: authType("type").notNull(),
    lastTwoDigits: varchar("last_two_digits", { length: 2 }).notNull(), // add check for it to be numbers?
    countryCallingCode: varchar("", { length: 10 }).notNull(),
    phoneCountryCode: phoneCountryCodeEnum("phone_country_code"),
    phoneHash: text("phone_hash").notNull(), // base64 encoded hash of phone + pepper
    pepperVersion: integer("pepper_version").notNull().default(0), // used pepper - we rotate app-wide pepper once in a while
    userId: uuid("user_id").notNull(),
    userAgent: text("user_agent").notNull(), // user-agent length is not fixed
    code: integer("code").notNull(), // one-time password sent to the email ("otp")
    codeExpiry: timestamp("code_expiry").notNull(),
    guessAttemptAmount: integer("guess_attempt_amount").default(0).notNull(),
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
});

// conceptually, it is a "pollContentTable"
export const pollTable = pgTable("poll", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postContentId: integer("post_content_id")
        .notNull()
        .unique()
        .references(() => postContentTable.id),
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

export const postProofTable = pgTable("post_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    postId: integer("post_id")
        .notNull()
        .references(() => postTable.id), // the postTable never gets deleted
    parentId: integer("parent_id").references(
        (): AnyPgColumn => postProofTable.id,
    ), // not null if edit or delete, else null
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

export const postContentTable = pgTable("post_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
        .references(() => postTable.id)
        .notNull(),
    postProofId: integer("post_proof_id")
        .notNull()
        .unique()
        .references(() => postProofTable.id), // cannot point to deletion proof
    parentId: integer("parent_id").references(
        (): AnyPgColumn => postContentTable.id,
    ), // not null if edit
    title: varchar("title", { length: MAX_LENGTH_TITLE }).notNull(),
    body: varchar("body"),
    pollId: integer("poll_id").references((): AnyPgColumn => pollTable.id), // for now there is only one poll per post at most
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const postTable = pgTable("post", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slugId: varchar("slug_id", { length: 8 }).notNull().unique(), // used for permanent URL
    authorId: uuid("author_id") // "postAs"
        .notNull()
        .references(() => userTable.id), // the author of the poll
    currentContentId: integer("current_content_id")
        .references((): AnyPgColumn => postContentTable.id)
        .unique(), // null if post was deleted
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
        // latest response to poll or comment
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
    commentCount: integer("comment_count").notNull().default(0),
});

export const pollResponseTable = pgTable(
    "poll_response",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        postId: integer("post_id") // poll is bound to the post
            .notNull()
            .references(() => postTable.id),
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
    (t) => ({
        onePollResponsePerAuthor: unique().on(t.authorId, t.postId),
    }),
);

export const pollResponseProofTable = pgTable("poll_response_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    postId: integer("post_id")
        .notNull()
        .references(() => postTable.id), // the postTable never gets deleted
    parentId: integer("parent_id").references(
        (): AnyPgColumn => pollResponseProofTable.id,
    ), // not null if edit or delete, else null
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
    postContentId: integer("post_content_id")
        .references(() => postContentTable.id)
        .notNull(), // exact post content and associated poll that existed when this poll was responded.
    parentId: integer("parent_id").references(
        (): AnyPgColumn => pollResponseContentTable.id,
    ), // not null if edit
    optionChosen: integer("option_chosen").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

export const commentProofTable = pgTable("comment_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    commentId: integer("comment_id")
        .notNull()
        .references(() => commentTable.id), // the commentTable never gets deleted
    parentId: integer("parent_id").references(
        (): AnyPgColumn => commentProofTable.id,
    ), // not null if edit or delete, else null
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

export const commentTable = pgTable("comment", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slugId: varchar("slug_id", { length: 8 }).notNull().unique(), // used for permanent URL
    authorId: uuid("author_id")
        .notNull()
        .references(() => userTable.id),
    postId: integer("post_id")
        .references(() => postTable.id)
        .notNull(),
    currentContentId: integer("current_content_id").references(
        (): AnyPgColumn => commentContentTable.id,
    ), // null if comment was deleted
    numLikes: integer("num_likes").notNull().default(0),
    numDislikes: integer("num_dislikes").notNull().default(0),
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
});

export const commentContentTable = pgTable("comment_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    commentId: integer("comment_id")
        .references(() => commentTable.id)
        .notNull(), // used to delete all commentContent when deleting a comment
    postContentId: integer("post_content_id")
        .references(() => postContentTable.id)
        .notNull(), // used to cascade delete all commentContent when deleting a post(content)
    commentProofId: integer("comment_proof_id")
        .notNull()
        .references(() => commentProofTable.id), // cannot point to deletion proof
    parentId: integer("parent_id").references(
        (): AnyPgColumn => commentContentTable.id,
    ), // not null if edit
    content: varchar("content").notNull(),
    createdAt: timestamp("created_at", {
        mode: "date",
        precision: 0,
    })
        .defaultNow()
        .notNull(),
});

// like or dislike on comments for each user
export const voteTable = pgTable(
    "vote",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => userTable.id),
        commentId: integer("comment_id")
            .notNull()
            .references(() => commentTable.id),
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
    (t) => ({
        oneCommentVotePerUser: unique().on(t.authorId, t.commentId),
    }),
);

export const voteProofTable = pgTable("vote_proof", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: proofTypeEnum("proof_type").notNull(),
    voteId: integer("vote_id")
        .notNull()
        .references(() => voteTable.id), // the postTable never gets deleted
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

export const voteEnum = pgEnum("vote_enum", ["like", "dislike"]);

export const voteContentTable = pgTable("vote_content", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    voteId: integer("vote_id") //
        .notNull()
        .references(() => voteTable.id),
    voteProofId: integer("vote_proof_id")
        .notNull()
        .references((): AnyPgColumn => voteProofTable.id),
    commentContentId: integer("comment_content_id")
        .references(() => commentContentTable.id)
        .notNull(), // exact comment content that existed when this vote was cast. Cascade delete from commentContent if commentContent was deleted.
    optionChosen: voteEnum("option_chosen").notNull(),
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
export const moderationActionPostsEnum = pgEnum("moderation_action_posts", [
    "lock",
]);

export const moderationActionCommentsEnum = pgEnum(
    "moderation_action_comments",
    ["move", "hide"],
);

export const reportPostsTable = pgTable(
    "report_posts_table",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        postId: integer("post_id")
            .references(() => postTable.id)
            .notNull(),
        reporterId: uuid("reporter_id")
            .references(() => userTable.id)
            .notNull(),
        reportReason: reportReasons("reporter_reason").notNull(),
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
    (table) => {
        return {
            postIdInx: index("postId_idx").on(table.postId),
        };
    },
);

export const reportCommentsTable = pgTable(
    "report_comments_table",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        commentId: integer("comment_id")
            .references(() => commentTable.id)
            .notNull(),
        reporterId: uuid("reporter_id")
            .references(() => userTable.id)
            .notNull(),
        reportReason: reportReasons("reporter_reason").notNull(),
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
    (table) => {
        return {
            commentIdInx: index("commentId_idx").on(table.commentId),
        };
    },
);

export const moderationPostsTable = pgTable("moderation_posts_table", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id") // one moderation action per post
        .references(() => postTable.id)
        .unique()
        .notNull(),
    moderatorId: uuid("moderator_id")
        .references(() => userTable.id)
        .notNull(),
    moderationAction: moderationActionPostsEnum("moderation_action").notNull(), // add check
    moderationReason: moderationReasonsEnum("moderation_reason").notNull(), // add check: if not nothing above, must not be nothing here
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

export const moderationCommentsTable = pgTable("moderation_comments_table", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    commentId: integer("comment_id") // one moderation action per comment
        .references(() => commentTable.id)
        .unique()
        .notNull(),
    moderatorId: uuid("moderator_id")
        .references(() => userTable.id)
        .notNull(),
    moderationAction:
        moderationActionCommentsEnum("moderation_action").notNull(), // add check
    moderationReason: moderationReasonsEnum("moderation_reason").notNull(), // add check: if not nothing above, must not be nothing here
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
