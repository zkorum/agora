-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "analysis_compression_enum" AS ENUM('zstd');

CREATE TYPE "auth_type" AS ENUM('register', 'login_known_device', 'login_new_device', 'merge', 'restore_deleted', 'restore_and_merge');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

CREATE TYPE "ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');

CREATE TYPE "ranking_mode" AS ENUM('bws', 'pairwise');

CREATE TYPE "sex" AS ENUM('F', 'M', 'X');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "ticket_provider" AS ENUM('zupass');

CREATE TABLE "analysis_input_participant_eligibility" (
	"input_snapshot_id" integer,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "analysis_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "analysis_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "analysis_input_participant_eligibility_index_check" CHECK ("participant_index" >= 0),
	CONSTRAINT "analysis_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);

CREATE TABLE "analysis_input_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_input_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"data_generation" integer NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"opinion_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"compression" "analysis_compression_enum" NOT NULL,
	"payload" bytea NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_input_snapshot_hash_unique" UNIQUE("conversation_id","data_generation","input_hash"),
	CONSTRAINT "analysis_input_snapshot_scope_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "analysis_input_snapshot_version_check" CHECK ("payload_version" in (1, 2)),
	CONSTRAINT "analysis_input_snapshot_counts_check" CHECK ("opinion_count" >= 0 AND "participant_count" >= 0 AND "vote_count" >= 0)
);

CREATE TABLE "auth_attempt_email" (
	"did_write" varchar(1000) PRIMARY KEY,
	"type" "auth_type" NOT NULL,
	"email" varchar(254) NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"code" integer NOT NULL,
	"email_reachability" "email_reachability",
	"code_expiry" timestamp NOT NULL,
	"guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "auth_attempt_email_canonical_check" CHECK ("email" = lower(btrim("email")))
);

CREATE TABLE "auth_attempt_phone" (
	"did_write" varchar(1000) PRIMARY KEY,
	"type" "auth_type" NOT NULL,
	"last_two_digits" smallint NOT NULL,
	"countryCallingCode" varchar(10) NOT NULL,
	"phone_country_code" "phone_country_code",
	"phone_hash" text NOT NULL,
	"pepper_version" integer DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"code" integer NOT NULL,
	"code_expiry" timestamp NOT NULL,
	"guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("last_two_digits" BETWEEN 0 and 99)
);

CREATE TABLE "blocked_phone_number" (
	"phone_hash" text,
	"pepper_version" integer,
	"reason" text NOT NULL,
	"blocked_at" timestamp(0) DEFAULT now() NOT NULL,
	"revoked_at" timestamp(0),
	CONSTRAINT "blocked_phone_number_pkey" PRIMARY KEY("phone_hash","pepper_version"),
	CONSTRAINT "blocked_phone_pepper_version_nonnegative_check" CHECK ("pepper_version" >= 0),
	CONSTRAINT "blocked_phone_reason_nonempty_check" CHECK (length(btrim("reason")) > 0)
);

CREATE TABLE "comparison_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"detached_at" timestamp(3),
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "comparison_response_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id"),
	CONSTRAINT "comparison_response_account_binding_check" CHECK (((((("participant_id" is not null)) and (("detached_at" is null)))) or (((("participant_id" is null)) and (("detached_at" is not null))))))
);

CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participant_id_account_unique" UNIQUE("id","user_id"),
	CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "conversation_participant_account_unique" UNIQUE("conversation_id","user_id")
);

