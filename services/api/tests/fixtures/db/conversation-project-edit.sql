-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."conversation_email_update_delivery_status" AS ENUM('preparing', 'queued', 'sending', 'stopping', 'stopped', 'completed', 'completed_with_failures', 'failed');

CREATE TYPE "public"."conversation_email_update_failure_reason" AS ENUM('materialization_failed', 'no_eligible_participants', 'required_owner_copy_not_accepted', 'no_participant_provider_accepted');

CREATE TYPE "public"."conversation_email_update_participant_preference_scope" AS ENUM('project', 'conversation');

CREATE TYPE "public"."conversation_email_update_safety_reason" AS ENUM('legal', 'abuse');

CREATE TYPE "public"."conversation_email_update_safety_target_kind" AS ENUM('organization', 'project', 'conversation', 'facilitator');

CREATE TYPE "public"."conversation_email_update_scope_kind" AS ENUM('listed_project', 'no_project');

CREATE TYPE "public"."conversation_email_update_stop_reason" AS ENUM('global_kill_switch', 'legal_or_abuse_block');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_moderation_action" AS ENUM('lock');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam');

CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "public"."organization_membership_capability_enum" AS ENUM('organization_manage_members', 'organization_manage_profile', 'project_create');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "public"."premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TYPE "public"."ranking_mode" AS ENUM('bws');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "public"."survey_choice_display" AS ENUM('auto', 'list', 'dropdown');

CREATE TYPE "public"."survey_question_type" AS ENUM('choice', 'free_text');

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

CREATE TABLE "conversation_email_update_conversation" (
	"update_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"conversation_title_snapshot" varchar(150) NOT NULL,
	"conversation_url_snapshot" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_conversation_update_id_conversation_id_pk" PRIMARY KEY("update_id","conversation_id")
);

