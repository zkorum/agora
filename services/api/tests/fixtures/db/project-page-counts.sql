-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."project_content_translation_source_kind" AS ENUM('manual', 'machine');

CREATE TYPE "public"."project_document_audience" AS ENUM('participant', 'owner');

CREATE TYPE "public"."project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');

CREATE TYPE "public"."project_document_file_status" AS ENUM('pending', 'available');

CREATE TYPE "public"."project_organization_attribution_role" AS ENUM('project_owner', 'sponsor', 'partner');

CREATE TYPE "public"."ranking_mode" AS ENUM('bws');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TABLE "conversation_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"title" varchar(140) NOT NULL,
	"body" text,
	"body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "conversation_content_source_metadata_check" CHECK ((("conversation_content"."source_language_provider" IS NULL AND "conversation_content"."source_raw_language_code" IS NULL) OR ("conversation_content"."source_language_provider" IS NOT NULL AND "conversation_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "conversation_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" text NOT NULL,
	"translated_body" text,
	"translated_body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_content_translation_unique" UNIQUE("conversation_content_id","display_language_code"),
	CONSTRAINT "conversation_content_translation_source_metadata_check" CHECK ((("conversation_content_translation"."source_language_provider" IS NULL AND "conversation_content_translation"."source_raw_language_code" IS NULL) OR ("conversation_content_translation"."source_language_provider" IS NOT NULL AND "conversation_content_translation"."source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "conversation_content_translation_body_plain_text_pair_check" CHECK ((("conversation_content_translation"."translated_body" IS NULL AND "conversation_content_translation"."translated_body_plain_text" IS NULL) OR ("conversation_content_translation"."translated_body" IS NOT NULL AND "conversation_content_translation"."translated_body_plain_text" IS NOT NULL)))
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
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_at" IS NULL) = ("conversation"."conversation_email_update_override_updated_by_user_id" IS NULL))
);

CREATE TABLE "conversation_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "conversation_view_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_view_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"analysis_snapshot_id" integer,
	"survey_aggregate_snapshot_id" integer,
	"conversation_content_id" integer,
	"view_reason" "conversation_view_snapshot_reason_enum" NOT NULL,
	"preferred_opinion_group_count" integer,
	"is_closed" boolean NOT NULL,
	"opinion_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"total_opinion_count" integer NOT NULL,
	"total_vote_count" integer NOT NULL,
	"total_participant_count" integer NOT NULL,
	"moderated_opinion_count" integer NOT NULL,
	"hidden_opinion_count" integer NOT NULL,
	"activated_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_view_snapshot_counts_check" CHECK ("conversation_view_snapshot"."opinion_count" >= 0 AND "conversation_view_snapshot"."vote_count" >= 0 AND "conversation_view_snapshot"."participant_count" >= 0 AND "conversation_view_snapshot"."total_opinion_count" >= 0 AND "conversation_view_snapshot"."total_vote_count" >= 0 AND "conversation_view_snapshot"."total_participant_count" >= 0 AND "conversation_view_snapshot"."moderated_opinion_count" >= 0 AND "conversation_view_snapshot"."hidden_opinion_count" >= 0),
	CONSTRAINT "conversation_view_snapshot_preferred_opinion_group_count_check" CHECK ("conversation_view_snapshot"."preferred_opinion_group_count" IS NULL OR ("conversation_view_snapshot"."preferred_opinion_group_count" >= 2 AND "conversation_view_snapshot"."preferred_opinion_group_count" <= 6))
);

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

CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_user_id" uuid,
	"image_path" text,
	"is_full_image_path" boolean NOT NULL,
	"website_url" text,
	"description" varchar(280),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "organization_auto_provisioned_for_user_id_unique" UNIQUE("auto_provisioned_for_user_id")
);

CREATE TABLE "project_contact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"first_name" varchar(65) NOT NULL,
	"last_name" varchar(65),
	"role_label" varchar(140),
	"email" text,
	"website_url" text,
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("project_contact"."organization_id", "project_contact"."external_organization_id") <= 1),
	CONSTRAINT "project_contact_email_or_website_check" CHECK (num_nonnulls("project_contact"."email", "project_contact"."website_url") >= 1)
);

