-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item');

CREATE TYPE "public"."content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'prioritizing');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "public"."organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');

CREATE TYPE "public"."organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "public"."premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TYPE "public"."project_content_translation_source_kind" AS ENUM('manual', 'machine');

CREATE TYPE "public"."project_document_audience" AS ENUM('participant', 'owner');

CREATE TYPE "public"."project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');

CREATE TYPE "public"."project_document_file_status" AS ENUM('pending', 'available');

CREATE TYPE "public"."project_organization_attribution_role" AS ENUM('project_owner', 'sponsor', 'partner');

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
	CONSTRAINT "content_translation_work_source_check" CHECK ((("content_translation_work"."source_kind" = 'conversation' and "content_translation_work"."conversation_id" is not null and "content_translation_work"."project_content_id" is null and "content_translation_work"."conversation_content_id" is not null and "content_translation_work"."opinion_content_id" is null and "content_translation_work"."survey_question_content_id" is null and "content_translation_work"."survey_question_option_content_ids" is null and "content_translation_work"."ranking_item_content_id" is null) or ("content_translation_work"."source_kind" = 'project' and "content_translation_work"."conversation_id" is null and "content_translation_work"."project_content_id" is not null and "content_translation_work"."conversation_content_id" is null and "content_translation_work"."opinion_content_id" is null and "content_translation_work"."survey_question_content_id" is null and "content_translation_work"."survey_question_option_content_ids" is null and "content_translation_work"."ranking_item_content_id" is null) or ("content_translation_work"."source_kind" = 'opinion' and "content_translation_work"."conversation_id" is not null and "content_translation_work"."project_content_id" is null and "content_translation_work"."conversation_content_id" is null and "content_translation_work"."opinion_content_id" is not null and "content_translation_work"."survey_question_content_id" is null and "content_translation_work"."survey_question_option_content_ids" is null and "content_translation_work"."ranking_item_content_id" is null) or ("content_translation_work"."source_kind" = 'survey_question' and "content_translation_work"."conversation_id" is not null and "content_translation_work"."project_content_id" is null and "content_translation_work"."conversation_content_id" is null and "content_translation_work"."opinion_content_id" is null and "content_translation_work"."survey_question_content_id" is not null and "content_translation_work"."survey_question_option_content_ids" is not null and "content_translation_work"."ranking_item_content_id" is null) or ("content_translation_work"."source_kind" = 'ranking_item' and "content_translation_work"."conversation_id" is not null and "content_translation_work"."project_content_id" is null and "content_translation_work"."conversation_content_id" is null and "content_translation_work"."opinion_content_id" is null and "content_translation_work"."survey_question_content_id" is null and "content_translation_work"."survey_question_option_content_ids" is null and "content_translation_work"."ranking_item_content_id" is not null))),
	CONSTRAINT "content_translation_work_running_lease_check" CHECK ((("content_translation_work"."status" <> 'running' and "content_translation_work"."lease_owner" is null and "content_translation_work"."lease_token" is null and "content_translation_work"."lease_expires_at" is null) or ("content_translation_work"."status" = 'running' and "content_translation_work"."lease_owner" is not null and "content_translation_work"."lease_token" is not null and "content_translation_work"."lease_expires_at" is not null))),
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

CREATE TABLE "conversation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"project_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"polis_config_id" integer,
	"ranking_config_id" integer,
	"credit_voting_config_id" integer,
	"prioritization_type" text,
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
	CONSTRAINT "conversation_credit_voting_config_id_unique" UNIQUE("credit_voting_config_id"),
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_deletion_intent_check" CHECK (("conversation"."deleted_at" is null or "conversation"."current_content_id" is null)),
	CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL AND "conversation"."credit_voting_config_id" IS NULL AND "conversation"."prioritization_type" IS NULL) OR ("conversation"."conversation_type" = 'prioritizing' AND "conversation"."polis_config_id" IS NULL AND "conversation"."prioritization_type" IS NOT NULL AND (("conversation"."prioritization_type" = 'comparisons' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."credit_voting_config_id" IS NULL) OR ("conversation"."prioritization_type" = 'qv' AND "conversation"."credit_voting_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL))))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_by_user_id" is null or "conversation"."conversation_email_update_override_updated_at" is not null))
);