CREATE TABLE "conversation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"current_content_id" integer UNIQUE,
	"deleted_at" timestamp(3),
	"polis_config_id" integer UNIQUE,
	"ranking_config_id" integer UNIQUE,
	"credit_voting_config_id" integer UNIQUE,
	"gathering_config_id" integer UNIQUE,
	"prioritization_type" text,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_enabled_override" boolean,
	"conversation_email_update_override_updated_at" timestamp(0),
	"conversation_email_update_override_updated_by_user_id" uuid,
	"language_settings_source" "conversation_language_settings_source" DEFAULT 'conversation_override'::"conversation_language_settings_source" NOT NULL,
	"is_indexed" boolean DEFAULT true NOT NULL,
	"participation_mode" "participation_mode" DEFAULT 'account_required'::"participation_mode" NOT NULL,
	"participation_mode_settings_source" text DEFAULT 'conversation_override' NOT NULL,
	"conversation_type" "conversation_type" DEFAULT 'polis'::"conversation_type" NOT NULL,
	"is_importing" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"vote_buffer_epoch" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vote_buffer_drained" boolean DEFAULT true NOT NULL,
	"closing_target_revision" bigint,
	"closed_finalized_at" timestamp(0),
	"is_edited" boolean DEFAULT false NOT NULL,
	"requires_event_ticket" "event_slug",
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_gathering_config_unique" UNIQUE("id","gathering_config_id"),
	CONSTRAINT "conversation_participation_mode_settings_source_check" CHECK ("participation_mode_settings_source" in ('project_inherited', 'conversation_override')),
	CONSTRAINT "conversation_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))),
	CONSTRAINT "conversation_closing_state_check" CHECK (("is_closed" OR ("closing_target_revision" IS NULL AND "closed_finalized_at" IS NULL)) AND ("closed_finalized_at" IS NULL OR "closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((((("conversation_type" = 'gathering') and (("gathering_config_id" is not null)) and (("polis_config_id" is null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or (((("gathering_config_id" is null)) and ((((("conversation_type" = 'polis') and (("polis_config_id" is not null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or ((("conversation_type" = 'prioritizing') and (("polis_config_id" is null)) and (("prioritization_type" is not null)) and ((((("prioritization_type" = 'comparisons') and (("ranking_config_id" is not null)) and (("credit_voting_config_id" is null)))) or ((("prioritization_type" = 'qv') and (("credit_voting_config_id" is not null)) and (("ranking_config_id" is null)))))))))))))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (((("conversation_email_update_override_updated_by_user_id" is null)) or (("conversation_email_update_override_updated_at" is not null))))
);

CREATE TABLE "device" (
	"did_write" varchar(1000) PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"session_started_at" timestamp(0) DEFAULT now() NOT NULL,
	"session_expiry" timestamp NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "email" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(254) NOT NULL,
	"type" "email_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email_reachability" "email_reachability",
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "email_canonical_check" CHECK ("email" = lower(btrim("email"))),
	CONSTRAINT "email_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
);

CREATE TABLE "event_ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"provider" "ticket_provider" NOT NULL,
	"nullifier" text NOT NULL,
	"event_slug" "event_slug" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp(0) DEFAULT now() NOT NULL,
	"pcd_type" text,
	"provider_metadata" jsonb,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "followed_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "followed_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "gathering_response_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"response_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_content_response_id_unique" UNIQUE("response_id","id"),
	CONSTRAINT "gathering_content_config_id_unique" UNIQUE("config_id","id")
);

