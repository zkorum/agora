-- WARNING: GENERATED FROM services/shared-backend/src/schema.ts. DO NOT EDIT.
-- Regenerate with: make sync-api-test-db-fixtures

CREATE TYPE "conversation_language_settings_source" AS ENUM('conversation_override', 'project_inherited');

CREATE TYPE "conversation_type" AS ENUM('gathering', 'polis', 'prioritizing');

CREATE TYPE "directory_visibility" AS ENUM('listed', 'unlisted');

CREATE TYPE "display_language_code" AS ENUM('en', 'es', 'fr', 'zh-Hant', 'zh-Hans', 'ja', 'ar', 'fa', 'he', 'ky', 'ru');

CREATE TYPE "event_slug" AS ENUM('devconnect-2025');

CREATE TYPE "moderation_reason_enum" AS ENUM('misleading', 'antisocial', 'illegal', 'doxing', 'sexual', 'spam', 'off_topic', 'other');

CREATE TYPE "opinion_moderation_action" AS ENUM('move', 'hide');

CREATE TYPE "organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');

CREATE TYPE "organization_role" AS ENUM('admin', 'manager', 'moderator');

CREATE TYPE "participation_mode" AS ENUM('account_required', 'strong_verification', 'email_verification', 'guest');

CREATE TYPE "project_document_audience" AS ENUM('participant', 'owner');

CREATE TYPE "project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');

CREATE TYPE "project_document_encoding" AS ENUM('gzip', 'br');

CREATE TYPE "project_document_file_status" AS ENUM('pending', 'available');

CREATE TYPE "project_document_representation_status" AS ENUM('pending', 'available', 'failed');

CREATE TABLE "comparison_answer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparison_answer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comparison_response_id" integer NOT NULL,
	"position" integer NOT NULL,
	"best_slug_id" varchar(8) NOT NULL,
	"worst_slug_id" varchar(8) NOT NULL,
	"candidate_set" text[] NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	CONSTRAINT "comparison_answer_position_check" CHECK ("position" >= 0),
	CONSTRAINT "comparison_answer_distinct_choices_check" CHECK ("best_slug_id" <> "worst_slug_id"),
	CONSTRAINT "comparison_answer_candidates_check" CHECK (((cardinality("candidate_set") BETWEEN 2 AND 4) and ("candidate_set" @> ARRAY["best_slug_id"::text, "worst_slug_id"::text])))
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

CREATE TABLE "project_document_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"audience" "project_document_audience" NOT NULL,
	"status" "project_document_file_status" DEFAULT 'pending'::"project_document_file_status" NOT NULL,
	"object_key" text NOT NULL UNIQUE,
	"original_file_name" text NOT NULL,
	"content_type" "project_document_content_type" NOT NULL,
	"html_scripts_enabled" boolean DEFAULT false NOT NULL,
	"byte_size" integer NOT NULL,
	"compressed_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	"object_deleted_at" timestamp(0),
	CONSTRAINT "project_document_file_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 52428800),
	CONSTRAINT "project_document_file_html_scripts_check" CHECK (NOT "html_scripts_enabled" OR "content_type" = 'text/html'),
	CONSTRAINT "project_document_file_compressed_content_check" CHECK ("compressed_at" IS NULL OR "content_type" <> 'application/pdf'),
	CONSTRAINT "project_document_file_original_cleanup_check" CHECK ("object_deleted_at" IS NULL OR "deleted_at" IS NOT NULL OR "compressed_at" IS NOT NULL)
);

CREATE TABLE "project_document_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"name" varchar(150) NOT NULL,
	"download_file_name" varchar(255) NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0)
);

CREATE TABLE "project_document_representation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_representation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" integer NOT NULL,
	"encoding" "project_document_encoding" NOT NULL,
	"status" "project_document_representation_status" DEFAULT 'pending'::"project_document_representation_status" NOT NULL,
	"object_key" text NOT NULL UNIQUE,
	"byte_size" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp(0),
	"object_deleted_at" timestamp(0),
	CONSTRAINT "project_document_representation_byte_size_check" CHECK ("byte_size" > 0),
	CONSTRAINT "project_document_representation_failed_check" CHECK ("status" <> 'failed' OR "deleted_at" IS NOT NULL),
	CONSTRAINT "project_document_representation_deleted_object_check" CHECK ("object_deleted_at" IS NULL OR "deleted_at" IS NOT NULL)
);

CREATE TABLE "project_document" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"created_by_username" varchar(20) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"created_at" timestamp(0) DEFAULT now() NOT NULL,
	"published_at" timestamp(0),
	"deleted_at" timestamp(0)
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

CREATE INDEX "comparison_answer_response_idx" ON "comparison_answer" ("comparison_response_id");

CREATE UNIQUE INDEX "comparison_answer_active_response_position_unique" ON "comparison_answer" ("comparison_response_id","position") WHERE ("deleted_at" is null);

CREATE INDEX "comparison_response_conversation_idx" ON "comparison_response" ("conversation_id");

CREATE INDEX "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);

CREATE INDEX "conversation_feed_idx" ON "conversation" ("created_at" DESC,"id" DESC) WHERE "is_indexed" = true AND "is_importing" = false;

CREATE INDEX "conversation_type_importing_idx" ON "conversation" ("is_importing","conversation_type");

CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" ("id") WHERE "conversation_type" = 'polis' AND "is_closed" = true AND "vote_buffer_drained" = false AND "closed_finalized_at" IS NULL;

CREATE INDEX "conversation_project_id_idx" ON "conversation" ("project_id");

CREATE INDEX "conversation_project_timeline_idx" ON "conversation" ("project_id","is_importing","created_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

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

CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" ("project_document_id","audience") WHERE ("deleted_at" is null);

CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" ("project_document_id") WHERE "deleted_at" IS NOT NULL AND "object_deleted_at" IS NULL;

CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" ("created_at","project_document_id") WHERE "status" = 'pending' AND "deleted_at" IS NULL;

CREATE INDEX "project_document_file_original_retirement_idx" ON "project_document_file" ("compressed_at") WHERE "compressed_at" IS NOT NULL AND "deleted_at" IS NULL AND "object_deleted_at" IS NULL;

CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" ("project_document_id","language_code") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_document_representation_file_encoding_active_unique" ON "project_document_representation" ("file_id","encoding") WHERE ("deleted_at" is null);

CREATE INDEX "project_document_representation_cleanup_idx" ON "project_document_representation" ("created_at") WHERE ("object_deleted_at" is null);

CREATE INDEX "project_document_project_id_idx" ON "project_document" ("project_id");

CREATE UNIQUE INDEX "project_organization_ownership_active_unique" ON "project_organization_ownership" ("project_id","organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "project_organization_ownership_organization_idx" ON "project_organization_ownership" ("organization_id");

CREATE UNIQUE INDEX "project_active_slug_unique" ON "project" ("slug") WHERE ("deleted_at" is null);

CREATE UNIQUE INDEX "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);

CREATE INDEX "vote_authorId_idx" ON "vote" ("author_id");

CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" ("author_id","updated_at" DESC,"id" DESC) WHERE ("current_content_id" is not null);

CREATE INDEX "vote_opinion_active_idx" ON "vote" ("opinion_id","current_content_id");
