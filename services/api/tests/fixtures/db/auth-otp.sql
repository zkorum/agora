-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."auth_type" AS ENUM('register', 'login_known_device', 'login_new_device', 'merge', 'restore_deleted', 'restore_and_merge');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'prioritizing');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "public"."email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TYPE "public"."organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

CREATE TYPE "public"."ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');

CREATE TYPE "public"."sex" AS ENUM('F', 'M', 'X');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "public"."ticket_provider" AS ENUM('zupass');

CREATE TABLE "auth_attempt_email" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"type" "auth_type" NOT NULL,
	"email" varchar(254) NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"code" integer NOT NULL,
	"email_reachability" "email_reachability",
	"code_expiry" timestamp NOT NULL,
	"guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "auth_attempt_email_canonical_check" CHECK ("auth_attempt_email"."email" = lower(btrim("auth_attempt_email"."email")))
);

CREATE TABLE "auth_attempt_phone" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("auth_attempt_phone"."last_two_digits" BETWEEN 0 and 99)
);

CREATE TABLE "blocked_phone_number" (
	"phone_hash" text NOT NULL,
	"pepper_version" integer NOT NULL,
	"reason" text NOT NULL,
	"blocked_at" timestamp (0) DEFAULT now() NOT NULL,
	"revoked_at" timestamp (0),
	CONSTRAINT "blocked_phone_number_phone_hash_pepper_version_pk" PRIMARY KEY("phone_hash","pepper_version"),
	CONSTRAINT "blocked_phone_pepper_version_nonnegative_check" CHECK ("blocked_phone_number"."pepper_version" >= 0),
	CONSTRAINT "blocked_phone_reason_nonempty_check" CHECK (length(btrim("blocked_phone_number"."reason")) > 0)
);

CREATE TABLE "comparison_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"detached_at" timestamp (3),
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "comparison_response_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id"),
	CONSTRAINT "comparison_response_account_binding_check" CHECK ((("comparison_response"."participant_id" is not null and "comparison_response"."detached_at" is null) or ("comparison_response"."participant_id" is null and "comparison_response"."detached_at" is not null)))
);

CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participant_id_account_unique" UNIQUE("id","user_id"),
	CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "conversation_participant_account_unique" UNIQUE("conversation_id","user_id")
);

CREATE TABLE "conversation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"project_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"polis_config_id" integer,
	"ranking_config_id" integer,
	"credit_voting_config_id" integer,
	"prioritization_type" text,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_enabled_override" boolean,
	"conversation_email_update_override_updated_at" timestamp (0),
	"conversation_email_update_override_updated_by_user_id" uuid,
	"language_settings_source" "conversation_language_settings_source" DEFAULT 'conversation_override' NOT NULL,
	"is_indexed" boolean DEFAULT true NOT NULL,
	"participation_mode" "participation_mode" DEFAULT 'account_required' NOT NULL,
	"conversation_type" "conversation_type" DEFAULT 'polis' NOT NULL,
	"is_importing" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"vote_buffer_epoch" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vote_buffer_drained" boolean DEFAULT true NOT NULL,
	"closing_target_revision" bigint,
	"closed_finalized_at" timestamp (0),
	"is_edited" boolean DEFAULT false NOT NULL,
	"requires_event_ticket" "event_slug",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "conversation_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "conversation_polis_config_id_unique" UNIQUE("polis_config_id"),
	CONSTRAINT "conversation_ranking_config_id_unique" UNIQUE("ranking_config_id"),
	CONSTRAINT "conversation_credit_voting_config_id_unique" UNIQUE("credit_voting_config_id"),
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_deletion_intent_check" CHECK (("conversation"."deleted_at" is null or "conversation"."current_content_id" is null)),
	CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL AND "conversation"."credit_voting_config_id" IS NULL AND "conversation"."prioritization_type" IS NULL) OR ("conversation"."conversation_type" = 'prioritizing' AND "conversation"."polis_config_id" IS NULL AND "conversation"."prioritization_type" IS NOT NULL AND (("conversation"."prioritization_type" = 'comparisons' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."credit_voting_config_id" IS NULL) OR ("conversation"."prioritization_type" = 'qv' AND "conversation"."credit_voting_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL))))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_by_user_id" is null or "conversation"."conversation_email_update_override_updated_at" is not null))
);