CREATE TABLE "project_content_banner_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_banner_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_content_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"banner_path" text NOT NULL,
	"banner_is_full_path" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "project_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(140) NOT NULL,
	"subtitle" varchar(140),
	"body" text,
	"body_plain_text" text,
	"banner_path" text,
	"banner_is_full_path" boolean DEFAULT false NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "project_content_source_metadata_check" CHECK ((("project_content"."source_language_provider" IS NULL AND "project_content"."source_raw_language_code" IS NULL) OR ("project_content"."source_language_provider" IS NOT NULL AND "project_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "project_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" text NOT NULL,
	"translated_subtitle" text,
	"translated_body" text,
	"translated_body_plain_text" text,
	"source_kind" "project_content_translation_source_kind" DEFAULT 'machine' NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_content_translation_source_metadata_check" CHECK ((("project_content_translation"."source_language_provider" IS NULL AND "project_content_translation"."source_raw_language_code" IS NULL) OR ("project_content_translation"."source_language_provider" IS NOT NULL AND "project_content_translation"."source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "project_content_translation_body_plain_text_pair_check" CHECK ((("project_content_translation"."translated_body" IS NULL AND "project_content_translation"."translated_body_plain_text" IS NULL) OR ("project_content_translation"."translated_body" IS NOT NULL AND "project_content_translation"."translated_body_plain_text" IS NOT NULL)))
);

CREATE TABLE "project_document_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"audience" "project_document_audience" NOT NULL,
	"status" "project_document_file_status" DEFAULT 'pending' NOT NULL,
	"object_key" text NOT NULL,
	"original_file_name" text NOT NULL,
	"content_type" "project_document_content_type" NOT NULL,
	"html_scripts_enabled" boolean DEFAULT false NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	"object_deleted_at" timestamp (0),
	CONSTRAINT "project_document_file_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "project_document_file_byte_size_check" CHECK ("project_document_file"."byte_size" > 0 AND "project_document_file"."byte_size" <= 52428800),
	CONSTRAINT "project_document_file_html_scripts_check" CHECK (NOT "project_document_file"."html_scripts_enabled" OR "project_document_file"."content_type" = 'text/html')
);

CREATE TABLE "project_document_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"name" varchar(140) NOT NULL,
	"download_file_name" varchar(255) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "project_document" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"created_by_username" varchar(20) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"published_at" timestamp (0),
	"deleted_at" timestamp (0),
	CONSTRAINT "project_document_public_id_unique" UNIQUE("public_id")
);

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
	"deleted_at" timestamp (0)
);

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
	"deleted_at" timestamp (0),
	CONSTRAINT "project_external_organization_project_id_id_unique" UNIQUE("project_id","id")
);

CREATE TABLE "project_organization_attribution" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_attribution_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"role" "project_organization_attribution_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_organization_attribution_source_xor_check" CHECK (num_nonnulls("project_organization_attribution"."organization_id", "project_organization_attribution"."external_organization_id") = 1)
);

CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"title" varchar(140) NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_organization_id" integer,
	"current_content_id" integer,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_default_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_default_updated_at" timestamp (0),
	"conversation_email_update_default_updated_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_auto_provisioned_for_organization_id_unique" UNIQUE("auto_provisioned_for_organization_id"),
	CONSTRAINT "project_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "project_email_update_default_audit_check" CHECK (("project"."conversation_email_update_default_updated_at" IS NULL) = ("project"."conversation_email_update_default_updated_by_user_id" IS NULL))
);

