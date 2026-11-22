-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "analysis_compression_enum" AS ENUM('zstd');

CREATE TYPE "analysis_family_enum" AS ENUM('opinion_groups');

CREATE TYPE "analysis_input_mode" AS ENUM('closing', 'live');

CREATE TYPE "analysis_insufficient_data_reason_enum" AS ENUM('empty_vote_matrix', 'not_enough_clusterable_participants', 'not_enough_unique_points', 'not_enough_samples_for_group_count', 'other');

CREATE TYPE "analysis_result_outcome_enum" AS ENUM('success', 'insufficient_data');

CREATE TYPE "analysis_work_error_kind_enum" AS ENUM('red_dwarf_exception', 'red_dwarf_contract_violation', 'database_error', 'valkey_error', 'transaction_error', 'unknown_error');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "conversation_view_snapshot_checkpoint_reason_enum" AS ENUM('first_displayable_analysis', 'first_group_count_available', 'default_group_count_changed', 'major_participation_milestone', 'major_vote_milestone', 'conversation_closed');

CREATE TYPE "conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "opinion_group_candidate_hidden_reason_enum" AS ENUM('singleton_group', 'duplicate_representative_opinions', 'missing_representative_opinions', 'invalid_candidate_output');

CREATE TYPE "opinion_group_clusterer_enum" AS ENUM('kmeans');

CREATE TYPE "opinion_group_reducer_enum" AS ENUM('pca');

CREATE TYPE "opinion_group_selection_policy_enum" AS ENUM('silhouette_size_balance');

CREATE TYPE "opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TABLE "analysis_input_baseline" (
	"input_snapshot_id" integer PRIMARY KEY,
	"baseline_input_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"participant_indices" integer[] NOT NULL,
	"opinion_indices" integer[] NOT NULL,
	"source_vote_count" integer NOT NULL,
	"source_participant_count" integer NOT NULL,
	CONSTRAINT "analysis_input_baseline_source_counts_check" CHECK ((("source_vote_count" >= 0) and ("source_participant_count" >= 0) and ("source_participant_count" <= "source_vote_count")))
);

CREATE TABLE "analysis_input_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_input_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"data_generation" integer NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"opinion_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"compression" "analysis_compression_enum" NOT NULL,
	"payload" bytea NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_input_snapshot_hash_unique" UNIQUE("conversation_id","data_generation","input_hash"),
	CONSTRAINT "analysis_input_snapshot_scope_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "analysis_input_snapshot_version_check" CHECK ("payload_version" in (1, 2)),
	CONSTRAINT "analysis_input_snapshot_counts_check" CHECK ("opinion_count" >= 0 AND "participant_count" >= 0 AND "vote_count" >= 0)
);

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

CREATE TABLE "analysis_snapshot_result" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshot_result_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"analysis_snapshot_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"outcome" "analysis_result_outcome_enum" NOT NULL,
	"outcome_reason" "analysis_insufficient_data_reason_enum",
	"variants_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_snapshot_result_spec_unique" UNIQUE("analysis_snapshot_id","opinion_group_spec_id"),
	CONSTRAINT "analysis_snapshot_result_reason_check" CHECK (("outcome" = 'insufficient_data' AND "outcome_reason" IS NOT NULL) OR ("outcome" = 'success' AND "outcome_reason" IS NULL))
);

