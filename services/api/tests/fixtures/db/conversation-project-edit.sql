-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "conversation_email_update_delivery_status" AS ENUM('preparing', 'queued', 'sending', 'stopping', 'stopped', 'completed', 'completed_with_failures', 'failed');

CREATE TYPE "conversation_email_update_failure_reason" AS ENUM('materialization_failed', 'no_eligible_participants', 'required_owner_copy_not_accepted', 'no_participant_provider_accepted');

CREATE TYPE "conversation_email_update_participant_preference_scope" AS ENUM('project', 'conversation');

CREATE TYPE "conversation_email_update_safety_reason" AS ENUM('legal', 'abuse');

CREATE TYPE "conversation_email_update_safety_target_kind" AS ENUM('organization', 'project', 'conversation', 'facilitator');

CREATE TYPE "conversation_email_update_scope_kind" AS ENUM('listed_project', 'no_project');

CREATE TYPE "conversation_email_update_stop_reason" AS ENUM('global_kill_switch', 'legal_or_abuse_block');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_moderation_action" AS ENUM('lock');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TYPE "ranking_mode" AS ENUM('bws', 'pairwise');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "survey_choice_display" AS ENUM('auto', 'list', 'dropdown');

CREATE TYPE "survey_question_type" AS ENUM('choice', 'free_text');

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

CREATE TABLE "conversation_email_update_conversation" (
	"update_id" integer,
	"project_id" integer NOT NULL,
	"conversation_id" integer,
	"conversation_title_snapshot" varchar(150) NOT NULL,
	"conversation_url_snapshot" text,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_conversation_pkey" PRIMARY KEY("update_id","conversation_id")
);

