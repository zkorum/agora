-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item', 'gathering_field', 'gathering_response');

CREATE TYPE "content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TABLE "analysis_snapshot_opinion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshot_opinion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysis_snapshot_id" integer NOT NULL,
	"opinion_id" integer NOT NULL,
	"opinion_content_id" integer,
	"local_opinion_index" integer NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"routing_priority" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_snapshot_opinion_unique" UNIQUE("analysis_snapshot_id","opinion_id"),
	CONSTRAINT "analysis_snapshot_opinion_local_idx_unique" UNIQUE("analysis_snapshot_id","local_opinion_index")
);

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

CREATE TABLE "opinion_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_content_id" integer NOT NULL,
	"display_language_code" "display_language_code" NOT NULL,
	"translated_content" text NOT NULL,
	"translated_content_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_translation_unique" UNIQUE("opinion_content_id","display_language_code"),
	CONSTRAINT "opinion_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)))
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

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" ("analysis_snapshot_id") WHERE ("analysis_snapshot_id" is not null);

CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" ("opinion_id") WHERE ("deleted_at" is null);

CREATE INDEX "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "opinion_authorId_idx" ON "opinion" ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" ("author_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);