CREATE TABLE "analysis_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"conversation_content_id" integer,
	"input_snapshot_id" integer NOT NULL,
	"data_generation" integer NOT NULL,
	"computed_at" timestamp(0) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "analysis_spec" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_spec_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysis_family" "analysis_family_enum" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "analysis_work_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_work_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"uses_closing_inputs" boolean DEFAULT false NOT NULL,
	"last_completed_data_generation" integer DEFAULT 0 NOT NULL,
	"running_data_generation" integer,
	"persisted_analysis_snapshot_id" integer,
	"dirty_since" timestamp(0),
	"attempt_generation" integer,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"non_retryable_generation" integer,
	"non_retryable_analysis_engine_epoch" integer,
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp(0),
	"last_error_kind" "analysis_work_error_kind_enum",
	"last_error_code" varchar(100),
	"last_error_message" text,
	"last_error_stack_hash" varchar(64),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_work_state_input_spec_unique" UNIQUE("conversation_id","opinion_group_spec_id","uses_closing_inputs"),
	CONSTRAINT "analysis_work_state_running_lease_check" CHECK (((((("running_data_generation" is null)) and (("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("running_data_generation" is not null)) and (("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))))
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

CREATE TABLE "conversation_view_snapshot_checkpoint_reason" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_view_snapshot_checkpoint_reason_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_view_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"reason" "conversation_view_snapshot_checkpoint_reason_enum" NOT NULL,
	"group_count" integer,
	"previous_group_count" integer,
	"participant_count" integer,
	"participant_milestone" integer,
	"vote_count" integer,
	"vote_milestone" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_group_count_check" CHECK ((("reason" IN ('first_group_count_available', 'default_group_count_changed') AND "group_count" IS NOT NULL AND "group_count" >= 2 AND ("previous_group_count" IS NULL OR "previous_group_count" >= 2)) OR ("reason" NOT IN ('first_group_count_available', 'default_group_count_changed') AND "group_count" IS NULL AND "previous_group_count" IS NULL))),
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_milestone_check" CHECK ((("reason" = 'major_participation_milestone' AND "previous_group_count" IS NULL AND "participant_count" IS NOT NULL AND "participant_milestone" IS NOT NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL AND "participant_count" >= "participant_milestone" AND "participant_milestone" > 0) OR ("reason" = 'major_vote_milestone' AND "previous_group_count" IS NULL AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NOT NULL AND "vote_milestone" IS NOT NULL AND "vote_count" >= "vote_milestone" AND "vote_milestone" > 0) OR ("reason" NOT IN ('major_participation_milestone', 'major_vote_milestone') AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL))),
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_previous_check" CHECK ((("reason" = 'default_group_count_changed' AND "previous_group_count" IS NOT NULL AND "previous_group_count" <> "group_count" AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL) OR ("reason" <> 'default_group_count_changed' AND "previous_group_count" IS NULL)))
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

CREATE TABLE "opinion_group_candidate_assessment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_assessment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL UNIQUE,
	"silhouette_score" real,
	"coefficient_of_variation" real,
	"balance_score" real,
	"selection_score" real,
	"hidden_reason" "opinion_group_candidate_hidden_reason_enum",
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "opinion_group_candidate_description_locale_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_description_locale_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"locale" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_description_locale_request_unique" UNIQUE("candidate_id","locale")
);

CREATE TABLE "opinion_group_candidate" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"snapshot_result_id" integer NOT NULL,
	"opinion_group_variant_id" integer NOT NULL,
	"scope_id" integer NOT NULL,
	"outcome" "analysis_result_outcome_enum" NOT NULL,
	"outcome_reason" "analysis_insufficient_data_reason_enum",
	"raw_output" jsonb,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_variant_unique" UNIQUE("snapshot_result_id","opinion_group_variant_id"),
	CONSTRAINT "opinion_group_candidate_reason_check" CHECK (("outcome" = 'insufficient_data' AND "outcome_reason" IS NOT NULL) OR ("outcome" = 'success' AND "outcome_reason" IS NULL))
);

CREATE TABLE "opinion_group_description" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"locale" "display_language_code" NOT NULL,
	"label" varchar(100) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "opinion_group_description_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"description_id" integer NOT NULL,
	"locale" "display_language_code" NOT NULL,
	"label" varchar(100) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_description_translation_unique" UNIQUE("description_id","locale")
);

CREATE TABLE "opinion_group_lineage_description_work" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_description_work_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lineage_id" integer NOT NULL CONSTRAINT "opinion_group_lineage_description_work_unique" UNIQUE,
	"conversation_id" integer NOT NULL,
	"source_candidate_id" integer NOT NULL,
	"sources_blocked" boolean DEFAULT false NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp(0),
	"last_error_at" timestamp(0),
	"non_retryable_ai_description_epoch" integer,
	"last_error_code" varchar(100),
	"last_error_message" text,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_lineage_description_work_running_lease_check" CHECK (((((("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))))
);

CREATE TABLE "opinion_group_lineage_scope" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_scope_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_variant_id" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_lineage_scope_unique" UNIQUE("conversation_id","opinion_group_variant_id")
);

CREATE TABLE "opinion_group_lineage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scope_id" integer NOT NULL,
	"system_description_id" integer,
	"admin_description_id" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "opinion_group_spec" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_spec_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysis_spec_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"version" integer NOT NULL,
	"reducer" "opinion_group_reducer_enum" NOT NULL,
	"clusterer" "opinion_group_clusterer_enum" NOT NULL,
	"selection_policy" "opinion_group_selection_policy_enum" NOT NULL,
	"min_clusterable_participants" integer NOT NULL,
	"min_votes_per_participant" integer NOT NULL,
	"max_group_count" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_spec_key_version_unique" UNIQUE("key","version")
);

