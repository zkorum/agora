CREATE TYPE "public"."export_artifact_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."export_file_audience_enum" AS ENUM('redacted', 'owner', 'requester');--> statement-breakpoint
CREATE TYPE "public"."export_generation_status_enum" AS ENUM('collecting', 'queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."survey_choice_display" AS ENUM('auto', 'list', 'dropdown');--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'bundle' BEFORE 'comments';--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_questions' BEFORE 'survey_participant_responses';--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_question_options' BEFORE 'survey_participant_responses';--> statement-breakpoint
CREATE TABLE "conversation_export_artifact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_artifact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"generation_id" integer NOT NULL,
	"file_type" "export_file_type_enum" NOT NULL,
	"audience" "export_file_audience_enum" NOT NULL,
	"subject_user_id" uuid,
	"status" "export_artifact_status_enum" DEFAULT 'queued' NOT NULL,
	"file_name" varchar(160) NOT NULL,
	"file_size" integer,
	"record_count" integer,
	"s3_key" text,
	"failure_reason" "export_failure_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "conversation_export_request_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_request_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_id" integer NOT NULL,
	"artifact_id" integer NOT NULL,
	"file_type" "export_file_type_enum" NOT NULL,
	"audience" "export_file_audience_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "survey_question_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_content_id" integer NOT NULL,
	"display_language_code" varchar(10) NOT NULL,
	"translated_question_text" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_content_translation_unique" UNIQUE("survey_question_content_id","display_language_code")
);
--> statement-breakpoint
CREATE TABLE "survey_question_option_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_option_content_id" integer NOT NULL,
	"display_language_code" varchar(10) NOT NULL,
	"translated_option_text" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_content_translation_unique" UNIQUE("survey_question_option_content_id","display_language_code")
);
--> statement-breakpoint
ALTER TABLE "survey_answer_option" DROP CONSTRAINT "survey_answer_option_survey_answer_id_survey_question_option_id_unique";--> statement-breakpoint
ALTER TABLE "survey_answer" DROP CONSTRAINT "survey_answer_survey_response_id_survey_question_id_unique";--> statement-breakpoint
ALTER TABLE "survey_response" DROP CONSTRAINT "survey_response_participant_id_conversation_id_unique";--> statement-breakpoint
ALTER TABLE "notification_export" ADD COLUMN "export_request_id" integer;--> statement-breakpoint
ALTER TABLE "notification_export" ADD COLUMN "export_slug_id" varchar(8);--> statement-breakpoint
ALTER TABLE "notification_export" ADD COLUMN "failure_reason" "export_failure_reason_enum";--> statement-breakpoint
ALTER TABLE "notification_export" ADD COLUMN "cancellation_reason" "export_cancellation_reason_enum";--> statement-breakpoint
UPDATE "notification_export"
SET
    "export_slug_id" = "conversation_export"."slug_id",
    "failure_reason" = "conversation_export"."failure_reason",
    "cancellation_reason" = "conversation_export"."cancellation_reason"