CREATE TABLE "credit_voting_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_voting_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"allow_opposition" boolean DEFAULT true NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"statement_set_revision" integer DEFAULT 0 NOT NULL,
	"statements_locked_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "credit_voting_fixed_budget_check" CHECK ("credit_voting_config"."credit_budget" = 100),
	CONSTRAINT "credit_voting_statement_revision_check" CHECK ("credit_voting_config"."statement_set_revision" >= 0),
	CONSTRAINT "credit_voting_item_count_check" CHECK ("credit_voting_config"."item_count" >= 0)
);

CREATE TABLE "device" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"session_started_at" timestamp (0) DEFAULT now() NOT NULL,
	"session_expiry" timestamp NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "email" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(254) NOT NULL,
	"type" "email_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email_reachability" "email_reachability",
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "email_canonical_check" CHECK ("email"."email" = lower(btrim("email"."email"))),
	CONSTRAINT "email_recovery_reservation_check" CHECK (("email"."reserved_for_recovery" = false or "email"."is_deleted" = true))
);

CREATE TABLE "event_ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"provider" "ticket_provider" NOT NULL,
	"nullifier" text NOT NULL,
	"event_slug" "event_slug" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp (0) DEFAULT now() NOT NULL,
	"pcd_type" text,
	"provider_metadata" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "followed_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "followed_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"user_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notification_type" "notification_type_enum" NOT NULL,
	"security_key" varchar(64),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "notification_slug_id_unique" UNIQUE("slug_id")
);

CREATE TABLE "opinion_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "opinion_content_edit_attribution_check" CHECK (("opinion_content"."edited_by_user_id" is null or "opinion_content"."is_edited" = true)),
	CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("opinion_content"."content") <= 16384),
	CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("opinion_content"."source_language_provider" IS NULL AND "opinion_content"."source_raw_language_code" IS NULL) OR ("opinion_content"."source_language_provider" IS NOT NULL AND "opinion_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"account_hidden_at" timestamp (3),
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "opinion_source_owner_check" CHECK (("opinion"."author_id" is not null or "opinion"."is_seed" = true or "opinion"."deleted_at" is not null or "opinion"."account_hidden_at" is not null)),
	CONSTRAINT "opinion_deletion_intent_check" CHECK (("opinion"."deleted_at" is null or "opinion"."current_content_id" is null))
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "otp_email_destination_state" (
	"email" varchar(254) PRIMARY KEY NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "otp_email_destination_canonical_check" CHECK ("otp_email_destination_state"."email" = lower(btrim("otp_email_destination_state"."email"))),
	CONSTRAINT "otp_email_wrong_guess_attempt_amount_nonnegative_check" CHECK ("otp_email_destination_state"."wrong_guess_attempt_amount" >= 0)
);

CREATE TABLE "otp_phone_destination_state" (
	"phone_hash" text PRIMARY KEY NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "otp_phone_wrong_guess_attempt_amount_nonnegative_check" CHECK ("otp_phone_destination_state"."wrong_guess_attempt_amount" >= 0)
);

CREATE TABLE "phone_sms_budget_alert" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"day" varchar(10) NOT NULL,
	"next_attempt_at" timestamp (3) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_alert_day_kind_unique" UNIQUE("day","kind"),
	CONSTRAINT "phone_sms_budget_alert_kind_check" CHECK ("phone_sms_budget_alert"."kind" IN ('warning', 'hard_limit')),
	CONSTRAINT "phone_sms_budget_alert_attempts_check" CHECK ("phone_sms_budget_alert"."attempt_count" >= 0)
);