CREATE TABLE "opinion_group" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"scope_id" integer NOT NULL,
	"lineage_id" integer,
	"key" varchar(20) NOT NULL,
	"external_id" integer NOT NULL,
	"num_users" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_key_unique" UNIQUE("candidate_id","key"),
	CONSTRAINT "opinion_group_candidate_lineage_unique" UNIQUE("candidate_id","lineage_id")
);

CREATE TABLE "opinion_group_variant" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_variant_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_group_spec_id" integer NOT NULL,
	"group_count" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_variant_spec_count_unique" UNIQUE("opinion_group_spec_id","group_count"),
	CONSTRAINT "opinion_group_variant_group_count_check" CHECK ("group_count" >= 2)
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

CREATE TABLE "polis_analysis_close_generation" (
	"conversation_id" integer,
	"data_generation" integer,
	"close_id" integer NOT NULL,
	"input_snapshot_id" integer,
	"published_at" timestamp,
	CONSTRAINT "polis_analysis_close_generation_pkey" PRIMARY KEY("conversation_id","data_generation"),
	CONSTRAINT "polis_analysis_close_generation_published_capture" CHECK (((("published_at" is null)) or (("input_snapshot_id" is not null)))),
	CONSTRAINT "polis_analysis_close_generation_positive" CHECK ("data_generation" >= 1)
);

CREATE TABLE "polis_analysis_close" (
	"close_id" integer,
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer,
	"original_view_snapshot_id" integer NOT NULL,
	CONSTRAINT "polis_analysis_close_pkey" PRIMARY KEY("close_id","opinion_group_spec_id")
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

CREATE INDEX "analysis_input_baseline_source_idx" ON "analysis_input_baseline" ("baseline_input_snapshot_id");

CREATE INDEX "analysis_input_snapshot_conversation_idx" ON "analysis_input_snapshot" ("conversation_id","data_generation");

CREATE INDEX "analysis_snapshot_latest_idx" ON "analysis_snapshot" ("conversation_id","data_generation","created_at");

CREATE INDEX "analysis_work_state_lease_expiry_idx" ON "analysis_work_state" ("lease_expires_at") WHERE ("running_data_generation" is not null);

CREATE UNIQUE INDEX "analysis_work_state_running_conversation_unique" ON "analysis_work_state" ("conversation_id") WHERE ("running_data_generation" is not null);

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "conversation_view_snapshot_checkpoint_reason_snapshot_idx" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_view_snapshot_id");

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_first_displayable_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id") WHERE "reason" = 'first_displayable_analysis';

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_group_count_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","group_count") WHERE "reason" = 'first_group_count_available';

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_default_change_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_view_snapshot_id") WHERE "reason" = 'default_group_count_changed';

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_participant_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","participant_milestone") WHERE "reason" = 'major_participation_milestone';

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_vote_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","vote_milestone") WHERE "reason" = 'major_vote_milestone';

CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_closed_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_view_snapshot_id") WHERE "reason" = 'conversation_closed';

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" ("analysis_snapshot_id") WHERE ("analysis_snapshot_id" is not null);

CREATE INDEX "opinion_group_candidate_description_locale_request_updated_idx" ON "opinion_group_candidate_description_locale_request" ("updated_at","id");

CREATE INDEX "og_candidate_desc_locale_request_translation_updated_idx" ON "opinion_group_candidate_description_locale_request" ("updated_at","id") WHERE "locale" <> 'en';

CREATE INDEX "opinion_group_lineage_description_work_lease_expiry_idx" ON "opinion_group_lineage_description_work" ("lease_expires_at") WHERE ("lease_token" is not null);

CREATE INDEX "opinion_group_lineage_description_work_claim_idx" ON "opinion_group_lineage_description_work" ("conversation_id","updated_at","id") WHERE ("lease_token" is null);

CREATE INDEX "opinion_group_scope_latest_lineage_idx" ON "opinion_group" ("scope_id","candidate_id" DESC NULLS LAST) WHERE ("lineage_id" is not null);

CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" ("opinion_id") WHERE ("deleted_at" is null);

CREATE INDEX "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "opinion_authorId_idx" ON "opinion" ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" ("author_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "polis_analysis_close_generation_close_idx" ON "polis_analysis_close_generation" ("close_id");

CREATE INDEX "polis_analysis_close_generation_published_idx" ON "polis_analysis_close_generation" ("close_id","data_generation" DESC NULLS LAST) WHERE ("published_at" is not null);

CREATE INDEX "polis_analysis_close_original_view_idx" ON "polis_analysis_close" ("original_view_snapshot_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);
