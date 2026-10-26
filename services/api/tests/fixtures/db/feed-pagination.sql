-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item');

CREATE TYPE "public"."content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_moderation_action" AS ENUM('lock');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."import_method" AS ENUM('url', 'csv');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam');

CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "public"."project_content_translation_source_kind" AS ENUM('manual', 'machine');

CREATE TYPE "public"."ranking_mode" AS ENUM('bws');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TABLE "content_translation_work" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_translation_work_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer,
	"source_kind" "content_translation_source_kind" NOT NULL,
	"project_content_id" integer,
	"conversation_content_id" integer,
	"opinion_content_id" integer,
	"survey_question_content_id" integer,
	"survey_question_option_content_ids" integer[],
	"ranking_item_content_id" integer,
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
	CONSTRAINT "content_translation_work_source_check" CHECK ((("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is not null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'project' AND "content_translation_work"."conversation_id" is null AND "content_translation_work"."project_content_id" is not null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is not null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null AND "content_translation_work"."ranking_item_content_id" is null) OR ("content_translation_work"."source_kind" = 'ranking_item' AND "content_translation_work"."conversation_id" is not null AND "content_translation_work"."project_content_id" is null AND "content_translation_work"."conversation_content_id" is null AND "content_translation_work"."opinion_content_id" is null AND "content_translation_work"."survey_question_content_id" is null AND "content_translation_work"."survey_question_option_content_ids" is null AND "content_translation_work"."ranking_item_content_id" is not null))),
	CONSTRAINT "content_translation_work_running_lease_check" CHECK ((("content_translation_work"."status" <> 'running' AND "content_translation_work"."lease_owner" is null AND "content_translation_work"."lease_token" is null AND "content_translation_work"."lease_expires_at" is null) OR ("content_translation_work"."status" = 'running' AND "content_translation_work"."lease_owner" is not null AND "content_translation_work"."lease_token" is not null AND "content_translation_work"."lease_expires_at" is not null))),
	CONSTRAINT "content_translation_work_priority_rank_check" CHECK ("content_translation_work"."priority_rank" >= 0 AND "content_translation_work"."priority_rank" <= 2)
);

CREATE TABLE "conversation_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
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

CREATE TABLE "conversation_moderation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"author_id" uuid NOT NULL,
	"moderation_action" "conversation_moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(1000),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
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

CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"granted_by_user_id" uuid,
	"revoked_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK ((("organization_membership_all_project_capability"."deleted_at" IS NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NULL) OR ("organization_membership_all_project_capability"."deleted_at" IS NOT NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NOT NULL)))
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
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

CREATE TABLE "polis_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polis_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"voting_presentation" "polis_voting_presentation" DEFAULT 'list' NOT NULL,
	"ai_labeling_enabled" boolean DEFAULT true NOT NULL,
	"analysis_data_generation" integer DEFAULT 0 NOT NULL,
	"preferred_opinion_group_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check" CHECK ("polis_conversation_config"."preferred_opinion_group_count" IS NULL OR "polis_conversation_config"."preferred_opinion_group_count" >= 2)
);

CREATE TABLE "project_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"subtitle" varchar(150),
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

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"title" varchar(150) NOT NULL,
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
	"deleted_at" timestamp (0),
	CONSTRAINT "ranking_stats_snapshot_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_conversation_stats_snapshot_counts_check" CHECK ("ranking_conversation_stats_snapshot"."item_count" >= 0 AND "ranking_conversation_stats_snapshot"."item_count" <= "ranking_conversation_stats_snapshot"."total_item_count" AND "ranking_conversation_stats_snapshot"."vote_count" >= 0 AND "ranking_conversation_stats_snapshot"."vote_count" <= "ranking_conversation_stats_snapshot"."total_vote_count" AND "ranking_conversation_stats_snapshot"."participant_count" >= 0 AND "ranking_conversation_stats_snapshot"."participant_count" <= "ranking_conversation_stats_snapshot"."total_participant_count" AND "ranking_conversation_stats_snapshot"."scoring_input_revision" >= 0)
);

CREATE TABLE "user_mute_preference" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_mute_preference_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
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

CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" USING btree ("conversation_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'conversation' AND "content_translation_work"."conversation_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" USING btree ("project_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'project' AND "content_translation_work"."project_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" USING btree ("opinion_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'opinion' AND "content_translation_work"."opinion_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" USING btree ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE ("content_translation_work"."source_kind" = 'survey_question' AND "content_translation_work"."survey_question_content_id" is not null AND "content_translation_work"."survey_question_option_content_ids" is not null);

CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" USING btree ("ranking_item_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'ranking_item' AND "content_translation_work"."ranking_item_content_id" is not null);

CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" USING btree ("priority_rank","updated_at","id") WHERE "content_translation_work"."status" = 'pending';

CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" USING btree ("lease_expires_at","id") WHERE "content_translation_work"."status" = 'running';

CREATE UNIQUE INDEX "conversation_moderation_active_conversation_unique" ON "conversation_moderation" USING btree ("conversation_id") WHERE "conversation_moderation"."deleted_at" is null;

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" USING btree ("conversation_id","language_code") WHERE "conversation_translation_target_language"."deleted_at" is null;

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" USING btree ("analysis_snapshot_id") WHERE "conversation_view_snapshot"."analysis_snapshot_id" is not null;

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_content_translation_active_unique" ON "project_content_translation" USING btree ("project_content_id","display_language_code") WHERE "project_content_translation"."deleted_at" is null;

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" USING btree ("project_id","language_code") WHERE "project_translation_target_language"."deleted_at" is null;

CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "ranking_conversation_stats_snapshot"."deleted_at" IS NULL;

CREATE INDEX "ranking_stats_snapshot_deleted_idx" ON "ranking_conversation_stats_snapshot" USING btree ("deleted_at","id") WHERE "ranking_conversation_stats_snapshot"."deleted_at" IS NOT NULL;

CREATE UNIQUE INDEX "user_mute_preference_active_unique" ON "user_mute_preference" USING btree ("source_user_id","target_user_id") WHERE "user_mute_preference"."deleted_at" is null;
