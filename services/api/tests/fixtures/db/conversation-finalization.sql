-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "analysis_compression_enum" AS ENUM('zstd');

CREATE TYPE "analysis_family_enum" AS ENUM('opinion_groups');

CREATE TYPE "analysis_input_mode" AS ENUM('closing', 'live');

CREATE TYPE "analysis_insufficient_data_reason_enum" AS ENUM('empty_vote_matrix', 'not_enough_clusterable_participants', 'not_enough_unique_points', 'not_enough_samples_for_group_count', 'other');

CREATE TYPE "analysis_result_outcome_enum" AS ENUM('success', 'insufficient_data');

CREATE TYPE "analysis_work_error_kind_enum" AS ENUM('red_dwarf_exception', 'red_dwarf_contract_violation', 'database_error', 'valkey_error', 'transaction_error', 'unknown_error');

CREATE TYPE "content_translation_source_kind" AS ENUM('conversation', 'opinion', 'survey_question', 'project', 'ranking_item', 'gathering_field', 'gathering_response');

CREATE TYPE "content_translation_work_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "conversation_view_snapshot_checkpoint_reason_enum" AS ENUM('first_displayable_analysis', 'first_group_count_available', 'default_group_count_changed', 'major_participation_milestone', 'major_vote_milestone', 'conversation_closed');

CREATE TYPE "conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');

CREATE TYPE "email_type" AS ENUM('primary', 'backup', 'secondary', 'other');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "language_detection_provider" AS ENUM('lingua', 'google_translate');

CREATE TYPE "moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "notification_type_enum" AS ENUM('opinion_vote', 'new_opinion', 'export_started', 'export_completed', 'export_failed', 'export_cancelled', 'import_started', 'import_completed', 'import_failed', 'security_add_email');

CREATE TYPE "opinion_group_candidate_hidden_reason_enum" AS ENUM('singleton_group', 'duplicate_representative_opinions', 'missing_representative_opinions', 'invalid_candidate_output');

CREATE TYPE "opinion_group_clusterer_enum" AS ENUM('kmeans');

CREATE TYPE "opinion_group_reducer_enum" AS ENUM('pca');

CREATE TYPE "opinion_group_selection_policy_enum" AS ENUM('silhouette_size_balance');

CREATE TYPE "opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "phone_country_code" AS ENUM('AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW');

CREATE TYPE "polis_voting_presentation" AS ENUM('list', 'one_at_a_time');

CREATE TYPE "ranking_item_lifecycle_status" AS ENUM('active', 'completed', 'in_progress', 'canceled');

CREATE TYPE "ranking_mode" AS ENUM('bws', 'pairwise');

CREATE TYPE "ranking_stats_checkpoint_reason_enum" AS ENUM('major_participation_milestone', 'major_vote_milestone', 'conversation_closed');

CREATE TYPE "sex" AS ENUM('F', 'M', 'X');

