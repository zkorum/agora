-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');

CREATE TYPE "public"."export_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart');

CREATE TYPE "public"."export_generation_status_enum" AS ENUM('collecting', 'queued', 'processing', 'completed', 'failed');

CREATE TYPE "public"."export_status_enum" AS ENUM('processing', 'completed', 'failed', 'cancelled');

CREATE TYPE "public"."import_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart', 'invalid_data_format');

CREATE TYPE "public"."import_status_enum" AS ENUM('processing', 'completed', 'failed');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TABLE "conversation_export_generation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_generation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer NOT NULL,
	"status" "export_generation_status_enum" DEFAULT 'collecting' NOT NULL,
	"collecting_ends_at" timestamp (0) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (0),
	"started_at" timestamp (0),
	"heartbeat_at" timestamp (0),
	"completed_at" timestamp (0),
	"failed_at" timestamp (0),
	"failure_reason" "export_failure_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_export_generation_slug_id_unique" UNIQUE("slug_id")
);

CREATE TABLE "conversation_export_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer NOT NULL,
	"generation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "export_status_enum" DEFAULT 'processing' NOT NULL,
	"failure_reason" "export_failure_reason_enum",
	"cancellation_reason" "export_cancellation_reason_enum",
	"expires_at" timestamp (0) NOT NULL,
	"deleted_at" timestamp (0),
	"started_notified_at" timestamp (0),
	"completed_notified_at" timestamp (0),
	"failed_notified_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_export_request_slug_id_unique" UNIQUE("slug_id")
);

CREATE TABLE "conversation_import" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_import_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer,
	"user_id" uuid NOT NULL,
	"status" "import_status_enum" DEFAULT 'processing' NOT NULL,
	"failure_reason" "import_failure_reason_enum",
	"csv_file_metadata" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_import_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "conversation_import_conversation_id_unique" UNIQUE("conversation_id")
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
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_at" IS NULL) = ("conversation"."conversation_email_update_override_updated_by_user_id" IS NULL))
);

CREATE INDEX "conversation_export_generation_conversation_idx" ON "conversation_export_generation" USING btree ("conversation_id");

CREATE INDEX "conversation_export_generation_collecting_due_idx" ON "conversation_export_generation" USING btree ("collecting_ends_at","created_at") WHERE "conversation_export_generation"."status" = 'collecting';

CREATE INDEX "conversation_export_generation_queued_due_idx" ON "conversation_export_generation" USING btree ("next_attempt_at","created_at") WHERE "conversation_export_generation"."status" = 'queued';

CREATE UNIQUE INDEX "conversation_export_generation_collecting_unique" ON "conversation_export_generation" USING btree ("conversation_id") WHERE "conversation_export_generation"."status" = 'collecting';

CREATE UNIQUE INDEX "conversation_export_generation_processing_unique" ON "conversation_export_generation" USING btree ("conversation_id") WHERE "conversation_export_generation"."status" = 'processing';

CREATE INDEX "conversation_export_request_conversation_idx" ON "conversation_export_request" USING btree ("conversation_id");

CREATE INDEX "conversation_export_request_generation_idx" ON "conversation_export_request" USING btree ("generation_id");

CREATE INDEX "conversation_export_request_active_history_idx" ON "conversation_export_request" USING btree ("conversation_id","user_id","created_at") WHERE "conversation_export_request"."deleted_at" IS NULL;

CREATE INDEX "conversation_export_request_expiry_idx" ON "conversation_export_request" USING btree ("expires_at") WHERE "conversation_export_request"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_export_request_active_unique" ON "conversation_export_request" USING btree ("conversation_id","user_id") WHERE "conversation_export_request"."status" = 'processing' AND "conversation_export_request"."deleted_at" IS NULL;

CREATE INDEX "conversation_import_status_idx" ON "conversation_import" USING btree ("status");

CREATE INDEX "conversation_import_created_idx" ON "conversation_import" USING btree ("created_at");

CREATE INDEX "conversation_import_user_idx" ON "conversation_import" USING btree ("user_id");

CREATE UNIQUE INDEX "conversation_import_active_user_unique" ON "conversation_import" USING btree ("user_id") WHERE "conversation_import"."status" = 'processing';

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;
