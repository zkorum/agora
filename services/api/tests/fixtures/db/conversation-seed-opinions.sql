-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "public"."analysis_insufficient_data_reason_enum" AS ENUM('empty_vote_matrix', 'not_enough_clusterable_participants', 'not_enough_unique_points', 'not_enough_samples_for_group_count', 'other');

CREATE TYPE "public"."analysis_result_outcome_enum" AS ENUM('success', 'insufficient_data');

CREATE TYPE "public"."analysis_work_error_kind_enum" AS ENUM('red_dwarf_exception', 'red_dwarf_contract_violation', 'database_error', 'valkey_error', 'transaction_error', 'unknown_error');

CREATE TYPE "public"."content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item');

CREATE TYPE "public"."content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "public"."conversation_email_update_delivery_status" AS ENUM('preparing', 'queued', 'sending', 'stopping', 'stopped', 'completed', 'completed_with_failures', 'failed');

CREATE TYPE "public"."conversation_email_update_failure_reason" AS ENUM('materialization_failed', 'no_eligible_participants', 'required_owner_copy_not_accepted', 'no_participant_provider_accepted');

CREATE TYPE "public"."conversation_email_update_participant_preference_scope" AS ENUM('project', 'conversation');

CREATE TYPE "public"."conversation_email_update_scope_kind" AS ENUM('listed_project', 'no_project');

CREATE TYPE "public"."conversation_email_update_stop_reason" AS ENUM('global_kill_switch', 'legal_or_abuse_block');

CREATE TYPE "public"."conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "public"."conversation_moderation_action" AS ENUM('lock');

CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'prioritizing');

CREATE TYPE "public"."conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "public"."directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "public"."display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "public"."email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "public"."email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "public"."event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "public"."external_source_type" AS ENUM('github_issue');

CREATE TYPE "public"."language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "public"."moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "public"."opinion_group_clusterer_enum" AS ENUM('kmeans');

CREATE TYPE "public"."opinion_group_reducer_enum" AS ENUM('pca');

CREATE TYPE "public"."opinion_group_selection_policy_enum" AS ENUM('silhouette_size_balance');

CREATE TYPE "public"."opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "public"."organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "public"."participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "public"."phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

CREATE TYPE "public"."polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "public"."premium_feature" AS ENUM('survey', 'event_ticket', 'analysis_variants', 'dynamic_translation', 'conversation_email_update');

CREATE TYPE "public"."ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');

CREATE TYPE "public"."ranking_mode" AS ENUM('bws', 'pairwise');

CREATE TYPE "public"."sex" AS ENUM('F', 'M', 'X');

CREATE TYPE "public"."spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "public"."survey_choice_display" AS ENUM('auto', 'list', 'dropdown');

CREATE TYPE "public"."survey_question_type" AS ENUM('choice', 'free_text');

CREATE TYPE "public"."vote_enum_all" AS ENUM('agree', 'disagree', 'pass');

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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_snapshot_result_spec_unique" UNIQUE("analysis_snapshot_id","opinion_group_spec_id"),
	CONSTRAINT "analysis_snapshot_result_reason_check" CHECK (("analysis_snapshot_result"."outcome" = 'insufficient_data' AND "analysis_snapshot_result"."outcome_reason" IS NOT NULL) OR ("analysis_snapshot_result"."outcome" = 'success' AND "analysis_snapshot_result"."outcome_reason" IS NULL))
);

CREATE TABLE "analysis_work_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_work_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"last_completed_data_generation" integer DEFAULT 0 NOT NULL,
	"running_data_generation" integer,
	"persisted_analysis_snapshot_id" integer,
	"dirty_since" timestamp (0),
	"attempt_generation" integer,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"non_retryable_generation" integer,
	"non_retryable_analysis_engine_epoch" integer,
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp (0),
	"last_error_kind" "analysis_work_error_kind_enum",
	"last_error_code" varchar(100),
	"last_error_message" text,
	"last_error_stack_hash" varchar(64),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_work_state_conversation_spec_unique" UNIQUE("conversation_id","opinion_group_spec_id"),
	CONSTRAINT "analysis_work_state_running_lease_check" CHECK ((("analysis_work_state"."running_data_generation" is null and "analysis_work_state"."lease_owner" is null and "analysis_work_state"."lease_token" is null and "analysis_work_state"."lease_expires_at" is null) or ("analysis_work_state"."running_data_generation" is not null and "analysis_work_state"."lease_owner" is not null and "analysis_work_state"."lease_token" is not null and "analysis_work_state"."lease_expires_at" is not null)))
);