CREATE TABLE "conversation_email_update_delivery" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_delivery_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"update_id" integer NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"accepted_test_attempt_id" integer NOT NULL UNIQUE,
	"accepted_by_user_id" uuid,
	"status" "conversation_email_update_delivery_status" NOT NULL,
	"participant_preference_scope" "conversation_email_update_participant_preference_scope" NOT NULL,
	"failure_reason" "conversation_email_update_failure_reason",
	"stop_reason" "conversation_email_update_stop_reason",
	"audience_cutoff_at" timestamp(0) NOT NULL,
	"displayed_participant_estimate" integer NOT NULL,
	"acceptance_participant_estimate" integer NOT NULL,
	"materialized_participant_count" integer DEFAULT 0 NOT NULL,
	"required_owner_copy_count" integer NOT NULL,
	"frequency_capped_count" integer DEFAULT 0 NOT NULL,
	"ineligible_count" integer DEFAULT 0 NOT NULL,
	"materialization_cursor_user_id" uuid,
	"materialization_attempt_count" integer DEFAULT 0 NOT NULL,
	"materialization_last_error" text,
	"dispatch_turn_at" timestamp(0),
	"accepted_at" timestamp(0) NOT NULL,
	"materialized_at" timestamp(0),
	"sending_started_at" timestamp(0),
	"stopping_at" timestamp(0),
	"completed_at" timestamp(0),
	"failed_at" timestamp(0),
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_delivery_id_update_unique" UNIQUE("id","update_id"),
	CONSTRAINT "conversation_email_update_delivery_counts_check" CHECK ("displayed_participant_estimate" >= 0 AND "acceptance_participant_estimate" >= 0 AND "materialized_participant_count" >= 0 AND "required_owner_copy_count" > 0 AND "frequency_capped_count" >= 0 AND "ineligible_count" >= 0 AND "materialization_attempt_count" BETWEEN 0 AND 5),
	CONSTRAINT "conversation_email_update_delivery_failure_reason_check" CHECK (("status" = 'failed') = ("failure_reason" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_delivery_stop_reason_check" CHECK (("status" IN ('stopping', 'stopped')) = ("stop_reason" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_delivery_timestamps_check" CHECK ((("status" = 'preparing' AND "materialized_at" IS NULL AND "sending_started_at" IS NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'queued' AND "materialized_at" IS NOT NULL AND "sending_started_at" IS NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'sending' AND "materialized_at" IS NOT NULL AND "sending_started_at" IS NOT NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'stopping' AND "stopping_at" IS NOT NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'stopped' AND "stopping_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "failed_at" IS NULL) OR ("status" IN ('completed', 'completed_with_failures') AND "materialized_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "stopping_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'failed' AND "failed_at" IS NOT NULL AND "completed_at" IS NULL)))
);

CREATE TABLE "conversation_email_update_scope_safety_block" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_scope_safety_block_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"target_kind" "conversation_email_update_safety_target_kind" NOT NULL,
	"organization_id" integer,
	"project_id" integer,
	"conversation_id" integer,
	"facilitator_user_id" uuid,
	"reason" "conversation_email_update_safety_reason" NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"lifted_at" timestamp(0),
	"lifted_by_user_id" uuid,
	CONSTRAINT "conversation_email_update_safety_target_check" CHECK ((("target_kind" = 'organization' AND "organization_id" IS NOT NULL AND num_nonnulls("project_id", "conversation_id", "facilitator_user_id") = 0) OR ("target_kind" = 'project' AND "project_id" IS NOT NULL AND num_nonnulls("organization_id", "conversation_id", "facilitator_user_id") = 0) OR ("target_kind" = 'conversation' AND "conversation_id" IS NOT NULL AND num_nonnulls("organization_id", "project_id", "facilitator_user_id") = 0) OR ("target_kind" = 'facilitator' AND "facilitator_user_id" IS NOT NULL AND num_nonnulls("organization_id", "project_id", "conversation_id") = 0))),
	CONSTRAINT "conversation_email_update_safety_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null))))
);

CREATE TABLE "conversation_email_update" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"scope_kind" "conversation_email_update_scope_kind" NOT NULL,
	"created_by_user_id" uuid,
	"authorizing_organization_id" integer NOT NULL,
	"authorizing_premium_feature_id" integer NOT NULL,
	"project_title_snapshot" varchar(150) NOT NULL,
	"reply_to_name_snapshot" varchar(150) NOT NULL,
	"reply_to_email_snapshot" varchar(254) NOT NULL,
	"subject" varchar(140) NOT NULL,
	"body_html" text NOT NULL,
	"body_plain_text" text NOT NULL,
	"cancelled_at" timestamp(0),
	"review_expires_at" timestamp(0),
	"template_version" varchar(100),
	"participant_preference_scope_snapshot" "conversation_email_update_participant_preference_scope",
	"branding_snapshot" jsonb,
	"review_test_email_credential_id" integer,
	"review_test_email_snapshot" varchar(254),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_email_update_review_fields_check" CHECK (((((((("review_expires_at" is null)) and (("template_version" is null)) and (("participant_preference_scope_snapshot" is null)) and (("branding_snapshot" is null)))) or (((("review_expires_at" is not null)) and (("template_version" is not null)) and (("participant_preference_scope_snapshot" is not null)) and (("branding_snapshot" is not null)))))) and (((("cancelled_at" is null)) or (("review_expires_at" is not null)))) and (((((("review_expires_at" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null)))) or (((("review_expires_at" is not null)) and (((((("created_by_user_id" is not null)) and (("review_test_email_credential_id" is not null)) and (("review_test_email_snapshot" is not null)))) or (((("created_by_user_id" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null)))))))))))),
	CONSTRAINT "conversation_email_update_review_expiry_check" CHECK ("review_expires_at" IS NULL OR ("review_expires_at" = "created_at" + interval '24 hours' AND length(btrim("template_version")) > 0)),
	CONSTRAINT "conversation_email_update_review_scope_check" CHECK ("scope_kind" <> 'no_project' OR "participant_preference_scope_snapshot" IS NULL OR "participant_preference_scope_snapshot" = 'conversation'),
	CONSTRAINT "conversation_email_update_branding_check" CHECK ("branding_snapshot" IS NULL OR (jsonb_typeof("branding_snapshot") = 'object' AND "branding_snapshot" ?& array['name', 'palette'] AND jsonb_typeof("branding_snapshot"->'name') = 'string' AND length(btrim("branding_snapshot"->>'name')) BETWEEN 1 AND 500 AND jsonb_typeof("branding_snapshot"->'palette') = 'string' AND "branding_snapshot"->>'palette' IN ('blue', 'purple', 'green') AND (NOT "branding_snapshot" ? 'imageUrl' OR jsonb_typeof("branding_snapshot"->'imageUrl') = 'string') AND (NOT "branding_snapshot" ? 'bannerImageUrl' OR jsonb_typeof("branding_snapshot"->'bannerImageUrl') = 'string'))),
	CONSTRAINT "conversation_email_update_subject_check" CHECK (length(btrim("subject")) > 0),
	CONSTRAINT "conversation_email_update_body_html_check" CHECK (octet_length("body_html") > 0 AND octet_length("body_html") <= 16384),
	CONSTRAINT "conversation_email_update_body_plain_text_check" CHECK (length(btrim("body_plain_text")) > 0 AND length("body_plain_text") <= 10000),
	CONSTRAINT "conversation_email_update_reply_to_email_canonical_check" CHECK ("reply_to_email_snapshot" = lower(btrim("reply_to_email_snapshot"))),
	CONSTRAINT "conversation_email_update_review_test_email_canonical_check" CHECK ("review_test_email_snapshot" IS NULL OR (length(btrim("review_test_email_snapshot")) > 0 AND "review_test_email_snapshot" = lower(btrim("review_test_email_snapshot"))))
);

CREATE TABLE "conversation_moderation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"author_id" uuid,
	"moderation_action" "conversation_moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(1000),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
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

CREATE TABLE "opinion_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"opinion_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_by_user_id" uuid,
	"content_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_edit_attribution_check" CHECK (((("edited_by_user_id" is null)) or ("is_edited" = true))),
	CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("content") <= 16384),
	CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "opinion_moderation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_id" integer NOT NULL,
	"author_id" uuid,
	"moderation_action" "opinion_moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(1000),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp(3),
	"account_hidden_at" timestamp(3),
	"account_hidden_content_retained" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "opinion_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))))
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

CREATE TABLE "qv_stats_refresh" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qv_stats_refresh_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"processed_at" timestamp(3)
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

CREATE TABLE "survey_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "survey_config_id_conversation_unique" UNIQUE("id","conversation_id")
);

