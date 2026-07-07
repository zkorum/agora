CREATE TYPE "public"."ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');--> statement-breakpoint
-- V0079 is branch-local and has not shipped, so create the persisted ranking subtype as bws directly.
CREATE TYPE "public"."ranking_mode" AS ENUM('bws');--> statement-breakpoint
CREATE TABLE "conversation_import_source" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_import_source_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"import_url" text,
	"import_conversation_url" text,
	"import_export_url" text,
	"import_created_at" timestamp (0),
	"import_author" text,
	"import_method" "import_method",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_import_source_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "polis_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polis_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ai_labeling_enabled" boolean DEFAULT true NOT NULL,
	"analysis_data_generation" integer DEFAULT 0 NOT NULL,
	"preferred_opinion_group_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_mode" "ranking_mode" NOT NULL,
	"current_ranking_score_id" integer,
	"external_source_config" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_conversation_config_current_ranking_score_id_unique" UNIQUE("current_ranking_score_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_item_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"ranking_item_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(3000),
	"body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "ranking_item_content_id_item_unique" UNIQUE("id","ranking_item_id"),
	CONSTRAINT "ranking_item_content_source_metadata_check" CHECK ((("ranking_item_content"."source_language_provider" IS NULL AND "ranking_item_content"."source_raw_language_code" IS NULL) OR ("ranking_item_content"."source_language_provider" IS NOT NULL AND "ranking_item_content"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "ranking_item_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_item_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" text NOT NULL,
	"translated_body_html" text,
	"translated_body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_content_translation_unique" UNIQUE("ranking_item_content_id","display_language_code"),
	CONSTRAINT "ranking_item_content_translation_source_metadata_check" CHECK ((("ranking_item_content_translation"."source_language_provider" IS NULL AND "ranking_item_content_translation"."source_raw_language_code" IS NULL) OR ("ranking_item_content_translation"."source_language_provider" IS NOT NULL AND "ranking_item_content_translation"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "ranking_item_external_source" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_external_source_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_item_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"source_type" "external_source_type" NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	"external_metadata" jsonb,
	"last_synced_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_external_source_ranking_item_id_unique" UNIQUE("ranking_item_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active' NOT NULL,
	"snapshot_score" real,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_source_check";--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD COLUMN "ranking_item_content_id" integer;--> statement-breakpoint
ALTER TABLE "conversation_content_translation" ADD COLUMN "translated_body_plain_text" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "polis_config_id" integer;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "ranking_config_id" integer;--> statement-breakpoint
ALTER TABLE "opinion_content_translation" ADD COLUMN "translated_content_plain_text" text;--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ADD COLUMN "last_error_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ADD COLUMN "last_error_at" timestamp (0);--> statement-breakpoint
UPDATE "opinion_group_description_translation_work" SET "last_error_at" = "updated_at" WHERE "last_error_code" IS NOT NULL AND "last_error_at" IS NULL;--> statement-breakpoint
UPDATE "opinion_group_lineage_description_work" SET "last_error_at" = "updated_at" WHERE "last_error_code" IS NOT NULL AND "last_error_at" IS NULL;--> statement-breakpoint
ALTER TABLE "project_content_translation" ADD COLUMN "translated_body_plain_text" text;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD COLUMN "text_value_plain_text" text;--> statement-breakpoint
ALTER TABLE "conversation_import_source" ADD CONSTRAINT "conversation_import_source_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD CONSTRAINT "ranking_conversation_config_current_ranking_score_id_ranking_score_id_fk" FOREIGN KEY ("current_ranking_score_id") REFERENCES "public"."ranking_score"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ADD CONSTRAINT "ranking_item_content_ranking_item_id_ranking_item_id_fk" FOREIGN KEY ("ranking_item_id") REFERENCES "public"."ranking_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ADD CONSTRAINT "ranking_item_content_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" ADD CONSTRAINT "ranking_item_content_translation_ranking_item_content_id_ranking_item_content_id_fk" FOREIGN KEY ("ranking_item_content_id") REFERENCES "public"."ranking_item_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_external_source" ADD CONSTRAINT "ranking_item_external_source_ranking_item_id_ranking_item_id_fk" FOREIGN KEY ("ranking_item_id") REFERENCES "public"."ranking_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_external_source" ADD CONSTRAINT "ranking_item_external_source_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_current_content_id_ranking_item_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."ranking_item_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_external_source_dedup_idx" ON "ranking_item_external_source" USING btree ("external_id","conversation_id");--> statement-breakpoint
CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" USING btree ("conversation_id","current_content_id");--> statement-breakpoint
CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" USING btree ("conversation_id","lifecycle_status");--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_ranking_item_content_id_ranking_item_content_id_fk" FOREIGN KEY ("ranking_item_content_id") REFERENCES "public"."ranking_item_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_polis_config_id_polis_conversation_config_id_fk" FOREIGN KEY ("polis_config_id") REFERENCES "public"."polis_conversation_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_ranking_config_id_ranking_conversation_config_id_fk" FOREIGN KEY ("ranking_config_id") REFERENCES "public"."ranking_conversation_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" USING btree ("ranking_item_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'ranking_item' AND "content_translation_work"."ranking_item_content_id" is not null);--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_polis_config_id_unique" UNIQUE("polis_config_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_ranking_config_id_unique" UNIQUE("ranking_config_id");--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_source_check" CHECK ((("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is not null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'project' AND "content_translation_work"."conversation_id" is null AND "content_translation_work"."project_content_id" is not null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is not null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'ranking_item' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is not null)));
