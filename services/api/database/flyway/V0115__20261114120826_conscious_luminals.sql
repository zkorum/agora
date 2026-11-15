-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Fail before DDL/backfills if legacy context cannot be safely dropped.
DO $$
BEGIN
    IF EXISTS (SELECT FROM ranking_score WHERE group_sources_snapshot IS NOT NULL
               AND group_sources_snapshot <> 'null'::jsonb) THEN
        RAISE EXCEPTION 'Legacy group context requires classification before its column can be removed';
    END IF;
END;
$$;

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');
--> statement-breakpoint
ALTER TYPE "ranking_mode" ADD VALUE 'pairwise';
--> statement-breakpoint
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
ALTER TABLE "maxdiff_comparison" RENAME TO "comparison_answer";
--> statement-breakpoint
ALTER TABLE "maxdiff_result" RENAME TO "comparison_response";
--> statement-breakpoint
ALTER TABLE "maxdiff_user_entity_score" RENAME TO "comparison_user_entity_score";
--> statement-breakpoint
ALTER TABLE "comparison_answer" RENAME COLUMN "maxdiff_result_id" TO "comparison_response_id";
--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME COLUMN "maxdiff_result_id" TO "comparison_response_id";
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_auto_provisioned_for_organization_id_unique";
--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_display_score_check" TO "comparison_user_entity_score_display_score_check";
--> statement-breakpoint
ALTER INDEX "maxdiff_comparison_result_idx" RENAME TO "comparison_answer_response_idx";
--> statement-breakpoint
ALTER INDEX "maxdiff_comparison_active_result_position_unique" RENAME TO "comparison_answer_active_response_position_unique";
--> statement-breakpoint
ALTER INDEX "maxdiff_result_conversation_idx" RENAME TO "comparison_response_conversation_idx";
--> statement-breakpoint
ALTER INDEX "maxdiff_user_entity_score_result_score_idx" RENAME TO "comparison_user_entity_score_response_score_idx";
--> statement-breakpoint
ALTER INDEX "maxdiff_user_entity_score_deleted_idx" RENAME TO "comparison_user_entity_score_deleted_idx";
--> statement-breakpoint
ALTER TABLE "comparison_answer" RENAME CONSTRAINT "maxdiff_comparison_maxdiff_result_id_maxdiff_result_id_fk" TO "comparison_answer_response_fk";
--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_maxdiff_result_id_f" TO "comparison_user_entity_score_response_fk";
--> statement-breakpoint
ALTER TABLE "comparison_response" ADD COLUMN "detached_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD COLUMN "sender_purged_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "conversation_export_generation" ADD COLUMN "source_data_generation" integer;
--> statement-breakpoint
ALTER TABLE "conversation_import" ADD COLUMN "requester_purged_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "deleted_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "credit_voting_config_id" integer;
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "prioritization_type" text;
--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "deleted_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "account_hidden_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "organization_membership" ADD COLUMN "role" "organization_role";
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "retired_for_account_deletion_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "phone" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "polis_conversation_config" ADD COLUMN "allow_participant_statements" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "retired_for_account_deletion_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "allow_participant_statements" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "deleted_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "account_hidden_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" ADD COLUMN "replay_floor_delivery_id" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "realtime_event_outbox" ADD COLUMN "delivered_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "contribution_revision" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_reason" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_requested_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recoverable_until" timestamp(3);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "purge_started_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "withdrawn_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "retired_at" timestamp(3);
--> statement-breakpoint
ALTER TABLE "zk_passport" ADD COLUMN "reserved_for_recovery" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TYPE "conversation_type" RENAME VALUE 'ranking' TO 'prioritizing';
--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "author_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_report" ALTER COLUMN "author_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "opinion_report" ALTER COLUMN "author_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "opinion" ALTER COLUMN "author_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_import" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "comparison_response" ALTER COLUMN "participant_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "opinion_group_user" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item" ALTER COLUMN "author_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ALTER COLUMN "ranking_item_content_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ALTER COLUMN "accepted_by_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ALTER COLUMN "created_by_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "created_by_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "requested_by_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "destination_email_credential_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ALTER COLUMN "destination_email_snapshot" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "comparison_user_entity_score" RENAME CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_entity_slug_id_unique" TO "comparison_user_entity_score_response_entity_unique";
--> statement-breakpoint
CREATE INDEX "conversation_export_object_artifact_idx" ON "conversation_export_object" ("artifact_id");
--> statement-breakpoint
CREATE INDEX "conversation_export_object_cleanup_idx" ON "conversation_export_object" ("cleanup_requested_at","id") WHERE ("object_deleted_at" is null);
--> statement-breakpoint
CREATE INDEX "qv_allocation_deleted_idx" ON "qv_allocation" ("deleted_at") WHERE ("deleted_at" is not null);
--> statement-breakpoint
CREATE INDEX "qv_calculation_claim_idx" ON "qv_calculation" ("next_attempt_at","created_at") WHERE "status" in ('queued', 'running');
--> statement-breakpoint
CREATE INDEX "qv_live_stats_refresh_idx" ON "qv_live_stats" ("refreshed_at","conversation_id");
--> statement-breakpoint
CREATE INDEX "qv_command_deleted_idx" ON "qv_response_command" ("deleted_at") WHERE ("deleted_at" is not null);
--> statement-breakpoint
CREATE INDEX "qv_response_conversation_active_idx" ON "qv_response" ("conversation_id") WHERE ((("current_version_id" is not null)) and (("deleted_at" is null)) and (("account_hidden_at" is null)));
--> statement-breakpoint
CREATE INDEX "qv_version_response_idx" ON "qv_response_version" ("response_id");
--> statement-breakpoint
CREATE INDEX "qv_version_deleted_idx" ON "qv_response_version" ("deleted_at") WHERE ("deleted_at" is not null);
--> statement-breakpoint
CREATE INDEX "qv_stats_refresh_pending_idx" ON "qv_stats_refresh" ("conversation_id","id") WHERE ("processed_at" is null);
--> statement-breakpoint
CREATE INDEX "ranking_input_snapshot_conversation_idx" ON "ranking_input_snapshot" ("conversation_id","stats_snapshot_id");
--> statement-breakpoint
CREATE INDEX "ranking_input_snapshot_prepared_idx" ON "ranking_input_snapshot" ("conversation_id","scoring_input_revision","created_at","id") WHERE ((("stats_snapshot_id" is null)) and (("sealed_at" is not null)));
