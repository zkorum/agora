CREATE TYPE "public"."content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question');--> statement-breakpoint
CREATE TYPE "public"."content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."conversation_language_setting_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');--> statement-breakpoint
CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');--> statement-breakpoint
CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');--> statement-breakpoint
CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_update', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations');--> statement-breakpoint
CREATE TYPE "public"."organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');--> statement-breakpoint
CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');--> statement-breakpoint
ALTER TYPE "public"."premium_feature" ADD VALUE 'dynamic_translation';--> statement-breakpoint
CREATE TABLE "content_translation_work" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_translation_work_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"source_kind" "content_translation_source_kind" NOT NULL,
	"conversation_content_id" integer,
	"opinion_content_id" integer,
	"survey_question_content_id" integer,
	"survey_question_option_content_ids" integer[],
	"display_language_code" "display_language_code" NOT NULL,
	"status" "content_translation_work_status" DEFAULT 'pending' NOT NULL,
	"priority_rank" integer DEFAULT 2 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"lease_owner" varchar(100),
	"lease_token" uuid,
	"lease_expires_at" timestamp (0),
	"last_error_code" varchar(100),
	"last_error_message" text,
	"requested_at" timestamp (0),
	"completed_at" timestamp (0),
	"failed_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "content_translation_work_source_check" CHECK ((("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_content_id" is not null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null) OR ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is not null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null) OR ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null))),
	CONSTRAINT "content_translation_work_running_lease_check" CHECK ((("content_translation_work"."status" <> 'running' AND "content_translation_work"."lease_owner" is null AND "content_translation_work"."lease_token" is null AND "content_translation_work"."lease_expires_at" is null) OR ("content_translation_work"."status" = 'running' AND "content_translation_work"."lease_owner" is not null AND "content_translation_work"."lease_token" is not null AND "content_translation_work"."lease_expires_at" is not null))),
	CONSTRAINT "content_translation_work_priority_rank_check" CHECK ("content_translation_work"."priority_rank" >= 0 AND "content_translation_work"."priority_rank" <= 2)
);
--> statement-breakpoint
CREATE TABLE "conversation_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" varchar(140) NOT NULL,
	"translated_body" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_content_translation_unique" UNIQUE("conversation_content_id","display_language_code"),
	CONSTRAINT "conversation_content_translation_source_metadata_check" CHECK ((("conversation_content_translation"."source_language_provider" IS NULL AND "conversation_content_translation"."source_raw_language_code" IS NULL) OR ("conversation_content_translation"."source_language_provider" IS NOT NULL AND "conversation_content_translation"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "conversation_language_setting" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_language_setting_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"mode" "conversation_language_setting_mode" NOT NULL,
	"language_code" "display_language_code",
	"detected_language_code" "display_language_code",
	"detected_source_language_code" "spoken_language_code",
	"detected_raw_language_code" varchar(35),
	"detected_raw_language_provider" "language_detection_provider",
	"detection_confidence" real,
	"detected_from_corpus_hash" varchar(64),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_language_setting_conversation_unique" UNIQUE("conversation_id"),
	CONSTRAINT "conversation_language_setting_manual_language_check" CHECK (("conversation_language_setting"."mode" <> 'manual') OR ("conversation_language_setting"."language_code" IS NOT NULL)),
	CONSTRAINT "conversation_language_setting_detected_raw_provider_check" CHECK ((("conversation_language_setting"."detected_raw_language_provider" IS NULL AND "conversation_language_setting"."detected_raw_language_code" IS NULL) OR ("conversation_language_setting"."detected_raw_language_provider" IS NOT NULL AND "conversation_language_setting"."detected_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "conversation_translation_setting" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_translation_setting_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_translation_setting_conversation_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"translation_setting_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_translation_target_language_unique" UNIQUE("translation_setting_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "opinion_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_content" text NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_translation_unique" UNIQUE("opinion_content_id","display_language_code"),
	CONSTRAINT "opinion_content_translation_source_metadata_check" CHECK ((("opinion_content_translation"."source_language_provider" IS NULL AND "opinion_content_translation"."source_raw_language_code" IS NULL) OR ("opinion_content_translation"."source_language_provider" IS NOT NULL AND "opinion_content_translation"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_all_project_capability_unique" UNIQUE("organization_membership_id","capability")
);
--> statement-breakpoint
CREATE TABLE "organization_membership_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_capability_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_capability_unique" UNIQUE("organization_membership_id","capability")
);
--> statement-breakpoint
CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_user_organization_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_organization_ownership_project_org_unique" UNIQUE("project_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug"),
	CONSTRAINT "project_auto_provisioned_for_organization_id_unique" UNIQUE("auto_provisioned_for_organization_id")
);
--> statement-breakpoint
CREATE TABLE "realtime_event_outbox_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	CONSTRAINT "realtime_event_outbox_topic_unique" UNIQUE("event_id","topic")
);
--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_website_url_unique";--> statement-breakpoint
DROP INDEX "og_candidate_desc_locale_request_translation_updated_idx";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_description_locale_request" ALTER COLUMN "locale" SET DATA TYPE "display_language_code" USING "locale"::"display_language_code";--> statement-breakpoint
ALTER TABLE "opinion_group_description" ALTER COLUMN "locale" SET DATA TYPE "display_language_code" USING "locale"::"display_language_code";--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation" ALTER COLUMN "locale" SET DATA TYPE "display_language_code" USING "locale"::"display_language_code";--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ALTER COLUMN "locale" SET DATA TYPE "display_language_code" USING "locale"::"display_language_code";--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "image_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_question_content" ALTER COLUMN "source_language_code" SET DATA TYPE "spoken_language_code" USING "source_language_code"::"spoken_language_code";--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ALTER COLUMN "display_language_code" SET DATA TYPE "display_language_code" USING "display_language_code"::"display_language_code";--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ALTER COLUMN "source_language_code" SET DATA TYPE "spoken_language_code" USING "source_language_code"::"spoken_language_code";--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ALTER COLUMN "display_language_code" SET DATA TYPE "display_language_code" USING "display_language_code"::"display_language_code";--> statement-breakpoint
ALTER TABLE "user_display_language" ALTER COLUMN "language_code" SET DATA TYPE "display_language_code" USING "language_code"::"display_language_code";--> statement-breakpoint
ALTER TABLE "user_spoken_languages" ALTER COLUMN "language_code" SET DATA TYPE "spoken_language_code" USING "language_code"::"spoken_language_code";--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "body_plain_text" text;--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_language_code" "spoken_language_code";--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "content_plain_text" text;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_language_code" "spoken_language_code";--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "slug" varchar(65);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "display_name" varchar(65);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "directory_visibility" "directory_visibility";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "auto_provisioned_for_user_id" uuid;--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD COLUMN "source_language_code" "spoken_language_code";--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD COLUMN "source_language_code" "spoken_language_code";--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD COLUMN "source_raw_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD COLUMN "source_language_provider" "language_detection_provider";--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" varchar(65);--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_opinion_content_id_opinion_content_id_fk" FOREIGN KEY ("opinion_content_id") REFERENCES "public"."opinion_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_survey_question_content_id_survey_question_content_id_fk" FOREIGN KEY ("survey_question_content_id") REFERENCES "public"."survey_question_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_content_translation" ADD CONSTRAINT "conversation_content_translation_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_language_setting" ADD CONSTRAINT "conversation_language_setting_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_translation_setting" ADD CONSTRAINT "conversation_translation_setting_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ADD CONSTRAINT "conversation_translation_target_language_translation_setting_id_conversation_translation_setting_id_fk" FOREIGN KEY ("translation_setting_id") REFERENCES "public"."conversation_translation_setting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_content_translation" ADD CONSTRAINT "opinion_content_translation_opinion_content_id_opinion_content_id_fk" FOREIGN KEY ("opinion_content_id") REFERENCES "public"."opinion_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD CONSTRAINT "organization_membership_all_project_capability_organization_membership_id_organization_membership_id_fk" FOREIGN KEY ("organization_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_capability" ADD CONSTRAINT "organization_membership_capability_organization_membership_id_organization_membership_id_fk" FOREIGN KEY ("organization_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ADD CONSTRAINT "project_organization_ownership_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ADD CONSTRAINT "project_organization_ownership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_auto_provisioned_for_organization_id_organization_id_fk" FOREIGN KEY ("auto_provisioned_for_organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realtime_event_outbox_topic" ADD CONSTRAINT "realtime_event_outbox_topic_event_id_realtime_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."realtime_event_outbox"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" USING btree ("conversation_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_content_id" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" USING btree ("opinion_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."opinion_content_id" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" USING btree ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null);--> statement-breakpoint
CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" USING btree ("priority_rank","updated_at","id") WHERE "content_translation_work"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" USING btree ("lease_expires_at","id") WHERE "content_translation_work"."status" = 'running';--> statement-breakpoint
CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "og_candidate_desc_locale_request_translation_updated_idx" ON "opinion_group_candidate_description_locale_request" USING btree ("updated_at","id") WHERE "opinion_group_candidate_description_locale_request"."locale" <> 'en';--> statement-breakpoint
CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" USING btree ("topic","event_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_auto_provisioned_for_user_id_user_id_fk" FOREIGN KEY ("auto_provisioned_for_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_display_language_active_user_unique" ON "user_display_language" USING btree ("user_id") WHERE "user_display_language"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "user_idx_organization" ON "user_organization_mapping" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_auto_provisioned_for_user_id_unique" UNIQUE("auto_provisioned_for_user_id");--> statement-breakpoint
ALTER TABLE "conversation_content" ADD CONSTRAINT "conversation_content_source_metadata_check" CHECK ((("conversation_content"."source_language_provider" IS NULL AND "conversation_content"."source_raw_language_code" IS NULL) OR ("conversation_content"."source_language_provider" IS NOT NULL AND "conversation_content"."source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "opinion_content" ADD CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("opinion_content"."source_language_provider" IS NULL AND "opinion_content"."source_raw_language_code" IS NULL) OR ("opinion_content"."source_language_provider" IS NOT NULL AND "opinion_content"."source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD CONSTRAINT "survey_question_content_source_metadata_check" CHECK ((("survey_question_content"."source_language_provider" IS NULL AND "survey_question_content"."source_raw_language_code" IS NULL) OR ("survey_question_content"."source_language_provider" IS NOT NULL AND "survey_question_content"."source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD CONSTRAINT "survey_question_content_translation_source_metadata_check" CHECK ((("survey_question_content_translation"."source_language_provider" IS NULL AND "survey_question_content_translation"."source_raw_language_code" IS NULL) OR ("survey_question_content_translation"."source_language_provider" IS NOT NULL AND "survey_question_content_translation"."source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD CONSTRAINT "survey_question_option_content_source_metadata_check" CHECK ((("survey_question_option_content"."source_language_provider" IS NULL AND "survey_question_option_content"."source_raw_language_code" IS NULL) OR ("survey_question_option_content"."source_language_provider" IS NOT NULL AND "survey_question_option_content"."source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD CONSTRAINT "survey_question_option_content_translation_source_metadata_check" CHECK ((("survey_question_option_content_translation"."source_language_provider" IS NULL AND "survey_question_option_content_translation"."source_raw_language_code" IS NULL) OR ("survey_question_option_content_translation"."source_language_provider" IS NOT NULL AND "survey_question_option_content_translation"."source_raw_language_code" IS NOT NULL)));
