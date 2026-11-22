-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item', 'gathering_field', 'gathering_response');

CREATE TYPE "content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TYPE "project_content_translation_source_kind" AS ENUM('manual', 'machine');

CREATE TYPE "project_document_audience" AS ENUM('participant', 'owner');

CREATE TYPE "project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');

CREATE TYPE "project_document_file_status" AS ENUM('pending', 'available');

CREATE TYPE "project_organization_attribution_role" AS ENUM('project_owner', 'sponsor', 'partner');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

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
	"gathering_field_id" uuid,
	"gathering_response_content_id" integer,
	"display_language_code" "display_language_code" NOT NULL,
	"status" "content_translation_work_status" DEFAULT 'pending'::"content_translation_work_status" NOT NULL,
	"priority_rank" integer DEFAULT 2 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"lease_owner" varchar(100),
	"lease_token" uuid,
	"lease_expires_at" timestamp(0),
	"last_error_code" varchar(100),
	"last_error_message" text,
	"requested_at" timestamp(0),
	"completed_at" timestamp(0),
	"failed_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "content_translation_work_gathering_source_check" CHECK ((((("source_kind" = 'gathering_field') and (("gathering_field_id" is not null)) and (("gathering_response_content_id" is null)))) or ((("source_kind" = 'gathering_response') and (("gathering_field_id" is null)) and (("gathering_response_content_id" is not null)))) or ((("source_kind" not in ('gathering_field', 'gathering_response')) and (("gathering_field_id" is null)) and (("gathering_response_content_id" is null)))))),
	CONSTRAINT "content_translation_work_source_check" CHECK ((((("source_kind" = 'conversation') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is not null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'project') and (("conversation_id" is null)) and (("project_content_id" is not null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'opinion') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is not null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'survey_question') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'ranking_item') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is not null)))) or ((("source_kind" in ('gathering_field', 'gathering_response')) and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))))),
	CONSTRAINT "content_translation_work_running_lease_check" CHECK ((((("status" <> 'running') and (("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or ((("status" = 'running') and (("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null)))))),
	CONSTRAINT "content_translation_work_priority_rank_check" CHECK ("priority_rank" >= 0 AND "priority_rank" <= 2)
);

CREATE TABLE "conversation_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"body" text,
	"body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
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

CREATE TABLE "conversation_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_localization_organization_language_unique" UNIQUE("organization_id","language_code")
);

CREATE TABLE "organization_membership_all_project_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_all_project_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_all_project_capability_enum" NOT NULL,
	"granted_by_user_id" uuid,
	"revoked_by_user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK (((("revoked_by_user_id" is null)) or (("deleted_at" is not null))))
);

CREATE TABLE "organization_membership_capability" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_capability_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_membership_id" integer NOT NULL,
	"capability" "organization_membership_capability_enum" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "organization_membership_capability_unique" UNIQUE("organization_membership_id","capability")
);

CREATE TABLE "organization_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"organization_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"display_name" varchar(65) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_user_id" uuid UNIQUE,
	"image_path" text,
	"is_full_image_path" boolean NOT NULL,
	"website_url" text,
	"description" varchar(280),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	"retired_for_account_deletion_at" timestamp(3),
	CONSTRAINT "organization_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_user_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0))))))
);

CREATE TABLE "polis_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "polis_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"voting_presentation" "polis_voting_presentation" DEFAULT 'list'::"polis_voting_presentation" NOT NULL,
	"ai_labeling_enabled" boolean DEFAULT true NOT NULL,
	"allow_participant_statements" boolean DEFAULT true NOT NULL,
	"analysis_data_generation" integer DEFAULT 0 NOT NULL,
	"preferred_opinion_group_count" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check" CHECK ("preferred_opinion_group_count" IS NULL OR "preferred_opinion_group_count" >= 2)
);

