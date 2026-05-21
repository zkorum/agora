CREATE TYPE "public"."ai_description_locale_status_enum" AS ENUM('pending', 'ready', 'fallback');--> statement-breakpoint
CREATE TYPE "public"."analysis_compression_enum" AS ENUM('zstd');--> statement-breakpoint
CREATE TYPE "public"."analysis_family_enum" AS ENUM('opinion_groups');--> statement-breakpoint
CREATE TYPE "public"."analysis_insufficient_data_reason_enum" AS ENUM('empty_vote_matrix', 'not_enough_clusterable_participants', 'not_enough_unique_points', 'not_enough_samples_for_group_count');--> statement-breakpoint
CREATE TYPE "public"."analysis_result_outcome_enum" AS ENUM('success', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."analysis_work_error_kind_enum" AS ENUM('red_dwarf_exception', 'red_dwarf_contract_violation', 'database_error', 'valkey_error', 'transaction_error', 'unknown_error');--> statement-breakpoint
CREATE TYPE "public"."conversation_view_snapshot_checkpoint_reason_enum" AS ENUM('first_displayable_analysis', 'first_group_count_available', 'default_group_count_changed', 'major_participation_milestone', 'major_vote_milestone', 'conversation_closed');--> statement-breakpoint
CREATE TYPE "public"."conversation_view_snapshot_reason_enum" AS ENUM('analysis_completed', 'survey_refreshed', 'conversation_content_updated', 'conversation_lifecycle_updated');--> statement-breakpoint
CREATE TYPE "public"."opinion_group_candidate_hidden_reason_enum" AS ENUM('singleton_group');--> statement-breakpoint
CREATE TYPE "public"."opinion_group_clusterer_enum" AS ENUM('kmeans');--> statement-breakpoint
CREATE TYPE "public"."opinion_group_reducer_enum" AS ENUM('pca');--> statement-breakpoint
CREATE TYPE "public"."opinion_group_selection_policy_enum" AS ENUM('silhouette_size_balance');--> statement-breakpoint
CREATE TYPE "public"."premium_feature" AS ENUM('survey', 'prioritization', 'event_ticket', 'analysis_variants');--> statement-breakpoint
CREATE TYPE "public"."survey_aggregate_scope_enum" AS ENUM('overall', 'opinion_group');--> statement-breakpoint
CREATE TYPE "public"."survey_aggregate_suppression_reason_enum" AS ENUM('count_below_threshold', 'cluster_deductive_disclosure');--> statement-breakpoint
CREATE TABLE "analysis_input_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_input_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"data_generation" integer NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"opinion_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"compression" "analysis_compression_enum" NOT NULL,
	"payload" "bytea" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_input_snapshot_hash_unique" UNIQUE("conversation_id","data_generation","input_hash"),
	CONSTRAINT "analysis_input_snapshot_counts_check" CHECK ("analysis_input_snapshot"."opinion_count" >= 0 AND "analysis_input_snapshot"."participant_count" >= 0 AND "analysis_input_snapshot"."vote_count" >= 0)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "analysis_snapshot_result" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshot_result_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"analysis_snapshot_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"outcome" "analysis_result_outcome_enum" NOT NULL,
	"outcome_reason" "analysis_insufficient_data_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_snapshot_result_spec_unique" UNIQUE("analysis_snapshot_id","opinion_group_spec_id"),
	CONSTRAINT "analysis_snapshot_result_reason_check" CHECK (("analysis_snapshot_result"."outcome" = 'insufficient_data' AND "analysis_snapshot_result"."outcome_reason" IS NOT NULL) OR ("analysis_snapshot_result"."outcome" = 'success' AND "analysis_snapshot_result"."outcome_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "analysis_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"conversation_content_id" integer,
	"input_snapshot_id" integer NOT NULL,
	"data_generation" integer NOT NULL,
	"computed_at" timestamp (0) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_spec" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_spec_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysis_family" "analysis_family_enum" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_work_state" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_work_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"last_completed_data_generation" integer DEFAULT 0 NOT NULL,
	"running_data_generation" integer,
	"dirty_since" timestamp (0),
	"next_run_at" timestamp (0),
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
	CONSTRAINT "analysis_work_state_running_lease_check" CHECK ((("analysis_work_state"."running_data_generation" is null AND "analysis_work_state"."lease_owner" is null AND "analysis_work_state"."lease_token" is null AND "analysis_work_state"."lease_expires_at" is null) OR ("analysis_work_state"."running_data_generation" is not null AND "analysis_work_state"."lease_owner" is not null AND "analysis_work_state"."lease_token" is not null AND "analysis_work_state"."lease_expires_at" is not null)))
);
--> statement-breakpoint
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
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_group_count_check" CHECK ((("conversation_view_snapshot_checkpoint_reason"."reason" IN ('first_group_count_available', 'default_group_count_changed') AND "conversation_view_snapshot_checkpoint_reason"."group_count" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."group_count" >= 2 AND ("conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NULL OR "conversation_view_snapshot_checkpoint_reason"."previous_group_count" >= 2)) OR ("conversation_view_snapshot_checkpoint_reason"."reason" NOT IN ('first_group_count_available', 'default_group_count_changed') AND "conversation_view_snapshot_checkpoint_reason"."group_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NULL))),
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_milestone_check" CHECK ((("conversation_view_snapshot_checkpoint_reason"."reason" = 'major_participation_milestone' AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_count" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_milestone" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_milestone" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_count" >= "conversation_view_snapshot_checkpoint_reason"."participant_milestone" AND "conversation_view_snapshot_checkpoint_reason"."participant_milestone" > 0) OR ("conversation_view_snapshot_checkpoint_reason"."reason" = 'major_vote_milestone' AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_milestone" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_count" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_milestone" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_count" >= "conversation_view_snapshot_checkpoint_reason"."vote_milestone" AND "conversation_view_snapshot_checkpoint_reason"."vote_milestone" > 0) OR ("conversation_view_snapshot_checkpoint_reason"."reason" NOT IN ('major_participation_milestone', 'major_vote_milestone') AND "conversation_view_snapshot_checkpoint_reason"."participant_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_milestone" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_milestone" IS NULL))),
	CONSTRAINT "conversation_view_snapshot_checkpoint_reason_previous_check" CHECK ((("conversation_view_snapshot_checkpoint_reason"."reason" = 'default_group_count_changed' AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NOT NULL AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" <> "conversation_view_snapshot_checkpoint_reason"."group_count" AND "conversation_view_snapshot_checkpoint_reason"."participant_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."participant_milestone" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_count" IS NULL AND "conversation_view_snapshot_checkpoint_reason"."vote_milestone" IS NULL) OR ("conversation_view_snapshot_checkpoint_reason"."reason" <> 'default_group_count_changed' AND "conversation_view_snapshot_checkpoint_reason"."previous_group_count" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "conversation_view_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_view_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"analysis_snapshot_id" integer,
	"survey_aggregate_snapshot_id" integer,
	"conversation_content_id" integer,
	"view_reason" "conversation_view_snapshot_reason_enum" NOT NULL,
	"is_closed" boolean NOT NULL,
	"opinion_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"total_opinion_count" integer NOT NULL,
	"total_vote_count" integer NOT NULL,
	"total_participant_count" integer NOT NULL,
	"moderated_opinion_count" integer NOT NULL,
	"hidden_opinion_count" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_view_snapshot_counts_check" CHECK ("conversation_view_snapshot"."opinion_count" >= 0 AND "conversation_view_snapshot"."vote_count" >= 0 AND "conversation_view_snapshot"."participant_count" >= 0 AND "conversation_view_snapshot"."total_opinion_count" >= 0 AND "conversation_view_snapshot"."total_vote_count" >= 0 AND "conversation_view_snapshot"."total_participant_count" >= 0 AND "conversation_view_snapshot"."moderated_opinion_count" >= 0 AND "conversation_view_snapshot"."hidden_opinion_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "opinion_group_candidate_assessment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_assessment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"silhouette_score" real,
	"coefficient_of_variation" real,
	"balance_score" real,
	"selection_score" real,
	"hidden_reason" "opinion_group_candidate_hidden_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_assessment_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "opinion_group_candidate_opinion_metrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_opinion_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"analysis_snapshot_opinion_id" integer NOT NULL,
	"group_aware_consensus_agree" real,
	"group_aware_consensus_disagree" real,
	"divisiveness" real,
	"majority_type" "vote_enum_simple",
	"majority_probability_success" real,
	"agreement_rank" integer,
	"disagreement_rank" integer,
	"divisiveness_rank" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_opinion_metrics_unique" UNIQUE("candidate_id","analysis_snapshot_opinion_id"),
	CONSTRAINT "opinion_group_candidate_opinion_metrics_majority_check" CHECK (("opinion_group_candidate_opinion_metrics"."majority_type" IS NULL AND "opinion_group_candidate_opinion_metrics"."majority_probability_success" IS NULL) OR ("opinion_group_candidate_opinion_metrics"."majority_type" IS NOT NULL AND "opinion_group_candidate_opinion_metrics"."majority_probability_success" IS NOT NULL)),
	CONSTRAINT "opinion_group_candidate_opinion_metrics_rank_check" CHECK (("opinion_group_candidate_opinion_metrics"."agreement_rank" IS NULL OR "opinion_group_candidate_opinion_metrics"."agreement_rank" > 0) AND ("opinion_group_candidate_opinion_metrics"."disagreement_rank" IS NULL OR "opinion_group_candidate_opinion_metrics"."disagreement_rank" > 0) AND ("opinion_group_candidate_opinion_metrics"."divisiveness_rank" IS NULL OR "opinion_group_candidate_opinion_metrics"."divisiveness_rank" > 0))
);
--> statement-breakpoint
CREATE TABLE "opinion_group_candidate" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"snapshot_result_id" integer NOT NULL,
	"opinion_group_variant_id" integer NOT NULL,
	"scope_id" integer NOT NULL,
	"outcome" "analysis_result_outcome_enum" NOT NULL,
	"outcome_reason" "analysis_insufficient_data_reason_enum",
	"raw_output" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_variant_unique" UNIQUE("snapshot_result_id","opinion_group_variant_id"),
	CONSTRAINT "opinion_group_candidate_reason_check" CHECK (("opinion_group_candidate"."outcome" = 'insufficient_data' AND "opinion_group_candidate"."outcome_reason" IS NOT NULL) OR ("opinion_group_candidate"."outcome" = 'success' AND "opinion_group_candidate"."outcome_reason" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "opinion_group_description_locale_status" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_locale_status_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_view_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"analysis_snapshot_result_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"status" "ai_description_locale_status_enum" NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp (0),
	"lease_owner" varchar(100),
	"lease_token" varchar(100),
	"lease_expires_at" timestamp (0),
	"non_retryable_ai_description_epoch" integer,
	"last_error_code" varchar(100),
	"last_error_message" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_description_locale_status_unique" UNIQUE("conversation_view_snapshot_id","locale"),
	CONSTRAINT "opinion_group_description_locale_status_running_lease_check" CHECK ((("opinion_group_description_locale_status"."lease_owner" is null AND "opinion_group_description_locale_status"."lease_token" is null AND "opinion_group_description_locale_status"."lease_expires_at" is null) OR ("opinion_group_description_locale_status"."lease_owner" is not null AND "opinion_group_description_locale_status"."lease_token" is not null AND "opinion_group_description_locale_status"."lease_expires_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "opinion_group_description" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"locale" varchar(10) NOT NULL,
	"label" varchar(100) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opinion_group_description_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"description_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"label" varchar(100) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_description_translation_unique" UNIQUE("description_id","locale")
);
--> statement-breakpoint
CREATE TABLE "opinion_group_lineage_scope" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_scope_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"opinion_group_variant_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_lineage_scope_unique" UNIQUE("conversation_id","opinion_group_variant_id")
);
--> statement-breakpoint
CREATE TABLE "opinion_group_lineage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_lineage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scope_id" integer NOT NULL,
	"system_description_id" integer,
	"admin_description_id" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opinion_group_opinion_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_opinion_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group_id" integer NOT NULL,
	"analysis_snapshot_opinion_id" integer NOT NULL,
	"num_agrees" integer DEFAULT 0 NOT NULL,
	"num_disagrees" integer DEFAULT 0 NOT NULL,
	"num_passes" integer DEFAULT 0 NOT NULL,
	"representative_agreement_type" "vote_enum_simple",
	"representative_probability_agreement" real,
	"representative_number_agreement" integer,
	"raw_repness" jsonb,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_opinion_stats_unique" UNIQUE("group_id","analysis_snapshot_opinion_id"),
	CONSTRAINT "opinion_group_opinion_stats_counts_check" CHECK ("opinion_group_opinion_stats"."num_agrees" >= 0 AND "opinion_group_opinion_stats"."num_disagrees" >= 0 AND "opinion_group_opinion_stats"."num_passes" >= 0),
	CONSTRAINT "opinion_group_opinion_stats_representative_check" CHECK ((("opinion_group_opinion_stats"."representative_agreement_type" IS NULL AND "opinion_group_opinion_stats"."representative_probability_agreement" IS NULL AND "opinion_group_opinion_stats"."representative_number_agreement" IS NULL AND "opinion_group_opinion_stats"."raw_repness" IS NULL) OR ("opinion_group_opinion_stats"."representative_agreement_type" IS NOT NULL AND "opinion_group_opinion_stats"."representative_probability_agreement" IS NOT NULL AND "opinion_group_opinion_stats"."representative_number_agreement" IS NOT NULL AND "opinion_group_opinion_stats"."raw_repness" IS NOT NULL)))
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "opinion_group" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"scope_id" integer NOT NULL,
	"lineage_id" integer,
	"key" varchar(20) NOT NULL,
	"external_id" integer NOT NULL,
	"num_users" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_key_unique" UNIQUE("candidate_id","key"),
	CONSTRAINT "opinion_group_candidate_lineage_unique" UNIQUE("candidate_id","lineage_id")
);
--> statement-breakpoint
CREATE TABLE "opinion_group_user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_user_candidate_unique" UNIQUE("candidate_id","user_id"),
	CONSTRAINT "opinion_group_user_group_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "opinion_group_variant" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_variant_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opinion_group_spec_id" integer NOT NULL,
	"group_count" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_variant_spec_count_unique" UNIQUE("opinion_group_spec_id","group_count"),
	CONSTRAINT "opinion_group_variant_group_count_check" CHECK ("opinion_group_variant"."group_count" >= 2)
);
--> statement-breakpoint
CREATE TABLE "premium_feature_entitlement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "premium_feature_entitlement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"organization_id" integer,
	"feature" "premium_feature" NOT NULL,
	"starts_at" timestamp (0) NOT NULL,
	"expires_at" timestamp (0),
	"revoked_at" timestamp (0),
	"admin_note" text,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "premium_feature_entitlement_single_subject_check" CHECK ((("premium_feature_entitlement"."user_id" is not null AND "premium_feature_entitlement"."organization_id" is null) OR ("premium_feature_entitlement"."user_id" is null AND "premium_feature_entitlement"."organization_id" is not null)))
);
--> statement-breakpoint
CREATE TABLE "survey_aggregate_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_aggregate_question_id" integer NOT NULL,
	"survey_question_option_id" integer,
	"option_slug_id" varchar(8) NOT NULL,
	"option_order" integer NOT NULL,
	"option_text" varchar(200) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_aggregate_option_question_slug_unique" UNIQUE("survey_aggregate_question_id","option_slug_id")
);
--> statement-breakpoint
CREATE TABLE "survey_aggregate_owner_current" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_owner_current_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"survey_aggregate_snapshot_id" integer NOT NULL,
	"survey_config_id" integer NOT NULL,
	"survey_config_revision" integer NOT NULL,
	"rows" jsonb NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_aggregate_owner_current_conversation_unique" UNIQUE("conversation_id"),
	CONSTRAINT "survey_aggregate_owner_current_snapshot_unique" UNIQUE("survey_aggregate_snapshot_id")
);
--> statement-breakpoint
CREATE TABLE "survey_aggregate_question" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_aggregate_snapshot_id" integer NOT NULL,
	"survey_question_id" integer,
	"question_slug_id" varchar(8) NOT NULL,
	"question_order" integer NOT NULL,
	"question_type" "survey_question_type" NOT NULL,
	"question_text" varchar(500) NOT NULL,
	"is_required" boolean NOT NULL,
	"question_semantic_version" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_aggregate_question_snapshot_slug_unique" UNIQUE("survey_aggregate_snapshot_id","question_slug_id")
);
--> statement-breakpoint
CREATE TABLE "survey_aggregate_result" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_result_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_aggregate_snapshot_id" integer NOT NULL,
	"candidate_id" integer,
	"group_id" integer,
	"scope" "survey_aggregate_scope_enum" NOT NULL,
	"survey_aggregate_question_id" integer NOT NULL,
	"survey_aggregate_option_id" integer NOT NULL,
	"count" integer,
	"percentage" real,
	"is_suppressed" boolean NOT NULL,
	"suppression_reason" "survey_aggregate_suppression_reason_enum",
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_aggregate_result_scope_check" CHECK ((("survey_aggregate_result"."scope" = 'overall' AND "survey_aggregate_result"."candidate_id" is null AND "survey_aggregate_result"."group_id" is null) OR ("survey_aggregate_result"."scope" = 'opinion_group' AND "survey_aggregate_result"."candidate_id" is not null AND "survey_aggregate_result"."group_id" is not null))),
	CONSTRAINT "survey_aggregate_result_suppression_check" CHECK ((("survey_aggregate_result"."is_suppressed" = true AND "survey_aggregate_result"."count" is null AND "survey_aggregate_result"."percentage" is null AND "survey_aggregate_result"."suppression_reason" is not null) OR ("survey_aggregate_result"."is_suppressed" = false AND "survey_aggregate_result"."count" is not null AND "survey_aggregate_result"."suppression_reason" is null)))
);
--> statement-breakpoint
CREATE TABLE "survey_aggregate_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_aggregate_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"analysis_snapshot_id" integer NOT NULL,
	"survey_config_id" integer NOT NULL,
	"survey_config_revision" integer NOT NULL,
	"suppression_threshold" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_aggregate_snapshot_checkpoint_unique" UNIQUE("analysis_snapshot_id")
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "ai_labeling_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "analysis_data_generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "preferred_opinion_group_count" integer;--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" ADD CONSTRAINT "analysis_input_snapshot_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_opinion" ADD CONSTRAINT "analysis_snapshot_opinion_analysis_snapshot_id_analysis_snapshot_id_fk" FOREIGN KEY ("analysis_snapshot_id") REFERENCES "public"."analysis_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_opinion" ADD CONSTRAINT "analysis_snapshot_opinion_opinion_id_opinion_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_opinion" ADD CONSTRAINT "analysis_snapshot_opinion_opinion_content_id_opinion_content_id_fk" FOREIGN KEY ("opinion_content_id") REFERENCES "public"."opinion_content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_result" ADD CONSTRAINT "analysis_snapshot_result_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_result" ADD CONSTRAINT "analysis_snapshot_result_analysis_snapshot_id_analysis_snapshot_id_fk" FOREIGN KEY ("analysis_snapshot_id") REFERENCES "public"."analysis_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot_result" ADD CONSTRAINT "analysis_snapshot_result_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ADD CONSTRAINT "analysis_snapshot_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ADD CONSTRAINT "analysis_snapshot_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ADD CONSTRAINT "analysis_snapshot_input_snapshot_id_analysis_input_snapshot_id_fk" FOREIGN KEY ("input_snapshot_id") REFERENCES "public"."analysis_input_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_work_state" ADD CONSTRAINT "analysis_work_state_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_work_state" ADD CONSTRAINT "analysis_work_state_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_conversation_view_snapshot_id_conversation_view_snapshot_id_fk" FOREIGN KEY ("conversation_view_snapshot_id") REFERENCES "public"."conversation_view_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_analysis_snapshot_id_analysis_snapshot_id_fk" FOREIGN KEY ("analysis_snapshot_id") REFERENCES "public"."analysis_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_survey_aggregate_snapshot_id_survey_aggregate_snapshot_id_fk" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "public"."survey_aggregate_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_conversation_content_id_conversation_content_id_fk" FOREIGN KEY ("conversation_content_id") REFERENCES "public"."conversation_content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_assessment" ADD CONSTRAINT "opinion_group_candidate_assessment_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_opinion_metrics" ADD CONSTRAINT "opinion_group_candidate_opinion_metrics_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_opinion_metrics" ADD CONSTRAINT "opinion_group_candidate_opinion_metrics_analysis_snapshot_opinion_id_analysis_snapshot_opinion_id_fk" FOREIGN KEY ("analysis_snapshot_opinion_id") REFERENCES "public"."analysis_snapshot_opinion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate" ADD CONSTRAINT "opinion_group_candidate_snapshot_result_id_analysis_snapshot_result_id_fk" FOREIGN KEY ("snapshot_result_id") REFERENCES "public"."analysis_snapshot_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate" ADD CONSTRAINT "opinion_group_candidate_opinion_group_variant_id_opinion_group_variant_id_fk" FOREIGN KEY ("opinion_group_variant_id") REFERENCES "public"."opinion_group_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_candidate" ADD CONSTRAINT "opinion_group_candidate_scope_id_opinion_group_lineage_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."opinion_group_lineage_scope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" ADD CONSTRAINT "opinion_group_description_locale_status_conversation_view_snapshot_id_conversation_view_snapshot_id_fk" FOREIGN KEY ("conversation_view_snapshot_id") REFERENCES "public"."conversation_view_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" ADD CONSTRAINT "opinion_group_description_locale_status_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" ADD CONSTRAINT "opinion_group_description_locale_status_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" ADD CONSTRAINT "opinion_group_description_locale_status_analysis_snapshot_result_id_analysis_snapshot_result_id_fk" FOREIGN KEY ("analysis_snapshot_result_id") REFERENCES "public"."analysis_snapshot_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation" ADD CONSTRAINT "opinion_group_description_translation_description_id_opinion_group_description_id_fk" FOREIGN KEY ("description_id") REFERENCES "public"."opinion_group_description"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_scope" ADD CONSTRAINT "opinion_group_lineage_scope_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_scope" ADD CONSTRAINT "opinion_group_lineage_scope_opinion_group_variant_id_opinion_group_variant_id_fk" FOREIGN KEY ("opinion_group_variant_id") REFERENCES "public"."opinion_group_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage" ADD CONSTRAINT "opinion_group_lineage_scope_id_opinion_group_lineage_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."opinion_group_lineage_scope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage" ADD CONSTRAINT "opinion_group_lineage_system_description_id_opinion_group_description_id_fk" FOREIGN KEY ("system_description_id") REFERENCES "public"."opinion_group_description"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_lineage" ADD CONSTRAINT "opinion_group_lineage_admin_description_id_opinion_group_description_id_fk" FOREIGN KEY ("admin_description_id") REFERENCES "public"."opinion_group_description"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_opinion_stats" ADD CONSTRAINT "opinion_group_opinion_stats_group_id_opinion_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."opinion_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_opinion_stats" ADD CONSTRAINT "opinion_group_opinion_stats_analysis_snapshot_opinion_id_analysis_snapshot_opinion_id_fk" FOREIGN KEY ("analysis_snapshot_opinion_id") REFERENCES "public"."analysis_snapshot_opinion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_spec" ADD CONSTRAINT "opinion_group_spec_analysis_spec_id_analysis_spec_id_fk" FOREIGN KEY ("analysis_spec_id") REFERENCES "public"."analysis_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group" ADD CONSTRAINT "opinion_group_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group" ADD CONSTRAINT "opinion_group_scope_id_opinion_group_lineage_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."opinion_group_lineage_scope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group" ADD CONSTRAINT "opinion_group_lineage_id_opinion_group_lineage_id_fk" FOREIGN KEY ("lineage_id") REFERENCES "public"."opinion_group_lineage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_group_id_opinion_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."opinion_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_variant" ADD CONSTRAINT "opinion_group_variant_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ADD CONSTRAINT "premium_feature_entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ADD CONSTRAINT "premium_feature_entitlement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ADD CONSTRAINT "premium_feature_entitlement_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ADD CONSTRAINT "premium_feature_entitlement_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_option" ADD CONSTRAINT "survey_aggregate_option_survey_aggregate_question_id_survey_aggregate_question_id_fk" FOREIGN KEY ("survey_aggregate_question_id") REFERENCES "public"."survey_aggregate_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_option" ADD CONSTRAINT "survey_aggregate_option_survey_question_option_id_survey_question_option_id_fk" FOREIGN KEY ("survey_question_option_id") REFERENCES "public"."survey_question_option"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_owner_current" ADD CONSTRAINT "survey_aggregate_owner_current_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_owner_current" ADD CONSTRAINT "survey_aggregate_owner_current_survey_aggregate_snapshot_id_survey_aggregate_snapshot_id_fk" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "public"."survey_aggregate_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_owner_current" ADD CONSTRAINT "survey_aggregate_owner_current_survey_config_id_survey_config_id_fk" FOREIGN KEY ("survey_config_id") REFERENCES "public"."survey_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_question" ADD CONSTRAINT "survey_aggregate_question_survey_aggregate_snapshot_id_survey_aggregate_snapshot_id_fk" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "public"."survey_aggregate_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_question" ADD CONSTRAINT "survey_aggregate_question_survey_question_id_survey_question_id_fk" FOREIGN KEY ("survey_question_id") REFERENCES "public"."survey_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_survey_aggregate_snapshot_id_survey_aggregate_snapshot_id_fk" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "public"."survey_aggregate_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_group_id_opinion_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."opinion_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_survey_aggregate_question_id_survey_aggregate_question_id_fk" FOREIGN KEY ("survey_aggregate_question_id") REFERENCES "public"."survey_aggregate_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ADD CONSTRAINT "survey_aggregate_result_survey_aggregate_option_id_survey_aggregate_option_id_fk" FOREIGN KEY ("survey_aggregate_option_id") REFERENCES "public"."survey_aggregate_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" ADD CONSTRAINT "survey_aggregate_snapshot_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" ADD CONSTRAINT "survey_aggregate_snapshot_analysis_snapshot_id_analysis_snapshot_id_fk" FOREIGN KEY ("analysis_snapshot_id") REFERENCES "public"."analysis_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" ADD CONSTRAINT "survey_aggregate_snapshot_survey_config_id_survey_config_id_fk" FOREIGN KEY ("survey_config_id") REFERENCES "public"."survey_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_input_snapshot_conversation_idx" ON "analysis_input_snapshot" USING btree ("conversation_id","data_generation");--> statement-breakpoint
CREATE INDEX "analysis_snapshot_latest_idx" ON "analysis_snapshot" USING btree ("conversation_id","data_generation","created_at");--> statement-breakpoint
CREATE INDEX "analysis_work_state_due_idx" ON "analysis_work_state" USING btree ("next_run_at") WHERE ("analysis_work_state"."running_data_generation" is null AND "analysis_work_state"."next_run_at" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_work_state_running_conversation_unique" ON "analysis_work_state" USING btree ("conversation_id") WHERE "analysis_work_state"."running_data_generation" is not null;--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_checkpoint_reason_snapshot_idx" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_view_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_first_displayable_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_id","opinion_group_spec_id") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'first_displayable_analysis';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_group_count_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_id","opinion_group_spec_id","group_count") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'first_group_count_available';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_default_change_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_view_snapshot_id") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'default_group_count_changed';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_participant_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_id","opinion_group_spec_id","participant_milestone") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'major_participation_milestone';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_vote_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_id","opinion_group_spec_id","vote_milestone") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'major_vote_milestone';--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_closed_unique" ON "conversation_view_snapshot_checkpoint_reason" USING btree ("conversation_view_snapshot_id") WHERE "conversation_view_snapshot_checkpoint_reason"."reason" = 'conversation_closed';--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "opinion_group_description_locale_status_due_idx" ON "opinion_group_description_locale_status" USING btree ("next_run_at") WHERE ("opinion_group_description_locale_status"."lease_token" is null AND "opinion_group_description_locale_status"."next_run_at" is not null AND "opinion_group_description_locale_status"."status" <> 'ready');--> statement-breakpoint
CREATE INDEX "premium_feature_entitlement_user_idx" ON "premium_feature_entitlement" USING btree ("user_id","feature");--> statement-breakpoint
CREATE INDEX "premium_feature_entitlement_org_idx" ON "premium_feature_entitlement" USING btree ("organization_id","feature");--> statement-breakpoint
CREATE INDEX "premium_feature_entitlement_expires_idx" ON "premium_feature_entitlement" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "survey_aggregate_result_snapshot_idx" ON "survey_aggregate_result" USING btree ("survey_aggregate_snapshot_id");--> statement-breakpoint
CREATE INDEX "survey_aggregate_result_group_idx" ON "survey_aggregate_result" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "survey_aggregate_snapshot_conversation_idx" ON "survey_aggregate_snapshot" USING btree ("conversation_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_preferred_opinion_group_count_check" CHECK ("conversation"."preferred_opinion_group_count" IS NULL OR "conversation"."preferred_opinion_group_count" >= 2);