CREATE TABLE "gathering_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"author_id" uuid,
	"is_seed" boolean DEFAULT false NOT NULL,
	"current_content_id" integer,
	"baseline_content_id" integer,
	"source_conversation_id" integer,
	"source_response_content_id" integer,
	"source_conversation_slug_id" varchar(8),
	"source_conversation_type" text,
	"moderation" text,
	"account_hidden_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_response_config_id_unique" UNIQUE("config_id","id"),
	CONSTRAINT "gathering_response_seed_author_check" CHECK ((("is_seed" = false) or (("author_id" is null)))),
	CONSTRAINT "gathering_response_author_check" CHECK ((("is_seed" = true) or (("author_id" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "gathering_response_deletion_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))),
	CONSTRAINT "gathering_response_moderation_check" CHECK (((("moderation" is null)) or ("moderation" in ('hide', 'move')))),
	CONSTRAINT "gathering_response_provenance_check" CHECK (((((("source_conversation_slug_id" is null)) and (("source_conversation_type" is null)) and (("baseline_content_id" is null)) and (("source_conversation_id" is null)) and (("source_response_content_id" is null)))) or (((("source_conversation_slug_id" is not null)) and (("source_conversation_type" is not null)) and ("source_conversation_type" = 'gathering') and (("baseline_content_id" is not null))))))
);

CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notification_type" "notification_type_enum" NOT NULL,
	"security_key" varchar(64),
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "opinion_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"opinion_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_by_user_id" uuid,
	"content_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_edit_attribution_check" CHECK (((("edited_by_user_id" is null)) or ("is_edited" = true))),
	CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("content") <= 16384),
	CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp(3),
	"account_hidden_at" timestamp(3),
	"account_hidden_content_retained" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "opinion_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))))
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "otp_email_destination_state" (
	"email" varchar(254) PRIMARY KEY,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "otp_email_destination_canonical_check" CHECK ("email" = lower(btrim("email"))),
	CONSTRAINT "otp_email_wrong_guess_attempt_amount_nonnegative_check" CHECK ("wrong_guess_attempt_amount" >= 0)
);

CREATE TABLE "otp_phone_destination_state" (
	"phone_hash" text PRIMARY KEY,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "otp_phone_wrong_guess_attempt_amount_nonnegative_check" CHECK ("wrong_guess_attempt_amount" >= 0)
);

CREATE TABLE "phone_sms_budget_alert" (
	"id" uuid PRIMARY KEY,
	"kind" varchar(16) NOT NULL,
	"day" varchar(10) NOT NULL,
	"next_attempt_at" timestamp(3) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_alert_day_kind_unique" UNIQUE("day","kind"),
	CONSTRAINT "phone_sms_budget_alert_kind_check" CHECK ("kind" IN ('warning', 'hard_limit')),
	CONSTRAINT "phone_sms_budget_alert_attempts_check" CHECK ("attempt_count" >= 0)
);

CREATE TABLE "phone_sms_budget_policy" (
	"id" integer PRIMARY KEY,
	"sending_enabled" boolean DEFAULT false NOT NULL,
	"hourly_send_limit" integer,
	"daily_send_limit" integer,
	"estimated_cents_per_send" integer NOT NULL,
	"hourly_budget_cents" integer,
	"daily_budget_cents" integer,
	"monthly_budget_cents" integer DEFAULT 10000 NOT NULL,
	"warning_percent" integer DEFAULT 75 NOT NULL,
	"registration_paused_at" timestamp(3),
	"registration_pause_expires_at" timestamp(3),
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_single_policy_check" CHECK ("id" = 1),
	CONSTRAINT "phone_sms_budget_positive_limits_check" CHECK (("hourly_send_limit" IS NULL OR "hourly_send_limit" > 0) AND ("daily_send_limit" IS NULL OR "daily_send_limit" > 0) AND ("hourly_send_limit" IS NULL OR "daily_send_limit" IS NULL OR "daily_send_limit" >= "hourly_send_limit") AND "estimated_cents_per_send" > 0 AND ("hourly_budget_cents" IS NULL OR "hourly_budget_cents" > 0) AND ("daily_budget_cents" IS NULL OR "daily_budget_cents" > 0) AND ("hourly_budget_cents" IS NULL OR "daily_budget_cents" IS NULL OR "daily_budget_cents" >= "hourly_budget_cents")),
	CONSTRAINT "phone_sms_budget_warning_percent_check" CHECK ("warning_percent" BETWEEN 1 AND 99),
	CONSTRAINT "phone_sms_budget_monthly_limit_check" CHECK ("monthly_budget_cents" >= 0),
	CONSTRAINT "phone_sms_budget_pause_expiry_check" CHECK ("registration_pause_expires_at" IS NULL OR ("registration_paused_at" IS NOT NULL AND "registration_pause_expires_at" > "registration_paused_at"))
);

CREATE TABLE "phone_sms_budget_reservation" (
	"id" uuid PRIMARY KEY,
	"estimated_cents" integer NOT NULL,
	"reserved_at" timestamp(3) NOT NULL,
	CONSTRAINT "phone_sms_budget_reservation_cents_check" CHECK ("estimated_cents" > 0)
);

CREATE TABLE "phone" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "phone_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"last_two_digits" smallint NOT NULL,
	"countryCallingCode" varchar(10) NOT NULL,
	"phone_country_code" "phone_country_code",
	"phone_hash" text NOT NULL,
	"pepper_version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("last_two_digits" BETWEEN 0 and 99),
	CONSTRAINT "phone_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
);

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "qv_allocation" (
	"version_id" uuid,
	"conversation_id" integer NOT NULL,
	"item_id" integer,
	"content_id" integer NOT NULL,
	"votes" smallint NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_allocation_pkey" PRIMARY KEY("version_id","item_id"),
	CONSTRAINT "qv_allocation_votes_check" CHECK ((("votes" <> 0) and ("votes" >= -10) and ("votes" <= 10)))
);

CREATE TABLE "qv_calculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" integer NOT NULL,
	"generation" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input_snapshot_id" uuid,
	"lease_token" uuid,
	"lease_expires_at" timestamp(3),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp(3) DEFAULT now() NOT NULL,
	"error_code" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"ready_at" timestamp(3),
	CONSTRAINT "qv_calculation_generation_unique" UNIQUE("conversation_id","generation"),
	CONSTRAINT "qv_calculation_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_calculation_generation_check" CHECK ("generation" >= 1),
	CONSTRAINT "qv_calculation_attempt_check" CHECK ("attempt_count" >= 0),
	CONSTRAINT "qv_calculation_status_check" CHECK ("status" in ('queued', 'running', 'ready', 'failed')),
	CONSTRAINT "qv_calculation_lease_check" CHECK ((((("status" = 'running') and (("lease_token" is not null)) and (("lease_expires_at" is not null)))) or ((("status" <> 'running') and (("lease_token" is null)) and (("lease_expires_at" is null)))))),
	CONSTRAINT "qv_calculation_ready_check" CHECK ((((("status" = 'ready') and (("input_snapshot_id" is not null)) and (("ready_at" is not null)))) or ((("status" <> 'ready') and (("ready_at" is null))))))
);