CREATE TABLE "phone_sms_budget_policy" (
	"id" integer PRIMARY KEY NOT NULL,
	"sending_enabled" boolean DEFAULT false NOT NULL,
	"hourly_send_limit" integer,
	"daily_send_limit" integer,
	"estimated_cents_per_send" integer NOT NULL,
	"hourly_budget_cents" integer,
	"daily_budget_cents" integer,
	"monthly_budget_cents" integer DEFAULT 10000 NOT NULL,
	"warning_percent" integer DEFAULT 75 NOT NULL,
	"registration_paused_at" timestamp (3),
	"registration_pause_expires_at" timestamp (3),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_single_policy_check" CHECK ("phone_sms_budget_policy"."id" = 1),
	CONSTRAINT "phone_sms_budget_positive_limits_check" CHECK (("phone_sms_budget_policy"."hourly_send_limit" IS NULL OR "phone_sms_budget_policy"."hourly_send_limit" > 0) AND ("phone_sms_budget_policy"."daily_send_limit" IS NULL OR "phone_sms_budget_policy"."daily_send_limit" > 0) AND ("phone_sms_budget_policy"."hourly_send_limit" IS NULL OR "phone_sms_budget_policy"."daily_send_limit" IS NULL OR "phone_sms_budget_policy"."daily_send_limit" >= "phone_sms_budget_policy"."hourly_send_limit") AND "phone_sms_budget_policy"."estimated_cents_per_send" > 0 AND ("phone_sms_budget_policy"."hourly_budget_cents" IS NULL OR "phone_sms_budget_policy"."hourly_budget_cents" > 0) AND ("phone_sms_budget_policy"."daily_budget_cents" IS NULL OR "phone_sms_budget_policy"."daily_budget_cents" > 0) AND ("phone_sms_budget_policy"."hourly_budget_cents" IS NULL OR "phone_sms_budget_policy"."daily_budget_cents" IS NULL OR "phone_sms_budget_policy"."daily_budget_cents" >= "phone_sms_budget_policy"."hourly_budget_cents")),
	CONSTRAINT "phone_sms_budget_warning_percent_check" CHECK ("phone_sms_budget_policy"."warning_percent" BETWEEN 1 AND 99),
	CONSTRAINT "phone_sms_budget_monthly_limit_check" CHECK ("phone_sms_budget_policy"."monthly_budget_cents" >= 0),
	CONSTRAINT "phone_sms_budget_pause_expiry_check" CHECK ("phone_sms_budget_policy"."registration_pause_expires_at" IS NULL OR ("phone_sms_budget_policy"."registration_paused_at" IS NOT NULL AND "phone_sms_budget_policy"."registration_pause_expires_at" > "phone_sms_budget_policy"."registration_paused_at"))
);

CREATE TABLE "phone_sms_budget_reservation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"estimated_cents" integer NOT NULL,
	"reserved_at" timestamp (3) NOT NULL,
	CONSTRAINT "phone_sms_budget_reservation_cents_check" CHECK ("phone_sms_budget_reservation"."estimated_cents" > 0)
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("phone"."last_two_digits" BETWEEN 0 and 99),
	CONSTRAINT "phone_recovery_reservation_check" CHECK (("phone"."reserved_for_recovery" = false or "phone"."is_deleted" = true))
);

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "qv_allocation" (
	"version_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"content_id" integer NOT NULL,
	"votes" smallint NOT NULL,
	"deleted_at" timestamp (3),
	CONSTRAINT "qv_allocation_version_id_item_id_pk" PRIMARY KEY("version_id","item_id"),
	CONSTRAINT "qv_allocation_votes_check" CHECK (("qv_allocation"."votes" <> 0 and "qv_allocation"."votes" >= -10 and "qv_allocation"."votes" <= 10))
);

CREATE TABLE "qv_response_command" (
	"response_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result_revision" integer NOT NULL,
	"result_version_id" uuid,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3),
	CONSTRAINT "qv_response_command_response_id_command_id_pk" PRIMARY KEY("response_id","command_id"),
	CONSTRAINT "qv_command_revision_check" CHECK ("qv_response_command"."result_revision" >= 0)
);

CREATE TABLE "qv_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"current_version_id" uuid,
	"account_hidden_at" timestamp (3),
	"deleted_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "qv_response_participant_unique" UNIQUE("participant_id"),
	CONSTRAINT "qv_response_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_response_revision_check" CHECK ("qv_response"."revision" >= 0),
	CONSTRAINT "qv_response_deleted_pointer_check" CHECK (("qv_response"."deleted_at" is null or "qv_response"."current_version_id" is null))
);