CREATE TYPE "spoken_language_code" AS ENUM('af', 'ak', 'am', 'ar', 'as', 'ay', 'az', 'be', 'bg', 'bho', 'bm', 'bn', 'bs', 'ca', 'ceb', 'ckb', 'co', 'cs', 'cy', 'da', 'de', 'doi', 'dv', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gom', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'ilo', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'kri', 'ku', 'ky', 'la', 'lb', 'lg', 'ln', 'lo', 'lt', 'lus', 'lv', 'mai', 'mg', 'mi', 'mk', 'ml', 'mn', 'mni-Mtei', 'mr', 'ms', 'mt', 'my', 'nb', 'ne', 'nl', 'nn', 'no', 'nso', 'ny', 'om', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sa', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'tr', 'ts', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh-Hans', 'zh-Hant', 'zu');

CREATE TYPE "ticket_provider" AS ENUM('zupass');

CREATE TYPE "vote_enum_all" AS ENUM('agree', 'disagree', 'pass');

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

CREATE TABLE "analysis_input_participant_eligibility" (
	"input_snapshot_id" integer,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "analysis_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "analysis_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "analysis_input_participant_eligibility_index_check" CHECK ("participant_index" >= 0),
	CONSTRAINT "analysis_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
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

CREATE TABLE "analysis_survey_choice_capture" (
	"survey_aggregate_snapshot_id" integer PRIMARY KEY,
	"baseline_input_snapshot_id" integer NOT NULL
);

CREATE TABLE "analysis_survey_choice" (
	"survey_aggregate_snapshot_id" integer,
	"participant_index" integer,
	"question_slug_id" varchar(8),
	"option_slug_ids" text[] NOT NULL,
	CONSTRAINT "analysis_survey_choice_pkey" PRIMARY KEY("survey_aggregate_snapshot_id","participant_index","question_slug_id"),
	CONSTRAINT "analysis_survey_choice_bounds" CHECK ((("participant_index" >= 0) and (cardinality("option_slug_ids") > 0)))
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

CREATE TABLE "comparison_input_baseline" (
	"input_snapshot_id" uuid PRIMARY KEY,
	"baseline_input_snapshot_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "comparison_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"detached_at" timestamp(3),
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "comparison_response_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id"),
	CONSTRAINT "comparison_response_account_binding_check" CHECK (((((("participant_id" is not null)) and (("detached_at" is null)))) or (((("participant_id" is null)) and (("detached_at" is not null))))))
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

CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participant_id_account_unique" UNIQUE("id","user_id"),
	CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "conversation_participant_account_unique" UNIQUE("conversation_id","user_id")
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

CREATE TABLE "device" (
	"did_write" varchar(1000) PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"user_agent" text NOT NULL,
	"session_started_at" timestamp(0) DEFAULT now() NOT NULL,
	"session_expiry" timestamp NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "email" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(254) NOT NULL,
	"type" "email_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email_reachability" "email_reachability",
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "email_canonical_check" CHECK ("email" = lower(btrim("email"))),
	CONSTRAINT "email_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
);

CREATE TABLE "event_ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"provider" "ticket_provider" NOT NULL,
	"nullifier" text NOT NULL,
	"event_slug" "event_slug" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp(0) DEFAULT now() NOT NULL,
	"pcd_type" text,
	"provider_metadata" jsonb,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "followed_topic" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "followed_topic_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "gathering_response_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"response_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_content_response_id_unique" UNIQUE("response_id","id"),
	CONSTRAINT "gathering_content_config_id_unique" UNIQUE("config_id","id")
);

CREATE TABLE "gathering_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gathering_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"conversation_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"author_id" uuid,
	"is_seed" boolean DEFAULT false NOT NULL,
	"current_content_id" integer,
	"baseline_content_id" integer,
	"source_conversation_id" integer,
	"source_response_content_id" integer,
	"source_conversation_slug_id" varchar(8),
	"source_conversation_type" text,
	"moderation" text,
	"account_hidden_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_response_config_id_unique" UNIQUE("config_id","id"),
	CONSTRAINT "gathering_response_seed_author_check" CHECK ((("is_seed" = false) or (("author_id" is null)))),
	CONSTRAINT "gathering_response_author_check" CHECK ((("is_seed" = true) or (("author_id" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "gathering_response_deletion_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))),
	CONSTRAINT "gathering_response_moderation_check" CHECK (((("moderation" is null)) or ("moderation" in ('hide', 'move')))),
	CONSTRAINT "gathering_response_provenance_check" CHECK (((((("source_conversation_slug_id" is null)) and (("source_conversation_type" is null)) and (("baseline_content_id" is null)) and (("source_conversation_id" is null)) and (("source_response_content_id" is null)))) or (((("source_conversation_slug_id" is not null)) and (("source_conversation_type" is not null)) and ("source_conversation_type" = 'gathering') and (("baseline_content_id" is not null))))))
);

CREATE TABLE "notification" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notification_type" "notification_type_enum" NOT NULL,
	"security_key" varchar(64),
	"created_at" timestamp(0) DEFAULT now() NOT NULL
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

CREATE TABLE "opinion_group_user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" uuid,
	"participant_id" uuid,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_user_candidate_unique" UNIQUE("candidate_id","user_id"),
	CONSTRAINT "opinion_group_user_group_unique" UNIQUE("group_id","user_id"),
	CONSTRAINT "opinion_group_participant_candidate_unique" UNIQUE("candidate_id","participant_id"),
	CONSTRAINT "opinion_group_user_identity_check" CHECK (((("user_id" is not null)) or (("participant_id" is not null))))
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
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "check_two_digits" CHECK ("last_two_digits" BETWEEN 0 and 99),
	CONSTRAINT "phone_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
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

CREATE TABLE "qv_allocation" (
	"version_id" uuid,
	"conversation_id" integer NOT NULL,
	"item_id" integer,
	"content_id" integer NOT NULL,
	"votes" smallint NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_allocation_pkey" PRIMARY KEY("version_id","item_id"),
	CONSTRAINT "qv_allocation_votes_check" CHECK ((("votes" <> 0) and ("votes" >= -10) and ("votes" <= 10)))
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

CREATE TABLE "qv_input_ballot_eligibility" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "qv_input_ballot_eligibility_pkey" PRIMARY KEY("snapshot_id","ballot_index"),
	CONSTRAINT "qv_input_ballot_eligibility_account_unique" UNIQUE("snapshot_id","user_id"),
	CONSTRAINT "qv_input_ballot_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);

CREATE TABLE "qv_input_ballot" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	CONSTRAINT "qv_input_ballot_pkey" PRIMARY KEY("snapshot_id","ballot_index"),
	CONSTRAINT "qv_input_ballot_index_check" CHECK ("ballot_index" >= 0)
);

CREATE TABLE "qv_input_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"calculation_id" uuid NOT NULL UNIQUE,
	"credit_budget" integer NOT NULL,
	"credit_pricing" text NOT NULL,
	"allow_opposition" boolean NOT NULL,
	"statement_set_revision" integer NOT NULL,
	"rule_version" integer NOT NULL,
	"algorithm_version" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"captured_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "qv_input_snapshot_id_calculation_unique" UNIQUE("id","calculation_id"),
	CONSTRAINT "qv_input_snapshot_provenance_check" CHECK ((("credit_budget" = 100) and ("credit_pricing" = 'quadratic') and ("rule_version" = 1) and ("algorithm_version" = 1) and ("participant_count" >= 0) and ("statement_set_revision" >= 0)))
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

CREATE TABLE "qv_response_command" (
	"response_id" uuid,
	"command_id" uuid,
	"request_hash" varchar(64) NOT NULL,
	"result_revision" integer NOT NULL,
	"result_version_id" uuid,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_response_command_pkey" PRIMARY KEY("response_id","command_id"),
	CONSTRAINT "qv_command_revision_check" CHECK ("result_revision" >= 0)
);

CREATE TABLE "qv_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"participant_id" uuid NOT NULL CONSTRAINT "qv_response_participant_unique" UNIQUE,
	"conversation_id" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"current_version_id" uuid,
	"account_hidden_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "qv_response_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_response_revision_check" CHECK ("revision" >= 0),
	CONSTRAINT "qv_response_deleted_pointer_check" CHECK (((("deleted_at" is null)) or (("current_version_id" is null))))
);

CREATE TABLE "qv_response_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"response_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"statement_set_revision" integer NOT NULL,
	"credit_budget" integer DEFAULT 100 NOT NULL,
	"credit_pricing" varchar(16) DEFAULT 'quadratic' NOT NULL,
	"allow_opposition" boolean NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"credits_spent" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3),
	CONSTRAINT "qv_version_id_response_unique" UNIQUE("id","response_id"),
	CONSTRAINT "qv_version_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "qv_version_revision_check" CHECK ("statement_set_revision" >= 0),
	CONSTRAINT "qv_version_budget_check" CHECK ((("credit_budget" = 100) and ("credit_pricing" = 'quadratic') and ("rule_version" = 1) and ("credits_spent" >= 1) and ("credits_spent" <= "credit_budget")))
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

CREATE TABLE "ranking_conversation_stats_checkpoint" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_checkpoint_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stats_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"reason" "ranking_stats_checkpoint_reason_enum" NOT NULL,
	"participant_milestone" integer,
	"vote_milestone" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_stats_checkpoint_milestone_check" CHECK ((("reason" = 'major_participation_milestone' AND "participant_milestone" IS NOT NULL AND "vote_milestone" IS NULL AND "participant_milestone" > 0) OR ("reason" = 'major_vote_milestone' AND "participant_milestone" IS NULL AND "vote_milestone" IS NOT NULL AND "vote_milestone" > 0) OR ("reason" = 'conversation_closed' AND "participant_milestone" IS NULL AND "vote_milestone" IS NULL)))
);

CREATE TABLE "ranking_conversation_stats_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stats_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"ranking_item_id" integer NOT NULL,
	"ranking_item_content_id" integer,
	"lifecycle_status" "ranking_item_lifecycle_status" NOT NULL,
	"excluded_by_moderation" boolean DEFAULT false NOT NULL,
	"score" real,
	"rank" integer,
	"participant_count" integer NOT NULL,
	"external_url" text,
	"deleted_at" timestamp(0),
	CONSTRAINT "ranking_stats_item_redacted_source_check" CHECK (((("ranking_item_content_id" is not null)) or (("external_url" is null)))),
	CONSTRAINT "ranking_stats_item_score_rank_check" CHECK ((("score" IS NULL AND "rank" IS NULL) OR ("score" IS NOT NULL AND "rank" IS NOT NULL AND "score" >= 0 AND "score" <= 1 AND "rank" > 0))),
	CONSTRAINT "ranking_stats_item_participant_count_check" CHECK ("participant_count" >= 0)
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

CREATE TABLE "ranking_input_participant_eligibility" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	"user_id" uuid,
	"is_account_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ranking_input_participant_eligibility_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "ranking_input_participant_eligibility_account_unique" UNIQUE("input_snapshot_id","user_id"),
	CONSTRAINT "ranking_input_participant_eligibility_detached_check" CHECK (((("user_id" is not null)) or ("is_account_hidden" = true)))
);

CREATE TABLE "ranking_input_participant" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	CONSTRAINT "ranking_input_participant_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "ranking_input_participant_index_check" CHECK ("participant_index" >= 0)
);