CREATE TABLE "credit_voting_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_voting_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"allow_opposition" boolean DEFAULT true NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"statement_set_revision" integer DEFAULT 0 NOT NULL,
	"statements_locked_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "credit_voting_fixed_budget_check" CHECK ("credit_budget" = 100),
	CONSTRAINT "credit_voting_statement_revision_check" CHECK ("statement_set_revision" >= 0),
	CONSTRAINT "credit_voting_item_count_check" CHECK ("item_count" >= 0)
);

CREATE TABLE "qv_input_ballot_eligibility" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "qv_input_ballot_eligibility_pkey" PRIMARY KEY("snapshot_id","ballot_index"),
	CONSTRAINT "qv_input_ballot_eligibility_account_unique" UNIQUE("snapshot_id","user_id"),
	CONSTRAINT "qv_input_ballot_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);

CREATE TABLE "qv_input_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"calculation_id" uuid NOT NULL UNIQUE,
	"credit_budget" integer NOT NULL,
	"credit_pricing" text NOT NULL,
	"allow_opposition" boolean NOT NULL,
	"statement_set_revision" integer NOT NULL,
	"rule_version" integer NOT NULL,
	"algorithm_version" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"captured_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "qv_input_snapshot_id_calculation_unique" UNIQUE("id","calculation_id"),
	CONSTRAINT "qv_input_snapshot_provenance_check" CHECK ((("credit_budget" = 100) and ("credit_pricing" = 'quadratic') and ("rule_version" = 1) and ("algorithm_version" = 1) and ("participant_count" >= 0) and ("statement_set_revision" >= 0)))
);

CREATE TABLE "qv_response_command" (
	"response_id" uuid,
	"command_id" uuid,
	"request_hash" varchar(64) NOT NULL,
	"result_revision" integer NOT NULL,
	"result_version_id" uuid,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_response_command_pkey" PRIMARY KEY("response_id","command_id"),
	CONSTRAINT "qv_command_revision_check" CHECK ("result_revision" >= 0)
);

CREATE TABLE "qv_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"participant_id" uuid NOT NULL CONSTRAINT "qv_response_participant_unique" UNIQUE,
	"conversation_id" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"current_version_id" uuid,
	"account_hidden_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "qv_response_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_response_revision_check" CHECK ("revision" >= 0),
	CONSTRAINT "qv_response_deleted_pointer_check" CHECK (((("deleted_at" is null)) or (("current_version_id" is null))))
);

CREATE TABLE "qv_response_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"response_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"statement_set_revision" integer NOT NULL,
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"credit_pricing" varchar(16) DEFAULT 'quadratic' NOT NULL,
	"allow_opposition" boolean NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"credits_spent" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_version_id_response_unique" UNIQUE("id","response_id"),
	CONSTRAINT "qv_version_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_version_revision_check" CHECK ("statement_set_revision" >= 0),
	CONSTRAINT "qv_version_budget_check" CHECK ((("credit_budget" = 100) and ("credit_pricing" = 'quadratic') and ("rule_version" = 1) and ("credits_spent" >= 1) and ("credits_spent" <= "credit_budget")))
);

CREATE TABLE "ranking_input_participant_eligibility" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ranking_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "ranking_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "ranking_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);

