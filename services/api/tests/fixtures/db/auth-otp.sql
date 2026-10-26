-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."auth_type" AS ENUM('register', 'login_known_device', 'login_new_device', 'merge', 'restore_deleted', 'restore_and_merge');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "public"."email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

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

CREATE TABLE "conversation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"project_id" integer NOT NULL,
	"current_content_id" integer,
	"polis_config_id" integer,
	"ranking_config_id" integer,
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
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_at" IS NULL) = ("conversation"."conversation_email_update_override_updated_by_user_id" IS NULL))
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "email_canonical_check" CHECK ("email"."email" = lower(btrim("email"."email")))
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

CREATE TABLE "opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_slug_id_unique" UNIQUE("slug_id")
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("phone"."last_two_digits" BETWEEN 0 and 99)
);

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "realtime_event_dispatch_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_delivery_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "realtime_event_dispatch_state_singleton_check" CHECK ("realtime_event_dispatch_state"."id" = 1),
	CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK ("realtime_event_dispatch_state"."last_delivery_id" >= 0)
);

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "realtime_event_outbox_delivery_id_unique" UNIQUE("delivery_id")
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
	"deleted_at" timestamp (0),
	"auth_restricted_at" timestamp (0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("user"."auth_restricted_at" IS NULL) = ("user"."auth_restriction_reason" IS NULL))
);

CREATE TABLE "vote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"participant_id" uuid,
	"opinion_id" integer NOT NULL,
	"polis_vote_id" integer,
	"current_content_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id")
);

CREATE TABLE "zk_passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zk_passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE INDEX "device_user_session_expiry_idx" ON "device" USING btree ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" USING btree ("email") WHERE "email"."is_deleted" = false;

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" USING btree ("user_id") WHERE "email"."type" = 'primary' AND "email"."is_deleted" = false;

CREATE INDEX "email_idx" ON "email" USING btree ("email");

CREATE INDEX "user_event_idx" ON "event_ticket" USING btree ("user_id","event_slug");

CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" USING btree ("nullifier","event_slug") WHERE "event_ticket"."is_deleted" = false;

CREATE INDEX "nullifier_idx" ON "event_ticket" USING btree ("nullifier");

CREATE UNIQUE INDEX "followed_topic_active_unique" ON "followed_topic" USING btree ("user_id","topic_id") WHERE "followed_topic"."deleted_at" is null;

CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" USING btree ("user_id","security_key");

CREATE INDEX "opinion_authorId_idx" ON "opinion" USING btree ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" USING btree ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE INDEX "otp_email_destination_updated_idx" ON "otp_email_destination_state" USING btree ("updated_at");

CREATE INDEX "otp_phone_destination_updated_idx" ON "otp_phone_destination_state" USING btree ("updated_at");

CREATE INDEX "phone_sms_budget_alert_due_idx" ON "phone_sms_budget_alert" USING btree ("sent_at","next_attempt_at");

CREATE INDEX "phone_sms_budget_reservation_time_idx" ON "phone_sms_budget_reservation" USING btree ("reserved_at");

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" USING btree ("phone_hash") WHERE "phone"."is_deleted" = false;

CREATE INDEX "phone_hash_idx" ON "phone" USING btree ("phone_hash");

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'conversation_comment_stats_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "vote_authorId_idx" ON "vote" USING btree ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC,"id" DESC) WHERE "vote"."current_content_id" is not null;

CREATE INDEX "vote_opinion_active_idx" ON "vote" USING btree ("opinion_id","current_content_id");

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" USING btree ("nullifier") WHERE "zk_passport"."is_deleted" = false;

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" USING btree ("nullifier");