CREATE TABLE "ranking_input_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"stats_snapshot_id" integer UNIQUE,
	"conversation_id" integer NOT NULL,
	"comparison_method" "ranking_mode" NOT NULL,
	"scoring_input_revision" bigint NOT NULL,
	"algorithm_version" integer NOT NULL,
	"solidago_version" varchar(100) NOT NULL,
	"pipeline_config" jsonb NOT NULL,
	"participant_count" integer NOT NULL,
	"item_count" integer NOT NULL,
	"answer_count" integer NOT NULL,
	"sealed_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_input_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_input_snapshot_bounds_check" CHECK ((("participant_count" >= 0) and ("scoring_input_revision" >= 0) and ("algorithm_version" >= 1) and ("item_count" >= 0) and ("answer_count" >= 0))),
	CONSTRAINT "ranking_input_published_sealed_check" CHECK (((("stats_snapshot_id" is null)) or (("sealed_at" is not null))))
);

CREATE TABLE "ranking_item_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"ranking_item_id" integer NOT NULL,
	"conversation_content_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"body_plain_text" text,
	"source_language_code" "spoken_language_code",
	"source_raw_language_code" varchar(35),
	"source_language_provider" "language_detection_provider",
	"source_language_confidence" real,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_content_id_item_unique" UNIQUE("id","ranking_item_id"),
	CONSTRAINT "ranking_item_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL))),
	CONSTRAINT "ranking_item_content_body_plain_text_pair_check" CHECK ((("body" IS NULL AND "body_plain_text" IS NULL) OR ("body" IS NOT NULL AND "body_plain_text" IS NOT NULL)))
);