CREATE TABLE "qv_response_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"statement_set_revision" integer NOT NULL,
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"credit_pricing" varchar(16) DEFAULT 'quadratic' NOT NULL,
	"allow_opposition" boolean NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"credits_spent" integer NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3),
	CONSTRAINT "qv_version_id_response_unique" UNIQUE("id","response_id"),
	CONSTRAINT "qv_version_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_version_revision_check" CHECK ("qv_response_version"."statement_set_revision" >= 0),
	CONSTRAINT "qv_version_budget_check" CHECK (("qv_response_version"."credit_budget" = 100 and "qv_response_version"."credit_pricing" = 'quadratic' and "qv_response_version"."rule_version" = 1 and "qv_response_version"."credits_spent" >= 1 and "qv_response_version"."credits_spent" <= "qv_response_version"."credit_budget"))
);

CREATE TABLE "ranking_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"account_hidden_at" timestamp (3),
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"snapshot_score" real,
	"snapshot_ranking_score_id" integer,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_item_source_owner_check" CHECK (("ranking_item"."author_id" is not null or "ranking_item"."is_seed" = true or "ranking_item"."deleted_at" is not null or "ranking_item"."account_hidden_at" is not null)),
	CONSTRAINT "ranking_item_deletion_intent_check" CHECK (("ranking_item"."deleted_at" is null or "ranking_item"."current_content_id" is null))
);

CREATE TABLE "realtime_event_dispatch_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_delivery_id" integer DEFAULT 0 NOT NULL,
	"replay_floor_delivery_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "realtime_event_dispatch_state_singleton_check" CHECK ("realtime_event_dispatch_state"."id" = 1),
	CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK (("realtime_event_dispatch_state"."replay_floor_delivery_id" >= 0 and "realtime_event_dispatch_state"."last_delivery_id" >= "realtime_event_dispatch_state"."replay_floor_delivery_id"))
);

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer,
	"delivered_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "realtime_event_outbox_delivery_id_unique" UNIQUE("delivery_id")
);

CREATE TABLE "retired_device_key" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"retired_at" timestamp (3) DEFAULT now() NOT NULL
);

CREATE TABLE "survey_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"completed_at" timestamp (0),
	"withdrawn_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_response_conversation_participant_unique" UNIQUE("conversation_id","participant_id"),
	CONSTRAINT "survey_response_id_conversation_unique" UNIQUE("id","conversation_id")
);

CREATE TABLE "user_display_language" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "user_spoken_languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"language_code" "spoken_language_code" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_spoken_languages_unique" UNIQUE("user_id","language_code")
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polis_participant_id" serial NOT NULL,
	"username" varchar(20) NOT NULL,
	"is_site_moderator" boolean DEFAULT false NOT NULL,
	"is_site_org_admin" boolean DEFAULT false NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp (0),
	"deletion_reason" text,
	"deletion_requested_at" timestamp (3),
	"recoverable_until" timestamp (3),
	"purge_started_at" timestamp (3),
	"auth_restricted_at" timestamp (0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_contribution_revision_check" CHECK ("user"."contribution_revision" >= 0),
	CONSTRAINT "user_recovery_lifecycle_check" CHECK (((("user"."deletion_requested_at" is null and "user"."recoverable_until" is null) or ("user"."is_deleted" = true and "user"."deletion_reason" is not null and "user"."deletion_reason" = 'account_deletion' and "user"."deletion_requested_at" is not null and "user"."recoverable_until" is not null and "user"."recoverable_until" = "user"."deletion_requested_at" + interval '15 days')) and ("user"."purge_started_at" is null or "user"."is_deleted" = true))),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("user"."auth_restricted_at" IS NULL) = ("user"."auth_restriction_reason" IS NULL)),
	CONSTRAINT "user_deletion_reason_check" CHECK (("user"."deletion_reason" is null or ("user"."is_deleted" = true and "user"."deleted_at" is not null and "user"."deletion_reason" in ('account_deletion', 'guest_merge'))))
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
	"withdrawn_at" timestamp (3),
	"retired_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id"),
	CONSTRAINT "vote_inactive_intent_check" CHECK ((("vote"."withdrawn_at" is null and "vote"."retired_at" is null) or "vote"."current_content_id" is null))
);

CREATE TABLE "zk_passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zk_passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "zk_passport_recovery_reservation_check" CHECK (("zk_passport"."reserved_for_recovery" = false or "zk_passport"."is_deleted" = true))
);