CREATE TABLE "conversation_email_update_delivery" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_delivery_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"update_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"accepted_test_attempt_id" integer NOT NULL,
	"accepted_by_user_id" uuid NOT NULL,
	"status" "conversation_email_update_delivery_status" NOT NULL,
	"participant_preference_scope" "conversation_email_update_participant_preference_scope" NOT NULL,
	"failure_reason" "conversation_email_update_failure_reason",
	"stop_reason" "conversation_email_update_stop_reason",
	"audience_cutoff_at" timestamp (0) NOT NULL,
	"displayed_participant_estimate" integer NOT NULL,
	"acceptance_participant_estimate" integer NOT NULL,
	"materialized_participant_count" integer DEFAULT 0 NOT NULL,
	"required_owner_copy_count" integer NOT NULL,
	"frequency_capped_count" integer DEFAULT 0 NOT NULL,
	"ineligible_count" integer DEFAULT 0 NOT NULL,
	"materialization_cursor_user_id" uuid,
	"materialization_attempt_count" integer DEFAULT 0 NOT NULL,
	"materialization_last_error" text,
	"dispatch_turn_at" timestamp (0),
	"accepted_at" timestamp (0) NOT NULL,
	"materialized_at" timestamp (0),
	"sending_started_at" timestamp (0),
	"stopping_at" timestamp (0),
	"completed_at" timestamp (0),
	"failed_at" timestamp (0),
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_delivery_update_id_unique" UNIQUE("update_id"),
	CONSTRAINT "conversation_email_update_delivery_accepted_test_attempt_id_unique" UNIQUE("accepted_test_attempt_id"),
	CONSTRAINT "conversation_email_update_delivery_id_update_unique" UNIQUE("id","update_id"),
	CONSTRAINT "conversation_email_update_delivery_counts_check" CHECK ("conversation_email_update_delivery"."displayed_participant_estimate" >= 0 AND "conversation_email_update_delivery"."acceptance_participant_estimate" >= 0 AND "conversation_email_update_delivery"."materialized_participant_count" >= 0 AND "conversation_email_update_delivery"."required_owner_copy_count" > 0 AND "conversation_email_update_delivery"."frequency_capped_count" >= 0 AND "conversation_email_update_delivery"."ineligible_count" >= 0 AND "conversation_email_update_delivery"."materialization_attempt_count" BETWEEN 0 AND 5),
	CONSTRAINT "conversation_email_update_delivery_failure_reason_check" CHECK (("conversation_email_update_delivery"."status" = 'failed') = ("conversation_email_update_delivery"."failure_reason" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_delivery_stop_reason_check" CHECK (("conversation_email_update_delivery"."status" IN ('stopping', 'stopped')) = ("conversation_email_update_delivery"."stop_reason" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_delivery_timestamps_check" CHECK ((("conversation_email_update_delivery"."status" = 'preparing' AND "conversation_email_update_delivery"."materialized_at" IS NULL AND "conversation_email_update_delivery"."sending_started_at" IS NULL AND "conversation_email_update_delivery"."stopping_at" IS NULL AND "conversation_email_update_delivery"."completed_at" IS NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" = 'queued' AND "conversation_email_update_delivery"."materialized_at" IS NOT NULL AND "conversation_email_update_delivery"."sending_started_at" IS NULL AND "conversation_email_update_delivery"."stopping_at" IS NULL AND "conversation_email_update_delivery"."completed_at" IS NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" = 'sending' AND "conversation_email_update_delivery"."materialized_at" IS NOT NULL AND "conversation_email_update_delivery"."sending_started_at" IS NOT NULL AND "conversation_email_update_delivery"."stopping_at" IS NULL AND "conversation_email_update_delivery"."completed_at" IS NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" = 'stopping' AND "conversation_email_update_delivery"."stopping_at" IS NOT NULL AND "conversation_email_update_delivery"."completed_at" IS NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" = 'stopped' AND "conversation_email_update_delivery"."stopping_at" IS NOT NULL AND "conversation_email_update_delivery"."completed_at" IS NOT NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" IN ('completed', 'completed_with_failures') AND "conversation_email_update_delivery"."materialized_at" IS NOT NULL AND "conversation_email_update_delivery"."completed_at" IS NOT NULL AND "conversation_email_update_delivery"."stopping_at" IS NULL AND "conversation_email_update_delivery"."failed_at" IS NULL) OR ("conversation_email_update_delivery"."status" = 'failed' AND "conversation_email_update_delivery"."failed_at" IS NOT NULL AND "conversation_email_update_delivery"."completed_at" IS NULL)))
);

CREATE TABLE "conversation_email_update_scope_safety_block" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_scope_safety_block_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"target_kind" "conversation_email_update_safety_target_kind" NOT NULL,
	"organization_id" integer,
	"project_id" integer,
	"conversation_id" integer,
	"facilitator_user_id" uuid,
	"reason" "conversation_email_update_safety_reason" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"lifted_at" timestamp (0),
	"lifted_by_user_id" uuid,
	CONSTRAINT "conversation_email_update_safety_target_check" CHECK ((("conversation_email_update_scope_safety_block"."target_kind" = 'organization' AND "conversation_email_update_scope_safety_block"."organization_id" IS NOT NULL AND num_nonnulls("conversation_email_update_scope_safety_block"."project_id", "conversation_email_update_scope_safety_block"."conversation_id", "conversation_email_update_scope_safety_block"."facilitator_user_id") = 0) OR ("conversation_email_update_scope_safety_block"."target_kind" = 'project' AND "conversation_email_update_scope_safety_block"."project_id" IS NOT NULL AND num_nonnulls("conversation_email_update_scope_safety_block"."organization_id", "conversation_email_update_scope_safety_block"."conversation_id", "conversation_email_update_scope_safety_block"."facilitator_user_id") = 0) OR ("conversation_email_update_scope_safety_block"."target_kind" = 'conversation' AND "conversation_email_update_scope_safety_block"."conversation_id" IS NOT NULL AND num_nonnulls("conversation_email_update_scope_safety_block"."organization_id", "conversation_email_update_scope_safety_block"."project_id", "conversation_email_update_scope_safety_block"."facilitator_user_id") = 0) OR ("conversation_email_update_scope_safety_block"."target_kind" = 'facilitator' AND "conversation_email_update_scope_safety_block"."facilitator_user_id" IS NOT NULL AND num_nonnulls("conversation_email_update_scope_safety_block"."organization_id", "conversation_email_update_scope_safety_block"."project_id", "conversation_email_update_scope_safety_block"."conversation_id") = 0))),
	CONSTRAINT "conversation_email_update_safety_lift_audit_check" CHECK (("conversation_email_update_scope_safety_block"."lifted_at" IS NULL) = ("conversation_email_update_scope_safety_block"."lifted_by_user_id" IS NULL))
);

CREATE TABLE "conversation_email_update" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"scope_kind" "conversation_email_update_scope_kind" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"authorizing_organization_id" integer NOT NULL,
	"authorizing_premium_feature_id" integer NOT NULL,
	"project_title_snapshot" varchar(150) NOT NULL,
	"reply_to_name_snapshot" varchar(150) NOT NULL,
	"reply_to_email_snapshot" varchar(254) NOT NULL,
	"subject" varchar(140) NOT NULL,
	"body_html" text NOT NULL,
	"body_plain_text" text NOT NULL,
	"cancelled_at" timestamp (0),
	"review_expires_at" timestamp (0),
	"template_version" varchar(100),
	"participant_preference_scope_snapshot" "conversation_email_update_participant_preference_scope",
	"branding_snapshot" jsonb,
	"review_test_email_credential_id" integer,
	"review_test_email_snapshot" varchar(254),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "conversation_email_update_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_email_update_review_fields_check" CHECK (num_nonnulls("conversation_email_update"."review_expires_at", "conversation_email_update"."template_version", "conversation_email_update"."participant_preference_scope_snapshot", "conversation_email_update"."branding_snapshot", "conversation_email_update"."review_test_email_credential_id", "conversation_email_update"."review_test_email_snapshot") IN (0, 6) AND ("conversation_email_update"."cancelled_at" IS NULL OR "conversation_email_update"."review_expires_at" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_review_expiry_check" CHECK ("conversation_email_update"."review_expires_at" IS NULL OR ("conversation_email_update"."review_expires_at" = "conversation_email_update"."created_at" + interval '24 hours' AND length(btrim("conversation_email_update"."template_version")) > 0)),
	CONSTRAINT "conversation_email_update_review_scope_check" CHECK ("conversation_email_update"."scope_kind" <> 'no_project' OR "conversation_email_update"."participant_preference_scope_snapshot" IS NULL OR "conversation_email_update"."participant_preference_scope_snapshot" = 'conversation'),
	CONSTRAINT "conversation_email_update_branding_check" CHECK ("conversation_email_update"."branding_snapshot" IS NULL OR (jsonb_typeof("conversation_email_update"."branding_snapshot") = 'object' AND "conversation_email_update"."branding_snapshot" ?& array['name', 'palette'] AND jsonb_typeof("conversation_email_update"."branding_snapshot"->'name') = 'string' AND length(btrim("conversation_email_update"."branding_snapshot"->>'name')) BETWEEN 1 AND 500 AND jsonb_typeof("conversation_email_update"."branding_snapshot"->'palette') = 'string' AND "conversation_email_update"."branding_snapshot"->>'palette' IN ('blue', 'purple', 'green') AND (NOT "conversation_email_update"."branding_snapshot" ? 'imageUrl' OR jsonb_typeof("conversation_email_update"."branding_snapshot"->'imageUrl') = 'string') AND (NOT "conversation_email_update"."branding_snapshot" ? 'bannerImageUrl' OR jsonb_typeof("conversation_email_update"."branding_snapshot"->'bannerImageUrl') = 'string'))),
	CONSTRAINT "conversation_email_update_subject_check" CHECK (length(btrim("conversation_email_update"."subject")) > 0),
	CONSTRAINT "conversation_email_update_body_html_check" CHECK (octet_length("conversation_email_update"."body_html") > 0 AND octet_length("conversation_email_update"."body_html") <= 16384),
	CONSTRAINT "conversation_email_update_body_plain_text_check" CHECK (length(btrim("conversation_email_update"."body_plain_text")) > 0 AND length("conversation_email_update"."body_plain_text") <= 10000),
	CONSTRAINT "conversation_email_update_reply_to_email_canonical_check" CHECK ("conversation_email_update"."reply_to_email_snapshot" = lower(btrim("conversation_email_update"."reply_to_email_snapshot"))),
	CONSTRAINT "conversation_email_update_review_test_email_canonical_check" CHECK ("conversation_email_update"."review_test_email_snapshot" IS NULL OR (length(btrim("conversation_email_update"."review_test_email_snapshot")) > 0 AND "conversation_email_update"."review_test_email_snapshot" = lower(btrim("conversation_email_update"."review_test_email_snapshot"))))
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
	CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK ((("organization_membership_all_project_capability"."deleted_at" IS NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NULL) OR ("organization_membership_all_project_capability"."deleted_at" IS NOT NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NOT NULL)))
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
	"first_name" varchar(65) NOT NULL,
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
	CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("project_contact"."organization_id", "project_contact"."external_organization_id") <= 1),
	CONSTRAINT "project_contact_email_or_website_check" CHECK (num_nonnulls("project_contact"."email", "project_contact"."website_url") >= 1)
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

CREATE TABLE "realtime_event_outbox" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "realtime_event_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivery_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "realtime_event_outbox_delivery_id_unique" UNIQUE("delivery_id")
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "survey_config_id_conversation_unique" UNIQUE("id","conversation_id")
);

CREATE TABLE "survey_question_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"survey_question_id" integer NOT NULL,
	"question_text" varchar(500) NOT NULL,
	"constraints" jsonb NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "survey_question_content_source_metadata_check" CHECK ((("survey_question_content"."source_language_provider" IS NULL AND "survey_question_content"."source_raw_language_code" IS NULL) OR ("survey_question_content"."source_language_provider" IS NOT NULL AND "survey_question_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "survey_question_option_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"survey_question_option_id" integer NOT NULL,
	"option_text" varchar(200) NOT NULL,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "survey_question_option_content_source_metadata_check" CHECK ((("survey_question_option_content"."source_language_provider" IS NULL AND "survey_question_option_content"."source_raw_language_code" IS NULL) OR ("survey_question_option_content"."source_language_provider" IS NOT NULL AND "survey_question_option_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "survey_question_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"survey_question_id" integer NOT NULL,
	"current_content_id" integer,
	"display_order" smallint NOT NULL,
	"allows_text" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "survey_question_option_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "survey_question_option_id_question_unique" UNIQUE("id","survey_question_id")
);

CREATE TABLE "survey_question" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"survey_config_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"question_type" "survey_question_type" NOT NULL,
	"choice_display" "survey_choice_display" DEFAULT 'auto' NOT NULL,
	"current_content_id" integer,
	"current_semantic_version" integer DEFAULT 1 NOT NULL,
	"display_order" smallint NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_public_aggregate_suppression_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "survey_question_current_content_id_unique" UNIQUE("current_content_id"),
	CONSTRAINT "survey_question_id_conversation_unique" UNIQUE("id","conversation_id")
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

CREATE INDEX "conversation_email_update_scope_conversation_idx" ON "conversation_email_update_conversation" USING btree ("conversation_id","update_id");

CREATE UNIQUE INDEX "conversation_email_update_delivery_project_active_unique" ON "conversation_email_update_delivery" USING btree ("project_id") WHERE "conversation_email_update_delivery"."status" IN ('preparing', 'queued', 'sending', 'stopping');

CREATE INDEX "conversation_email_update_delivery_materialization_idx" ON "conversation_email_update_delivery" USING btree ("status","updated_at","id");

CREATE INDEX "conversation_email_update_delivery_dispatch_idx" ON "conversation_email_update_delivery" USING btree ("status","dispatch_turn_at","id");

CREATE INDEX "conversation_email_update_delivery_project_history_idx" ON "conversation_email_update_delivery" USING btree ("project_id","accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE INDEX "conversation_email_update_delivery_history_idx" ON "conversation_email_update_delivery" USING btree ("accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE UNIQUE INDEX "conversation_email_update_safety_organization_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("organization_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'organization' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_project_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("project_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'project' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_conversation_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("conversation_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'conversation' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;

CREATE UNIQUE INDEX "conversation_email_update_safety_facilitator_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("facilitator_user_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'facilitator' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;

CREATE INDEX "conversation_email_update_creator_created_idx" ON "conversation_email_update" USING btree ("created_by_user_id","created_at");

CREATE UNIQUE INDEX "conversation_moderation_active_conversation_unique" ON "conversation_moderation" USING btree ("conversation_id") WHERE "conversation_moderation"."deleted_at" is null;

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" USING btree ("conversation_id","language_code") WHERE "conversation_translation_target_language"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" USING btree ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" USING btree ("project_id") WHERE "project_contact"."deleted_at" is null;

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" USING btree ("project_id","language_code") WHERE "project_translation_target_language"."deleted_at" is null;

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'conversation_comment_stats_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" USING btree ("topic","event_id");

CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" USING btree ("conversation_id") WHERE "survey_config"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" USING btree ("survey_question_id","display_order") WHERE "survey_question_option"."current_content_id" IS NOT NULL;

CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" USING btree ("survey_config_id","display_order") WHERE "survey_question"."current_content_id" IS NOT NULL;

CREATE INDEX "survey_question_config_idx" ON "survey_question" USING btree ("survey_config_id");