FROM "conversation_export"
WHERE "notification_export"."export_id" = "conversation_export"."id";--> statement-breakpoint
UPDATE "notification_export"
SET "export_slug_id" = substring(md5("id"::text) from 1 for 8)
WHERE "export_slug_id" IS NULL;--> statement-breakpoint
ALTER TABLE "notification_export" ALTER COLUMN "export_slug_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_export" DROP CONSTRAINT IF EXISTS "notification_export_export_id_conversation_export_id_fk";--> statement-breakpoint
ALTER TABLE "notification_export" DROP COLUMN "export_id";--> statement-breakpoint
ALTER TABLE "conversation_export_file" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_export" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "conversation_export_file" CASCADE;--> statement-breakpoint
DROP TABLE "conversation_export" CASCADE;--> statement-breakpoint
ALTER TABLE "survey_question" ALTER COLUMN "question_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "survey_question"
SET "question_type" = 'choice'
WHERE "question_type" IN ('mono_choice', 'multi_choice', 'select');--> statement-breakpoint
UPDATE "survey_question_content"
SET "constraints" = '{"type":"choice","minSelections":1,"maxSelections":1}'::jsonb
WHERE "constraints"->>'type' IN ('mono_choice', 'select');--> statement-breakpoint
UPDATE "survey_question_content"
SET "constraints" = '{"type":"choice","minSelections":1}'::jsonb
WHERE "constraints"->>'type' = 'multi_choice';--> statement-breakpoint
DROP TYPE "public"."survey_question_type";--> statement-breakpoint
CREATE TYPE "public"."survey_question_type" AS ENUM('choice', 'free_text');--> statement-breakpoint
ALTER TABLE "survey_question" ALTER COLUMN "question_type" SET DATA TYPE "public"."survey_question_type" USING "question_type"::"public"."survey_question_type";--> statement-breakpoint
DROP INDEX "survey_answer_question_semantic_version_idx";--> statement-breakpoint
DROP INDEX "survey_config_conversation_deleted_idx";--> statement-breakpoint
DROP INDEX "survey_question_option_question_content_idx";--> statement-breakpoint
DROP INDEX "survey_question_option_question_display_order_idx";--> statement-breakpoint
DROP INDEX "survey_question_config_content_idx";--> statement-breakpoint
DROP INDEX "survey_question_config_display_order_idx";--> statement-breakpoint
DROP INDEX "survey_question_config_semantic_version_idx";--> statement-breakpoint
DROP INDEX "survey_response_conversation_withdrawn_idx";--> statement-breakpoint
DROP INDEX "survey_response_conversation_completed_idx";--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD COLUMN "survey_question_id" integer;--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "survey_answer" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "survey_question" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "survey_question" ADD COLUMN "choice_display" "survey_choice_display" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
UPDATE "survey_answer_option"
SET "survey_question_id" = "survey_answer"."survey_question_id"
FROM "survey_answer"
WHERE "survey_answer_option"."survey_answer_id" = "survey_answer"."id";--> statement-breakpoint
UPDATE "survey_answer"
SET "conversation_id" = "survey_response"."conversation_id"
FROM "survey_response"
WHERE "survey_answer"."survey_response_id" = "survey_response"."id";--> statement-breakpoint
UPDATE "survey_question"
SET "conversation_id" = "survey_config"."conversation_id"
FROM "survey_config"
WHERE "survey_question"."survey_config_id" = "survey_config"."id";--> statement-breakpoint
ALTER TABLE "survey_answer_option" ALTER COLUMN "survey_question_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_answer" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_question" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_export_artifact" ADD CONSTRAINT "conversation_export_artifact_generation_id_conversation_export_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."conversation_export_generation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_artifact" ADD CONSTRAINT "conversation_export_artifact_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ADD CONSTRAINT "conversation_export_generation_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_request_file" ADD CONSTRAINT "conversation_export_request_file_request_id_conversation_export_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."conversation_export_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_request_file" ADD CONSTRAINT "conversation_export_request_file_artifact_id_conversation_export_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."conversation_export_artifact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_request" ADD CONSTRAINT "conversation_export_request_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_request" ADD CONSTRAINT "conversation_export_request_generation_id_conversation_export_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."conversation_export_generation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export_request" ADD CONSTRAINT "conversation_export_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD CONSTRAINT "survey_question_content_translation_survey_question_content_id_survey_question_content_id_fk" FOREIGN KEY ("survey_question_content_id") REFERENCES "public"."survey_question_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD CONSTRAINT "survey_question_option_content_translation_survey_question_option_content_id_survey_question_option_content_id_fk" FOREIGN KEY ("survey_question_option_content_id") REFERENCES "public"."survey_question_option_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_export_artifact_generation_idx" ON "conversation_export_artifact" USING btree ("generation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_artifact_shared_unique" ON "conversation_export_artifact" USING btree ("generation_id","file_type","audience") WHERE "conversation_export_artifact"."subject_user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_artifact_requester_unique" ON "conversation_export_artifact" USING btree ("generation_id","file_type","audience","subject_user_id") WHERE "conversation_export_artifact"."subject_user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_export_generation_conversation_idx" ON "conversation_export_generation" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_generation_collecting_due_idx" ON "conversation_export_generation" USING btree ("collecting_ends_at","created_at") WHERE "conversation_export_generation"."status" = 'collecting';--> statement-breakpoint
CREATE INDEX "conversation_export_generation_queued_due_idx" ON "conversation_export_generation" USING btree ("next_attempt_at","created_at") WHERE "conversation_export_generation"."status" = 'queued';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_generation_collecting_unique" ON "conversation_export_generation" USING btree ("conversation_id") WHERE "conversation_export_generation"."status" = 'collecting';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_generation_processing_unique" ON "conversation_export_generation" USING btree ("conversation_id") WHERE "conversation_export_generation"."status" = 'processing';--> statement-breakpoint
CREATE INDEX "conversation_export_request_file_artifact_idx" ON "conversation_export_request_file" USING btree ("artifact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_request_file_unique" ON "conversation_export_request_file" USING btree ("request_id","file_type","audience");--> statement-breakpoint
CREATE INDEX "conversation_export_request_conversation_idx" ON "conversation_export_request" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_request_generation_idx" ON "conversation_export_request" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_request_active_history_idx" ON "conversation_export_request" USING btree ("conversation_id","user_id","created_at") WHERE "conversation_export_request"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "conversation_export_request_expiry_idx" ON "conversation_export_request" USING btree ("expires_at") WHERE "conversation_export_request"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_request_active_unique" ON "conversation_export_request" USING btree ("conversation_id","user_id") WHERE "conversation_export_request"."status" = 'processing' AND "conversation_export_request"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_export_request_id_conversation_export_request_id_fk" FOREIGN KEY ("export_request_id") REFERENCES "public"."conversation_export_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_id_question_unique" UNIQUE("id","survey_question_id");--> statement-breakpoint
ALTER TABLE "survey_config" ADD CONSTRAINT "survey_config_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "survey_question_option" ADD CONSTRAINT "survey_question_option_id_question_unique" UNIQUE("id","survey_question_id");--> statement-breakpoint
ALTER TABLE "survey_question" ADD CONSTRAINT "survey_question_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD CONSTRAINT "survey_answer_option_answer_question_fk" FOREIGN KEY ("survey_answer_id","survey_question_id") REFERENCES "public"."survey_answer"("id","survey_question_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD CONSTRAINT "survey_answer_option_option_question_fk" FOREIGN KEY ("survey_question_option_id","survey_question_id") REFERENCES "public"."survey_question_option"("id","survey_question_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_response_conversation_fk" FOREIGN KEY ("survey_response_id","conversation_id") REFERENCES "public"."survey_response"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_question_conversation_fk" FOREIGN KEY ("survey_question_id","conversation_id") REFERENCES "public"."survey_question"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_option" ADD CONSTRAINT "survey_question_option_current_content_id_survey_question_option_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."survey_question_option_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question" ADD CONSTRAINT "survey_question_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question" ADD CONSTRAINT "survey_question_current_content_id_survey_question_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."survey_question_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question" ADD CONSTRAINT "survey_question_config_conversation_fk" FOREIGN KEY ("survey_config_id","conversation_id") REFERENCES "public"."survey_config"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_export_notification_idx" ON "notification_export" USING btree ("notification_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_option_answer_option_active_uidx" ON "survey_answer_option" USING btree ("survey_answer_id","survey_question_option_id") WHERE "survey_answer_option"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_response_question_active_uidx" ON "survey_answer" USING btree ("survey_response_id","survey_question_id") WHERE "survey_answer"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" USING btree ("survey_question_id","display_order") WHERE "survey_question_option"."current_content_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" USING btree ("survey_config_id","display_order") WHERE "survey_question"."current_content_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "survey_question_config_idx" ON "survey_question" USING btree ("survey_config_id");--> statement-breakpoint
CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" USING btree ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_conversation_participant_unique" UNIQUE("conversation_id","participant_id");
