-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "analysis_input_mode" AS ENUM('closing', 'live');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "project_content_translation_source_kind" AS ENUM('manual', 'machine');

CREATE TYPE "project_document_audience" AS ENUM('participant', 'owner');

CREATE TYPE "project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');

CREATE TYPE "project_document_file_status" AS ENUM('pending', 'available');

CREATE TYPE "project_organization_attribution_role" AS ENUM('project_owner', 'sponsor', 'partner');

CREATE TYPE "ranking_mode" AS ENUM('bws', 'pairwise');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TABLE "comparison_analysis_close" (
	"close_id" integer PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"original_stats_snapshot_id" integer NOT NULL UNIQUE,
	"closing_stats_snapshot_id" integer NOT NULL,
	"live_stats_snapshot_id" integer NOT NULL,
	"served_stats_snapshot_id" integer NOT NULL,
	"processed_closing_revision" bigint DEFAULT 0 NOT NULL,
	"failed_closing_revision" bigint,
	"failed_live_revision" bigint
);

CREATE TABLE "conversation_analysis_close" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_analysis_close_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"close_epoch" uuid NOT NULL,
	"source_revision" bigint NOT NULL,
	"selected_input_mode" "analysis_input_mode" DEFAULT 'closing'::"analysis_input_mode" NOT NULL,
	"requested_result_revision" bigint,
	"served_input_mode" "analysis_input_mode" DEFAULT 'closing'::"analysis_input_mode" NOT NULL,
	"served_result_revision" bigint,
	"selection_revision" bigint DEFAULT 0 NOT NULL,
	"minimum_closing_result_revision" bigint DEFAULT 0 NOT NULL,
	"finalized_at" timestamp(0) NOT NULL,
	CONSTRAINT "conversation_analysis_close_epoch_unique" UNIQUE("conversation_id","close_epoch"),
	CONSTRAINT "conversation_analysis_close_scope_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "conversation_analysis_close_revision_check" CHECK ((("source_revision" >= 0) and ("selection_revision" >= 0) and ("minimum_closing_result_revision" >= 0) and (((("requested_result_revision" is null)) or ("requested_result_revision" > 0))) and (((("served_result_revision" is null)) or ("served_result_revision" > 0))) and ((("served_input_mode" = 'closing') or (("served_result_revision" is not null))))))
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_content_translation_unique" UNIQUE("conversation_content_id","display_language_code"),
	CONSTRAINT "conversation_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "conversation_content_translation_body_plain_text_pair_check" CHECK ((("translated_body" IS NULL AND "translated_body_plain_text" IS NULL) OR ("translated_body" IS NOT NULL AND "translated_body_plain_text" IS NOT NULL)))
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

CREATE TABLE "conversation_view_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_view_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"analysis_snapshot_id" integer,
	"close_replacement_generation" integer,
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
	"activated_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_view_snapshot_scope_unique" UNIQUE("id","conversation_id","opinion_group_spec_id"),
	CONSTRAINT "conversation_view_snapshot_close_generation_spec_unique" UNIQUE("conversation_id","close_replacement_generation","opinion_group_spec_id"),
	CONSTRAINT "conversation_view_snapshot_counts_check" CHECK ("opinion_count" >= 0 AND "vote_count" >= 0 AND "participant_count" >= 0 AND "total_opinion_count" >= 0 AND "total_vote_count" >= 0 AND "total_participant_count" >= 0 AND "moderated_opinion_count" >= 0 AND "hidden_opinion_count" >= 0),
	CONSTRAINT "conversation_view_snapshot_preferred_opinion_group_count_check" CHECK ("preferred_opinion_group_count" IS NULL OR ("preferred_opinion_group_count" >= 2 AND "preferred_opinion_group_count" <= 6))
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

CREATE TABLE "qv_calculation_state" (
	"conversation_id" integer PRIMARY KEY,
	"generation" integer DEFAULT 0 NOT NULL,
	"current_calculation_id" uuid,
	CONSTRAINT "qv_calculation_state_generation_check" CHECK ("generation" >= 0)
);