CREATE TABLE "survey_question_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"survey_question_id" integer NOT NULL,
	"question_text" varchar(500) NOT NULL,
	"constraints" jsonb NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "survey_question_option_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"survey_question_option_id" integer NOT NULL,
	"option_text" varchar(200) NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "survey_question_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"survey_question_id" integer NOT NULL,
	"current_content_id" integer UNIQUE,
	"display_order" smallint NOT NULL,
	"allows_text" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_id_question_unique" UNIQUE("id","survey_question_id")
);

CREATE TABLE "survey_question" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"survey_config_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"question_type" "survey_question_type" NOT NULL,
	"choice_display" "survey_choice_display" DEFAULT 'auto'::"survey_choice_display" NOT NULL,
	"current_content_id" integer UNIQUE,
	"current_semantic_version" integer DEFAULT 1 NOT NULL,
	"display_order" smallint NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_public_aggregate_suppression_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_id_conversation_unique" UNIQUE("id","conversation_id")
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

CREATE INDEX "conversation_email_update_scope_conversation_idx" ON "conversation_email_update_conversation" ("conversation_id","update_id");

CREATE UNIQUE INDEX "conversation_email_update_delivery_project_active_unique" ON "conversation_email_update_delivery" ("project_id") WHERE "status" IN ('preparing', 'queued', 'sending', 'stopping');

CREATE INDEX "conversation_email_update_delivery_materialization_idx" ON "conversation_email_update_delivery" ("status","updated_at","id");

CREATE INDEX "conversation_email_update_delivery_dispatch_idx" ON "conversation_email_update_delivery" ("status","dispatch_turn_at","id");

CREATE INDEX "conversation_email_update_delivery_project_history_idx" ON "conversation_email_update_delivery" ("project_id","accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE INDEX "conversation_email_update_delivery_history_idx" ON "conversation_email_update_delivery" ("accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE UNIQUE INDEX "conversation_email_update_safety_organization_active_unique" ON "conversation_email_update_scope_safety_block" ("organization_id") WHERE "target_kind" = 'organization' AND "lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_project_active_unique" ON "conversation_email_update_scope_safety_block" ("project_id") WHERE "target_kind" = 'project' AND "lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_conversation_active_unique" ON "conversation_email_update_scope_safety_block" ("conversation_id") WHERE "target_kind" = 'conversation' AND "lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_facilitator_active_unique" ON "conversation_email_update_scope_safety_block" ("facilitator_user_id") WHERE "target_kind" = 'facilitator' AND "lifted_at" IS NULL;

CREATE INDEX "conversation_email_update_creator_created_idx" ON "conversation_email_update" ("created_by_user_id","created_at");

CREATE UNIQUE INDEX "conversation_moderation_active_conversation_unique" ON "conversation_moderation" ("conversation_id") WHERE ("deleted_at" is null);

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" ("conversation_id","language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" ("opinion_id") WHERE ("deleted_at" is null);

CREATE INDEX "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "opinion_authorId_idx" ON "opinion" ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" ("author_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" ("organization_membership_id","capability") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" ("user_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" ("slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" ("project_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_contact_organization_idx" ON "project_contact" ("organization_id") WHERE ("organization_id" is not null);

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" ("project_id","language_code") WHERE ("deleted_at" is null);

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');

CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");

CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" ("conversation_id","id") WHERE ("processed_at" is null);

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" ("id") WHERE ("delivery_id" is null);

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" ("topic","event_id");

CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" ("conversation_id") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" ("survey_question_id","display_order") WHERE "current_content_id" IS NOT NULL;

CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" ("survey_config_id","display_order") WHERE "current_content_id" IS NOT NULL;

CREATE INDEX "survey_question_config_idx" ON "survey_question" ("survey_config_id");