CREATE TABLE "comparison_answer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_answer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comparison_response_id" integer NOT NULL,
	"position" integer NOT NULL,
	"best_slug_id" varchar(8) NOT NULL,
	"worst_slug_id" varchar(8) NOT NULL,
	"candidate_set" text[] NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "comparison_answer_position_check" CHECK ("comparison_answer"."position" >= 0),
	CONSTRAINT "comparison_answer_distinct_choices_check" CHECK ("comparison_answer"."best_slug_id" <> "comparison_answer"."worst_slug_id"),
	CONSTRAINT "comparison_answer_candidates_check" CHECK ((cardinality("comparison_answer"."candidate_set") BETWEEN 2 AND 4 and "comparison_answer"."candidate_set" @> ARRAY["comparison_answer"."best_slug_id"::text, "comparison_answer"."worst_slug_id"::text]))
);

CREATE TABLE "comparison_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"detached_at" timestamp (3),
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "comparison_response_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id"),
	CONSTRAINT "comparison_response_account_binding_check" CHECK ((("comparison_response"."participant_id" is not null and "comparison_response"."detached_at" is null) or ("comparison_response"."participant_id" is null and "comparison_response"."detached_at" is not null)))
);

CREATE TABLE "comparison_user_entity_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_user_entity_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comparison_response_id" integer NOT NULL,
	"entity_slug_id" varchar(8) NOT NULL,
	"score" real NOT NULL,
	"display_score" real,
	"uncertainty_left" real NOT NULL,
	"uncertainty_right" real NOT NULL,
	"deleted_at" timestamp (0),
	CONSTRAINT "comparison_user_entity_score_response_entity_unique" UNIQUE("comparison_response_id","entity_slug_id"),
	CONSTRAINT "comparison_user_entity_score_display_score_check" CHECK (("comparison_user_entity_score"."display_score" is null or ("comparison_user_entity_score"."display_score" >= 0 and "comparison_user_entity_score"."display_score" <= 1)))
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

CREATE TABLE "conversation_email_update_delivery" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_delivery_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"update_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"accepted_test_attempt_id" integer NOT NULL,
	"accepted_by_user_id" uuid,
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

CREATE TABLE "conversation_email_update" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
	CONSTRAINT "conversation_email_update_review_fields_check" CHECK (((("conversation_email_update"."review_expires_at" is null and "conversation_email_update"."template_version" is null and "conversation_email_update"."participant_preference_scope_snapshot" is null and "conversation_email_update"."branding_snapshot" is null) or ("conversation_email_update"."review_expires_at" is not null and "conversation_email_update"."template_version" is not null and "conversation_email_update"."participant_preference_scope_snapshot" is not null and "conversation_email_update"."branding_snapshot" is not null)) and ("conversation_email_update"."cancelled_at" is null or "conversation_email_update"."review_expires_at" is not null) and (("conversation_email_update"."review_expires_at" is null and "conversation_email_update"."review_test_email_credential_id" is null and "conversation_email_update"."review_test_email_snapshot" is null) or ("conversation_email_update"."review_expires_at" is not null and (("conversation_email_update"."created_by_user_id" is not null and "conversation_email_update"."review_test_email_credential_id" is not null and "conversation_email_update"."review_test_email_snapshot" is not null) or ("conversation_email_update"."created_by_user_id" is null and "conversation_email_update"."review_test_email_credential_id" is null and "conversation_email_update"."review_test_email_snapshot" is null)))))),
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
	"author_id" uuid,
	"moderation_action" "conversation_moderation_action" NOT NULL,
	"moderation_reason" "moderation_reason_enum" NOT NULL,
	"moderation_explanation" varchar(1000),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);

CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participant_id_account_unique" UNIQUE("id","user_id"),
	CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "conversation_participant_account_unique" UNIQUE("conversation_id","user_id")
);

CREATE TABLE "conversation_project_assignment" (
	"conversation_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"first_assigned_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_project_assignment_project_id_conversation_id_pk" PRIMARY KEY("project_id","conversation_id")
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

CREATE TABLE "device" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"session_started_at" timestamp (0) DEFAULT now() NOT NULL,
	"session_expiry" timestamp NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);