CREATE TABLE "ranking_input_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"stats_snapshot_id" integer UNIQUE,
	"conversation_id" integer NOT NULL,
	"comparison_method" "ranking_mode" NOT NULL,
	"scoring_input_revision" bigint NOT NULL,
	"algorithm_version" integer NOT NULL,
	"solidago_version" varchar(100) NOT NULL,
	"pipeline_config" jsonb NOT NULL,
	"participant_count" integer NOT NULL,
	"item_count" integer NOT NULL,
	"answer_count" integer NOT NULL,
	"sealed_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_input_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_input_snapshot_bounds_check" CHECK ((("participant_count" >= 0) and ("scoring_input_revision" >= 0) and ("algorithm_version" >= 1) and ("item_count" >= 0) and ("answer_count" >= 0))),
	CONSTRAINT "ranking_input_published_sealed_check" CHECK (((("stats_snapshot_id" is null)) or (("sealed_at" is not null))))
);

CREATE TABLE "ranking_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp(3),
	"account_hidden_at" timestamp(3),
	"account_hidden_content_retained" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active'::"ranking_item_lifecycle_status" NOT NULL,
	"moderation" text,
	"position" integer DEFAULT 0 NOT NULL,
	"snapshot_score" real,
	"snapshot_ranking_score_id" integer,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_item_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "ranking_item_participant_moderation_check" CHECK (((("moderation" is null)) or ((("is_seed" = false) and ("moderation" in ('move', 'hide')))))),
	CONSTRAINT "ranking_item_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))))
);

CREATE TABLE "realtime_event_dispatch_state" (
	"id" integer PRIMARY KEY,
	"last_delivery_id" integer DEFAULT 0 NOT NULL,
	"replay_floor_delivery_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "realtime_event_dispatch_state_singleton_check" CHECK ("id" = 1),
	CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK ((("replay_floor_delivery_id" >= 0) and ("last_delivery_id" >= "replay_floor_delivery_id")))
);

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer UNIQUE,
	"delivered_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "retired_device_key" (
	"did_write" varchar(1000) PRIMARY KEY,
	"retired_at" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "survey_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"completed_at" timestamp(0),
	"withdrawn_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_response_conversation_participant_unique" UNIQUE("conversation_id","participant_id"),
	CONSTRAINT "survey_response_id_conversation_unique" UNIQUE("id","conversation_id")
);

CREATE TABLE "user_display_language" (
	"user_id" uuid PRIMARY KEY,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "user_spoken_languages" (
	"id" serial PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"language_code" "spoken_language_code" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_spoken_languages_unique" UNIQUE("user_id","language_code")
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY,
	"polis_participant_id" serial,
	"username" varchar(20) NOT NULL UNIQUE,
	"is_site_moderator" boolean DEFAULT false NOT NULL,
	"is_site_org_admin" boolean DEFAULT false NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp(0),
	"deletion_reason" text,
	"deletion_requested_at" timestamp(3),
	"recoverable_until" timestamp(3),
	"purge_started_at" timestamp(3),
	"auth_restricted_at" timestamp(0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_contribution_revision_check" CHECK ("contribution_revision" >= 0),
	CONSTRAINT "user_recovery_lifecycle_check" CHECK (((((((("deletion_requested_at" is null)) and (("recoverable_until" is null)))) or ((("is_deleted" = true) and (("deletion_reason" is not null)) and ("deletion_reason" = 'account_deletion') and (("deletion_requested_at" is not null)) and (("recoverable_until" is not null)) and ("recoverable_until" = "deletion_requested_at" + interval '15 days'))))) and (((("purge_started_at" is null)) or ("is_deleted" = true))))),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("auth_restricted_at" IS NULL) = ("auth_restriction_reason" IS NULL)),
	CONSTRAINT "user_deletion_reason_check" CHECK (((("deletion_reason" is null)) or ((("is_deleted" = true) and (("deleted_at" is not null)) and ("deletion_reason" in ('account_deletion', 'guest_merge'))))))
);

CREATE TABLE "vote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"participant_id" uuid,
	"opinion_id" integer NOT NULL,
	"polis_vote_id" integer,
	"buffer_epoch" uuid,
	"buffer_sequence" bigint DEFAULT 0 NOT NULL,
	"current_content_id" integer,
	"withdrawn_at" timestamp(3),
	"retired_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id"),
	CONSTRAINT "vote_inactive_intent_check" CHECK (((((("withdrawn_at" is null)) and (("retired_at" is null)))) or (("current_content_id" is null))))
);

