CREATE TYPE "public"."project_language_setting_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."project_organization_attribution_role" AS ENUM('project_owner', 'sponsor', 'partner');--> statement-breakpoint
ALTER TYPE "public"."content_translation_source_kind" ADD VALUE 'project';--> statement-breakpoint
ALTER TYPE "public"."conversation_language_setting_mode" ADD VALUE 'inherit' BEFORE 'auto';--> statement-breakpoint
CREATE TABLE "organization_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"description" varchar(280) NOT NULL,
	"website_url" text,
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_localization_organization_language_unique" UNIQUE("organization_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "project_contact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"name" varchar(65) NOT NULL,
	"role_label" varchar(140),
	"email" text NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_contact_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("project_contact"."organization_id", "project_contact"."external_organization_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "project_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"title" varchar(140) NOT NULL,
	"subtitle" varchar(140),
	"body" text,
	"body_plain_text" text,
	"hero_image_path" text,
	"hero_image_is_full_path" boolean DEFAULT false NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_content_source_metadata_check" CHECK ((("project_content"."source_language_provider" IS NULL AND "project_content"."source_raw_language_code" IS NULL) OR ("project_content"."source_language_provider" IS NOT NULL AND "project_content"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "project_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" text NOT NULL,
	"translated_subtitle" text,
	"translated_body" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_content_translation_unique" UNIQUE("project_content_id","display_language_code"),
	CONSTRAINT "project_content_translation_source_metadata_check" CHECK ((("project_content_translation"."source_language_provider" IS NULL AND "project_content_translation"."source_raw_language_code" IS NULL) OR ("project_content_translation"."source_language_provider" IS NOT NULL AND "project_content_translation"."source_raw_language_code" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "project_external_organization_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_external_organization_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_organization_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"description" varchar(280) NOT NULL,
	"website_url" text,
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_external_org_loc_external_org_language_unique" UNIQUE("external_organization_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "project_external_organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_external_organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"description" varchar(280),
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"website_url" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_external_organization_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "project_language_setting" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_language_setting_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"mode" "project_language_setting_mode" NOT NULL,
	"language_code" "display_language_code",
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_language_setting_project_unique" UNIQUE("project_id"),
	CONSTRAINT "project_language_setting_manual_language_check" CHECK (("project_language_setting"."mode" <> 'manual') OR ("project_language_setting"."language_code" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "project_organization_attribution" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_attribution_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"role" "project_organization_attribution_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_organization_attribution_order_unique" UNIQUE("project_id","role","sort_order"),
	CONSTRAINT "project_organization_attribution_source_xor_check" CHECK (num_nonnulls("project_organization_attribution"."organization_id", "project_organization_attribution"."external_organization_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "project_participant_display_language" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_participant_display_language_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "project_translation_target_language_unique" UNIQUE("project_id","language_code")
);
--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "display_name" TO "title";--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_slug_unique";--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_source_check";--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "conversation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_translation_setting" ALTER COLUMN "conversation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ALTER COLUMN "translation_setting_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD COLUMN "project_content_id" integer;--> statement-breakpoint
ALTER TABLE "conversation_language_setting" ADD COLUMN "dynamic_translation_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "dynamic_translation_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "default_language_code" "display_language_code";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "current_content_id" integer;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "dynamic_translation_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_localization" ADD CONSTRAINT "organization_localization_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_external_project_fk" FOREIGN KEY ("project_id","external_organization_id") REFERENCES "public"."project_external_organization"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_content" ADD CONSTRAINT "project_content_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_content_translation" ADD CONSTRAINT "project_content_translation_project_content_id_project_content_id_fk" FOREIGN KEY ("project_content_id") REFERENCES "public"."project_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_external_organization_localization" ADD CONSTRAINT "project_external_organization_localization_external_organization_id_project_external_organization_id_fk" FOREIGN KEY ("external_organization_id") REFERENCES "public"."project_external_organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_external_organization" ADD CONSTRAINT "project_external_organization_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_language_setting" ADD CONSTRAINT "project_language_setting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_attribution" ADD CONSTRAINT "project_organization_attribution_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_attribution" ADD CONSTRAINT "project_organization_attribution_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_organization_attribution" ADD CONSTRAINT "project_organization_attribution_external_project_fk" FOREIGN KEY ("project_id","external_organization_id") REFERENCES "public"."project_external_organization"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participant_display_language" ADD CONSTRAINT "project_participant_display_language_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participant_display_language" ADD CONSTRAINT "project_participant_display_language_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_translation_target_language" ADD CONSTRAINT "project_translation_target_language_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_contact_organization_idx" ON "project_contact" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_external_organization_project_idx" ON "project_external_organization" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_attribution_real_unique" ON "project_organization_attribution" USING btree ("project_id","role","organization_id") WHERE "project_organization_attribution"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_attribution_external_unique" ON "project_organization_attribution" USING btree ("project_id","role","external_organization_id") WHERE "project_organization_attribution"."external_organization_id" is not null;--> statement-breakpoint
CREATE INDEX "project_organization_attribution_project_idx" ON "project_organization_attribution" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_organization_attribution_organization_idx" ON "project_organization_attribution" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_project_content_id_project_content_id_fk" FOREIGN KEY ("project_content_id") REFERENCES "public"."project_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ADD CONSTRAINT "conversation_translation_target_language_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_current_content_id_project_content_id_fk" FOREIGN KEY ("current_content_id") REFERENCES "public"."project_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" USING btree ("project_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'project' AND "content_translation_work"."project_content_id" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ADD CONSTRAINT "conversation_translation_target_language_conversation_unique" UNIQUE("conversation_id","language_code");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_current_content_id_unique" UNIQUE("current_content_id");--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_source_check" CHECK ((("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is not null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null) OR ("content_translation_work"."source_kind" = 'project' AND "content_translation_work"."conversation_id" is null AND "content_translation_work"."project_content_id" is not null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null) OR ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is not null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null) OR ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null)));