CREATE TABLE "email" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(254) NOT NULL,
	"type" "email_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email_reachability" "email_reachability",
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "email_canonical_check" CHECK ("email"."email" = lower(btrim("email"."email"))),
	CONSTRAINT "email_recovery_reservation_check" CHECK (("email"."reserved_for_recovery" = false or "email"."is_deleted" = true))
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
	CONSTRAINT "opinion_content_edit_attribution_check" CHECK (("opinion_content"."edited_by_user_id" is null or "opinion_content"."is_edited" = true)),
	CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("opinion_content"."content") <= 16384),
	CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("opinion_content"."source_language_provider" IS NULL AND "opinion_content"."source_raw_language_code" IS NULL) OR ("opinion_content"."source_language_provider" IS NOT NULL AND "opinion_content"."source_raw_language_code" IS NOT NULL)))
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_content_translation_unique" UNIQUE("opinion_content_id","display_language_code"),
	CONSTRAINT "opinion_content_translation_source_metadata_check" CHECK ((("opinion_content_translation"."source_language_provider" IS NULL AND "opinion_content_translation"."source_raw_language_code" IS NULL) OR ("opinion_content_translation"."source_language_provider" IS NOT NULL AND "opinion_content_translation"."source_raw_language_code" IS NOT NULL)))
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_spec_key_version_unique" UNIQUE("key","version")
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
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"account_hidden_at" timestamp (3),
	"is_seed" boolean DEFAULT false NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_reacted_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "opinion_source_owner_check" CHECK (("opinion"."author_id" is not null or "opinion"."is_seed" = true or "opinion"."deleted_at" is not null or "opinion"."account_hidden_at" is not null)),
	CONSTRAINT "opinion_deletion_intent_check" CHECK (("opinion"."deleted_at" is null or "opinion"."current_content_id" is null))
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

CREATE TABLE "phone" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "phone_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"last_two_digits" smallint NOT NULL,
	"countryCallingCode" varchar(10) NOT NULL,
	"phone_country_code" "phone_country_code",
	"phone_hash" text NOT NULL,
	"pepper_version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("phone"."last_two_digits" BETWEEN 0 and 99),
	CONSTRAINT "phone_recovery_reservation_check" CHECK (("phone"."reserved_for_recovery" = false or "phone"."is_deleted" = true))
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

CREATE TABLE "qv_calculation_state" (
	"conversation_id" integer PRIMARY KEY NOT NULL,
	"generation" integer DEFAULT 0 NOT NULL,
	"current_calculation_id" uuid,
	CONSTRAINT "qv_calculation_state_generation_check" CHECK ("qv_calculation_state"."generation" >= 0)
);

CREATE TABLE "qv_calculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"generation" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input_snapshot_id" uuid,
	"lease_token" uuid,
	"lease_expires_at" timestamp (3),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (3) DEFAULT now() NOT NULL,
	"error_code" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"ready_at" timestamp (3),
	CONSTRAINT "qv_calculation_generation_unique" UNIQUE("conversation_id","generation"),
	CONSTRAINT "qv_calculation_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_calculation_generation_check" CHECK ("qv_calculation"."generation" >= 1),
	CONSTRAINT "qv_calculation_attempt_check" CHECK ("qv_calculation"."attempt_count" >= 0),
	CONSTRAINT "qv_calculation_status_check" CHECK ("qv_calculation"."status" in ('queued', 'running', 'ready', 'failed')),
	CONSTRAINT "qv_calculation_lease_check" CHECK ((("qv_calculation"."status" = 'running' and "qv_calculation"."lease_token" is not null and "qv_calculation"."lease_expires_at" is not null) or ("qv_calculation"."status" <> 'running' and "qv_calculation"."lease_token" is null and "qv_calculation"."lease_expires_at" is null))),
	CONSTRAINT "qv_calculation_ready_check" CHECK ((("qv_calculation"."status" = 'ready' and "qv_calculation"."input_snapshot_id" is not null and "qv_calculation"."ready_at" is not null) or ("qv_calculation"."status" <> 'ready' and "qv_calculation"."ready_at" is null)))
);

CREATE TABLE "qv_live_stats" (
	"conversation_id" integer PRIMARY KEY NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"refreshed_at" timestamp (3),
	"retry_after" timestamp (3),
	CONSTRAINT "qv_live_stats_count_check" CHECK ("qv_live_stats"."participant_count" >= 0),
	CONSTRAINT "qv_live_stats_revision_check" CHECK ("qv_live_stats"."revision" >= 0)
);

CREATE TABLE "qv_stats_refresh" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qv_stats_refresh_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"processed_at" timestamp (3)
);

CREATE TABLE "ranking_conversation_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_mode" "ranking_mode" NOT NULL,
	"allow_participant_statements" boolean DEFAULT false NOT NULL,
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
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp (3),
	"account_hidden_at" timestamp (3),
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"snapshot_score" real,
	"snapshot_ranking_score_id" integer,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_item_source_owner_check" CHECK (("ranking_item"."author_id" is not null or "ranking_item"."is_seed" = true or "ranking_item"."deleted_at" is not null or "ranking_item"."account_hidden_at" is not null)),
	CONSTRAINT "ranking_item_deletion_intent_check" CHECK (("ranking_item"."deleted_at" is null or "ranking_item"."current_content_id" is null))
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