CREATE TABLE "zk_passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zk_passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "zk_passport_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
);

CREATE INDEX "analysis_input_participant_eligibility_user_idx" ON "analysis_input_participant_eligibility" ("user_id");

CREATE INDEX "analysis_input_snapshot_conversation_idx" ON "analysis_input_snapshot" ("conversation_id","data_generation");

CREATE INDEX "comparison_response_conversation_idx" ON "comparison_response" ("conversation_id");

CREATE INDEX "conversation_participant_user_idx" ON "conversation_participant" ("user_id");

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "device_user_session_expiry_idx" ON "device" ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" ("email") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" ("user_id") WHERE "type" = 'primary' AND "is_deleted" = false;

CREATE INDEX "email_idx" ON "email" ("email");

CREATE INDEX "user_event_idx" ON "event_ticket" ("user_id","event_slug");

CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" ("nullifier","event_slug") WHERE "is_deleted" = false;

CREATE INDEX "nullifier_idx" ON "event_ticket" ("nullifier");

CREATE UNIQUE INDEX "followed_topic_active_unique" ON "followed_topic" ("user_id","topic_id") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "gathering_response_author_unique" ON "gathering_response" ("conversation_id","author_id") WHERE "is_seed" = false;

CREATE INDEX "gathering_response_author_idx" ON "gathering_response" ("author_id");

CREATE INDEX "notification_user_created_id_idx" ON "notification" ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" ("user_id","security_key");

CREATE INDEX "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "opinion_authorId_idx" ON "opinion" ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" ("author_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" ("user_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));

CREATE INDEX "otp_email_destination_updated_idx" ON "otp_email_destination_state" ("updated_at");

CREATE INDEX "otp_phone_destination_updated_idx" ON "otp_phone_destination_state" ("updated_at");

CREATE INDEX "phone_sms_budget_alert_due_idx" ON "phone_sms_budget_alert" ("sent_at","next_attempt_at");

CREATE INDEX "phone_sms_budget_reservation_time_idx" ON "phone_sms_budget_reservation" ("reserved_at");

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" ("phone_hash") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE INDEX "phone_hash_idx" ON "phone" ("phone_hash");

CREATE INDEX "phone_user_idx" ON "phone" ("user_id");

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" ("organization_id");

CREATE INDEX "qv_allocation_deleted_idx" ON "qv_allocation" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');

CREATE INDEX "qv_input_ballot_eligibility_user_idx" ON "qv_input_ballot_eligibility" ("user_id");

CREATE INDEX "qv_command_deleted_idx" ON "qv_response_command" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "qv_response_conversation_active_idx" ON "qv_response" ("conversation_id") WHERE ((("current_version_id" is not null)) and (("deleted_at" is null)) and (("account_hidden_at" is null)));

CREATE INDEX "qv_version_response_idx" ON "qv_response_version" ("response_id");

CREATE INDEX "qv_version_deleted_idx" ON "qv_response_version" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "ranking_input_participant_eligibility_user_idx" ON "ranking_input_participant_eligibility" ("user_id");

CREATE INDEX "ranking_input_snapshot_conversation_idx" ON "ranking_input_snapshot" ("conversation_id","stats_snapshot_id");

CREATE INDEX "ranking_input_snapshot_prepared_idx" ON "ranking_input_snapshot" ("conversation_id","scoring_input_revision","created_at","id") WHERE ((("stats_snapshot_id" is null)) and (("sealed_at" is not null)));

CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" ("conversation_id","current_content_id");

CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" ("conversation_id","lifecycle_status");

CREATE INDEX "comparison_moderation_history_idx" ON "ranking_item" ("conversation_id","id") WHERE ("moderation" is not null);

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" ("id") WHERE ("delivery_id" is null);

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" ("conversation_id","created_at");

CREATE INDEX "survey_response_participant_idx" ON "survey_response" ("participant_id");

CREATE INDEX "vote_authorId_idx" ON "vote" ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" ("author_id","updated_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "vote_opinion_active_idx" ON "vote" ("opinion_id","current_content_id");

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" ("nullifier") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" ("nullifier");

CREATE INDEX "zk_passport_user_idx" ON "zk_passport" ("user_id");
