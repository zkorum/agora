-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."auth_type" AS ENUM('register', 'login_known_device', 'login_new_device', 'merge', 'restore_deleted', 'restore_and_merge');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "public"."email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "public"."notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TYPE "public"."phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

CREATE TYPE "public"."sex" AS ENUM('F', 'M', 'X');

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
	"hourly_send_limit" integer NOT NULL,
	"daily_send_limit" integer NOT NULL,
	"estimated_cents_per_send" integer NOT NULL,
	"hourly_budget_cents" integer NOT NULL,
	"daily_budget_cents" integer NOT NULL,
	"warning_percent" integer DEFAULT 75 NOT NULL,
	"registration_paused_at" timestamp (3),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_single_policy_check" CHECK ("phone_sms_budget_policy"."id" = 1),
	CONSTRAINT "phone_sms_budget_positive_limits_check" CHECK ("phone_sms_budget_policy"."hourly_send_limit" > 0 AND "phone_sms_budget_policy"."daily_send_limit" >= "phone_sms_budget_policy"."hourly_send_limit" AND "phone_sms_budget_policy"."estimated_cents_per_send" > 0 AND "phone_sms_budget_policy"."hourly_budget_cents" > 0 AND "phone_sms_budget_policy"."daily_budget_cents" >= "phone_sms_budget_policy"."hourly_budget_cents"),
	CONSTRAINT "phone_sms_budget_warning_percent_check" CHECK ("phone_sms_budget_policy"."warning_percent" BETWEEN 1 AND 99)
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

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "user_display_language" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
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

CREATE INDEX "device_user_session_expiry_idx" ON "device" USING btree ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" USING btree ("email") WHERE "email"."is_deleted" = false;

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" USING btree ("user_id") WHERE "email"."type" = 'primary' AND "email"."is_deleted" = false;

CREATE INDEX "email_idx" ON "email" USING btree ("email");

CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" USING btree ("user_id","security_key");

CREATE INDEX "otp_email_destination_updated_idx" ON "otp_email_destination_state" USING btree ("updated_at");

CREATE INDEX "otp_phone_destination_updated_idx" ON "otp_phone_destination_state" USING btree ("updated_at");

CREATE INDEX "phone_sms_budget_alert_due_idx" ON "phone_sms_budget_alert" USING btree ("sent_at","next_attempt_at");

CREATE INDEX "phone_sms_budget_reservation_time_idx" ON "phone_sms_budget_reservation" USING btree ("reserved_at");

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" USING btree ("phone_hash") WHERE "phone"."is_deleted" = false;

CREATE INDEX "phone_hash_idx" ON "phone" USING btree ("phone_hash");

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" USING btree ("nullifier") WHERE "zk_passport"."is_deleted" = false;

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" USING btree ("nullifier");