CREATE TABLE "retired_device_key" (
	"did_write" varchar(1000) PRIMARY KEY NOT NULL,
	"retired_at" timestamp (3) DEFAULT now() NOT NULL
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

CREATE TABLE "vote_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vote_id" integer NOT NULL,
	"opinion_content_id" integer NOT NULL,
	"vote" "vote_enum_all" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_content_id_owner_unique" UNIQUE("id","vote_id")
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
	"withdrawn_at" timestamp (3),
	"retired_at" timestamp (3),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id"),
	CONSTRAINT "vote_inactive_intent_check" CHECK ((("vote"."withdrawn_at" is null and "vote"."retired_at" is null) or "vote"."current_content_id" is null))
);

CREATE TABLE "zk_passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zk_passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "zk_passport_recovery_reservation_check" CHECK (("zk_passport"."reserved_for_recovery" = false or "zk_passport"."is_deleted" = true))
);

CREATE INDEX "analysis_work_state_lease_expiry_idx" ON "analysis_work_state" USING btree ("lease_expires_at") WHERE "analysis_work_state"."running_data_generation" is not null;

CREATE UNIQUE INDEX "analysis_work_state_running_conversation_unique" ON "analysis_work_state" USING btree ("conversation_id") WHERE "analysis_work_state"."running_data_generation" is not null;

CREATE INDEX "comparison_answer_response_idx" ON "comparison_answer" USING btree ("comparison_response_id");

CREATE UNIQUE INDEX "comparison_answer_active_response_position_unique" ON "comparison_answer" USING btree ("comparison_response_id","position") WHERE "comparison_answer"."deleted_at" is null;

CREATE INDEX "comparison_response_conversation_idx" ON "comparison_response" USING btree ("conversation_id");

CREATE INDEX "comparison_user_entity_score_response_score_idx" ON "comparison_user_entity_score" USING btree ("comparison_response_id","score" desc) WHERE "comparison_user_entity_score"."deleted_at" is null;

CREATE INDEX "comparison_user_entity_score_deleted_idx" ON "comparison_user_entity_score" USING btree ("deleted_at","id") WHERE "comparison_user_entity_score"."deleted_at" is not null;

CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" USING btree ("conversation_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'conversation' and "content_translation_work"."conversation_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" USING btree ("project_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'project' and "content_translation_work"."project_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" USING btree ("opinion_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'opinion' and "content_translation_work"."opinion_content_id" is not null);

CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" USING btree ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE ("content_translation_work"."source_kind" = 'survey_question' and "content_translation_work"."survey_question_content_id" is not null and "content_translation_work"."survey_question_option_content_ids" is not null);

CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" USING btree ("ranking_item_content_id","display_language_code") WHERE ("content_translation_work"."source_kind" = 'ranking_item' and "content_translation_work"."ranking_item_content_id" is not null);

CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" USING btree ("priority_rank","updated_at","id") WHERE "content_translation_work"."status" = 'pending';

CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" USING btree ("lease_expires_at","id") WHERE "content_translation_work"."status" = 'running';

CREATE UNIQUE INDEX "conversation_email_update_delivery_project_active_unique" ON "conversation_email_update_delivery" USING btree ("project_id") WHERE "conversation_email_update_delivery"."status" IN ('preparing', 'queued', 'sending', 'stopping');

CREATE INDEX "conversation_email_update_delivery_materialization_idx" ON "conversation_email_update_delivery" USING btree ("status","updated_at","id");

CREATE INDEX "conversation_email_update_delivery_dispatch_idx" ON "conversation_email_update_delivery" USING btree ("status","dispatch_turn_at","id");

CREATE INDEX "conversation_email_update_delivery_project_history_idx" ON "conversation_email_update_delivery" USING btree ("project_id","accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE INDEX "conversation_email_update_delivery_history_idx" ON "conversation_email_update_delivery" USING btree ("accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);

CREATE INDEX "conversation_email_update_creator_created_idx" ON "conversation_email_update" USING btree ("created_by_user_id","created_at");

CREATE UNIQUE INDEX "conversation_moderation_active_conversation_unique" ON "conversation_moderation" USING btree ("conversation_id") WHERE "conversation_moderation"."deleted_at" is null;

CREATE INDEX "conversation_participant_user_idx" ON "conversation_participant" USING btree ("user_id");

CREATE INDEX "conversation_deleted_idx" ON "conversation" USING btree ("deleted_at","id") WHERE "conversation"."deleted_at" is not null;

CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" USING btree ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" USING btree ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;

CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" USING btree ("conversation_id","language_code") WHERE "conversation_translation_target_language"."deleted_at" is null;

CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);

CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;

CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" USING btree ("analysis_snapshot_id") WHERE "conversation_view_snapshot"."analysis_snapshot_id" is not null;

CREATE INDEX "device_user_session_expiry_idx" ON "device" USING btree ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" USING btree ("email") WHERE ("email"."is_deleted" = false or "email"."reserved_for_recovery" = true);

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" USING btree ("user_id") WHERE "email"."type" = 'primary' AND "email"."is_deleted" = false;

CREATE INDEX "email_idx" ON "email" USING btree ("email");

CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" USING btree ("opinion_id") WHERE "opinion_moderation"."deleted_at" is null;

CREATE INDEX "opinion_deleted_idx" ON "opinion" USING btree ("deleted_at","id") WHERE "opinion"."deleted_at" is not null;

CREATE INDEX "opinion_authorId_idx" ON "opinion" USING btree ("author_id");

CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE INDEX "opinion_conversation_active_idx" ON "opinion" USING btree ("conversation_id","current_content_id");

CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;

CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" USING btree ("user_id","organization_id") WHERE "organization_membership"."deleted_at" is null;

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" USING btree ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" USING btree ("organization_id","user_id") WHERE ("organization_membership"."deleted_at" is null and "organization_membership"."role" = 'admin');

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" USING btree ("slug") WHERE "organization"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" USING btree ("phone_hash") WHERE ("phone"."is_deleted" = false or "phone"."reserved_for_recovery" = true);

CREATE INDEX "phone_hash_idx" ON "phone" USING btree ("phone_hash");

CREATE INDEX "phone_user_idx" ON "phone" USING btree ("user_id");

CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" USING btree ("organization_id","feature");

CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" USING btree ("project_id") WHERE "project_contact"."deleted_at" is null;

CREATE INDEX "project_contact_organization_idx" ON "project_contact" USING btree ("organization_id") WHERE "project_contact"."organization_id" is not null;

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" USING btree ("project_id","organization_id") WHERE "project_organization_ownership"."deleted_at" is null;

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" USING btree ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" USING btree ("slug") WHERE "project"."deleted_at" is null;

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" USING btree ("auto_provisioned_for_organization_id") WHERE "project"."deleted_at" is null;

CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" USING btree ("project_id","language_code") WHERE "project_translation_target_language"."deleted_at" is null;

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" USING btree ("next_attempt_at","created_at") WHERE "qv_calculation"."status" in ('queued', 'running');

CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" USING btree ("refreshed_at","conversation_id");

CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" USING btree ("conversation_id","id") WHERE "qv_stats_refresh"."processed_at" is null;

CREATE UNIQUE INDEX "ranking_external_source_dedup_idx" ON "ranking_item_external_source" USING btree ("external_id","conversation_id");

CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" USING btree ("conversation_id","current_content_id");

CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" USING btree ("conversation_id","lifecycle_status");

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" USING btree ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" USING btree ("topic","event_id");

CREATE UNIQUE INDEX "survey_answer_option_answer_option_active_uidx" ON "survey_answer_option" USING btree ("survey_answer_id","survey_question_option_id") WHERE "survey_answer_option"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_answer_response_question_active_uidx" ON "survey_answer" USING btree ("survey_response_id","survey_question_id") WHERE "survey_answer"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" USING btree ("conversation_id") WHERE "survey_config"."deleted_at" IS NULL;

CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" USING btree ("survey_question_id","display_order") WHERE "survey_question_option"."current_content_id" IS NOT NULL;

CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" USING btree ("survey_config_id","display_order") WHERE "survey_question"."current_content_id" IS NOT NULL;

CREATE INDEX "survey_question_config_idx" ON "survey_question" USING btree ("survey_config_id");

CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" USING btree ("conversation_id","created_at");

CREATE INDEX "survey_response_participant_idx" ON "survey_response" USING btree ("participant_id");

CREATE INDEX "vote_authorId_idx" ON "vote" USING btree ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC,"id" DESC) WHERE "vote"."current_content_id" is not null;

CREATE INDEX "vote_opinion_active_idx" ON "vote" USING btree ("opinion_id","current_content_id");

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" USING btree ("nullifier") WHERE ("zk_passport"."is_deleted" = false or "zk_passport"."reserved_for_recovery" = true);

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" USING btree ("nullifier");

CREATE INDEX "zk_passport_user_idx" ON "zk_passport" USING btree ("user_id");