CREATE TABLE "qv_calculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" integer NOT NULL,
	"generation" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input_snapshot_id" uuid,
	"lease_token" uuid,
	"lease_expires_at" timestamp(3),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp(3) DEFAULT now() NOT NULL,
	"error_code" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"ready_at" timestamp(3),
	CONSTRAINT "qv_calculation_generation_unique" UNIQUE("conversation_id","generation"),
	CONSTRAINT "qv_calculation_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_calculation_generation_check" CHECK ("generation" >= 1),
	CONSTRAINT "qv_calculation_attempt_check" CHECK ("attempt_count" >= 0),
	CONSTRAINT "qv_calculation_status_check" CHECK ("status" in ('queued', 'running', 'ready', 'failed')),
	CONSTRAINT "qv_calculation_lease_check" CHECK ((((("status" = 'running') and (("lease_token" is not null)) and (("lease_expires_at" is not null)))) or ((("status" <> 'running') and (("lease_token" is null)) and (("lease_expires_at" is null)))))),
	CONSTRAINT "qv_calculation_ready_check" CHECK ((((("status" = 'ready') and (("input_snapshot_id" is not null)) and (("ready_at" is not null)))) or ((("status" <> 'ready') and (("ready_at" is null))))))
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

CREATE TABLE "qv_live_stats" (
	"conversation_id" integer PRIMARY KEY,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"refreshed_at" timestamp(3),
	"retry_after" timestamp(3),
	CONSTRAINT "qv_live_stats_count_check" CHECK ("participant_count" >= 0),
	CONSTRAINT "qv_live_stats_revision_check" CHECK ("revision" >= 0)
);

CREATE TABLE "ranking_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_mode" "ranking_mode" NOT NULL,
	"allow_participant_statements" boolean DEFAULT false NOT NULL,
	"current_ranking_score_id" integer UNIQUE,
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_conversation_config_invalidation_revision_check" CHECK ("scoring_invalidation_revision" >= 0 AND "scoring_invalidation_revision" <= "scoring_input_revision"),
	CONSTRAINT "ranking_conversation_config_counts_check" CHECK ("item_count" >= 0 AND "item_count" <= "total_item_count" AND "vote_count" >= 0 AND "vote_count" <= "total_vote_count" AND "participant_count" >= 0 AND "participant_count" <= "total_participant_count" AND "scoring_input_revision" >= 0 AND "processed_scoring_input_revision" >= -1 AND "processed_scoring_input_revision" <= "scoring_input_revision")
);

CREATE TABLE "ranking_conversation_stats_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"ranking_score_id" integer,
	"reused_input_snapshot_id" uuid,
	"derived_from_close_id" integer,
	"item_count" integer NOT NULL,
	"total_item_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"total_vote_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"total_participant_count" integer NOT NULL,
	"scoring_input_revision" bigint NOT NULL,
	"is_closed" boolean NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "ranking_stats_snapshot_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "comparison_derived_closing_result_check" CHECK (((("derived_from_close_id" is null)) or ((("is_closed" = true) and (("reused_input_snapshot_id" is null)))))),
	CONSTRAINT "ranking_stats_reused_input_closed_check" CHECK (((("reused_input_snapshot_id" is null)) or ("is_closed" = true))),
	CONSTRAINT "ranking_conversation_stats_snapshot_counts_check" CHECK ("item_count" >= 0 AND "item_count" <= "total_item_count" AND "vote_count" >= 0 AND "vote_count" <= "total_vote_count" AND "participant_count" >= 0 AND "participant_count" <= "total_participant_count" AND "scoring_input_revision" >= 0)
);

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" ("conversation_id","language_code") WHERE ("deleted_at" is null);

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" ("analysis_snapshot_id") WHERE ("analysis_snapshot_id" is not null);

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" ("slug") WHERE "deleted_at" IS NULL;

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

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" ("project_id","language_code") WHERE ("deleted_at" is null);

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');

CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");

CREATE INDEX "ranking_stats_reused_input_idx" ON "ranking_conversation_stats_snapshot" ("reused_input_snapshot_id") WHERE ("reused_input_snapshot_id" is not null);

CREATE UNIQUE INDEX "comparison_closing_result_revision_unique" ON "ranking_conversation_stats_snapshot" ("derived_from_close_id","scoring_input_revision") WHERE ("derived_from_close_id" is not null);

CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE "deleted_at" IS NULL;

CREATE INDEX "ranking_stats_snapshot_deleted_idx" ON "ranking_conversation_stats_snapshot" ("deleted_at","id") WHERE "deleted_at" IS NOT NULL;
