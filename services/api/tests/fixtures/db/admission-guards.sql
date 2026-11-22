-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');

CREATE TYPE "export_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart');

CREATE TYPE "export_generation_status_enum" AS ENUM('collecting', 'queued', 'processing', 'completed', 'failed');

CREATE TYPE "export_status_enum" AS ENUM('processing', 'completed', 'failed', 'cancelled');

CREATE TYPE "import_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart', 'invalid_data_format');

CREATE TYPE "import_status_enum" AS ENUM('processing', 'completed', 'failed');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TABLE "conversation_export_generation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_generation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"status" "export_generation_status_enum" DEFAULT 'collecting'::"export_generation_status_enum" NOT NULL,
	"collecting_ends_at" timestamp(0) NOT NULL,
	"source_data_generation" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp(0),
	"started_at" timestamp(0),
	"heartbeat_at" timestamp(0),
	"completed_at" timestamp(0),
	"failed_at" timestamp(0),
	"failure_reason" "export_failure_reason_enum",
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "conversation_export_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"generation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "export_status_enum" DEFAULT 'processing'::"export_status_enum" NOT NULL,
	"failure_reason" "export_failure_reason_enum",
	"cancellation_reason" "export_cancellation_reason_enum",
	"expires_at" timestamp(0) NOT NULL,
	"deleted_at" timestamp(0),
	"started_notified_at" timestamp(0),
	"completed_notified_at" timestamp(0),
	"failed_notified_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "conversation_import" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer UNIQUE,
	"user_id" uuid,
	"requester_purged_at" timestamp(3),
	"status" "import_status_enum" DEFAULT 'processing'::"import_status_enum" NOT NULL,
	"failure_reason" "import_failure_reason_enum",
	"csv_file_metadata" jsonb,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_import_requester_check" CHECK (((((("user_id" is not null)) and (("requester_purged_at" is null)))) or (((("user_id" is null)) and (("requester_purged_at" is not null)) and (("conversation_id" is not null))))))
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

CREATE TABLE "qv_calculation_state" (
	"conversation_id" integer PRIMARY KEY,
	"generation" integer DEFAULT 0 NOT NULL,
	"current_calculation_id" uuid,
	CONSTRAINT "qv_calculation_state_generation_check" CHECK ("generation" >= 0)
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

CREATE TABLE "qv_live_stats" (
	"conversation_id" integer PRIMARY KEY,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"refreshed_at" timestamp(3),
	"retry_after" timestamp(3),
	CONSTRAINT "qv_live_stats_count_check" CHECK ("participant_count" >= 0),
	CONSTRAINT "qv_live_stats_revision_check" CHECK ("revision" >= 0)
);

CREATE TABLE "qv_stats_refresh" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qv_stats_refresh_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"processed_at" timestamp(3)
);

CREATE INDEX "conversation_export_generation_conversation_idx" ON "conversation_export_generation" ("conversation_id");

CREATE INDEX "conversation_export_generation_collecting_due_idx" ON "conversation_export_generation" ("collecting_ends_at","created_at") WHERE "status" = 'collecting';

CREATE INDEX "conversation_export_generation_queued_due_idx" ON "conversation_export_generation" ("next_attempt_at","created_at") WHERE "status" = 'queued';

CREATE UNIQUE INDEX "conversation_export_generation_collecting_unique" ON "conversation_export_generation" ("conversation_id") WHERE "status" = 'collecting';

CREATE UNIQUE INDEX "conversation_export_generation_processing_unique" ON "conversation_export_generation" ("conversation_id") WHERE "status" = 'processing';

CREATE INDEX "conversation_export_request_conversation_idx" ON "conversation_export_request" ("conversation_id");

CREATE INDEX "conversation_export_request_generation_idx" ON "conversation_export_request" ("generation_id");

CREATE INDEX "conversation_export_request_active_history_idx" ON "conversation_export_request" ("conversation_id","user_id","created_at") WHERE "deleted_at" IS NULL;

CREATE INDEX "conversation_export_request_expiry_idx" ON "conversation_export_request" ("expires_at") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_export_request_active_unique" ON "conversation_export_request" ("conversation_id","user_id") WHERE "status" = 'processing' AND "deleted_at" IS NULL;

CREATE INDEX "conversation_import_status_idx" ON "conversation_import" ("status");

CREATE INDEX "conversation_import_created_idx" ON "conversation_import" ("created_at");

CREATE INDEX "conversation_import_user_idx" ON "conversation_import" ("user_id");

CREATE UNIQUE INDEX "conversation_import_active_user_unique" ON "conversation_import" ("user_id") WHERE "status" = 'processing';

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');

CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");

CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" ("conversation_id","id") WHERE ("processed_at" is null);