CREATE TABLE "premium_feature_entitlement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "premium_feature_entitlement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"feature" "premium_feature" NOT NULL,
	"starts_at" timestamp(0) NOT NULL,
	"expires_at" timestamp(0),
	"revoked_at" timestamp(0),
	"admin_note" text,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "project_contact_identity_or_email_check" CHECK (((((("email" is not null)) and ("email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("first_name" is not null)) and ("first_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("last_name" is not null)) and ("last_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (("organization_id" is not null)))),
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("organization_id", "external_organization_id") <= 1),
	CONSTRAINT "project_contact_email_or_website_check" CHECK (((((("email" is not null)) and ("email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("website_url" is not null)) and ("website_url" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]')))))
);

CREATE TABLE "project_content_banner_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_banner_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_content_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"banner_path" text NOT NULL,
	"banner_is_full_path" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "project_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "project_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "project_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_title" text NOT NULL,
	"translated_subtitle" text,
	"translated_body" text,
	"translated_body_plain_text" text,
	"source_kind" "project_content_translation_source_kind" DEFAULT 'machine'::"project_content_translation_source_kind" NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "project_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "project_content_translation_body_plain_text_pair_check" CHECK ((("translated_body" IS NULL AND "translated_body_plain_text" IS NULL) OR ("translated_body" IS NOT NULL AND "translated_body_plain_text" IS NOT NULL)))
);

CREATE TABLE "project_document_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"audience" "project_document_audience" NOT NULL,
	"status" "project_document_file_status" DEFAULT 'pending'::"project_document_file_status" NOT NULL,
	"object_key" text NOT NULL UNIQUE,
	"original_file_name" text NOT NULL,
	"content_type" "project_document_content_type" NOT NULL,
	"html_scripts_enabled" boolean DEFAULT false NOT NULL,
	"byte_size" integer NOT NULL,
	"compressed_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	"object_deleted_at" timestamp(0),
	CONSTRAINT "project_document_file_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 52428800),
	CONSTRAINT "project_document_file_html_scripts_check" CHECK (NOT "html_scripts_enabled" OR "content_type" = 'text/html'),
	CONSTRAINT "project_document_file_compressed_content_check" CHECK ("compressed_at" IS NULL OR "content_type" <> 'application/pdf'),
	CONSTRAINT "project_document_file_original_cleanup_check" CHECK ("object_deleted_at" IS NULL OR "deleted_at" IS NOT NULL OR "compressed_at" IS NOT NULL)
);

CREATE TABLE "project_document_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"name" varchar(150) NOT NULL,
	"download_file_name" varchar(255) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "project_document" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"created_by_username" varchar(20) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"published_at" timestamp(0),
	"deleted_at" timestamp(0)
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "project_external_organization_project_id_id_unique" UNIQUE("project_id","id")
);

CREATE TABLE "project_organization_attribution" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_attribution_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"role" "project_organization_attribution_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"organization_id" integer,
	"external_organization_id" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "project_organization_attribution_source_xor_check" CHECK (num_nonnulls("organization_id", "external_organization_id") = 1)
);

CREATE TABLE "project_organization_ownership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_organization_ownership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(65) NOT NULL,
	"title" varchar(150) NOT NULL,
	"directory_visibility" "directory_visibility" NOT NULL,
	"auto_provisioned_for_organization_id" integer,
	"current_content_id" integer UNIQUE,
	"dynamic_translation_enabled" boolean DEFAULT false NOT NULL,
	"conversation_email_update_default_enabled" boolean DEFAULT false NOT NULL,
	"participation_mode" "participation_mode" DEFAULT 'guest'::"participation_mode" NOT NULL,
	"conversation_email_update_default_updated_at" timestamp(0),
	"conversation_email_update_default_updated_by_user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	"retired_for_account_deletion_at" timestamp(3),
	CONSTRAINT "project_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_organization_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0)))))),
	CONSTRAINT "project_email_update_default_audit_check" CHECK (((("conversation_email_update_default_updated_by_user_id" is null)) or (("conversation_email_update_default_updated_at" is not null))))
);

CREATE TABLE "project_translation_target_language" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_translation_target_language_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "credit_voting_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_voting_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"allow_opposition" boolean DEFAULT true NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"statement_set_revision" integer DEFAULT 0 NOT NULL,
	"statements_locked_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "credit_voting_fixed_budget_check" CHECK ("credit_budget" = 100),
	CONSTRAINT "credit_voting_statement_revision_check" CHECK ("statement_set_revision" >= 0),
	CONSTRAINT "credit_voting_item_count_check" CHECK ("item_count" >= 0)
);

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer UNIQUE,
	"delivered_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "realtime_event_outbox_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	CONSTRAINT "realtime_event_outbox_topic_unique" UNIQUE("event_id","topic")
);

CREATE TABLE "user" (
	"id" uuid PRIMARY KEY,
	"polis_participant_id" serial,
	"username" varchar(20) NOT NULL UNIQUE,
	"is_site_moderator" boolean DEFAULT false NOT NULL,
	"is_site_org_admin" boolean DEFAULT false NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"contribution_revision" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp(0),
	"deletion_reason" text,
	"deletion_requested_at" timestamp(3),
	"recoverable_until" timestamp(3),
	"purge_started_at" timestamp(3),
	"auth_restricted_at" timestamp(0),
	"auth_restriction_reason" text,
	"active_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_conversation_count" integer DEFAULT 0 NOT NULL,
	"total_opinion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_contribution_revision_check" CHECK ("contribution_revision" >= 0),
	CONSTRAINT "user_recovery_lifecycle_check" CHECK (((((((("deletion_requested_at" is null)) and (("recoverable_until" is null)))) or ((("is_deleted" = true) and (("deletion_reason" is not null)) and ("deletion_reason" = 'account_deletion') and (("deletion_requested_at" is not null)) and (("recoverable_until" is not null)) and ("recoverable_until" = "deletion_requested_at" + interval '15 days'))))) and (((("purge_started_at" is null)) or ("is_deleted" = true))))),
	CONSTRAINT "user_auth_restriction_reason_check" CHECK (("auth_restricted_at" IS NULL) = ("auth_restriction_reason" IS NULL)),
	CONSTRAINT "user_deletion_reason_check" CHECK (((("deletion_reason" is null)) or ((("is_deleted" = true) and (("deleted_at" is not null)) and ("deletion_reason" in ('account_deletion', 'guest_merge'))))))
);

CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" ("conversation_content_id","display_language_code") WHERE (("source_kind" = 'conversation') and (("conversation_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" ("project_content_id","display_language_code") WHERE (("source_kind" = 'project') and (("project_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" ("opinion_content_id","display_language_code") WHERE (("source_kind" = 'opinion') and (("opinion_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE (("source_kind" = 'survey_question') and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)));

CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" ("ranking_item_content_id","display_language_code") WHERE (("source_kind" = 'ranking_item') and (("ranking_item_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_gathering_field_unique" ON "content_translation_work" ("gathering_field_id","display_language_code") WHERE "source_kind" = 'gathering_field';

CREATE UNIQUE INDEX "content_translation_work_gathering_response_unique" ON "content_translation_work" ("gathering_response_content_id","display_language_code") WHERE "source_kind" = 'gathering_response';

CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" ("priority_rank","updated_at","id") WHERE "status" = 'pending';

CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" ("lease_expires_at","id") WHERE "status" = 'running';

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" ("conversation_id","language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" ("organization_membership_id","capability") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" ("user_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" ("slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" ("project_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_contact_organization_idx" ON "project_contact" ("organization_id") WHERE ("organization_id" is not null);

CREATE UNIQUE INDEX "project_content_banner_localization_active_unique" ON "project_content_banner_localization" ("project_content_id","language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_content_translation_active_unique" ON "project_content_translation" ("project_content_id","display_language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" ("project_document_id","audience") WHERE ("deleted_at" is null);

CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" ("project_document_id") WHERE "deleted_at" IS NOT NULL AND "object_deleted_at" IS NULL;

CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" ("created_at","project_document_id") WHERE "status" = 'pending' AND "deleted_at" IS NULL;

CREATE INDEX "project_document_file_original_retirement_idx" ON "project_document_file" ("compressed_at") WHERE "compressed_at" IS NOT NULL AND "deleted_at" IS NULL AND "object_deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" ("project_document_id","language_code") WHERE ("deleted_at" is null);

CREATE INDEX "project_document_project_id_idx" ON "project_document" ("project_id");

CREATE UNIQUE INDEX "project_external_org_loc_active_unique" ON "project_external_organization_localization" ("external_organization_id","language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_organization_attribution_order_active_unique" ON "project_organization_attribution" ("project_id","role","sort_order") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_attribution_organization_idx" ON "project_organization_attribution" ("organization_id") WHERE ("organization_id" is not null);

CREATE UNIQUE INDEX "project_organization_attribution_real_active_unique" ON "project_organization_attribution" ("project_id","role","organization_id") WHERE ((("organization_id" is not null)) and (("deleted_at" is null)));

CREATE UNIQUE INDEX "project_organization_attribution_external_active_unique" ON "project_organization_attribution" ("project_id","role","external_organization_id") WHERE ((("external_organization_id" is not null)) and (("deleted_at" is null)));

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" ("project_id","language_code") WHERE ("deleted_at" is null);

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" ("id") WHERE ("delivery_id" is null);

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" ("topic","event_id");
