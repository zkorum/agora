CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');--> statement-breakpoint
ALTER TYPE "ranking_mode" ADD VALUE 'pairwise';--> statement-breakpoint
CREATE TABLE "conversation_export_object" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"artifact_id" integer NOT NULL,
	"generation_attempt" integer NOT NULL,
	"bucket_name" text NOT NULL,
	"region" text NOT NULL,
	"s3_key" text NOT NULL,
	"upload_expires_at" timestamp(3) NOT NULL,
	"upload_finished_at" timestamp(3),
	"cleanup_requested_at" timestamp(3),
	"object_deleted_at" timestamp(3),
	"delete_attempts" integer DEFAULT 0 NOT NULL,
	"last_delete_attempt_at" timestamp(3),
	"lease_token" uuid,
	"lease_expires_at" timestamp(3),
	CONSTRAINT "conversation_export_object_address_unique" UNIQUE("bucket_name","s3_key"),
	CONSTRAINT "conversation_export_object_lease_check" CHECK (((((("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("lease_token" is not null)) and (("lease_expires_at" is not null)))))),
	CONSTRAINT "conversation_export_object_attempts_check" CHECK ((("delete_attempts" >= 0) and ("generation_attempt" >= 0))),
	CONSTRAINT "conversation_export_object_deleted_check" CHECK (((("object_deleted_at" is null)) or (("cleanup_requested_at" is not null))))
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "qv_calculation_state" (
	"conversation_id" integer PRIMARY KEY,
	"generation" integer DEFAULT 0 NOT NULL,
	"current_calculation_id" uuid,
	CONSTRAINT "qv_calculation_state_generation_check" CHECK ("generation" >= 0)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "qv_input_allocation" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	"item_slug_id" varchar(8),
	"votes" smallint NOT NULL,
	CONSTRAINT "qv_input_allocation_pkey" PRIMARY KEY("snapshot_id","ballot_index","item_slug_id"),
	CONSTRAINT "qv_input_allocation_votes_check" CHECK ((("votes" <> 0) and ("votes" >= -10) and ("votes" <= 10)))
);
--> statement-breakpoint
CREATE TABLE "qv_input_ballot" (
	"snapshot_id" uuid,
	"ballot_index" integer,
	CONSTRAINT "qv_input_ballot_pkey" PRIMARY KEY("snapshot_id","ballot_index"),
	CONSTRAINT "qv_input_ballot_index_check" CHECK ("ballot_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "qv_input_item" (
	"snapshot_id" uuid,
	"item_slug_id" varchar(8),
	"source_version" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	CONSTRAINT "qv_input_item_pkey" PRIMARY KEY("snapshot_id","item_slug_id"),
	CONSTRAINT "qv_input_item_position_check" CHECK ("position" >= 0)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "qv_live_stats" (
	"conversation_id" integer PRIMARY KEY,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"refreshed_at" timestamp(3),
	"retry_after" timestamp(3),
	CONSTRAINT "qv_live_stats_count_check" CHECK ("participant_count" >= 0),
	CONSTRAINT "qv_live_stats_revision_check" CHECK ("revision" >= 0)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "qv_result_item" (
	"snapshot_id" uuid,
	"item_slug_id" varchar(8),
	"support_units" bigint NOT NULL,
	"opposition_units" bigint NOT NULL,
	"net_units" bigint NOT NULL,
	"supporting_participant_count" integer NOT NULL,
	"opposing_participant_count" integer NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "qv_result_item_pkey" PRIMARY KEY("snapshot_id","item_slug_id"),
	CONSTRAINT "qv_result_item_totals_check" CHECK ((("support_units" >= 0) and ("opposition_units" >= 0) and ("net_units" = "support_units" - "opposition_units") and ("supporting_participant_count" >= 0) and ("opposing_participant_count" >= 0) and ("rank" >= 1)))
);
--> statement-breakpoint
CREATE TABLE "qv_stats_refresh" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qv_stats_refresh_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"processed_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "ranking_input_answer" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	"position" integer,
	"best_slug_id" varchar(8) NOT NULL,
	"worst_slug_id" varchar(8) NOT NULL,
	"candidate_set" text[] NOT NULL,
	"effective_candidate_set" text[] NOT NULL,
	CONSTRAINT "ranking_input_answer_pkey" PRIMARY KEY("input_snapshot_id","participant_index","position"),
	CONSTRAINT "ranking_input_answer_choices_check" CHECK ((("position" >= 0) and ("best_slug_id" <> "worst_slug_id"))),
	CONSTRAINT "ranking_input_answer_candidates_check" CHECK (((cardinality("candidate_set") BETWEEN 2 AND 4) and (cardinality("effective_candidate_set") BETWEEN 2 AND 4) and ("candidate_set" @> "effective_candidate_set") and ("effective_candidate_set" @> ARRAY["best_slug_id"::text, "worst_slug_id"::text])))
);
--> statement-breakpoint
CREATE TABLE "ranking_input_item" (
	"input_snapshot_id" uuid,
	"item_slug_id" varchar(8),
	"position" integer NOT NULL,
	CONSTRAINT "ranking_input_item_pkey" PRIMARY KEY("input_snapshot_id","item_slug_id"),
	CONSTRAINT "ranking_input_item_position_unique" UNIQUE("input_snapshot_id","position"),
	CONSTRAINT "ranking_input_item_position_check" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ranking_input_participant" (
	"input_snapshot_id" uuid,
	"participant_index" integer,
	CONSTRAINT "ranking_input_participant_pkey" PRIMARY KEY("input_snapshot_id","participant_index"),
	CONSTRAINT "ranking_input_participant_index_check" CHECK ("participant_index" >= 0)
);
--> statement-breakpoint
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
	CONSTRAINT "ranking_input_snapshot_bounds_check" CHECK ((("participant_count" >= 0) and ("scoring_input_revision" >= 0) and ("algorithm_version" >= 1) and ("item_count" >= 0) and ("answer_count" >= 0))),
	CONSTRAINT "ranking_input_published_sealed_check" CHECK (((("stats_snapshot_id" is null)) or (("sealed_at" is not null))))
);
--> statement-breakpoint
CREATE TABLE "retired_device_key" (
	"did_write" varchar(1000) PRIMARY KEY,
	"retired_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maxdiff_comparison" RENAME TO "comparison_answer";--> statement-breakpoint
ALTER TABLE "maxdiff_result" RENAME TO "comparison_response";--> statement-breakpoint
ALTER TABLE "maxdiff_user_entity_score" RENAME TO "comparison_user_entity_score";--> statement-breakpoint
ALTER TABLE "comparison_answer" RENAME COLUMN "maxdiff_result_id" TO "comparison_response_id";--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME COLUMN "maxdiff_result_id" TO "comparison_response_id";--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_auto_provisioned_for_organization_id_unique";--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_display_score_check" TO "comparison_user_entity_score_display_score_check";--> statement-breakpoint
ALTER INDEX "maxdiff_comparison_result_idx" RENAME TO "comparison_answer_response_idx";--> statement-breakpoint
ALTER INDEX "maxdiff_comparison_active_result_position_unique" RENAME TO "comparison_answer_active_response_position_unique";--> statement-breakpoint
ALTER INDEX "maxdiff_result_conversation_idx" RENAME TO "comparison_response_conversation_idx";--> statement-breakpoint
ALTER INDEX "maxdiff_user_entity_score_result_score_idx" RENAME TO "comparison_user_entity_score_response_score_idx";--> statement-breakpoint
ALTER INDEX "maxdiff_user_entity_score_deleted_idx" RENAME TO "comparison_user_entity_score_deleted_idx";--> statement-breakpoint
DROP INDEX "maxdiff_result_complete_idx";--> statement-breakpoint
ALTER TABLE "comparison_answer" RENAME CONSTRAINT "maxdiff_comparison_maxdiff_result_id_maxdiff_result_id_fk" TO "comparison_answer_response_fk";--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_maxdiff_result_id_f" TO "comparison_user_entity_score_response_fk";--> statement-breakpoint
ALTER TABLE "vote" RENAME CONSTRAINT "vote_current_content_id_vote_content_id_fk" TO "vote_participant_account_fk";--> statement-breakpoint
ALTER TABLE "comparison_response" ADD COLUMN "detached_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD COLUMN "sender_purged_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ADD COLUMN "source_data_generation" integer;--> statement-breakpoint
ALTER TABLE "conversation_import" ADD COLUMN "requester_purged_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "deleted_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "credit_voting_config_id" integer;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "prioritization_type" text;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "deleted_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "account_hidden_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "organization_membership" ADD COLUMN "role" "organization_role" NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "retired_for_account_deletion_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "phone" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "polis_conversation_config" ADD COLUMN "allow_participant_statements" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "retired_for_account_deletion_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "allow_participant_statements" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "deleted_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "account_hidden_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" ADD COLUMN "replay_floor_delivery_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "realtime_event_outbox" ADD COLUMN "delivered_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "contribution_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_requested_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recoverable_until" timestamp(3);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "purge_started_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "withdrawn_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "retired_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "zk_passport" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "conversation_type";--> statement-breakpoint
CREATE TYPE "conversation_type" AS ENUM('polis', 'prioritizing');--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DATA TYPE "conversation_type" USING "conversation_type"::"conversation_type";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DEFAULT 'polis'::"conversation_type";--> statement-breakpoint
ALTER TABLE "ranking_score" DROP COLUMN "group_sources_snapshot";--> statement-breakpoint
ALTER TABLE "auth_attempt_phone" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "auth_attempt_phone" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_report" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_report" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "last_reacted_at" SET DATA TYPE timestamp(0) USING "last_reacted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_topic" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "device" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "device" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "notification_new_opinion" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_moderation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_moderation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_report" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_report" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion" ALTER COLUMN "last_reacted_at" SET DATA TYPE timestamp(0) USING "last_reacted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "phone" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "phone" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_mute_preference" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "vote_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "vote" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "vote" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "zk_passport" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "zk_passport" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "followed_topic" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "topic" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_spoken_languages" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_spoken_languages" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "event_ticket" ALTER COLUMN "verified_at" SET DATA TYPE timestamp(0) USING "verified_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "event_ticket" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "event_ticket" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_import" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_import" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_import" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "notification_export" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "notification_import" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "auth_attempt_email" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "auth_attempt_email" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "email" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "email" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "comparison_response" ALTER COLUMN "participant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "comparison_response" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "comparison_response" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_score" ALTER COLUMN "computed_at" SET DATA TYPE timestamp(0) USING "computed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_score" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "comparison_answer" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "otp_phone_destination_state" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "otp_phone_destination_state" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_answer" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_answer" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_config" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_config" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_config" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_option" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_option" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_response" ALTER COLUMN "completed_at" SET DATA TYPE timestamp(0) USING "completed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_response" ALTER COLUMN "withdrawn_at" SET DATA TYPE timestamp(0) USING "withdrawn_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_response" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_response" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_artifact" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_artifact" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "collecting_ends_at" SET DATA TYPE timestamp(0) USING "collecting_ends_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "next_attempt_at" SET DATA TYPE timestamp(0) USING "next_attempt_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "started_at" SET DATA TYPE timestamp(0) USING "started_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "heartbeat_at" SET DATA TYPE timestamp(0) USING "heartbeat_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "completed_at" SET DATA TYPE timestamp(0) USING "completed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "failed_at" SET DATA TYPE timestamp(0) USING "failed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request_file" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "expires_at" SET DATA TYPE timestamp(0) USING "expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "started_notified_at" SET DATA TYPE timestamp(0) USING "started_notified_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "completed_notified_at" SET DATA TYPE timestamp(0) USING "completed_notified_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "failed_notified_at" SET DATA TYPE timestamp(0) USING "failed_notified_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_export_request" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_answer_option" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_answer" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_snapshot_opinion" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_snapshot_result" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ALTER COLUMN "computed_at" SET DATA TYPE timestamp(0) USING "computed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_spec" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_work_state" ALTER COLUMN "dirty_since" SET DATA TYPE timestamp(0) USING "dirty_since"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_work_state" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_work_state" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "analysis_work_state" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ALTER COLUMN "activated_at" SET DATA TYPE timestamp(0) USING "activated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_assessment" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_opinion_metrics" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_candidate" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_scope" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_opinion_stats" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_spec" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_user" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_variant" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "starts_at" SET DATA TYPE timestamp(0) USING "starts_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "expires_at" SET DATA TYPE timestamp(0) USING "expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp(0) USING "revoked_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "realtime_event_outbox" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_aggregate_option" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_aggregate_question" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_description_locale_request" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_description_locale_request" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "requested_at" SET DATA TYPE timestamp(0) USING "requested_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "completed_at" SET DATA TYPE timestamp(0) USING "completed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "failed_at" SET DATA TYPE timestamp(0) USING "failed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "content_translation_work" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership_capability" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "followed_topic" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_moderation" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_localization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_localization" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_contact" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_contact" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_contact" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_banner_localization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_banner_localization" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_banner_localization" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_content_translation" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization_localization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization_localization" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization_localization" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_external_organization" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_organization_attribution" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_organization_attribution" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_organization_ownership" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_translation_target_language" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_translation_target_language" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_mute_preference" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_display_language" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user_display_language" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_import_source" ALTER COLUMN "import_created_at" SET DATA TYPE timestamp(0) USING "import_created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_import_source" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_import_source" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" ALTER COLUMN "last_error_at" SET DATA TYPE timestamp(0) USING "last_error_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ALTER COLUMN "last_error_at" SET DATA TYPE timestamp(0) USING "last_error_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "polis_conversation_config" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "polis_conversation_config" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item_content" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item_external_source" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp(0) USING "last_synced_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item_external_source" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_item" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_item" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_checkpoint" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ALTER COLUMN "ranking_item_content_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "device" ALTER COLUMN "session_started_at" SET DATA TYPE timestamp(0) USING "session_started_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document_file" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document_file" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document_file" ALTER COLUMN "object_deleted_at" SET DATA TYPE timestamp(0) USING "object_deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document_localization" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document_localization" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document" ALTER COLUMN "published_at" SET DATA TYPE timestamp(0) USING "published_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project_document" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" ALTER COLUMN "expires_at" SET DATA TYPE timestamp(0) USING "expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" ALTER COLUMN "last_used_at" SET DATA TYPE timestamp(0) USING "last_used_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_conversation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "delivered_at" SET DATA TYPE timestamp(0) USING "delivered_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "delivery_delayed_at" SET DATA TYPE timestamp(0) USING "delivery_delayed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "provider_failed_at" SET DATA TYPE timestamp(0) USING "provider_failed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "permanent_bounced_at" SET DATA TYPE timestamp(0) USING "permanent_bounced_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "complained_at" SET DATA TYPE timestamp(0) USING "complained_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "authorized_at" SET DATA TYPE timestamp(0) USING "authorized_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "finished_at" SET DATA TYPE timestamp(0) USING "finished_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "accepted_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "audience_cutoff_at" SET DATA TYPE timestamp(0) USING "audience_cutoff_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "dispatch_turn_at" SET DATA TYPE timestamp(0) USING "dispatch_turn_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "accepted_at" SET DATA TYPE timestamp(0) USING "accepted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "materialized_at" SET DATA TYPE timestamp(0) USING "materialized_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "sending_started_at" SET DATA TYPE timestamp(0) USING "sending_started_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "stopping_at" SET DATA TYPE timestamp(0) USING "stopping_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "completed_at" SET DATA TYPE timestamp(0) USING "completed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "failed_at" SET DATA TYPE timestamp(0) USING "failed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" ALTER COLUMN "source_event_occurred_at" SET DATA TYPE timestamp(0) USING "source_event_occurred_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" ALTER COLUMN "lifted_at" SET DATA TYPE timestamp(0) USING "lifted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient_conversation" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "next_attempt_at" SET DATA TYPE timestamp(0) USING "next_attempt_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "claimed_at" SET DATA TYPE timestamp(0) USING "claimed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "attempting_at" SET DATA TYPE timestamp(0) USING "attempting_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "provider_accepted_at" SET DATA TYPE timestamp(0) USING "provider_accepted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "skipped_at" SET DATA TYPE timestamp(0) USING "skipped_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "permanent_failed_at" SET DATA TYPE timestamp(0) USING "permanent_failed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ALTER COLUMN "unknown_at" SET DATA TYPE timestamp(0) USING "unknown_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_report" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ALTER COLUMN "lifted_at" SET DATA TYPE timestamp(0) USING "lifted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "next_attempt_at" SET DATA TYPE timestamp(0) USING "next_attempt_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "received_at" SET DATA TYPE timestamp(0) USING "received_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "completed_at" SET DATA TYPE timestamp(0) USING "completed_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "dead_lettered_at" SET DATA TYPE timestamp(0) USING "dead_lettered_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "requested_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "destination_email_credential_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "destination_email_snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "lease_expires_at" SET DATA TYPE timestamp(0) USING "lease_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "authorized_at" SET DATA TYPE timestamp(0) USING "authorized_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "finished_at" SET DATA TYPE timestamp(0) USING "finished_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" ALTER COLUMN "source_event_occurred_at" SET DATA TYPE timestamp(0) USING "source_event_occurred_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" ALTER COLUMN "lifted_at" SET DATA TYPE timestamp(0) USING "lifted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_conversation_preference" ALTER COLUMN "choice_at" SET DATA TYPE timestamp(0) USING "choice_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_conversation_preference" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_global_setting" ALTER COLUMN "paused_at" SET DATA TYPE timestamp(0) USING "paused_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_global_setting" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_global_setting" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_project_preference" ALTER COLUMN "choice_at" SET DATA TYPE timestamp(0) USING "choice_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_project_preference" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_email_update_override_updated_at" SET DATA TYPE timestamp(0) USING "conversation_email_update_override_updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "comparison_answer" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(0) USING "updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "conversation_email_update_default_updated_at" SET DATA TYPE timestamp(0) USING "conversation_email_update_default_updated_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "cancelled_at" SET DATA TYPE timestamp(0) USING "cancelled_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "review_expires_at" SET DATA TYPE timestamp(0) USING "review_expires_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "blocked_phone_number" ALTER COLUMN "blocked_at" SET DATA TYPE timestamp(0) USING "blocked_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "blocked_phone_number" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp(0) USING "revoked_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "auth_restricted_at" SET DATA TYPE timestamp(0) USING "auth_restricted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_alert" ALTER COLUMN "next_attempt_at" SET DATA TYPE timestamp(3) USING "next_attempt_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_alert" ALTER COLUMN "sent_at" SET DATA TYPE timestamp(3) USING "sent_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_alert" ALTER COLUMN "created_at" SET DATA TYPE timestamp(3) USING "created_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" ALTER COLUMN "registration_paused_at" SET DATA TYPE timestamp(3) USING "registration_paused_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" ALTER COLUMN "updated_at" SET DATA TYPE timestamp(3) USING "updated_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_reservation" ALTER COLUMN "reserved_at" SET DATA TYPE timestamp(3) USING "reserved_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" ALTER COLUMN "registration_pause_expires_at" SET DATA TYPE timestamp(3) USING "registration_pause_expires_at"::timestamp(3);--> statement-breakpoint
ALTER TABLE "conversation_project_assignment" ALTER COLUMN "first_assigned_at" SET DATA TYPE timestamp(0) USING "first_assigned_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp(0) USING "deleted_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation_participant" ALTER COLUMN "created_at" SET DATA TYPE timestamp(0) USING "created_at"::timestamp(0);--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "closed_finalized_at" SET DATA TYPE timestamp(0) USING "closed_finalized_at"::timestamp(0);--> statement-breakpoint
DROP INDEX "event_ticket_nullifier_event_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "event_ticket_nullifier_event_active_unique" ON "event_ticket" ("nullifier","event_slug") WHERE "is_deleted" = false;--> statement-breakpoint
DROP INDEX "phone_hash_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "phone_hash_active_unique" ON "phone" ("phone_hash") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));--> statement-breakpoint
DROP INDEX "zk_passport_nullifier_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "zk_passport_nullifier_active_unique" ON "zk_passport" ("nullifier") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));--> statement-breakpoint
DROP INDEX "email_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "email_active_unique" ON "email" ("email") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));--> statement-breakpoint
DROP INDEX "conversation_feed_idx";--> statement-breakpoint
CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;--> statement-breakpoint
DROP INDEX "conversation_import_active_user_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_import_active_user_unique" ON "conversation_import" ("user_id") WHERE "status" = 'processing';--> statement-breakpoint
DROP INDEX "comparison_answer_active_response_position_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_answer_active_response_position_unique" ON "comparison_answer" ("comparison_response_id","position") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "survey_config_active_conversation_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" ("conversation_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_export_artifact_shared_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_artifact_shared_unique" ON "conversation_export_artifact" ("generation_id","file_type","audience") WHERE "subject_user_id" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_export_artifact_requester_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_artifact_requester_unique" ON "conversation_export_artifact" ("generation_id","file_type","audience","subject_user_id") WHERE "subject_user_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "conversation_export_generation_collecting_due_idx";--> statement-breakpoint
CREATE INDEX "conversation_export_generation_collecting_due_idx" ON "conversation_export_generation" ("collecting_ends_at","created_at") WHERE "status" = 'collecting';--> statement-breakpoint
DROP INDEX "conversation_export_generation_queued_due_idx";--> statement-breakpoint
CREATE INDEX "conversation_export_generation_queued_due_idx" ON "conversation_export_generation" ("next_attempt_at","created_at") WHERE "status" = 'queued';--> statement-breakpoint
DROP INDEX "conversation_export_generation_collecting_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_generation_collecting_unique" ON "conversation_export_generation" ("conversation_id") WHERE "status" = 'collecting';--> statement-breakpoint
DROP INDEX "conversation_export_generation_processing_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_generation_processing_unique" ON "conversation_export_generation" ("conversation_id") WHERE "status" = 'processing';--> statement-breakpoint
DROP INDEX "conversation_export_request_active_history_idx";--> statement-breakpoint
CREATE INDEX "conversation_export_request_active_history_idx" ON "conversation_export_request" ("conversation_id","user_id","created_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_export_request_expiry_idx";--> statement-breakpoint
CREATE INDEX "conversation_export_request_expiry_idx" ON "conversation_export_request" ("expires_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_export_request_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_request_active_unique" ON "conversation_export_request" ("conversation_id","user_id") WHERE "status" = 'processing' AND "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "survey_answer_option_answer_option_active_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_option_answer_option_active_uidx" ON "survey_answer_option" ("survey_answer_id","survey_question_option_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "survey_answer_response_question_active_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_response_question_active_uidx" ON "survey_answer" ("survey_response_id","survey_question_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "survey_question_option_active_question_display_order_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_question_option_active_question_display_order_uidx" ON "survey_question_option" ("survey_question_id","display_order") WHERE "current_content_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "survey_question_active_config_display_order_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_question_active_config_display_order_uidx" ON "survey_question" ("survey_config_id","display_order") WHERE "current_content_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX "analysis_work_state_lease_expiry_idx";--> statement-breakpoint
CREATE INDEX "analysis_work_state_lease_expiry_idx" ON "analysis_work_state" ("lease_expires_at") WHERE ("running_data_generation" is not null);--> statement-breakpoint
DROP INDEX "analysis_work_state_running_conversation_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_work_state_running_conversation_unique" ON "analysis_work_state" ("conversation_id") WHERE ("running_data_generation" is not null);--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_first_displayable_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_first_displayable_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id") WHERE "reason" = 'first_displayable_analysis';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_group_count_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_group_count_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","group_count") WHERE "reason" = 'first_group_count_available';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_default_change_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_default_change_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_view_snapshot_id") WHERE "reason" = 'default_group_count_changed';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_participant_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_participant_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","participant_milestone") WHERE "reason" = 'major_participation_milestone';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_vote_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_vote_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_id","opinion_group_spec_id","vote_milestone") WHERE "reason" = 'major_vote_milestone';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_checkpoint_closed_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_snapshot_checkpoint_closed_unique" ON "conversation_view_snapshot_checkpoint_reason" ("conversation_view_snapshot_id") WHERE "reason" = 'conversation_closed';--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_latest_active_idx";--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_latest_spec_active_idx";--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE ("activated_at" is not null);--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_analysis_snapshot_idx";--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_analysis_snapshot_idx" ON "conversation_view_snapshot" ("analysis_snapshot_id") WHERE ("analysis_snapshot_id" is not null);--> statement-breakpoint
DROP INDEX "opinion_group_description_translation_work_lease_expiry_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_description_translation_work_lease_expiry_idx" ON "opinion_group_description_translation_work" ("lease_expires_at") WHERE ("lease_token" is not null);--> statement-breakpoint
DROP INDEX "opinion_group_lineage_description_work_lease_expiry_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_lineage_description_work_lease_expiry_idx" ON "opinion_group_lineage_description_work" ("lease_expires_at") WHERE ("lease_token" is not null);--> statement-breakpoint
DROP INDEX "opinion_author_active_created_id_idx";--> statement-breakpoint
CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" ("author_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);--> statement-breakpoint
DROP INDEX "opinion_conversation_active_created_id_idx";--> statement-breakpoint
CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" ("conversation_id","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);--> statement-breakpoint
DROP INDEX "vote_author_active_updated_id_idx";--> statement-breakpoint
CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" ("author_id","updated_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);--> statement-breakpoint
DROP INDEX "realtime_event_outbox_conversation_replay_idx";--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');--> statement-breakpoint
DROP INDEX "opinion_group_description_translation_work_claim_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_description_translation_work_claim_idx" ON "opinion_group_description_translation_work" ("conversation_id","updated_at","id") WHERE ("lease_token" is null);--> statement-breakpoint
DROP INDEX "opinion_group_lineage_description_work_claim_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_lineage_description_work_claim_idx" ON "opinion_group_lineage_description_work" ("conversation_id","updated_at","id") WHERE ("lease_token" is null);--> statement-breakpoint
DROP INDEX "comparison_user_entity_score_response_score_idx";--> statement-breakpoint
CREATE INDEX "comparison_user_entity_score_response_score_idx" ON "comparison_user_entity_score" ("comparison_response_id","score" desc) WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "og_candidate_desc_locale_request_translation_updated_idx";--> statement-breakpoint
CREATE INDEX "og_candidate_desc_locale_request_translation_updated_idx" ON "opinion_group_candidate_description_locale_request" ("updated_at","id") WHERE "locale" <> 'en';--> statement-breakpoint
DROP INDEX "opinion_group_opinion_stats_representative_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_opinion_stats_representative_idx" ON "opinion_group_opinion_stats" ("group_id","representative_probability_agreement" DESC NULLS LAST,"analysis_snapshot_opinion_id") WHERE ((("representative_agreement_type" is not null)) and (("representative_probability_agreement" is not null)));--> statement-breakpoint
DROP INDEX "content_translation_work_conversation_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_conversation_unique" ON "content_translation_work" ("conversation_content_id","display_language_code") WHERE (("source_kind" = 'conversation') and (("conversation_content_id" is not null)));--> statement-breakpoint
DROP INDEX "content_translation_work_opinion_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_opinion_unique" ON "content_translation_work" ("opinion_content_id","display_language_code") WHERE (("source_kind" = 'opinion') and (("opinion_content_id" is not null)));--> statement-breakpoint
DROP INDEX "content_translation_work_survey_question_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_survey_question_unique" ON "content_translation_work" ("survey_question_content_id","survey_question_option_content_ids","display_language_code") WHERE (("source_kind" = 'survey_question') and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)));--> statement-breakpoint
DROP INDEX "content_translation_work_claim_idx";--> statement-breakpoint
CREATE INDEX "content_translation_work_claim_idx" ON "content_translation_work" ("priority_rank","updated_at","id") WHERE "status" = 'pending';--> statement-breakpoint
DROP INDEX "content_translation_work_lease_expiry_idx";--> statement-breakpoint
CREATE INDEX "content_translation_work_lease_expiry_idx" ON "content_translation_work" ("lease_expires_at","id") WHERE "status" = 'running';--> statement-breakpoint
DROP INDEX "conversation_project_timeline_idx";--> statement-breakpoint
CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);--> statement-breakpoint
DROP INDEX "content_translation_work_project_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_project_unique" ON "content_translation_work" ("project_content_id","display_language_code") WHERE (("source_kind" = 'project') and (("project_content_id" is not null)));--> statement-breakpoint
DROP INDEX "conversation_moderation_active_conversation_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_moderation_active_conversation_unique" ON "conversation_moderation" ("conversation_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "conversation_translation_target_language_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_translation_target_language_active_unique" ON "conversation_translation_target_language" ("conversation_id","language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "followed_topic_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "followed_topic_active_unique" ON "followed_topic" ("user_id","topic_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "opinion_moderation_active_opinion_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_moderation_active_opinion_unique" ON "opinion_moderation" ("opinion_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "organization_membership_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "organization_membership_active_unique" ON "organization_membership" ("user_id","organization_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "organization_active_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "organization_active_slug_unique" ON "organization" ("slug") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "project_contact_project_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_contact_project_active_unique" ON "project_contact" ("project_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_content_banner_localization_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_content_banner_localization_active_unique" ON "project_content_banner_localization" ("project_content_id","language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_content_translation_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_content_translation_active_unique" ON "project_content_translation" ("project_content_id","display_language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_external_org_loc_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_external_org_loc_active_unique" ON "project_external_organization_localization" ("external_organization_id","language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_organization_attribution_order_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_attribution_order_active_unique" ON "project_organization_attribution" ("project_id","role","sort_order") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_organization_attribution_real_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_attribution_real_active_unique" ON "project_organization_attribution" ("project_id","role","organization_id") WHERE ((("organization_id" is not null)) and (("deleted_at" is null)));--> statement-breakpoint
DROP INDEX "project_organization_attribution_external_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_attribution_external_active_unique" ON "project_organization_attribution" ("project_id","role","external_organization_id") WHERE ((("external_organization_id" is not null)) and (("deleted_at" is null)));--> statement-breakpoint
DROP INDEX "project_organization_ownership_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_active_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_translation_target_language_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_translation_target_language_active_unique" ON "project_translation_target_language" ("project_id","language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "user_mute_preference_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "user_mute_preference_active_unique" ON "user_mute_preference" ("source_user_id","target_user_id") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "content_translation_work_ranking_item_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_work_ranking_item_unique" ON "content_translation_work" ("ranking_item_content_id","display_language_code") WHERE (("source_kind" = 'ranking_item') and (("ranking_item_content_id" is not null)));--> statement-breakpoint
DROP INDEX "ranking_stats_checkpoint_participant_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_participant_unique" ON "ranking_conversation_stats_checkpoint" ("conversation_id","participant_milestone") WHERE "reason" = 'major_participation_milestone';--> statement-breakpoint
DROP INDEX "ranking_stats_checkpoint_vote_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_vote_unique" ON "ranking_conversation_stats_checkpoint" ("conversation_id","vote_milestone") WHERE "reason" = 'major_vote_milestone';--> statement-breakpoint
DROP INDEX "ranking_stats_checkpoint_closed_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_closed_unique" ON "ranking_conversation_stats_checkpoint" ("stats_snapshot_id") WHERE "reason" = 'conversation_closed';--> statement-breakpoint
DROP INDEX "ranking_conversation_stats_snapshot_latest_idx";--> statement-breakpoint
CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" ("conversation_id","created_at" DESC,"id" DESC) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "realtime_event_outbox_ranking_replay_idx";--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" = 'conversation_ranking_stats_updated';--> statement-breakpoint
DROP INDEX "project_document_file_audience_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" ("project_document_id","audience") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "project_document_file_deletion_queue_idx";--> statement-breakpoint
CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" ("project_document_id") WHERE "deleted_at" IS NOT NULL AND "object_deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "project_document_file_pending_created_idx";--> statement-breakpoint
CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" ("created_at","project_document_id") WHERE "status" = 'pending' AND "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "project_document_localization_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" ("project_document_id","language_code") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "conversation_email_update_attempt_provider_message_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_attempt_provider_message_unique" ON "conversation_email_update_delivery_attempt" ("provider_message_id") WHERE ("provider_message_id" is not null);--> statement-breakpoint
DROP INDEX "conversation_email_update_delivery_project_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_delivery_project_active_unique" ON "conversation_email_update_delivery" ("project_id") WHERE "status" IN ('preparing', 'queued', 'sending', 'stopping');--> statement-breakpoint
DROP INDEX "conversation_email_update_email_suppression_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_email_suppression_active_unique" ON "conversation_email_update_email_suppression" ("canonical_email","reason") WHERE ("lifted_at" is null);--> statement-breakpoint
DROP INDEX "conversation_email_update_safety_organization_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_organization_active_unique" ON "conversation_email_update_scope_safety_block" ("organization_id") WHERE "target_kind" = 'organization' AND "lifted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_email_update_safety_project_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_project_active_unique" ON "conversation_email_update_scope_safety_block" ("project_id") WHERE "target_kind" = 'project' AND "lifted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_email_update_safety_conversation_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_conversation_active_unique" ON "conversation_email_update_scope_safety_block" ("conversation_id") WHERE "target_kind" = 'conversation' AND "lifted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_email_update_safety_facilitator_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_facilitator_active_unique" ON "conversation_email_update_scope_safety_block" ("facilitator_user_id") WHERE "target_kind" = 'facilitator' AND "lifted_at" IS NULL;--> statement-breakpoint
DROP INDEX "conversation_email_update_test_provider_message_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_test_provider_message_unique" ON "conversation_email_update_test_attempt" ("provider_message_id") WHERE ("provider_message_id" is not null);--> statement-breakpoint
DROP INDEX "conversation_email_update_user_complaint_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_user_complaint_active_unique" ON "conversation_email_update_user_complaint_suppression" ("user_id") WHERE ("lifted_at" is null);--> statement-breakpoint
DROP INDEX "email_active_primary_user_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" ("user_id") WHERE "type" = 'primary' AND "is_deleted" = false;--> statement-breakpoint
DROP INDEX "organization_membership_all_project_capability_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" ("organization_membership_id","capability") WHERE ("deleted_at" is null);--> statement-breakpoint
DROP INDEX "conversation_email_update_test_lease_expiry_idx";--> statement-breakpoint
CREATE INDEX "conversation_email_update_test_lease_expiry_idx" ON "conversation_email_update_test_attempt" ("lease_expires_at") WHERE "status" IN ('claimed', 'attempting');--> statement-breakpoint
DROP INDEX "comparison_user_entity_score_deleted_idx";--> statement-breakpoint
CREATE INDEX "comparison_user_entity_score_deleted_idx" ON "comparison_user_entity_score" ("deleted_at","id") WHERE ("deleted_at" is not null);--> statement-breakpoint
DROP INDEX "ranking_stats_item_deleted_idx";--> statement-breakpoint
CREATE INDEX "ranking_stats_item_deleted_idx" ON "ranking_conversation_stats_item" ("deleted_at","id") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
DROP INDEX "ranking_stats_snapshot_deleted_idx";--> statement-breakpoint
CREATE INDEX "ranking_stats_snapshot_deleted_idx" ON "ranking_conversation_stats_snapshot" ("deleted_at","id") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
DROP INDEX "realtime_event_outbox_pending_delivery_idx";--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" ("id") WHERE ("delivery_id" is null);--> statement-breakpoint
DROP INDEX "opinion_group_scope_latest_lineage_idx";--> statement-breakpoint
CREATE INDEX "opinion_group_scope_latest_lineage_idx" ON "opinion_group" ("scope_id","candidate_id" DESC NULLS LAST) WHERE ("lineage_id" is not null);--> statement-breakpoint
DROP INDEX "conversation_vote_buffer_drain_idx";--> statement-breakpoint
CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_entity_slug_id_unique" TO "comparison_user_entity_score_response_entity_unique";--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_id_account_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "vote_content" ADD CONSTRAINT "vote_content_id_owner_unique" UNIQUE("id","vote_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_credit_voting_config_id_key" UNIQUE("credit_voting_config_id");--> statement-breakpoint
CREATE INDEX "conversation_export_object_artifact_idx" ON "conversation_export_object" ("artifact_id");--> statement-breakpoint
CREATE INDEX "conversation_export_object_cleanup_idx" ON "conversation_export_object" ("cleanup_requested_at","id") WHERE ("object_deleted_at" is null);--> statement-breakpoint
CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);--> statement-breakpoint
CREATE INDEX "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);--> statement-breakpoint
CREATE INDEX "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));--> statement-breakpoint
CREATE INDEX "phone_user_idx" ON "phone" ("user_id");--> statement-breakpoint
CREATE INDEX "project_contact_organization_idx" ON "project_contact" ("organization_id") WHERE ("organization_id" is not null);--> statement-breakpoint
CREATE INDEX "project_organization_attribution_organization_idx" ON "project_organization_attribution" ("organization_id") WHERE ("organization_id" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);--> statement-breakpoint
CREATE INDEX "qv_allocation_deleted_idx" ON "qv_allocation" ("deleted_at") WHERE ("deleted_at" is not null);--> statement-breakpoint
CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");--> statement-breakpoint
CREATE INDEX "qv_command_deleted_idx" ON "qv_response_command" ("deleted_at") WHERE ("deleted_at" is not null);--> statement-breakpoint
CREATE INDEX "qv_response_conversation_active_idx" ON "qv_response" ("conversation_id") WHERE ((("current_version_id" is not null)) and (("deleted_at" is null)) and (("account_hidden_at" is null)));--> statement-breakpoint
CREATE INDEX "qv_version_response_idx" ON "qv_response_version" ("response_id");--> statement-breakpoint
CREATE INDEX "qv_version_deleted_idx" ON "qv_response_version" ("deleted_at") WHERE ("deleted_at" is not null);--> statement-breakpoint
CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" ("conversation_id","id") WHERE ("processed_at" is null);--> statement-breakpoint
CREATE INDEX "ranking_input_snapshot_conversation_idx" ON "ranking_input_snapshot" ("conversation_id","stats_snapshot_id");--> statement-breakpoint
CREATE INDEX "ranking_input_snapshot_prepared_idx" ON "ranking_input_snapshot" ("conversation_id","scoring_input_revision","created_at","id") WHERE ((("stats_snapshot_id" is null)) and (("sealed_at" is not null)));--> statement-breakpoint
CREATE INDEX "ranking_score_conversation_idx" ON "ranking_score" ("conversation_id","id");--> statement-breakpoint
CREATE INDEX "ranking_score_unclassified_context_idx" ON "ranking_score" ("id") WHERE ((("user_weights_snapshot" is not null)) and ("user_weights_snapshot" <> 'null'::jsonb));--> statement-breakpoint
CREATE INDEX "survey_response_participant_idx" ON "survey_response" ("participant_id");--> statement-breakpoint
CREATE INDEX "zk_passport_user_idx" ON "zk_passport" ("user_id");--> statement-breakpoint
ALTER TABLE "conversation_export_object" ADD CONSTRAINT "conversation_export_object_PtLlWo75via5_fkey" FOREIGN KEY ("artifact_id") REFERENCES "conversation_export_artifact"("id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_nju61H63Fkmf_fkey" FOREIGN KEY ("credit_voting_config_id") REFERENCES "credit_voting_config"("id");--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_participant_account_fk" FOREIGN KEY ("participant_id","user_id") REFERENCES "conversation_participant"("id","user_id");--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_version_conversation_fk" FOREIGN KEY ("version_id","conversation_id") REFERENCES "qv_response_version"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_item_conversation_fk" FOREIGN KEY ("item_id","conversation_id") REFERENCES "ranking_item"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_content_owner_fk" FOREIGN KEY ("content_id","item_id") REFERENCES "ranking_item_content"("id","ranking_item_id");--> statement-breakpoint
ALTER TABLE "qv_calculation_state" ADD CONSTRAINT "qv_calculation_state_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");--> statement-breakpoint
ALTER TABLE "qv_calculation_state" ADD CONSTRAINT "qv_current_calculation_conversation_fk" FOREIGN KEY ("current_calculation_id","conversation_id") REFERENCES "qv_calculation"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "qv_calculation" ADD CONSTRAINT "qv_calculation_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");--> statement-breakpoint
ALTER TABLE "qv_calculation" ADD CONSTRAINT "qv_calculation_input_owner_fk" FOREIGN KEY ("input_snapshot_id","id") REFERENCES "qv_input_snapshot"("id","calculation_id");--> statement-breakpoint
ALTER TABLE "qv_input_allocation" ADD CONSTRAINT "qv_input_allocation_ballot_fk" FOREIGN KEY ("snapshot_id","ballot_index") REFERENCES "qv_input_ballot"("snapshot_id","ballot_index");--> statement-breakpoint
ALTER TABLE "qv_input_allocation" ADD CONSTRAINT "qv_input_allocation_item_fk" FOREIGN KEY ("snapshot_id","item_slug_id") REFERENCES "qv_input_item"("snapshot_id","item_slug_id");--> statement-breakpoint
ALTER TABLE "qv_input_ballot" ADD CONSTRAINT "qv_input_ballot_snapshot_id_qv_input_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "qv_input_snapshot"("id");--> statement-breakpoint
ALTER TABLE "qv_input_item" ADD CONSTRAINT "qv_input_item_snapshot_id_qv_input_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "qv_input_snapshot"("id");--> statement-breakpoint
ALTER TABLE "qv_input_snapshot" ADD CONSTRAINT "qv_input_snapshot_calculation_id_qv_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "qv_calculation"("id");--> statement-breakpoint
ALTER TABLE "qv_live_stats" ADD CONSTRAINT "qv_live_stats_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");--> statement-breakpoint
ALTER TABLE "qv_response_command" ADD CONSTRAINT "qv_response_command_response_id_qv_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "qv_response"("id");--> statement-breakpoint
ALTER TABLE "qv_response_command" ADD CONSTRAINT "qv_command_result_owner_fk" FOREIGN KEY ("result_version_id","response_id") REFERENCES "qv_response_version"("id","response_id");--> statement-breakpoint
ALTER TABLE "qv_response" ADD CONSTRAINT "qv_response_participant_conversation_fk" FOREIGN KEY ("participant_id","conversation_id") REFERENCES "conversation_participant"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "qv_response" ADD CONSTRAINT "qv_response_current_version_owner_fk" FOREIGN KEY ("current_version_id","id") REFERENCES "qv_response_version"("id","response_id");--> statement-breakpoint
ALTER TABLE "qv_response_version" ADD CONSTRAINT "qv_version_response_conversation_fk" FOREIGN KEY ("response_id","conversation_id") REFERENCES "qv_response"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "qv_result_item" ADD CONSTRAINT "qv_result_input_item_fk" FOREIGN KEY ("snapshot_id","item_slug_id") REFERENCES "qv_input_item"("snapshot_id","item_slug_id");--> statement-breakpoint
ALTER TABLE "qv_stats_refresh" ADD CONSTRAINT "qv_stats_refresh_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_participant_fk" FOREIGN KEY ("input_snapshot_id","participant_index") REFERENCES "ranking_input_participant"("input_snapshot_id","participant_index");--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_best_item_fk" FOREIGN KEY ("input_snapshot_id","best_slug_id") REFERENCES "ranking_input_item"("input_snapshot_id","item_slug_id");--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_worst_item_fk" FOREIGN KEY ("input_snapshot_id","worst_slug_id") REFERENCES "ranking_input_item"("input_snapshot_id","item_slug_id");--> statement-breakpoint
ALTER TABLE "ranking_input_item" ADD CONSTRAINT "ranking_input_item_mDlic55lBiV8_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "ranking_input_snapshot"("id");--> statement-breakpoint
ALTER TABLE "ranking_input_participant" ADD CONSTRAINT "ranking_input_participant_2En63jjmaTz0_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "ranking_input_snapshot"("id");--> statement-breakpoint
ALTER TABLE "ranking_input_snapshot" ADD CONSTRAINT "ranking_input_snapshot_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");--> statement-breakpoint
ALTER TABLE "ranking_input_snapshot" ADD CONSTRAINT "ranking_input_stats_conversation_fk" FOREIGN KEY ("stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_current_content_owner_fk" FOREIGN KEY ("current_content_id","id") REFERENCES "vote_content"("id","vote_id");--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_participant_account_fk", ADD CONSTRAINT "vote_participant_account_fk" FOREIGN KEY ("participant_id","author_id") REFERENCES "conversation_participant"("id","user_id");--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_position_check" CHECK ("position" >= 0);--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_distinct_choices_check" CHECK ("best_slug_id" <> "worst_slug_id");--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_candidates_check" CHECK (((cardinality("candidate_set") BETWEEN 2 AND 4) and ("candidate_set" @> ARRAY["best_slug_id"::text, "worst_slug_id"::text])));--> statement-breakpoint
ALTER TABLE "comparison_response" ADD CONSTRAINT "comparison_response_account_binding_check" CHECK (((((("participant_id" is not null)) and (("detached_at" is null)))) or (((("participant_id" is null)) and (("detached_at" is not null))))));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD CONSTRAINT "email_update_test_sender_provenance_check" CHECK (((((("sender_purged_at" is null)) and (("requested_by_user_id" is not null)) and (("destination_email_credential_id" is not null)) and (("destination_email_snapshot" is not null)))) or (((("sender_purged_at" is not null)) and (("requested_by_user_id" is null)) and (("destination_email_credential_id" is null)) and (("destination_email_snapshot" is null)) and ("status" not in ('pending', 'claimed', 'attempting'))))));--> statement-breakpoint
ALTER TABLE "conversation_import" ADD CONSTRAINT "conversation_import_requester_check" CHECK (((((("user_id" is not null)) and (("requester_purged_at" is null)))) or (((("user_id" is null)) and (("requester_purged_at" is not null)) and (("conversation_id" is not null))))));--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))));--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)));--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_identity_check" CHECK (((("user_id" is not null)) or (("participant_id" is not null))));--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "opinion_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null))));--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "opinion_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))));--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_user_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0))))));--> statement-breakpoint
ALTER TABLE "phone" ADD CONSTRAINT "phone_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)));--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_organization_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0))))));--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD CONSTRAINT "ranking_stats_item_redacted_source_check" CHECK (((("ranking_item_content_id" is not null)) or (("external_url" is null))));--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null))));--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null))));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_contribution_revision_check" CHECK ("contribution_revision" >= 0);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_recovery_lifecycle_check" CHECK (((((((("deletion_requested_at" is null)) and (("recoverable_until" is null)))) or ((("is_deleted" = true) and (("deletion_reason" is not null)) and ("deletion_reason" = 'account_deletion') and (("deletion_requested_at" is not null)) and (("recoverable_until" is not null)) and ("recoverable_until" = "deletion_requested_at" + interval '15 days'))))) and (((("purge_started_at" is null)) or ("is_deleted" = true)))));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_deletion_reason_check" CHECK (((("deletion_reason" is null)) or ((("is_deleted" = true) and (("deleted_at" is not null)) and ("deletion_reason" in ('account_deletion', 'guest_merge'))))));--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_inactive_intent_check" CHECK (((((("withdrawn_at" is null)) and (("retired_at" is null)))) or (("current_content_id" is null))));--> statement-breakpoint
ALTER TABLE "zk_passport" ADD CONSTRAINT "zk_passport_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true)));--> statement-breakpoint
ALTER TABLE "auth_attempt_phone" DROP CONSTRAINT "check_two_digits", ADD CONSTRAINT "check_two_digits" CHECK ("last_two_digits" BETWEEN 0 and 99);--> statement-breakpoint
ALTER TABLE "phone" DROP CONSTRAINT "check_two_digits", ADD CONSTRAINT "check_two_digits" CHECK ("last_two_digits" BETWEEN 0 and 99);--> statement-breakpoint
ALTER TABLE "auth_attempt_email" DROP CONSTRAINT "auth_attempt_email_canonical_check", ADD CONSTRAINT "auth_attempt_email_canonical_check" CHECK ("email" = lower(btrim("email")));--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_canonical_check", ADD CONSTRAINT "email_canonical_check" CHECK ("email" = lower(btrim("email")));--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" DROP CONSTRAINT "otp_email_destination_canonical_check", ADD CONSTRAINT "otp_email_destination_canonical_check" CHECK ("email" = lower(btrim("email")));--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" DROP CONSTRAINT "analysis_input_snapshot_counts_check", ADD CONSTRAINT "analysis_input_snapshot_counts_check" CHECK ("opinion_count" >= 0 AND "participant_count" >= 0 AND "vote_count" >= 0);--> statement-breakpoint
ALTER TABLE "analysis_snapshot_result" DROP CONSTRAINT "analysis_snapshot_result_reason_check", ADD CONSTRAINT "analysis_snapshot_result_reason_check" CHECK (("outcome" = 'insufficient_data' AND "outcome_reason" IS NOT NULL) OR ("outcome" = 'success' AND "outcome_reason" IS NULL));--> statement-breakpoint
ALTER TABLE "analysis_work_state" DROP CONSTRAINT "analysis_work_state_running_lease_check", ADD CONSTRAINT "analysis_work_state_running_lease_check" CHECK (((((("running_data_generation" is null)) and (("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("running_data_generation" is not null)) and (("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))));--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" DROP CONSTRAINT "conversation_view_snapshot_checkpoint_reason_group_count_check", ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_group_count_check" CHECK ((("reason" IN ('first_group_count_available', 'default_group_count_changed') AND "group_count" IS NOT NULL AND "group_count" >= 2 AND ("previous_group_count" IS NULL OR "previous_group_count" >= 2)) OR ("reason" NOT IN ('first_group_count_available', 'default_group_count_changed') AND "group_count" IS NULL AND "previous_group_count" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" DROP CONSTRAINT "conversation_view_snapshot_checkpoint_reason_milestone_check", ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_milestone_check" CHECK ((("reason" = 'major_participation_milestone' AND "previous_group_count" IS NULL AND "participant_count" IS NOT NULL AND "participant_milestone" IS NOT NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL AND "participant_count" >= "participant_milestone" AND "participant_milestone" > 0) OR ("reason" = 'major_vote_milestone' AND "previous_group_count" IS NULL AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NOT NULL AND "vote_milestone" IS NOT NULL AND "vote_count" >= "vote_milestone" AND "vote_milestone" > 0) OR ("reason" NOT IN ('major_participation_milestone', 'major_vote_milestone') AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot_checkpoint_reason" DROP CONSTRAINT "conversation_view_snapshot_checkpoint_reason_previous_check", ADD CONSTRAINT "conversation_view_snapshot_checkpoint_reason_previous_check" CHECK ((("reason" = 'default_group_count_changed' AND "previous_group_count" IS NOT NULL AND "previous_group_count" <> "group_count" AND "participant_count" IS NULL AND "participant_milestone" IS NULL AND "vote_count" IS NULL AND "vote_milestone" IS NULL) OR ("reason" <> 'default_group_count_changed' AND "previous_group_count" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" DROP CONSTRAINT "conversation_view_snapshot_counts_check", ADD CONSTRAINT "conversation_view_snapshot_counts_check" CHECK ("opinion_count" >= 0 AND "vote_count" >= 0 AND "participant_count" >= 0 AND "total_opinion_count" >= 0 AND "total_vote_count" >= 0 AND "total_participant_count" >= 0 AND "moderated_opinion_count" >= 0 AND "hidden_opinion_count" >= 0);--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" DROP CONSTRAINT "conversation_view_snapshot_preferred_opinion_group_count_check", ADD CONSTRAINT "conversation_view_snapshot_preferred_opinion_group_count_check" CHECK ("preferred_opinion_group_count" IS NULL OR ("preferred_opinion_group_count" >= 2 AND "preferred_opinion_group_count" <= 6));--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_opinion_metrics" DROP CONSTRAINT "opinion_group_candidate_opinion_metrics_majority_check", ADD CONSTRAINT "opinion_group_candidate_opinion_metrics_majority_check" CHECK (("majority_type" IS NULL AND "majority_probability_success" IS NULL) OR ("majority_type" IS NOT NULL AND "majority_probability_success" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_opinion_metrics" DROP CONSTRAINT "opinion_group_candidate_opinion_metrics_rank_check", ADD CONSTRAINT "opinion_group_candidate_opinion_metrics_rank_check" CHECK (("agreement_rank" IS NULL OR "agreement_rank" > 0) AND ("disagreement_rank" IS NULL OR "disagreement_rank" > 0) AND ("divisiveness_rank" IS NULL OR "divisiveness_rank" > 0));--> statement-breakpoint
ALTER TABLE "opinion_group_candidate" DROP CONSTRAINT "opinion_group_candidate_reason_check", ADD CONSTRAINT "opinion_group_candidate_reason_check" CHECK (("outcome" = 'insufficient_data' AND "outcome_reason" IS NOT NULL) OR ("outcome" = 'success' AND "outcome_reason" IS NULL));--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" DROP CONSTRAINT "opinion_group_description_translation_work_running_lease_check", ADD CONSTRAINT "opinion_group_description_translation_work_running_lease_check" CHECK (((((("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))));--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" DROP CONSTRAINT "opinion_group_lineage_description_work_running_lease_check", ADD CONSTRAINT "opinion_group_lineage_description_work_running_lease_check" CHECK (((((("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or (((("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))));--> statement-breakpoint
ALTER TABLE "opinion_group_opinion_stats" DROP CONSTRAINT "opinion_group_opinion_stats_counts_check", ADD CONSTRAINT "opinion_group_opinion_stats_counts_check" CHECK ("num_agrees" >= 0 AND "num_disagrees" >= 0 AND "num_passes" >= 0);--> statement-breakpoint
ALTER TABLE "opinion_group_opinion_stats" DROP CONSTRAINT "opinion_group_opinion_stats_representative_check", ADD CONSTRAINT "opinion_group_opinion_stats_representative_check" CHECK ((("representative_agreement_type" IS NULL AND "representative_probability_agreement" IS NULL AND "representative_number_agreement" IS NULL AND "raw_repness" IS NULL) OR ("representative_agreement_type" IS NOT NULL AND "representative_probability_agreement" IS NOT NULL AND "representative_number_agreement" IS NOT NULL AND "raw_repness" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "opinion_group_variant" DROP CONSTRAINT "opinion_group_variant_group_count_check", ADD CONSTRAINT "opinion_group_variant_group_count_check" CHECK ("group_count" >= 2);--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" DROP CONSTRAINT "survey_aggregate_result_scope_check", ADD CONSTRAINT "survey_aggregate_result_scope_check" CHECK ((((("scope" = 'overall') and (("candidate_id" is null)) and (("group_id" is null)))) or ((("scope" = 'opinion_group') and (("candidate_id" is not null)) and (("group_id" is not null))))));--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" DROP CONSTRAINT "survey_aggregate_result_suppression_check", ADD CONSTRAINT "survey_aggregate_result_suppression_check" CHECK ((((("is_suppressed" = true) and (("suppressed_count" is null)) and (("suppressed_percentage" is null)) and (("suppression_reason" is not null)))) or ((("is_suppressed" = false) and (("suppressed_count" is not null)) and (("suppression_reason" is null))))));--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_source_check", ADD CONSTRAINT "content_translation_work_source_check" CHECK ((((("source_kind" = 'conversation') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is not null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'project') and (("conversation_id" is null)) and (("project_content_id" is not null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'opinion') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is not null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'survey_question') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'ranking_item') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is not null))))));--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_running_lease_check", ADD CONSTRAINT "content_translation_work_running_lease_check" CHECK ((((("status" <> 'running') and (("lease_owner" is null)) and (("lease_token" is null)) and (("lease_expires_at" is null)))) or ((("status" = 'running') and (("lease_owner" is not null)) and (("lease_token" is not null)) and (("lease_expires_at" is not null))))));--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_priority_rank_check", ADD CONSTRAINT "content_translation_work_priority_rank_check" CHECK ("priority_rank" >= 0 AND "priority_rank" <= 2);--> statement-breakpoint
ALTER TABLE "conversation_content" DROP CONSTRAINT "conversation_content_source_metadata_check", ADD CONSTRAINT "conversation_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_content_translation" DROP CONSTRAINT "conversation_content_translation_source_metadata_check", ADD CONSTRAINT "conversation_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "opinion_content" DROP CONSTRAINT "opinion_content_source_metadata_check", ADD CONSTRAINT "opinion_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "opinion_content_translation" DROP CONSTRAINT "opinion_content_translation_source_metadata_check", ADD CONSTRAINT "opinion_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_content" DROP CONSTRAINT "survey_question_content_source_metadata_check", ADD CONSTRAINT "survey_question_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" DROP CONSTRAINT "survey_question_content_translation_source_metadata_check", ADD CONSTRAINT "survey_question_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_option_content" DROP CONSTRAINT "survey_question_option_content_source_metadata_check", ADD CONSTRAINT "survey_question_option_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" DROP CONSTRAINT "survey_question_option_content_translation_source_metadata_check", ADD CONSTRAINT "survey_question_option_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "project_contact" DROP CONSTRAINT "project_contact_affiliation_source_check", ADD CONSTRAINT "project_contact_affiliation_source_check" CHECK (num_nonnulls("organization_id", "external_organization_id") <= 1);--> statement-breakpoint
ALTER TABLE "project_content" DROP CONSTRAINT "project_content_source_metadata_check", ADD CONSTRAINT "project_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "project_content_translation" DROP CONSTRAINT "project_content_translation_source_metadata_check", ADD CONSTRAINT "project_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "project_organization_attribution" DROP CONSTRAINT "project_organization_attribution_source_xor_check", ADD CONSTRAINT "project_organization_attribution_source_xor_check" CHECK (num_nonnulls("organization_id", "external_organization_id") = 1);--> statement-breakpoint
ALTER TABLE "project_contact" DROP CONSTRAINT "project_contact_email_or_website_check", ADD CONSTRAINT "project_contact_email_or_website_check" CHECK (((((("email" is not null)) and ("email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("website_url" is not null)) and ("website_url" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]')))));--> statement-breakpoint
ALTER TABLE "ranking_item_content" DROP CONSTRAINT "ranking_item_content_source_metadata_check", ADD CONSTRAINT "ranking_item_content_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" DROP CONSTRAINT "ranking_item_content_translation_source_metadata_check", ADD CONSTRAINT "ranking_item_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_content_translation" DROP CONSTRAINT "conversation_content_translation_body_plain_text_pair_check", ADD CONSTRAINT "conversation_content_translation_body_plain_text_pair_check" CHECK ((("translated_body" IS NULL AND "translated_body_plain_text" IS NULL) OR ("translated_body" IS NOT NULL AND "translated_body_plain_text" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_subtype_config_check", ADD CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation_type" = 'polis' AND "polis_config_id" IS NOT NULL AND "ranking_config_id" IS NULL AND "credit_voting_config_id" IS NULL AND "prioritization_type" IS NULL) OR ("conversation_type" = 'prioritizing' AND "polis_config_id" IS NULL AND "prioritization_type" IS NOT NULL AND (("prioritization_type" = 'comparisons' AND "ranking_config_id" IS NOT NULL AND "credit_voting_config_id" IS NULL) OR ("prioritization_type" = 'qv' AND "credit_voting_config_id" IS NOT NULL AND "ranking_config_id" IS NULL)))));--> statement-breakpoint
ALTER TABLE "polis_conversation_config" DROP CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check", ADD CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check" CHECK ("preferred_opinion_group_count" IS NULL OR "preferred_opinion_group_count" >= 2);--> statement-breakpoint
ALTER TABLE "project_content_translation" DROP CONSTRAINT "project_content_translation_body_plain_text_pair_check", ADD CONSTRAINT "project_content_translation_body_plain_text_pair_check" CHECK ((("translated_body" IS NULL AND "translated_body_plain_text" IS NULL) OR ("translated_body" IS NOT NULL AND "translated_body_plain_text" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "ranking_item_content" DROP CONSTRAINT "ranking_item_content_body_plain_text_pair_check", ADD CONSTRAINT "ranking_item_content_body_plain_text_pair_check" CHECK ((("body" IS NULL AND "body_plain_text" IS NULL) OR ("body" IS NOT NULL AND "body_plain_text" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" DROP CONSTRAINT "ranking_item_content_translation_body_plain_text_pair_check", ADD CONSTRAINT "ranking_item_content_translation_body_plain_text_pair_check" CHECK ((("translated_body_html" IS NULL AND "translated_body_plain_text" IS NULL) OR ("translated_body_html" IS NOT NULL AND "translated_body_plain_text" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" DROP CONSTRAINT "ranking_conversation_config_counts_check", ADD CONSTRAINT "ranking_conversation_config_counts_check" CHECK ("item_count" >= 0 AND "item_count" <= "total_item_count" AND "vote_count" >= 0 AND "vote_count" <= "total_vote_count" AND "participant_count" >= 0 AND "participant_count" <= "total_participant_count" AND "scoring_input_revision" >= 0 AND "processed_scoring_input_revision" >= -1 AND "processed_scoring_input_revision" <= "scoring_input_revision");--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_checkpoint" DROP CONSTRAINT "ranking_stats_checkpoint_milestone_check", ADD CONSTRAINT "ranking_stats_checkpoint_milestone_check" CHECK ((("reason" = 'major_participation_milestone' AND "participant_milestone" IS NOT NULL AND "vote_milestone" IS NULL AND "participant_milestone" > 0) OR ("reason" = 'major_vote_milestone' AND "participant_milestone" IS NULL AND "vote_milestone" IS NOT NULL AND "vote_milestone" > 0) OR ("reason" = 'conversation_closed' AND "participant_milestone" IS NULL AND "vote_milestone" IS NULL)));--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" DROP CONSTRAINT "ranking_stats_item_score_rank_check", ADD CONSTRAINT "ranking_stats_item_score_rank_check" CHECK ((("score" IS NULL AND "rank" IS NULL) OR ("score" IS NOT NULL AND "rank" IS NOT NULL AND "score" >= 0 AND "score" <= 1 AND "rank" > 0)));--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" DROP CONSTRAINT "ranking_stats_item_participant_count_check", ADD CONSTRAINT "ranking_stats_item_participant_count_check" CHECK ("participant_count" >= 0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" DROP CONSTRAINT "ranking_conversation_stats_snapshot_counts_check", ADD CONSTRAINT "ranking_conversation_stats_snapshot_counts_check" CHECK ("item_count" >= 0 AND "item_count" <= "total_item_count" AND "vote_count" >= 0 AND "vote_count" <= "total_vote_count" AND "participant_count" >= 0 AND "participant_count" <= "total_participant_count" AND "scoring_input_revision" >= 0);--> statement-breakpoint
ALTER TABLE "opinion_content" DROP CONSTRAINT "opinion_content_content_byte_length_check", ADD CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("content") <= 16384);--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" DROP CONSTRAINT "otp_email_wrong_guess_attempt_amount_nonnegative_check", ADD CONSTRAINT "otp_email_wrong_guess_attempt_amount_nonnegative_check" CHECK ("wrong_guess_attempt_amount" >= 0);--> statement-breakpoint
ALTER TABLE "otp_phone_destination_state" DROP CONSTRAINT "otp_phone_wrong_guess_attempt_amount_nonnegative_check", ADD CONSTRAINT "otp_phone_wrong_guess_attempt_amount_nonnegative_check" CHECK ("wrong_guess_attempt_amount" >= 0);--> statement-breakpoint
ALTER TABLE "project_document_file" DROP CONSTRAINT "project_document_file_byte_size_check", ADD CONSTRAINT "project_document_file_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 52428800);--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" DROP CONSTRAINT "conversation_email_update_action_expiry_check", ADD CONSTRAINT "conversation_email_update_action_expiry_check" CHECK ("expires_at" > "created_at");--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" DROP CONSTRAINT "conversation_email_update_action_token_hash_check", ADD CONSTRAINT "conversation_email_update_action_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" DROP CONSTRAINT "conversation_email_update_attempt_number_check", ADD CONSTRAINT "conversation_email_update_attempt_number_check" CHECK ("attempt_number" BETWEEN 1 AND 3);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" DROP CONSTRAINT "conversation_email_update_attempt_outcome_check", ADD CONSTRAINT "conversation_email_update_attempt_outcome_check" CHECK ((("outcome" = 'send_authorized' AND "finished_at" IS NULL AND "provider_message_id" IS NULL) OR ("outcome" = 'provider_accepted' AND "finished_at" IS NOT NULL AND "provider_message_id" IS NOT NULL) OR ("outcome" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "finished_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" DROP CONSTRAINT "conversation_email_update_attempt_error_check", ADD CONSTRAINT "conversation_email_update_attempt_error_check" CHECK ((("outcome" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "error_category" IS NOT NULL AND "error_code" IS NOT NULL AND length(btrim("error_code")) > 0 AND "error_details" IS NOT NULL AND length(btrim("error_details")) > 0) OR ("outcome" NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "error_category" IS NULL AND "error_code" IS NULL AND "error_details" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" DROP CONSTRAINT "conversation_email_update_attempt_email_canonical_check", ADD CONSTRAINT "conversation_email_update_attempt_email_canonical_check" CHECK ("email_snapshot" = lower(btrim("email_snapshot")));--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" DROP CONSTRAINT "conversation_email_update_delivery_counts_check", ADD CONSTRAINT "conversation_email_update_delivery_counts_check" CHECK ("displayed_participant_estimate" >= 0 AND "acceptance_participant_estimate" >= 0 AND "materialized_participant_count" >= 0 AND "required_owner_copy_count" > 0 AND "frequency_capped_count" >= 0 AND "ineligible_count" >= 0 AND "materialization_attempt_count" BETWEEN 0 AND 5);--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" DROP CONSTRAINT "conversation_email_update_delivery_failure_reason_check", ADD CONSTRAINT "conversation_email_update_delivery_failure_reason_check" CHECK (("status" = 'failed') = ("failure_reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" DROP CONSTRAINT "conversation_email_update_delivery_stop_reason_check", ADD CONSTRAINT "conversation_email_update_delivery_stop_reason_check" CHECK (("status" IN ('stopping', 'stopped')) = ("stop_reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" DROP CONSTRAINT "conversation_email_update_delivery_timestamps_check", ADD CONSTRAINT "conversation_email_update_delivery_timestamps_check" CHECK ((("status" = 'preparing' AND "materialized_at" IS NULL AND "sending_started_at" IS NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'queued' AND "materialized_at" IS NOT NULL AND "sending_started_at" IS NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'sending' AND "materialized_at" IS NOT NULL AND "sending_started_at" IS NOT NULL AND "stopping_at" IS NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'stopping' AND "stopping_at" IS NOT NULL AND "completed_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'stopped' AND "stopping_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "failed_at" IS NULL) OR ("status" IN ('completed', 'completed_with_failures') AND "materialized_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "stopping_at" IS NULL AND "failed_at" IS NULL) OR ("status" = 'failed' AND "failed_at" IS NOT NULL AND "completed_at" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" DROP CONSTRAINT "conversation_email_update_email_suppression_canonical_check", ADD CONSTRAINT "conversation_email_update_email_suppression_canonical_check" CHECK ("canonical_email" = lower(btrim("canonical_email")));--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" DROP CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check", ADD CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null))));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_attempt_count_check", ADD CONSTRAINT "conversation_email_update_recipient_attempt_count_check" CHECK ("attempt_count" BETWEEN 0 AND 3);--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_lease_check", ADD CONSTRAINT "conversation_email_update_recipient_lease_check" CHECK ((("lease_owner" IS NULL AND "lease_token" IS NULL AND "lease_expires_at" IS NULL) OR ("lease_owner" IS NOT NULL AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_status_lease_check", ADD CONSTRAINT "conversation_email_update_recipient_status_lease_check" CHECK ((("status" IN ('claimed', 'attempting') AND "lease_token" IS NOT NULL) OR ("status" NOT IN ('claimed', 'attempting') AND "lease_token" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_status_check", ADD CONSTRAINT "conversation_email_update_recipient_status_check" CHECK ((("status" = 'pending' AND "next_attempt_at" IS NULL) OR ("status" = 'claimed' AND "claimed_at" IS NOT NULL) OR ("status" = 'attempting' AND "claimed_at" IS NOT NULL AND "attempting_at" IS NOT NULL) OR ("status" = 'retry_wait' AND "next_attempt_at" IS NOT NULL) OR ("status" = 'provider_accepted' AND "provider_accepted_at" IS NOT NULL) OR ("status" = 'skipped' AND "skipped_at" IS NOT NULL AND "skip_reason" IS NOT NULL) OR ("status" = 'permanent_failed' AND "permanent_failed_at" IS NOT NULL) OR ("status" = 'unknown' AND "unknown_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_skip_reason_check", ADD CONSTRAINT "conversation_email_update_recipient_skip_reason_check" CHECK (("status" = 'skipped') = ("skip_reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_failure_check", ADD CONSTRAINT "conversation_email_update_recipient_failure_check" CHECK ((("status" IN ('retry_wait', 'permanent_failed', 'unknown') AND "failure_code" IS NOT NULL AND length(btrim("failure_code")) > 0 AND "failure_details" IS NOT NULL AND length(btrim("failure_details")) > 0) OR ("status" NOT IN ('retry_wait', 'permanent_failed', 'unknown') AND "failure_code" IS NULL AND "failure_details" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" DROP CONSTRAINT "conversation_email_update_recipient_email_canonical_check", ADD CONSTRAINT "conversation_email_update_recipient_email_canonical_check" CHECK ("materialized_email_snapshot" = lower(btrim("materialized_email_snapshot")));--> statement-breakpoint
ALTER TABLE "conversation_email_update_report" DROP CONSTRAINT "conversation_email_update_report_details_check", ADD CONSTRAINT "conversation_email_update_report_details_check" CHECK ("details" IS NULL OR (length(btrim("details")) > 0 AND length("details") <= 2000));--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" DROP CONSTRAINT "conversation_email_update_safety_target_check", ADD CONSTRAINT "conversation_email_update_safety_target_check" CHECK ((("target_kind" = 'organization' AND "organization_id" IS NOT NULL AND num_nonnulls("project_id", "conversation_id", "facilitator_user_id") = 0) OR ("target_kind" = 'project' AND "project_id" IS NOT NULL AND num_nonnulls("organization_id", "conversation_id", "facilitator_user_id") = 0) OR ("target_kind" = 'conversation' AND "conversation_id" IS NOT NULL AND num_nonnulls("organization_id", "project_id", "facilitator_user_id") = 0) OR ("target_kind" = 'facilitator' AND "facilitator_user_id" IS NOT NULL AND num_nonnulls("organization_id", "project_id", "conversation_id") = 0)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" DROP CONSTRAINT "conversation_email_update_safety_lift_audit_check", ADD CONSTRAINT "conversation_email_update_safety_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null))));--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" DROP CONSTRAINT "conversation_email_update_sns_attempt_count_check", ADD CONSTRAINT "conversation_email_update_sns_attempt_count_check" CHECK ("processing_attempt_count" BETWEEN 0 AND 10);--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" DROP CONSTRAINT "conversation_email_update_sns_lease_check", ADD CONSTRAINT "conversation_email_update_sns_lease_check" CHECK ((("lease_owner" IS NULL AND "lease_token" IS NULL AND "lease_expires_at" IS NULL) OR ("lease_owner" IS NOT NULL AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" DROP CONSTRAINT "conversation_email_update_sns_status_lease_check", ADD CONSTRAINT "conversation_email_update_sns_status_lease_check" CHECK ((("status" = 'processing' AND "lease_token" IS NOT NULL) OR ("status" <> 'processing' AND "lease_token" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_sns_event_inbox" DROP CONSTRAINT "conversation_email_update_sns_terminal_check", ADD CONSTRAINT "conversation_email_update_sns_terminal_check" CHECK ((("status" = 'completed' AND "completed_at" IS NOT NULL AND "deleted_at" IS NOT NULL AND "raw_payload" IS NULL AND "last_error" IS NULL AND "dead_lettered_at" IS NULL) OR ("status" = 'dead_letter' AND "dead_lettered_at" IS NOT NULL AND "completed_at" IS NULL) OR ("status" IN ('pending', 'processing', 'retry_wait') AND "raw_payload" IS NOT NULL AND "completed_at" IS NULL AND "dead_lettered_at" IS NULL AND "deleted_at" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_subject_check", ADD CONSTRAINT "conversation_email_update_subject_check" CHECK (length(btrim("subject")) > 0);--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_body_html_check", ADD CONSTRAINT "conversation_email_update_body_html_check" CHECK (octet_length("body_html") > 0 AND octet_length("body_html") <= 16384);--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_body_plain_text_check", ADD CONSTRAINT "conversation_email_update_body_plain_text_check" CHECK (length(btrim("body_plain_text")) > 0 AND length("body_plain_text") <= 10000);--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_reply_to_email_canonical_check", ADD CONSTRAINT "conversation_email_update_reply_to_email_canonical_check" CHECK ("reply_to_email_snapshot" = lower(btrim("reply_to_email_snapshot")));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" DROP CONSTRAINT "conversation_email_update_test_lease_check", ADD CONSTRAINT "conversation_email_update_test_lease_check" CHECK ((("lease_owner" IS NULL AND "lease_token" IS NULL AND "lease_expires_at" IS NULL) OR ("lease_owner" IS NOT NULL AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" DROP CONSTRAINT "conversation_email_update_test_status_lease_check", ADD CONSTRAINT "conversation_email_update_test_status_lease_check" CHECK ((("status" IN ('claimed', 'attempting') AND "lease_token" IS NOT NULL) OR ("status" NOT IN ('claimed', 'attempting') AND "lease_token" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" DROP CONSTRAINT "conversation_email_update_test_outcome_check", ADD CONSTRAINT "conversation_email_update_test_outcome_check" CHECK ((("status" IN ('pending', 'claimed') AND "authorized_at" IS NULL AND "finished_at" IS NULL AND "provider_message_id" IS NULL) OR ("status" = 'attempting' AND "authorized_at" IS NOT NULL AND "finished_at" IS NULL AND "provider_message_id" IS NULL) OR ("status" = 'provider_accepted' AND "authorized_at" IS NOT NULL AND "finished_at" IS NOT NULL AND "provider_message_id" IS NOT NULL) OR ("status" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "authorized_at" IS NOT NULL AND "finished_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" DROP CONSTRAINT "conversation_email_update_test_error_check", ADD CONSTRAINT "conversation_email_update_test_error_check" CHECK ((("status" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "error_category" IS NOT NULL AND "error_code" IS NOT NULL AND length(btrim("error_code")) > 0 AND "error_details" IS NOT NULL AND length(btrim("error_details")) > 0) OR ("status" NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "error_category" IS NULL AND "error_code" IS NULL AND "error_details" IS NULL)));--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" DROP CONSTRAINT "conversation_email_update_test_email_canonical_check", ADD CONSTRAINT "conversation_email_update_test_email_canonical_check" CHECK ("destination_email_snapshot" = lower(btrim("destination_email_snapshot")));--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" DROP CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check", ADD CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null))));--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_email_update_override_audit_check", ADD CONSTRAINT "conversation_email_update_override_audit_check" CHECK (((("conversation_email_update_override_updated_by_user_id" is null)) or (("conversation_email_update_override_updated_at" is not null))));--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" DROP CONSTRAINT "organization_membership_all_project_capability_revocation_check", ADD CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK (((("revoked_by_user_id" is null)) or (("deleted_at" is not null))));--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_email_update_default_audit_check", ADD CONSTRAINT "project_email_update_default_audit_check" CHECK (((("conversation_email_update_default_updated_by_user_id" is null)) or (("conversation_email_update_default_updated_at" is not null))));--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_review_fields_check", ADD CONSTRAINT "conversation_email_update_review_fields_check" CHECK (((((((("review_expires_at" is null)) and (("template_version" is null)) and (("participant_preference_scope_snapshot" is null)) and (("branding_snapshot" is null)))) or (((("review_expires_at" is not null)) and (("template_version" is not null)) and (("participant_preference_scope_snapshot" is not null)) and (("branding_snapshot" is not null)))))) and (((("cancelled_at" is null)) or (("review_expires_at" is not null)))) and (((((("review_expires_at" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null)))) or (((("review_expires_at" is not null)) and (((((("created_by_user_id" is not null)) and (("review_test_email_credential_id" is not null)) and (("review_test_email_snapshot" is not null)))) or (((("created_by_user_id" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null))))))))))));--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_review_expiry_check", ADD CONSTRAINT "conversation_email_update_review_expiry_check" CHECK ("review_expires_at" IS NULL OR ("review_expires_at" = "created_at" + interval '24 hours' AND length(btrim("template_version")) > 0));--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_review_scope_check", ADD CONSTRAINT "conversation_email_update_review_scope_check" CHECK ("scope_kind" <> 'no_project' OR "participant_preference_scope_snapshot" IS NULL OR "participant_preference_scope_snapshot" = 'conversation');--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_branding_check", ADD CONSTRAINT "conversation_email_update_branding_check" CHECK ("branding_snapshot" IS NULL OR (jsonb_typeof("branding_snapshot") = 'object' AND "branding_snapshot" ?& array['name', 'palette'] AND jsonb_typeof("branding_snapshot"->'name') = 'string' AND length(btrim("branding_snapshot"->>'name')) BETWEEN 1 AND 500 AND jsonb_typeof("branding_snapshot"->'palette') = 'string' AND "branding_snapshot"->>'palette' IN ('blue', 'purple', 'green') AND (NOT "branding_snapshot" ? 'imageUrl' OR jsonb_typeof("branding_snapshot"->'imageUrl') = 'string') AND (NOT "branding_snapshot" ? 'bannerImageUrl' OR jsonb_typeof("branding_snapshot"->'bannerImageUrl') = 'string')));--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_review_test_email_canonical_check", ADD CONSTRAINT "conversation_email_update_review_test_email_canonical_check" CHECK ("review_test_email_snapshot" IS NULL OR (length(btrim("review_test_email_snapshot")) > 0 AND "review_test_email_snapshot" = lower(btrim("review_test_email_snapshot"))));--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" DROP CONSTRAINT "ranking_conversation_config_invalidation_revision_check", ADD CONSTRAINT "ranking_conversation_config_invalidation_revision_check" CHECK ("scoring_invalidation_revision" >= 0 AND "scoring_invalidation_revision" <= "scoring_input_revision");--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" DROP CONSTRAINT "comparison_user_entity_score_display_score_check", ADD CONSTRAINT "comparison_user_entity_score_display_score_check" CHECK (((("display_score" is null)) or ((("display_score" >= 0) and ("display_score" <= 1)))));--> statement-breakpoint
ALTER TABLE "ranking_score_entity" DROP CONSTRAINT "ranking_score_entity_display_score_check", ADD CONSTRAINT "ranking_score_entity_display_score_check" CHECK ("display_score" IS NULL OR ("display_score" >= 0 AND "display_score" <= 1));--> statement-breakpoint
ALTER TABLE "project_document_file" DROP CONSTRAINT "project_document_file_html_scripts_check", ADD CONSTRAINT "project_document_file_html_scripts_check" CHECK (NOT "html_scripts_enabled" OR "content_type" = 'text/html');--> statement-breakpoint
ALTER TABLE "blocked_phone_number" DROP CONSTRAINT "blocked_phone_pepper_version_nonnegative_check", ADD CONSTRAINT "blocked_phone_pepper_version_nonnegative_check" CHECK ("pepper_version" >= 0);--> statement-breakpoint
ALTER TABLE "blocked_phone_number" DROP CONSTRAINT "blocked_phone_reason_nonempty_check", ADD CONSTRAINT "blocked_phone_reason_nonempty_check" CHECK (length(btrim("reason")) > 0);--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_auth_restriction_reason_check", ADD CONSTRAINT "user_auth_restriction_reason_check" CHECK (("auth_restricted_at" IS NULL) = ("auth_restriction_reason" IS NULL));--> statement-breakpoint
ALTER TABLE "phone_sms_budget_alert" DROP CONSTRAINT "phone_sms_budget_alert_kind_check", ADD CONSTRAINT "phone_sms_budget_alert_kind_check" CHECK ("kind" IN ('warning', 'hard_limit'));--> statement-breakpoint
ALTER TABLE "phone_sms_budget_alert" DROP CONSTRAINT "phone_sms_budget_alert_attempts_check", ADD CONSTRAINT "phone_sms_budget_alert_attempts_check" CHECK ("attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" DROP CONSTRAINT "phone_sms_budget_single_policy_check", ADD CONSTRAINT "phone_sms_budget_single_policy_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" DROP CONSTRAINT "phone_sms_budget_positive_limits_check", ADD CONSTRAINT "phone_sms_budget_positive_limits_check" CHECK (("hourly_send_limit" IS NULL OR "hourly_send_limit" > 0) AND ("daily_send_limit" IS NULL OR "daily_send_limit" > 0) AND ("hourly_send_limit" IS NULL OR "daily_send_limit" IS NULL OR "daily_send_limit" >= "hourly_send_limit") AND "estimated_cents_per_send" > 0 AND ("hourly_budget_cents" IS NULL OR "hourly_budget_cents" > 0) AND ("daily_budget_cents" IS NULL OR "daily_budget_cents" > 0) AND ("hourly_budget_cents" IS NULL OR "daily_budget_cents" IS NULL OR "daily_budget_cents" >= "hourly_budget_cents"));--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" DROP CONSTRAINT "phone_sms_budget_warning_percent_check", ADD CONSTRAINT "phone_sms_budget_warning_percent_check" CHECK ("warning_percent" BETWEEN 1 AND 99);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_reservation" DROP CONSTRAINT "phone_sms_budget_reservation_cents_check", ADD CONSTRAINT "phone_sms_budget_reservation_cents_check" CHECK ("estimated_cents" > 0);--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" DROP CONSTRAINT "notification_opinion_vote_positive_count", ADD CONSTRAINT "notification_opinion_vote_positive_count" CHECK ("num_votes" >= 1);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" DROP CONSTRAINT "phone_sms_budget_monthly_limit_check", ADD CONSTRAINT "phone_sms_budget_monthly_limit_check" CHECK ("monthly_budget_cents" >= 0);--> statement-breakpoint
ALTER TABLE "phone_sms_budget_policy" DROP CONSTRAINT "phone_sms_budget_pause_expiry_check", ADD CONSTRAINT "phone_sms_budget_pause_expiry_check" CHECK ("registration_pause_expires_at" IS NULL OR ("registration_paused_at" IS NOT NULL AND "registration_pause_expires_at" > "registration_paused_at"));--> statement-breakpoint
ALTER TABLE "survey_answer_option" DROP CONSTRAINT "survey_answer_option_text_byte_length_check", ADD CONSTRAINT "survey_answer_option_text_byte_length_check" CHECK (octet_length("text_value_plain_text") <= 16384);--> statement-breakpoint
ALTER TABLE "opinion_content" DROP CONSTRAINT "opinion_content_edit_attribution_check", ADD CONSTRAINT "opinion_content_edit_attribution_check" CHECK (((("edited_by_user_id" is null)) or ("is_edited" = true)));--> statement-breakpoint
ALTER TABLE "survey_answer_option" DROP CONSTRAINT "survey_answer_option_html_byte_length_check", ADD CONSTRAINT "survey_answer_option_html_byte_length_check" CHECK (octet_length("text_value_html") <= 81927);--> statement-breakpoint
ALTER TABLE "survey_answer_option" DROP CONSTRAINT "survey_answer_option_text_pair_check", ADD CONSTRAINT "survey_answer_option_text_pair_check" CHECK (("text_value_html" IS NULL) = ("text_value_plain_text" IS NULL));--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" DROP CONSTRAINT "realtime_event_dispatch_state_singleton_check", ADD CONSTRAINT "realtime_event_dispatch_state_singleton_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" DROP CONSTRAINT "realtime_event_dispatch_state_sequence_check", ADD CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK ((("replay_floor_delivery_id" >= 0) and ("last_delivery_id" >= "replay_floor_delivery_id")));--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_closing_state_check", ADD CONSTRAINT "conversation_closing_state_check" CHECK (("is_closed" OR ("closing_target_revision" IS NULL AND "closed_finalized_at" IS NULL)) AND ("closed_finalized_at" IS NULL OR "closing_target_revision" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "project_contact" DROP CONSTRAINT "project_contact_name_or_affiliation_check", ADD CONSTRAINT "project_contact_name_or_affiliation_check" CHECK (((((("first_name" is not null)) and ("first_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("last_name" is not null)) and ("last_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (("organization_id" is not null))));