CREATE TABLE "ranking_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL UNIQUE,
	"author_id" uuid,
	"conversation_id" integer NOT NULL,
	"current_content_id" integer,
	"deleted_at" timestamp(3),
	"account_hidden_at" timestamp(3),
	"account_hidden_content_retained" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" DEFAULT 'active'::"ranking_item_lifecycle_status" NOT NULL,
	"moderation" text,
	"position" integer DEFAULT 0 NOT NULL,
	"snapshot_score" real,
	"snapshot_ranking_score_id" integer,
	"snapshot_rank" integer,
	"snapshot_participant_count" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_item_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))),
	CONSTRAINT "ranking_item_participant_moderation_check" CHECK (((("moderation" is null)) or ((("is_seed" = false) and ("moderation" in ('move', 'hide')))))),
	CONSTRAINT "ranking_item_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))))
);

CREATE TABLE "ranking_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"participant_counts" jsonb NOT NULL,
	"user_weights_snapshot" jsonb,
	"pipeline_config" jsonb NOT NULL,
	"preference_learning" varchar(100),
	"voting_rights" varchar(100),
	"aggregation_config" varchar(200),
	"computed_at" timestamp(0) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_score_id_conversation_unique" UNIQUE("id","conversation_id")
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

CREATE TABLE "retired_device_key" (
	"did_write" varchar(1000) PRIMARY KEY,
	"retired_at" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "survey_aggregate_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"analysis_snapshot_id" integer NOT NULL CONSTRAINT "survey_aggregate_snapshot_checkpoint_unique" UNIQUE,
	"survey_config_id" integer NOT NULL,
	"survey_config_revision" integer NOT NULL,
	"suppression_threshold" integer NOT NULL,
	"source_survey_aggregate_snapshot_id" integer,
	"created_at" timestamp(0) DEFAULT now() NOT NULL
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

CREATE TABLE "survey_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"completed_at" timestamp(0),
	"withdrawn_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_response_conversation_participant_unique" UNIQUE("conversation_id","participant_id"),
	CONSTRAINT "survey_response_id_conversation_unique" UNIQUE("id","conversation_id")
);