CREATE INDEX "comparison_response_conversation_idx" ON "comparison_response" USING btree ("conversation_id");

CREATE INDEX "conversation_participant_user_idx" ON "conversation_participant" USING btree ("user_id");

CREATE INDEX "conversation_deleted_idx" ON "conversation" USING btree ("deleted_at","id") WHERE "conversation"."deleted_at" is not null;

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE INDEX "device_user_session_expiry_idx" ON "device" USING btree ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" USING btree ("email") WHERE ("email"."is_deleted" = false or "email"."reserved_for_recovery" = true);

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" USING btree ("user_id") WHERE "email"."type" = 'primary' AND "email"."is_deleted" = false;

CREATE INDEX "email_idx" ON "email" USING btree ("email");

CREATE INDEX "user_event_idx" ON "event_ticket" USING btree ("user_id","event_slug");

CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" USING btree ("nullifier","event_slug") WHERE "event_ticket"."is_deleted" = false;

CREATE INDEX "nullifier_idx" ON "event_ticket" USING btree ("nullifier");

CREATE UNIQUE INDEX "followed_topic_active_unique" ON "followed_topic" USING btree ("user_id","topic_id") WHERE "followed_topic"."deleted_at" is null;

CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" USING btree ("user_id","security_key");

CREATE INDEX "opinion_deleted_idx" ON "opinion" USING btree ("deleted_at","id") WHERE "opinion"."deleted_at" is not null;

CREATE INDEX "opinion_authorId_idx" ON "opinion" USING btree ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" USING btree ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" USING btree ("organization_id","user_id") WHERE ("organization_membership"."deleted_at" is null and "organization_membership"."role" = 'admin');

CREATE INDEX "otp_email_destination_updated_idx" ON "otp_email_destination_state" USING btree ("updated_at");

CREATE INDEX "otp_phone_destination_updated_idx" ON "otp_phone_destination_state" USING btree ("updated_at");

CREATE INDEX "phone_sms_budget_alert_due_idx" ON "phone_sms_budget_alert" USING btree ("sent_at","next_attempt_at");

CREATE INDEX "phone_sms_budget_reservation_time_idx" ON "phone_sms_budget_reservation" USING btree ("reserved_at");

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" USING btree ("phone_hash") WHERE ("phone"."is_deleted" = false or "phone"."reserved_for_recovery" = true);

CREATE INDEX "phone_hash_idx" ON "phone" USING btree ("phone_hash");

CREATE INDEX "phone_user_idx" ON "phone" USING btree ("user_id");

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE INDEX "qv_allocation_deleted_idx" ON "qv_allocation" USING btree ("deleted_at") WHERE "qv_allocation"."deleted_at" is not null;

CREATE INDEX "qv_command_deleted_idx" ON "qv_response_command" USING btree ("deleted_at") WHERE "qv_response_command"."deleted_at" is not null;

CREATE INDEX "qv_response_conversation_active_idx" ON "qv_response" USING btree ("conversation_id") WHERE ("qv_response"."current_version_id" is not null and "qv_response"."deleted_at" is null and "qv_response"."account_hidden_at" is null);

CREATE INDEX "qv_version_response_idx" ON "qv_response_version" USING btree ("response_id");

CREATE INDEX "qv_version_deleted_idx" ON "qv_response_version" USING btree ("deleted_at") WHERE "qv_response_version"."deleted_at" is not null;

CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" USING btree ("conversation_id","current_content_id");

CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" USING btree ("conversation_id","lifecycle_status");

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" USING btree ("conversation_id","created_at");

CREATE INDEX "survey_response_participant_idx" ON "survey_response" USING btree ("participant_id");

CREATE INDEX "vote_authorId_idx" ON "vote" USING btree ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC,"id" DESC) WHERE "vote"."current_content_id" is not null;

CREATE INDEX "vote_opinion_active_idx" ON "vote" USING btree ("opinion_id","current_content_id");

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" USING btree ("nullifier") WHERE ("zk_passport"."is_deleted" = false or "zk_passport"."reserved_for_recovery" = true);

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" USING btree ("nullifier");

CREATE INDEX "zk_passport_user_idx" ON "zk_passport" USING btree ("user_id");