CREATE TABLE "project_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "ranking_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_mode" "ranking_mode" NOT NULL,
	"current_ranking_score_id" integer,
	"external_source_config" jsonb,
	"item_count" integer DEFAULT 0 NOT NULL,
	"total_item_count" integer DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"total_vote_count" integer DEFAULT 0 NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"total_participant_count" integer DEFAULT 0 NOT NULL,
	"scoring_input_revision" bigint DEFAULT 0 NOT NULL,
	"scoring_invalidation_revision" bigint DEFAULT 0 NOT NULL,
	"processed_scoring_input_revision" bigint DEFAULT -1 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_conversation_config_current_ranking_score_id_unique" UNIQUE("current_ranking_score_id"),
	CONSTRAINT "ranking_conversation_config_invalidation_revision_check" CHECK ("ranking_conversation_config"."scoring_invalidation_revision" >= 0 AND "ranking_conversation_config"."scoring_invalidation_revision" <= "ranking_conversation_config"."scoring_input_revision"),
	CONSTRAINT "ranking_conversation_config_counts_check" CHECK ("ranking_conversation_config"."item_count" >= 0 AND "ranking_conversation_config"."item_count" <= "ranking_conversation_config"."total_item_count" AND "ranking_conversation_config"."vote_count" >= 0 AND "ranking_conversation_config"."vote_count" <= "ranking_conversation_config"."total_vote_count" AND "ranking_conversation_config"."participant_count" >= 0 AND "ranking_conversation_config"."participant_count" <= "ranking_conversation_config"."total_participant_count" AND "ranking_conversation_config"."scoring_input_revision" >= 0 AND "ranking_conversation_config"."processed_scoring_input_revision" >= -1 AND "ranking_conversation_config"."processed_scoring_input_revision" <= "ranking_conversation_config"."scoring_input_revision")
);

CREATE TABLE "ranking_conversation_stats_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"ranking_score_id" integer,
	"item_count" integer NOT NULL,
	"total_item_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"total_vote_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"total_participant_count" integer NOT NULL,
	"scoring_input_revision" bigint NOT NULL,
	"is_closed" boolean NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_stats_snapshot_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_conversation_stats_snapshot_counts_check" CHECK ("ranking_conversation_stats_snapshot"."item_count" >= 0 AND "ranking_conversation_stats_snapshot"."item_count" <= "ranking_conversation_stats_snapshot"."total_item_count" AND "ranking_conversation_stats_snapshot"."vote_count" >= 0 AND "ranking_conversation_stats_snapshot"."vote_count" <= "ranking_conversation_stats_snapshot"."total_vote_count" AND "ranking_conversation_stats_snapshot"."participant_count" >= 0 AND "ranking_conversation_stats_snapshot"."participant_count" <= "ranking_conversation_stats_snapshot"."total_participant_count" AND "ranking_conversation_stats_snapshot"."scoring_input_revision" >= 0)
);

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" USING btree ("conversation_id","language_code") WHERE "conversation_translation_target_language"."deleted_at" is null;

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" USING btree ("analysis_snapshot_id") WHERE "conversation_view_snapshot"."analysis_snapshot_id" is not null;

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" USING btree ("project_id") WHERE "project_contact"."deleted_at" is null;

CREATE UNIQUE INDEX "project_content_banner_localization_active_unique" ON "project_content_banner_localization" USING btree ("project_content_id","language_code") WHERE "project_content_banner_localization"."deleted_at" is null;

CREATE UNIQUE INDEX "project_content_translation_active_unique" ON "project_content_translation" USING btree ("project_content_id","display_language_code") WHERE "project_content_translation"."deleted_at" is null;

CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" USING btree ("project_document_id","audience") WHERE "project_document_file"."deleted_at" is null;

CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" USING btree ("project_document_id") WHERE "project_document_file"."deleted_at" IS NOT NULL AND "project_document_file"."object_deleted_at" IS NULL;

CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" USING btree ("created_at","project_document_id") WHERE "project_document_file"."status" = 'pending' AND "project_document_file"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" USING btree ("project_document_id","language_code") WHERE "project_document_localization"."deleted_at" is null;

CREATE INDEX "project_document_project_id_idx" ON "project_document" USING btree ("project_id");

CREATE UNIQUE INDEX "project_external_org_loc_active_unique" ON "project_external_organization_localization" USING btree ("external_organization_id","language_code") WHERE "project_external_organization_localization"."deleted_at" is null;

CREATE UNIQUE INDEX "project_organization_attribution_order_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","sort_order") WHERE "project_organization_attribution"."deleted_at" is null;

CREATE UNIQUE INDEX "project_organization_attribution_real_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","organization_id") WHERE ("project_organization_attribution"."organization_id" is not null AND "project_organization_attribution"."deleted_at" is null);

CREATE UNIQUE INDEX "project_organization_attribution_external_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","external_organization_id") WHERE ("project_organization_attribution"."external_organization_id" is not null AND "project_organization_attribution"."deleted_at" is null);

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" USING btree ("project_id","language_code") WHERE "project_translation_target_language"."deleted_at" is null;

CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);