CREATE TABLE "user_display_language" (
	"user_id" uuid PRIMARY KEY,
	"language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL
);

CREATE TABLE "user_spoken_languages" (
	"id" serial PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"language_code" "spoken_language_code" NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "user_spoken_languages_unique" UNIQUE("user_id","language_code")
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

CREATE TABLE "vote_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vote_id" integer NOT NULL,
	"opinion_content_id" integer NOT NULL,
	"vote" "vote_enum_all" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
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
	"withdrawn_at" timestamp(3),
	"retired_at" timestamp(3),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "vote_author_id_opinion_id_unique" UNIQUE("author_id","opinion_id"),
	CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id"),
	CONSTRAINT "vote_inactive_intent_check" CHECK (((((("withdrawn_at" is null)) and (("retired_at" is null)))) or (("current_content_id" is null))))
);

CREATE TABLE "zk_passport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zk_passport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"citizenship" varchar(10) NOT NULL,
	"nullifier" text NOT NULL,
	"sex" varchar(50) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reserved_for_recovery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"updated_at" timestamp(0) DEFAULT now() NOT NULL,
	CONSTRAINT "zk_passport_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)))
);

CREATE INDEX "analysis_input_baseline_source_idx" ON "analysis_input_baseline" ("baseline_input_snapshot_id");

CREATE INDEX "analysis_input_participant_eligibility_user_idx" ON "analysis_input_participant_eligibility" ("user_id");

CREATE INDEX "analysis_input_snapshot_conversation_idx" ON "analysis_input_snapshot" ("conversation_id","data_generation");

CREATE INDEX "analysis_snapshot_latest_idx" ON "analysis_snapshot" ("conversation_id","data_generation","created_at");

CREATE INDEX "analysis_survey_choice_capture_input_idx" ON "analysis_survey_choice_capture" ("baseline_input_snapshot_id");

CREATE INDEX "analysis_work_state_lease_expiry_idx" ON "analysis_work_state" ("lease_expires_at") WHERE ("running_data_generation" is not null);

CREATE UNIQUE INDEX "analysis_work_state_running_conversation_unique" ON "analysis_work_state" ("conversation_id") WHERE ("running_data_generation" is not null);

CREATE INDEX "comparison_input_baseline_source_idx" ON "comparison_input_baseline" ("baseline_input_snapshot_id","conversation_id");

CREATE INDEX "comparison_response_conversation_idx" ON "comparison_response" ("conversation_id");

CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" ("conversation_content_id","display_language_code") WHERE (("source_kind" = 'conversation') and (("conversation_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" ("project_content_id","display_language_code") WHERE (("source_kind" = 'project') and (("project_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" ("opinion_content_id","display_language_code") WHERE (("source_kind" = 'opinion') and (("opinion_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE (("source_kind" = 'survey_question') and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)));

CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" ("ranking_item_content_id","display_language_code") WHERE (("source_kind" = 'ranking_item') and (("ranking_item_content_id" is not null)));

CREATE UNIQUE INDEX "content_translation_work_gathering_field_unique" ON "content_translation_work" ("gathering_field_id","display_language_code") WHERE "source_kind" = 'gathering_field';

CREATE UNIQUE INDEX "content_translation_work_gathering_response_unique" ON "content_translation_work" ("gathering_response_content_id","display_language_code") WHERE "source_kind" = 'gathering_response';

CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" ("priority_rank","updated_at","id") WHERE "status" = 'pending';

CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" ("lease_expires_at","id") WHERE "status" = 'running';

CREATE INDEX "conversation_participant_user_idx" ON "conversation_participant" ("user_id");

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

CREATE INDEX "device_user_session_expiry_idx" ON "device" ("user_id","session_expiry");

CREATE UNIQUE INDEX "email_active_unique" ON "email" ("email") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" ("user_id") WHERE "type" = 'primary' AND "is_deleted" = false;

CREATE INDEX "email_idx" ON "email" ("email");

CREATE INDEX "user_event_idx" ON "event_ticket" ("user_id","event_slug");

CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" ("nullifier","event_slug") WHERE "is_deleted" = false;

CREATE INDEX "nullifier_idx" ON "event_ticket" ("nullifier");

CREATE UNIQUE INDEX "followed_topic_active_unique" ON "followed_topic" ("user_id","topic_id") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "gathering_response_author_unique" ON "gathering_response" ("conversation_id","author_id") WHERE "is_seed" = false;

CREATE INDEX "gathering_response_author_idx" ON "gathering_response" ("author_id");

CREATE INDEX "notification_user_created_id_idx" ON "notification" ("user_id","created_at" DESC,"id" DESC);

CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" ("user_id","security_key");

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

CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" ("user_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "organization_membership_organization_idx" ON "organization_membership" ("organization_id");

CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));

CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" ("slug") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" ("phone_hash") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE INDEX "phone_hash_idx" ON "phone" ("phone_hash");

CREATE INDEX "phone_user_idx" ON "phone" ("user_id");

CREATE INDEX "polis_analysis_close_generation_close_idx" ON "polis_analysis_close_generation" ("close_id");

CREATE INDEX "polis_analysis_close_generation_published_idx" ON "polis_analysis_close_generation" ("close_id","data_generation" DESC NULLS LAST) WHERE ("published_at" is not null);

CREATE INDEX "polis_analysis_close_original_view_idx" ON "polis_analysis_close" ("original_view_snapshot_id");

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "qv_allocation_deleted_idx" ON "qv_allocation" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');

CREATE INDEX "qv_input_ballot_eligibility_user_idx" ON "qv_input_ballot_eligibility" ("user_id");

CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");

CREATE INDEX "qv_command_deleted_idx" ON "qv_response_command" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "qv_response_conversation_active_idx" ON "qv_response" ("conversation_id") WHERE ((("current_version_id" is not null)) and (("deleted_at" is null)) and (("account_hidden_at" is null)));

CREATE INDEX "qv_version_response_idx" ON "qv_response_version" ("response_id");

CREATE INDEX "qv_version_deleted_idx" ON "qv_response_version" ("deleted_at") WHERE ("deleted_at" is not null);

CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" ("conversation_id","id") WHERE ("processed_at" is null);

CREATE INDEX "ranking_stats_checkpoint_snapshot_idx" ON "ranking_conversation_stats_checkpoint" ("stats_snapshot_id");

CREATE UNIQUE INDEX "ranking_stats_checkpoint_participant_unique" ON "ranking_conversation_stats_checkpoint" ("conversation_id","participant_milestone") WHERE "reason" = 'major_participation_milestone';

