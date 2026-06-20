-- WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."export_cancellation_reason_enum" AS ENUM('duplicate_in_batch', 'cooldown_active');

CREATE TYPE "public"."export_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart');

CREATE TYPE "public"."export_generation_status_enum" AS ENUM('collecting', 'queued', 'processing', 'completed', 'failed');

CREATE TYPE "public"."export_status_enum" AS ENUM('processing', 'completed', 'failed', 'cancelled');

CREATE TYPE "public"."import_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart', 'invalid_data_format');

CREATE TYPE "public"."import_status_enum" AS ENUM('processing', 'completed', 'failed');

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