CREATE TABLE "conversation_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "credit_voting_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_voting_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"allow_opposition" boolean DEFAULT true NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"statement_set_revision" integer DEFAULT 0 NOT NULL,
	"statements_locked_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "credit_voting_fixed_budget_check" CHECK ("credit_voting_config"."credit_budget" = 100),
	CONSTRAINT "credit_voting_statement_revision_check" CHECK ("credit_voting_config"."statement_set_revision" >= 0),
	CONSTRAINT "credit_voting_item_count_check" CHECK ("credit_voting_config"."item_count" >= 0)
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

CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"granted_by_user_id" uuid,
	"revoked_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK (("organization_membership_all_project_capability"."revoked_by_user_id" is null or "organization_membership_all_project_capability"."deleted_at" is not null))
);

CREATE TABLE "organization_membership_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_capability_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_capability_unique" UNIQUE("organization_membership_id","capability")
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
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
	"retired_for_account_deletion_at" timestamp (3),
	CONSTRAINT "organization_auto_provisioned_for_user_id_unique" UNIQUE("auto_provisioned_for_user_id"),
	CONSTRAINT "organization_account_retirement_check" CHECK (("organization"."retired_for_account_deletion_at" is null or ("organization"."auto_provisioned_for_user_id" is not null and "organization"."deleted_at" is not null and "organization"."deleted_at" = "organization"."retired_for_account_deletion_at"::timestamp(0))))
);

CREATE TABLE "polis_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polis_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"voting_presentation" "polis_voting_presentation" DEFAULT 'list' NOT NULL,
	"ai_labeling_enabled" boolean DEFAULT true NOT NULL,
	"allow_participant_statements" boolean DEFAULT true NOT NULL,
	"analysis_data_generation" integer DEFAULT 0 NOT NULL,
	"preferred_opinion_group_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check" CHECK ("polis_conversation_config"."preferred_opinion_group_count" IS NULL OR "polis_conversation_config"."preferred_opinion_group_count" >= 2)
);

CREATE TABLE "premium_feature_entitlement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "premium_feature_entitlement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"feature" "premium_feature" NOT NULL,
	"starts_at" timestamp (0) NOT NULL,
	"expires_at" timestamp (0),
	"revoked_at" timestamp (0),
	"admin_note" text,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "premium_feature_entitlement_organization_id_id_unique" UNIQUE("organization_id","id")
);

CREATE TABLE "project_contact" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"first_name" varchar(65),
	"last_name" varchar(65),
	"role_label" varchar(150),
	"email" text,
	"website_url" text,
	"image_path" text,
	"is_full_image_path" boolean DEFAULT false NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "project_contact_name_or_affiliation_check" CHECK ((("project_contact"."first_name" is not null and "project_contact"."first_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or ("project_contact"."last_name" is not null and "project_contact"."last_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or "project_contact"."organization_id" is not null)),
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("project_contact"."organization_id", "project_contact"."external_organization_id") <= 1),
	CONSTRAINT "project_contact_email_or_website_check" CHECK ((("project_contact"."email" is not null and "project_contact"."email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]') or ("project_contact"."website_url" is not null and "project_contact"."website_url" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]')))
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
	"name" varchar(150) NOT NULL,
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
	"retired_for_account_deletion_at" timestamp (3),
	CONSTRAINT "project_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "project_account_retirement_check" CHECK (("project"."retired_for_account_deletion_at" is null or ("project"."auto_provisioned_for_organization_id" is not null and "project"."deleted_at" is not null and "project"."deleted_at" = "project"."retired_for_account_deletion_at"::timestamp(0)))),
	CONSTRAINT "project_email_update_default_audit_check" CHECK (("project"."conversation_email_update_default_updated_by_user_id" is null or "project"."conversation_email_update_default_updated_at" is not null))
);

CREATE TABLE "project_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer,
	"delivered_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "realtime_event_outbox_delivery_id_unique" UNIQUE("delivery_id")
);

CREATE TABLE "realtime_event_outbox_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	CONSTRAINT "realtime_event_outbox_topic_unique" UNIQUE("event_id","topic")
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polis_participant_id" serial NOT NULL,
	"username" varchar(20) NOT NULL,
	"is_site_moderator" boolean DEFAULT false NOT NULL,
	"is_site_org_admin" boolean DEFAULT false NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp (0),
	"deletion_reason" text,
	"deletion_requested_at" timestamp (3),
	"recoverable_until" timestamp (3),
	"purge_started_at" timestamp (3),
	"auth_restricted_at" timestamp (0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_contribution_revision_check" CHECK ("user"."contribution_revision" >= 0),
	CONSTRAINT "user_recovery_lifecycle_check" CHECK (((("user"."deletion_requested_at" is null and "user"."recoverable_until" is null) or ("user"."is_deleted" = true and "user"."deletion_reason" is not null and "user"."deletion_reason" = 'account_deletion' and "user"."deletion_requested_at" is not null and "user"."recoverable_until" is not null and "user"."recoverable_until" = "user"."deletion_requested_at" + interval '15 days')) and ("user"."purge_started_at" is null or "user"."is_deleted" = true))),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("user"."auth_restricted_at" IS NULL) = ("user"."auth_restriction_reason" IS NULL)),
	CONSTRAINT "user_deletion_reason_check" CHECK (("user"."deletion_reason" is null or ("user"."is_deleted" = true and "user"."deleted_at" is not null and "user"."deletion_reason" in ('account_deletion', 'guest_merge'))))
);

CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" USING btree ("conversation_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'conversation' and "content_translation_work"."conversation_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" USING btree ("project_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'project' and "content_translation_work"."project_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" USING btree ("opinion_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'opinion' and "content_translation_work"."opinion_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" USING btree ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE ("content_translation_work"."source_kind" = 'survey_question' and "content_translation_work"."survey_question_content_id" is not null and "content_translation_work"."survey_question_option_content_ids" is not null);

CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" USING btree ("ranking_item_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'ranking_item' and "content_translation_work"."ranking_item_content_id" is not null);

CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" USING btree ("priority_rank","updated_at","id") WHERE "content_translation_work"."status" = 'pending';

CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" USING btree ("lease_expires_at","id") WHERE "content_translation_work"."status" = 'running';

CREATE INDEX "conversation_deleted_idx" ON "conversation" USING btree ("deleted_at","id") WHERE "conversation"."deleted_at" is not null;

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" USING btree ("conversation_id","language_code") WHERE "conversation_translation_target_language"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" USING btree ("organization_id","user_id") WHERE ("organization_membership"."deleted_at" is null and "organization_membership"."role" = 'admin');

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" USING btree ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" USING btree ("project_id") WHERE "project_contact"."deleted_at" is null;

CREATE INDEX "project_contact_organization_idx" ON "project_contact" USING btree ("organization_id") WHERE "project_contact"."organization_id" is not null;

CREATE UNIQUE INDEX "project_content_banner_localization_active_unique" ON "project_content_banner_localization" USING btree ("project_content_id","language_code") WHERE "project_content_banner_localization"."deleted_at" is null;

CREATE UNIQUE INDEX "project_content_translation_active_unique" ON "project_content_translation" USING btree ("project_content_id","display_language_code") WHERE "project_content_translation"."deleted_at" is null;

CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" USING btree ("project_document_id","audience") WHERE "project_document_file"."deleted_at" is null;

CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" USING btree ("project_document_id") WHERE "project_document_file"."deleted_at" IS NOT NULL AND "project_document_file"."object_deleted_at" IS NULL;

CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" USING btree ("created_at","project_document_id") WHERE "project_document_file"."status" = 'pending' AND "project_document_file"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" USING btree ("project_document_id","language_code") WHERE "project_document_localization"."deleted_at" is null;

CREATE INDEX "project_document_project_id_idx" ON "project_document" USING btree ("project_id");

CREATE UNIQUE INDEX "project_external_org_loc_active_unique" ON "project_external_organization_localization" USING btree ("external_organization_id","language_code") WHERE "project_external_organization_localization"."deleted_at" is null;

CREATE UNIQUE INDEX "project_organization_attribution_order_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","sort_order") WHERE "project_organization_attribution"."deleted_at" is null;

CREATE INDEX "project_organization_attribution_organization_idx" ON "project_organization_attribution" USING btree ("organization_id") WHERE "project_organization_attribution"."organization_id" is not null;

CREATE UNIQUE INDEX "project_organization_attribution_real_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","organization_id") WHERE ("project_organization_attribution"."organization_id" is not null and "project_organization_attribution"."deleted_at" is null);

CREATE UNIQUE INDEX "project_organization_attribution_external_active_unique" ON "project_organization_attribution" USING btree ("project_id","role","external_organization_id") WHERE ("project_organization_attribution"."external_organization_id" is not null and "project_organization_attribution"."deleted_at" is null);

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" is null;

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" USING btree ("auto_provisioned_for_organization_id") WHERE "project"."deleted_at" is null;

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" USING btree ("project_id","language_code") WHERE "project_translation_target_language"."deleted_at" is null;

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" USING btree ("topic","event_id");
