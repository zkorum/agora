-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."external_source_type" AS ENUM('github_issue');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam');

CREATE TYPE "public"."opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "public"."ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');

CREATE TYPE "public"."ranking_mode" AS ENUM('bws');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "public"."survey_choice_display" AS ENUM('auto', 'list', 'dropdown');

CREATE TYPE "public"."survey_question_type" AS ENUM('choice', 'free_text');

CREATE TYPE "public"."vote_enum_all" AS ENUM('agree', 'disagree', 'pass');

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
	CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL)),
	CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL))),
	CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_at" IS NULL) = ("conversation"."conversation_email_update_override_updated_by_user_id" IS NULL))
);

CREATE TABLE "maxdiff_comparison" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_comparison_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"maxdiff_result_id" integer NOT NULL,
	"position" integer NOT NULL,
	"best_slug_id" varchar(8) NOT NULL,
	"worst_slug_id" varchar(8) NOT NULL,
	"candidate_set" text[] NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "maxdiff_result" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_result_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "maxdiff_result_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id")
);

CREATE TABLE "opinion_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "opinion_content_edit_attribution_check" CHECK ("opinion_content"."is_edited" = ("opinion_content"."edited_by_user_id" IS NOT NULL)),
	CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("opinion_content"."content") <= 16384),
	CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("opinion_content"."source_language_provider" IS NULL AND "opinion_content"."source_raw_language_code" IS NULL) OR ("opinion_content"."source_language_provider" IS NOT NULL AND "opinion_content"."source_raw_language_code" IS NOT NULL)))
);

CREATE TABLE "opinion_moderation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_id" integer NOT NULL,
	"author_id" uuid,
	"moderation_action" "opinion_moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(1000),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_slug_id_unique" UNIQUE("slug_id")
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

CREATE TABLE "ranking_item_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"ranking_item_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_content_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "ranking_item_content_id_item_unique" UNIQUE("id","ranking_item_id"),
	CONSTRAINT "ranking_item_content_source_metadata_check" CHECK ((("ranking_item_content"."source_language_provider" IS NULL AND "ranking_item_content"."source_raw_language_code" IS NULL) OR ("ranking_item_content"."source_language_provider" IS NOT NULL AND "ranking_item_content"."source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "ranking_item_content_body_plain_text_pair_check" CHECK ((("ranking_item_content"."body" IS NULL AND "ranking_item_content"."body_plain_text" IS NULL) OR ("ranking_item_content"."body" IS NOT NULL AND "ranking_item_content"."body_plain_text" IS NOT NULL)))
);

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

CREATE TABLE "ranking_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"author_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active' NOT NULL,
	"snapshot_score" real,
	"snapshot_ranking_score_id" integer,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id")
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

CREATE TABLE "survey_answer_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_answer_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_answer_id" integer NOT NULL,
	"survey_question_id" integer NOT NULL,
	"survey_question_option_id" integer NOT NULL,
	"text_value_html" text,
	"text_value_plain_text" text,
	"deleted_at" timestamp (0),
	CONSTRAINT "survey_answer_option_text_byte_length_check" CHECK (octet_length("survey_answer_option"."text_value_plain_text") <= 16384),
	CONSTRAINT "survey_answer_option_html_byte_length_check" CHECK (octet_length("survey_answer_option"."text_value_html") <= 81927),
	CONSTRAINT "survey_answer_option_text_pair_check" CHECK (("survey_answer_option"."text_value_html" IS NULL) = ("survey_answer_option"."text_value_plain_text" IS NULL))
);

CREATE TABLE "survey_answer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_answer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_response_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"survey_question_id" integer NOT NULL,
	"answered_question_semantic_version" integer NOT NULL,
	"text_value_html" text,
	"text_value_plain_text" text,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_answer_id_question_unique" UNIQUE("id","survey_question_id")
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

CREATE TABLE "survey_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"completed_at" timestamp (0),
	"withdrawn_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_response_conversation_participant_unique" UNIQUE("conversation_id","participant_id"),
	CONSTRAINT "survey_response_id_conversation_unique" UNIQUE("id","conversation_id")
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

CREATE TABLE "vote_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vote_id" integer NOT NULL,
	"opinion_content_id" integer NOT NULL,
	"vote" "vote_enum_all" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "vote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_id" uuid NOT NULL,
	"participant_id" uuid,
	"opinion_id" integer NOT NULL,
	"polis_vote_id" integer,
	"buffer_epoch" uuid,
	"buffer_sequence" bigint DEFAULT 0 NOT NULL,
	"current_content_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id")
);

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE INDEX "maxdiff_comparison_result_idx" ON "maxdiff_comparison" USING btree ("maxdiff_result_id");

CREATE UNIQUE INDEX "maxdiff_comparison_active_result_position_unique" ON "maxdiff_comparison" USING btree ("maxdiff_result_id","position") WHERE "maxdiff_comparison"."deleted_at" IS NULL;

CREATE INDEX "maxdiff_result_complete_idx" ON "maxdiff_result" USING btree ("conversation_id","is_complete");

CREATE INDEX "maxdiff_result_conversation_idx" ON "maxdiff_result" USING btree ("conversation_id");

CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" USING btree ("opinion_id") WHERE "opinion_moderation"."deleted_at" is null;

CREATE INDEX "opinion_authorId_idx" ON "opinion" USING btree ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" USING btree ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "ranking_external_source_dedup_idx" ON "ranking_item_external_source" USING btree ("external_id","conversation_id");

CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" USING btree ("conversation_id","current_content_id");

CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" USING btree ("conversation_id","lifecycle_status");

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'conversation_comment_stats_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" USING btree ("topic","event_id");

CREATE UNIQUE INDEX "survey_answer_option_answer_option_active_uidx" ON "survey_answer_option" USING btree ("survey_answer_id","survey_question_option_id") WHERE "survey_answer_option"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_answer_response_question_active_uidx" ON "survey_answer" USING btree ("survey_response_id","survey_question_id") WHERE "survey_answer"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" USING btree ("conversation_id") WHERE "survey_config"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" USING btree ("survey_question_id","display_order") WHERE "survey_question_option"."current_content_id" IS NOT NULL;

CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" USING btree ("survey_config_id","display_order") WHERE "survey_question"."current_content_id" IS NOT NULL;

CREATE INDEX "survey_question_config_idx" ON "survey_question" USING btree ("survey_config_id");

CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" USING btree ("conversation_id","created_at");

CREATE INDEX "vote_authorId_idx" ON "vote" USING btree ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC,"id" DESC) WHERE "vote"."current_content_id" is not null;

CREATE INDEX "vote_opinion_active_idx" ON "vote" USING btree ("opinion_id","current_content_id");