CREATE UNIQUE INDEX "ranking_stats_checkpoint_vote_unique" ON "ranking_conversation_stats_checkpoint" ("conversation_id","vote_milestone") WHERE "reason" = 'major_vote_milestone';

CREATE UNIQUE INDEX "ranking_stats_checkpoint_closed_unique" ON "ranking_conversation_stats_checkpoint" ("stats_snapshot_id") WHERE "reason" = 'conversation_closed';

CREATE UNIQUE INDEX "ranking_stats_item_snapshot_item_unique" ON "ranking_conversation_stats_item" ("stats_snapshot_id","ranking_item_id");

CREATE INDEX "ranking_stats_item_deleted_idx" ON "ranking_conversation_stats_item" ("deleted_at","id") WHERE "deleted_at" IS NOT NULL;

CREATE INDEX "ranking_stats_reused_input_idx" ON "ranking_conversation_stats_snapshot" ("reused_input_snapshot_id") WHERE ("reused_input_snapshot_id" is not null);

CREATE UNIQUE INDEX "comparison_closing_result_revision_unique" ON "ranking_conversation_stats_snapshot" ("derived_from_close_id","scoring_input_revision") WHERE ("derived_from_close_id" is not null);

CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE "deleted_at" IS NULL;

CREATE INDEX "ranking_stats_snapshot_deleted_idx" ON "ranking_conversation_stats_snapshot" ("deleted_at","id") WHERE "deleted_at" IS NOT NULL;

CREATE INDEX "ranking_input_participant_eligibility_user_idx" ON "ranking_input_participant_eligibility" ("user_id");

CREATE INDEX "ranking_input_snapshot_conversation_idx" ON "ranking_input_snapshot" ("conversation_id","stats_snapshot_id");

CREATE INDEX "ranking_input_snapshot_prepared_idx" ON "ranking_input_snapshot" ("conversation_id","scoring_input_revision","created_at","id") WHERE ((("stats_snapshot_id" is null)) and (("sealed_at" is not null)));

CREATE INDEX "ranking_item_conversation_active_idx" ON "ranking_item" ("conversation_id","current_content_id");

CREATE INDEX "ranking_item_lifecycle_idx" ON "ranking_item" ("conversation_id","lifecycle_status");

CREATE INDEX "comparison_moderation_history_idx" ON "ranking_item" ("conversation_id","id") WHERE ("moderation" is not null);

CREATE INDEX "ranking_score_conversation_idx" ON "ranking_score" ("conversation_id","id");

CREATE INDEX "ranking_score_unclassified_context_idx" ON "ranking_score" ("id") WHERE ((("user_weights_snapshot" is not null)) and ("user_weights_snapshot" <> 'null'::jsonb));

CREATE INDEX "realtime_event_outbox_created_at_idx" ON "realtime_event_outbox" ("created_at");

CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" ("id") WHERE ("delivery_id" is null);

CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');

CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" = 'conversation_ranking_stats_updated';

CREATE INDEX "realtime_event_outbox_topic_replay_idx" ON "realtime_event_outbox_topic" ("topic","event_id");

CREATE INDEX "survey_aggregate_snapshot_conversation_idx" ON "survey_aggregate_snapshot" ("conversation_id");

CREATE INDEX "survey_aggregate_snapshot_source_idx" ON "survey_aggregate_snapshot" ("source_survey_aggregate_snapshot_id") WHERE ("source_survey_aggregate_snapshot_id" is not null);

CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" ("conversation_id") WHERE "deleted_at" IS NULL;

CREATE INDEX "survey_response_conversation_created_idx" ON "survey_response" ("conversation_id","created_at");

CREATE INDEX "survey_response_participant_idx" ON "survey_response" ("participant_id");

CREATE INDEX "vote_authorId_idx" ON "vote" ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" ("author_id","updated_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "vote_opinion_active_idx" ON "vote" ("opinion_id","current_content_id");

CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" ("nullifier") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));

CREATE INDEX "zk_passport_nullifier_idx" ON "zk_passport" ("nullifier");

CREATE INDEX "zk_passport_user_idx" ON "zk_passport" ("user_id");
