CREATE TYPE "public"."conversation_email_update_action" AS ENUM('unsubscribe_project', 'unsubscribe_conversation', 'manage_preferences', 'report');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_delivery_attempt_outcome" AS ENUM('send_authorized', 'provider_accepted', 'retryable_rejected', 'permanent_rejected', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_delivery_status" AS ENUM('preparing', 'queued', 'sending', 'stopping', 'stopped', 'completed', 'completed_with_failures', 'failed');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_email_suppression_reason" AS ENUM('permanent_bounce', 'complaint');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_error_category" AS ENUM('retryable', 'permanent', 'ambiguous');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_failure_reason" AS ENUM('materialization_failed', 'no_eligible_participants', 'required_owner_copy_not_accepted', 'no_participant_provider_accepted');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_preference_source" AS ENUM('onboarding', 'menu', 'settings', 'unsubscribe', 'support');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_recipient_kind" AS ENUM('participant', 'conversation_owner_copy');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_recipient_status" AS ENUM('pending', 'claimed', 'attempting', 'retry_wait', 'provider_accepted', 'skipped', 'permanent_failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_report_reason" AS ENUM('spam', 'abuse', 'unrelated_content', 'other');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_safety_reason" AS ENUM('legal', 'abuse');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_safety_target_kind" AS ENUM('organization', 'project', 'conversation', 'facilitator');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_scope_kind" AS ENUM('listed_project', 'no_project');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_skip_reason" AS ENUM('global_pause', 'project_preference_disabled', 'conversation_preference_disabled', 'frequency_capped', 'account_ineligible', 'email_credential_changed', 'user_complaint_suppressed', 'email_suppressed', 'scope_safety_blocked', 'delivery_stopped');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_sns_event_inbox_status" AS ENUM('pending', 'processing', 'retry_wait', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_stop_reason" AS ENUM('global_kill_switch', 'legal_or_abuse_block');--> statement-breakpoint
CREATE TYPE "public"."conversation_email_update_test_attempt_status" AS ENUM('pending', 'claimed', 'attempting', 'provider_accepted', 'retryable_rejected', 'permanent_rejected', 'unknown');--> statement-breakpoint
ALTER TYPE "public"."premium_feature" ADD VALUE 'conversation_email_update';--> statement-breakpoint
CREATE TABLE "conversation_email_update_action_token" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_action_token_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"token_hash" varchar(64) NOT NULL,
	"recipient_id" bigint NOT NULL,
	"action" "conversation_email_update_action" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"expires_at" timestamp (0) NOT NULL,
	"last_used_at" timestamp (0),
	CONSTRAINT "conversation_email_update_action_token_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "conversation_email_update_action_expiry_check" CHECK ("conversation_email_update_action_token"."expires_at" > "conversation_email_update_action_token"."created_at"),
	CONSTRAINT "conversation_email_update_action_token_hash_check" CHECK ("conversation_email_update_action_token"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_conversation" (
	"update_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"conversation_title_snapshot" varchar(140) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_conversation_update_id_conversation_id_pk" PRIMARY KEY("update_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_delivery_attempt" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_delivery_attempt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" bigint NOT NULL,
	"attempt_number" integer NOT NULL,
	"lease_token" uuid NOT NULL,
	"email_credential_id" integer NOT NULL,
	"email_snapshot" varchar(254) NOT NULL,
	"outcome" "conversation_email_update_delivery_attempt_outcome" NOT NULL,
	"provider_message_id" text,
	"error_category" "conversation_email_update_error_category",
	"error_code" varchar(100),
	"error_details" text,
	"delivered_at" timestamp (0),
	"delivery_delayed_at" timestamp (0),
	"provider_failed_at" timestamp (0),
	"permanent_bounced_at" timestamp (0),
	"complained_at" timestamp (0),
	"authorized_at" timestamp (0) NOT NULL,
	"finished_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_delivery_attempt_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "conversation_email_update_attempt_recipient_number_unique" UNIQUE("recipient_id","attempt_number"),
	CONSTRAINT "conversation_email_update_attempt_number_check" CHECK ("conversation_email_update_delivery_attempt"."attempt_number" BETWEEN 1 AND 3),
	CONSTRAINT "conversation_email_update_attempt_outcome_check" CHECK ((("conversation_email_update_delivery_attempt"."outcome" = 'send_authorized' AND "conversation_email_update_delivery_attempt"."finished_at" IS NULL AND "conversation_email_update_delivery_attempt"."provider_message_id" IS NULL) OR ("conversation_email_update_delivery_attempt"."outcome" = 'provider_accepted' AND "conversation_email_update_delivery_attempt"."finished_at" IS NOT NULL AND "conversation_email_update_delivery_attempt"."provider_message_id" IS NOT NULL) OR ("conversation_email_update_delivery_attempt"."outcome" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_delivery_attempt"."finished_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_attempt_error_check" CHECK ((("conversation_email_update_delivery_attempt"."outcome" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_delivery_attempt"."error_category" IS NOT NULL AND "conversation_email_update_delivery_attempt"."error_code" IS NOT NULL AND length(btrim("conversation_email_update_delivery_attempt"."error_code")) > 0 AND "conversation_email_update_delivery_attempt"."error_details" IS NOT NULL AND length(btrim("conversation_email_update_delivery_attempt"."error_details")) > 0) OR ("conversation_email_update_delivery_attempt"."outcome" NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_delivery_attempt"."error_category" IS NULL AND "conversation_email_update_delivery_attempt"."error_code" IS NULL AND "conversation_email_update_delivery_attempt"."error_details" IS NULL))),
	CONSTRAINT "conversation_email_update_attempt_email_canonical_check" CHECK ("conversation_email_update_delivery_attempt"."email_snapshot" = lower(btrim("conversation_email_update_delivery_attempt"."email_snapshot")))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_delivery" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_delivery_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"update_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"accepted_test_attempt_id" integer NOT NULL,
	"accepted_by_user_id" uuid NOT NULL,
	"status" "conversation_email_update_delivery_status" NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "conversation_email_update_email_suppression" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_email_suppression_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"canonical_email" varchar(254) NOT NULL,
	"email_credential_id" integer,
	"reason" "conversation_email_update_email_suppression_reason" NOT NULL,
	"source_sns_topic_arn" text NOT NULL,
	"source_sns_message_id" varchar(191) NOT NULL,
	"source_ses_message_id" text NOT NULL,
	"source_event_occurred_at" timestamp (0) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"lifted_at" timestamp (0),
	"lifted_by_user_id" uuid,
	CONSTRAINT "conversation_email_update_email_suppression_source_unique" UNIQUE("source_sns_topic_arn","source_sns_message_id"),
	CONSTRAINT "conversation_email_update_email_suppression_canonical_check" CHECK ("conversation_email_update_email_suppression"."canonical_email" = lower(btrim("conversation_email_update_email_suppression"."canonical_email"))),
	CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check" CHECK (("conversation_email_update_email_suppression"."lifted_at" IS NULL) = ("conversation_email_update_email_suppression"."lifted_by_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_recipient_conversation" (
	"recipient_id" bigint NOT NULL,
	"delivery_id" integer NOT NULL,
	"update_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_recipient_conversation_recipient_id_conversation_id_pk" PRIMARY KEY("recipient_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_recipient" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_recipient_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"delivery_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "conversation_email_update_recipient_kind" NOT NULL,
	"status" "conversation_email_update_recipient_status" NOT NULL,
	"materialized_email_credential_id" integer NOT NULL,
	"materialized_email_snapshot" varchar(254) NOT NULL,
	"display_language" "display_language_code" NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (0),
	"lease_owner" varchar(100),
	"lease_token" uuid,
	"lease_expires_at" timestamp (0),
	"skip_reason" "conversation_email_update_skip_reason",
	"failure_code" varchar(100),
	"failure_details" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"claimed_at" timestamp (0),
	"attempting_at" timestamp (0),
	"provider_accepted_at" timestamp (0),
	"skipped_at" timestamp (0),
	"permanent_failed_at" timestamp (0),
	"unknown_at" timestamp (0),
	CONSTRAINT "conversation_email_update_recipient_delivery_user_unique" UNIQUE("delivery_id","user_id"),
	CONSTRAINT "conversation_email_update_recipient_delivery_id_unique" UNIQUE("delivery_id","id"),
	CONSTRAINT "conversation_email_update_recipient_credential_id_unique" UNIQUE("materialized_email_credential_id","id"),
	CONSTRAINT "conversation_email_update_recipient_attempt_count_check" CHECK ("conversation_email_update_recipient"."attempt_count" BETWEEN 0 AND 3),
	CONSTRAINT "conversation_email_update_recipient_lease_check" CHECK ((("conversation_email_update_recipient"."lease_owner" IS NULL AND "conversation_email_update_recipient"."lease_token" IS NULL AND "conversation_email_update_recipient"."lease_expires_at" IS NULL) OR ("conversation_email_update_recipient"."lease_owner" IS NOT NULL AND "conversation_email_update_recipient"."lease_token" IS NOT NULL AND "conversation_email_update_recipient"."lease_expires_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_recipient_status_lease_check" CHECK ((("conversation_email_update_recipient"."status" IN ('claimed', 'attempting') AND "conversation_email_update_recipient"."lease_token" IS NOT NULL) OR ("conversation_email_update_recipient"."status" NOT IN ('claimed', 'attempting') AND "conversation_email_update_recipient"."lease_token" IS NULL))),
	CONSTRAINT "conversation_email_update_recipient_status_check" CHECK ((("conversation_email_update_recipient"."status" = 'pending' AND "conversation_email_update_recipient"."next_attempt_at" IS NULL) OR ("conversation_email_update_recipient"."status" = 'claimed' AND "conversation_email_update_recipient"."claimed_at" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'attempting' AND "conversation_email_update_recipient"."claimed_at" IS NOT NULL AND "conversation_email_update_recipient"."attempting_at" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'retry_wait' AND "conversation_email_update_recipient"."next_attempt_at" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'provider_accepted' AND "conversation_email_update_recipient"."provider_accepted_at" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'skipped' AND "conversation_email_update_recipient"."skipped_at" IS NOT NULL AND "conversation_email_update_recipient"."skip_reason" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'permanent_failed' AND "conversation_email_update_recipient"."permanent_failed_at" IS NOT NULL) OR ("conversation_email_update_recipient"."status" = 'unknown' AND "conversation_email_update_recipient"."unknown_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_recipient_skip_reason_check" CHECK (("conversation_email_update_recipient"."status" = 'skipped') = ("conversation_email_update_recipient"."skip_reason" IS NOT NULL)),
	CONSTRAINT "conversation_email_update_recipient_failure_check" CHECK ((("conversation_email_update_recipient"."status" IN ('retry_wait', 'permanent_failed', 'unknown') AND "conversation_email_update_recipient"."failure_code" IS NOT NULL AND length(btrim("conversation_email_update_recipient"."failure_code")) > 0 AND "conversation_email_update_recipient"."failure_details" IS NOT NULL AND length(btrim("conversation_email_update_recipient"."failure_details")) > 0) OR ("conversation_email_update_recipient"."status" NOT IN ('retry_wait', 'permanent_failed', 'unknown') AND "conversation_email_update_recipient"."failure_code" IS NULL AND "conversation_email_update_recipient"."failure_details" IS NULL))),
	CONSTRAINT "conversation_email_update_recipient_email_canonical_check" CHECK ("conversation_email_update_recipient"."materialized_email_snapshot" = lower(btrim("conversation_email_update_recipient"."materialized_email_snapshot")))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_report" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_report_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"recipient_id" bigint NOT NULL,
	"reason" "conversation_email_update_report_reason" NOT NULL,
	"details" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_report_recipient_id_unique" UNIQUE("recipient_id"),
	CONSTRAINT "conversation_email_update_report_details_check" CHECK ("conversation_email_update_report"."details" IS NULL OR (length(btrim("conversation_email_update_report"."details")) > 0 AND length("conversation_email_update_report"."details") <= 2000))
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "conversation_email_update_sns_event_inbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_sns_event_inbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sns_topic_arn" text NOT NULL,
	"sns_message_id" varchar(191) NOT NULL,
	"raw_payload" jsonb,
	"status" "conversation_email_update_sns_event_inbox_status" NOT NULL,
	"lease_owner" varchar(100),
	"lease_token" uuid,
	"lease_expires_at" timestamp (0),
	"processing_attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (0) DEFAULT now() NOT NULL,
	"last_error" text,
	"received_at" timestamp (0) DEFAULT now() NOT NULL,
	"completed_at" timestamp (0),
	"dead_lettered_at" timestamp (0),
	"deleted_at" timestamp (0),
	CONSTRAINT "conversation_email_update_sns_source_unique" UNIQUE("sns_topic_arn","sns_message_id"),
	CONSTRAINT "conversation_email_update_sns_attempt_count_check" CHECK ("conversation_email_update_sns_event_inbox"."processing_attempt_count" BETWEEN 0 AND 10),
	CONSTRAINT "conversation_email_update_sns_lease_check" CHECK ((("conversation_email_update_sns_event_inbox"."lease_owner" IS NULL AND "conversation_email_update_sns_event_inbox"."lease_token" IS NULL AND "conversation_email_update_sns_event_inbox"."lease_expires_at" IS NULL) OR ("conversation_email_update_sns_event_inbox"."lease_owner" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."lease_token" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."lease_expires_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_sns_status_lease_check" CHECK ((("conversation_email_update_sns_event_inbox"."status" = 'processing' AND "conversation_email_update_sns_event_inbox"."lease_token" IS NOT NULL) OR ("conversation_email_update_sns_event_inbox"."status" <> 'processing' AND "conversation_email_update_sns_event_inbox"."lease_token" IS NULL))),
	CONSTRAINT "conversation_email_update_sns_terminal_check" CHECK ((("conversation_email_update_sns_event_inbox"."status" = 'completed' AND "conversation_email_update_sns_event_inbox"."completed_at" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."deleted_at" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."raw_payload" IS NULL AND "conversation_email_update_sns_event_inbox"."last_error" IS NULL AND "conversation_email_update_sns_event_inbox"."dead_lettered_at" IS NULL) OR ("conversation_email_update_sns_event_inbox"."status" = 'dead_letter' AND "conversation_email_update_sns_event_inbox"."dead_lettered_at" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."completed_at" IS NULL) OR ("conversation_email_update_sns_event_inbox"."status" IN ('pending', 'processing', 'retry_wait') AND "conversation_email_update_sns_event_inbox"."raw_payload" IS NOT NULL AND "conversation_email_update_sns_event_inbox"."completed_at" IS NULL AND "conversation_email_update_sns_event_inbox"."dead_lettered_at" IS NULL AND "conversation_email_update_sns_event_inbox"."deleted_at" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"scope_kind" "conversation_email_update_scope_kind" NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"authorizing_organization_id" integer NOT NULL,
	"authorizing_premium_feature_id" integer NOT NULL,
	"project_title_snapshot" varchar(140) NOT NULL,
	"reply_to_name_snapshot" varchar(140) NOT NULL,
	"reply_to_email_snapshot" varchar(254) NOT NULL,
	"subject" varchar(140) NOT NULL,
	"body_html" text NOT NULL,
	"body_plain_text" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "conversation_email_update_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "conversation_email_update_subject_check" CHECK (length(btrim("conversation_email_update"."subject")) > 0),
	CONSTRAINT "conversation_email_update_body_html_check" CHECK (octet_length("conversation_email_update"."body_html") > 0 AND octet_length("conversation_email_update"."body_html") <= 16384),
	CONSTRAINT "conversation_email_update_body_plain_text_check" CHECK (length(btrim("conversation_email_update"."body_plain_text")) > 0 AND length("conversation_email_update"."body_plain_text") <= 10000),
	CONSTRAINT "conversation_email_update_reply_to_email_canonical_check" CHECK ("conversation_email_update"."reply_to_email_snapshot" = lower(btrim("conversation_email_update"."reply_to_email_snapshot")))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_test_attempt" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_test_attempt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"update_id" integer NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"destination_email_credential_id" integer NOT NULL,
	"destination_email_snapshot" varchar(254) NOT NULL,
	"status" "conversation_email_update_test_attempt_status" NOT NULL,
	"lease_owner" varchar(100),
	"lease_token" uuid,
	"lease_expires_at" timestamp (0),
	"provider_message_id" text,
	"error_category" "conversation_email_update_error_category",
	"error_code" varchar(100),
	"error_details" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"authorized_at" timestamp (0),
	"finished_at" timestamp (0),
	CONSTRAINT "conversation_email_update_test_attempt_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "conversation_email_update_test_update_id_id_unique" UNIQUE("update_id","id"),
	CONSTRAINT "conversation_email_update_test_lease_check" CHECK ((("conversation_email_update_test_attempt"."lease_owner" IS NULL AND "conversation_email_update_test_attempt"."lease_token" IS NULL AND "conversation_email_update_test_attempt"."lease_expires_at" IS NULL) OR ("conversation_email_update_test_attempt"."lease_owner" IS NOT NULL AND "conversation_email_update_test_attempt"."lease_token" IS NOT NULL AND "conversation_email_update_test_attempt"."lease_expires_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_test_status_lease_check" CHECK ((("conversation_email_update_test_attempt"."status" IN ('claimed', 'attempting') AND "conversation_email_update_test_attempt"."lease_token" IS NOT NULL) OR ("conversation_email_update_test_attempt"."status" NOT IN ('claimed', 'attempting') AND "conversation_email_update_test_attempt"."lease_token" IS NULL))),
	CONSTRAINT "conversation_email_update_test_outcome_check" CHECK ((("conversation_email_update_test_attempt"."status" IN ('pending', 'claimed') AND "conversation_email_update_test_attempt"."authorized_at" IS NULL AND "conversation_email_update_test_attempt"."finished_at" IS NULL AND "conversation_email_update_test_attempt"."provider_message_id" IS NULL) OR ("conversation_email_update_test_attempt"."status" = 'attempting' AND "conversation_email_update_test_attempt"."authorized_at" IS NOT NULL AND "conversation_email_update_test_attempt"."finished_at" IS NULL AND "conversation_email_update_test_attempt"."provider_message_id" IS NULL) OR ("conversation_email_update_test_attempt"."status" = 'provider_accepted' AND "conversation_email_update_test_attempt"."authorized_at" IS NOT NULL AND "conversation_email_update_test_attempt"."finished_at" IS NOT NULL AND "conversation_email_update_test_attempt"."provider_message_id" IS NOT NULL) OR ("conversation_email_update_test_attempt"."status" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_test_attempt"."authorized_at" IS NOT NULL AND "conversation_email_update_test_attempt"."finished_at" IS NOT NULL))),
	CONSTRAINT "conversation_email_update_test_error_check" CHECK ((("conversation_email_update_test_attempt"."status" IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_test_attempt"."error_category" IS NOT NULL AND "conversation_email_update_test_attempt"."error_code" IS NOT NULL AND length(btrim("conversation_email_update_test_attempt"."error_code")) > 0 AND "conversation_email_update_test_attempt"."error_details" IS NOT NULL AND length(btrim("conversation_email_update_test_attempt"."error_details")) > 0) OR ("conversation_email_update_test_attempt"."status" NOT IN ('retryable_rejected', 'permanent_rejected', 'unknown') AND "conversation_email_update_test_attempt"."error_category" IS NULL AND "conversation_email_update_test_attempt"."error_code" IS NULL AND "conversation_email_update_test_attempt"."error_details" IS NULL))),
	CONSTRAINT "conversation_email_update_test_email_canonical_check" CHECK ("conversation_email_update_test_attempt"."destination_email_snapshot" = lower(btrim("conversation_email_update_test_attempt"."destination_email_snapshot")))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_user_complaint_suppression" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_email_update_user_complaint_suppression_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"source_sns_topic_arn" text NOT NULL,
	"source_sns_message_id" varchar(191) NOT NULL,
	"source_ses_message_id" text NOT NULL,
	"source_event_occurred_at" timestamp (0) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"lifted_at" timestamp (0),
	"lifted_by_user_id" uuid,
	CONSTRAINT "conversation_email_update_user_complaint_source_unique" UNIQUE("source_sns_topic_arn","source_sns_message_id"),
	CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check" CHECK (("conversation_email_update_user_complaint_suppression"."lifted_at" IS NULL) = ("conversation_email_update_user_complaint_suppression"."lifted_by_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_user_conversation_preference" (
	"user_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"enabled" boolean NOT NULL,
	"choice_at" timestamp (0) NOT NULL,
	"choice_source" "conversation_email_update_preference_source" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_user_conversation_preference_user_id_conversation_id_pk" PRIMARY KEY("user_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_user_global_setting" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"paused_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_email_update_user_project_preference" (
	"user_id" uuid NOT NULL,
	"project_id" integer NOT NULL,
	"enabled" boolean NOT NULL,
	"choice_at" timestamp (0) NOT NULL,
	"choice_source" "conversation_email_update_preference_source" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_email_update_user_project_preference_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" DROP CONSTRAINT "organization_membership_all_project_capability_unique";--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ALTER COLUMN "capability" SET DATA TYPE text;--> statement-breakpoint
UPDATE "organization_membership_all_project_capability" SET "capability" = 'conversation_edit' WHERE "capability" = 'conversation_update';--> statement-breakpoint
DROP TYPE "public"."organization_membership_all_project_capability_enum";--> statement-breakpoint
CREATE TYPE "public"."organization_membership_all_project_capability_enum" AS ENUM('project_update', 'project_delete', 'project_manage_owner_organizations', 'conversation_create', 'conversation_edit', 'conversation_delete', 'conversation_view_private_results', 'conversation_export_owner_data', 'conversation_moderate', 'conversation_manage_integrations', 'conversation_email_update');--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ALTER COLUMN "capability" SET DATA TYPE "public"."organization_membership_all_project_capability_enum" USING "capability"::"public"."organization_membership_all_project_capability_enum";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "conversation_email_update_enabled_override" boolean;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "conversation_email_update_override_updated_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "conversation_email_update_override_updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "maxdiff_comparison" ADD COLUMN "created_at" timestamp (0) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD COLUMN "granted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD COLUMN "revoked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD COLUMN "updated_at" timestamp (0) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "conversation_email_update_default_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "conversation_email_update_default_updated_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "conversation_email_update_default_updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_project_id_id_unique" UNIQUE("project_id","id");--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_user_id_id_unique" UNIQUE("user_id","id");--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ADD CONSTRAINT "premium_feature_entitlement_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "conversation_email_update_action_token" ADD CONSTRAINT "conversation_email_update_action_token_recipient_id_conversation_email_update_recipient_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."conversation_email_update_recipient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_conversation" ADD CONSTRAINT "email_update_scope_update_project_fk" FOREIGN KEY ("project_id","update_id") REFERENCES "public"."conversation_email_update"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_conversation" ADD CONSTRAINT "email_update_scope_conversation_project_fk" FOREIGN KEY ("project_id","conversation_id") REFERENCES "public"."conversation"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery_attempt" ADD CONSTRAINT "email_update_attempt_recipient_credential_fk" FOREIGN KEY ("email_credential_id","recipient_id") REFERENCES "public"."conversation_email_update_recipient"("materialized_email_credential_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ADD CONSTRAINT "conversation_email_update_delivery_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ADD CONSTRAINT "email_update_delivery_update_project_fk" FOREIGN KEY ("project_id","update_id") REFERENCES "public"."conversation_email_update"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_delivery" ADD CONSTRAINT "email_update_delivery_test_update_fk" FOREIGN KEY ("update_id","accepted_test_attempt_id") REFERENCES "public"."conversation_email_update_test_attempt"("update_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" ADD CONSTRAINT "conversation_email_update_email_suppression_email_credential_id_email_id_fk" FOREIGN KEY ("email_credential_id") REFERENCES "public"."email"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" ADD CONSTRAINT "conversation_email_update_email_suppression_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient_conversation" ADD CONSTRAINT "email_update_recipient_scope_recipient_fk" FOREIGN KEY ("delivery_id","recipient_id") REFERENCES "public"."conversation_email_update_recipient"("delivery_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient_conversation" ADD CONSTRAINT "email_update_recipient_scope_delivery_fk" FOREIGN KEY ("delivery_id","update_id") REFERENCES "public"."conversation_email_update_delivery"("id","update_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient_conversation" ADD CONSTRAINT "email_update_recipient_scope_update_fk" FOREIGN KEY ("update_id","conversation_id") REFERENCES "public"."conversation_email_update_conversation"("update_id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ADD CONSTRAINT "conversation_email_update_recipient_delivery_id_conversation_email_update_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."conversation_email_update_delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ADD CONSTRAINT "conversation_email_update_recipient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_recipient" ADD CONSTRAINT "email_update_recipient_credential_owner_fk" FOREIGN KEY ("user_id","materialized_email_credential_id") REFERENCES "public"."email"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_report" ADD CONSTRAINT "conversation_email_update_report_recipient_id_conversation_email_update_recipient_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."conversation_email_update_recipient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_facilitator_user_id_user_id_fk" FOREIGN KEY ("facilitator_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" ADD CONSTRAINT "conversation_email_update_scope_safety_block_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update" ADD CONSTRAINT "conversation_email_update_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update" ADD CONSTRAINT "email_update_authorizing_entitlement_fk" FOREIGN KEY ("authorizing_organization_id","authorizing_premium_feature_id") REFERENCES "public"."premium_feature_entitlement"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update" ADD CONSTRAINT "email_update_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD CONSTRAINT "conversation_email_update_test_attempt_update_id_conversation_email_update_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."conversation_email_update"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD CONSTRAINT "conversation_email_update_test_attempt_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD CONSTRAINT "email_update_test_destination_owner_fk" FOREIGN KEY ("requested_by_user_id","destination_email_credential_id") REFERENCES "public"."email"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" ADD CONSTRAINT "conversation_email_update_user_complaint_suppression_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" ADD CONSTRAINT "conversation_email_update_user_complaint_suppression_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_conversation_preference" ADD CONSTRAINT "email_update_conversation_preference_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_conversation_preference" ADD CONSTRAINT "email_update_conversation_preference_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_global_setting" ADD CONSTRAINT "conversation_email_update_user_global_setting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_project_preference" ADD CONSTRAINT "email_update_project_preference_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_project_preference" ADD CONSTRAINT "email_update_project_preference_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_email_update_action_recipient_idx" ON "conversation_email_update_action_token" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_scope_conversation_idx" ON "conversation_email_update_conversation" USING btree ("conversation_id","update_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_attempt_provider_message_unique" ON "conversation_email_update_delivery_attempt" USING btree ("provider_message_id") WHERE "conversation_email_update_delivery_attempt"."provider_message_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_delivery_project_active_unique" ON "conversation_email_update_delivery" USING btree ("project_id") WHERE "conversation_email_update_delivery"."status" IN ('preparing', 'queued', 'sending', 'stopping');--> statement-breakpoint
CREATE INDEX "conversation_email_update_delivery_materialization_idx" ON "conversation_email_update_delivery" USING btree ("status","id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_delivery_dispatch_idx" ON "conversation_email_update_delivery" USING btree ("status","dispatch_turn_at","id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_delivery_project_history_idx" ON "conversation_email_update_delivery" USING btree ("project_id","accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversation_email_update_delivery_history_idx" ON "conversation_email_update_delivery" USING btree ("accepted_at" DESC NULLS LAST,"update_id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_email_suppression_active_unique" ON "conversation_email_update_email_suppression" USING btree ("canonical_email","reason") WHERE "conversation_email_update_email_suppression"."lifted_at" is null;--> statement-breakpoint
CREATE INDEX "conversation_email_update_email_suppression_credential_idx" ON "conversation_email_update_email_suppression" USING btree ("email_credential_id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_recipient_scope_delivery_idx" ON "conversation_email_update_recipient_conversation" USING btree ("delivery_id","update_id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_recipient_scope_update_idx" ON "conversation_email_update_recipient_conversation" USING btree ("update_id","conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_recipient_dispatch_idx" ON "conversation_email_update_recipient" USING btree ("status","next_attempt_at","delivery_id","id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_recipient_lease_expiry_idx" ON "conversation_email_update_recipient" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE INDEX "conversation_email_update_recipient_frequency_idx" ON "conversation_email_update_recipient" USING btree ("user_id","status","provider_accepted_at","delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_organization_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("organization_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'organization' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_project_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("project_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'project' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_conversation_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("conversation_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'conversation' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_safety_facilitator_active_unique" ON "conversation_email_update_scope_safety_block" USING btree ("facilitator_user_id") WHERE "conversation_email_update_scope_safety_block"."target_kind" = 'facilitator' AND "conversation_email_update_scope_safety_block"."lifted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "conversation_email_update_sns_claim_idx" ON "conversation_email_update_sns_event_inbox" USING btree ("status","next_attempt_at","id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_sns_lease_expiry_idx" ON "conversation_email_update_sns_event_inbox" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE INDEX "conversation_email_update_test_requester_created_idx" ON "conversation_email_update_test_attempt" USING btree ("requested_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "conversation_email_update_test_claim_idx" ON "conversation_email_update_test_attempt" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_test_provider_message_unique" ON "conversation_email_update_test_attempt" USING btree ("provider_message_id") WHERE "conversation_email_update_test_attempt"."provider_message_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_email_update_user_complaint_active_unique" ON "conversation_email_update_user_complaint_suppression" USING btree ("user_id") WHERE "conversation_email_update_user_complaint_suppression"."lifted_at" is null;--> statement-breakpoint
CREATE INDEX "conversation_email_update_conversation_preference_scope_idx" ON "conversation_email_update_user_conversation_preference" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_email_update_project_preference_project_idx" ON "conversation_email_update_user_project_preference" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_conversation_email_update_override_updated_by_user_id_user_id_fk" FOREIGN KEY ("conversation_email_update_override_updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD CONSTRAINT "organization_membership_all_project_capability_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD CONSTRAINT "organization_membership_all_project_capability_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_conversation_email_update_default_updated_by_user_id_user_id_fk" FOREIGN KEY ("conversation_email_update_default_updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_active_primary_user_unique" ON "email" USING btree ("user_id") WHERE "email"."type" = 'primary' AND "email"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique" ON "organization_membership_all_project_capability" USING btree ("organization_membership_id","capability") WHERE "organization_membership_all_project_capability"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_email_update_override_audit_check" CHECK (("conversation"."conversation_email_update_override_updated_at" IS NULL) = ("conversation"."conversation_email_update_override_updated_by_user_id" IS NULL));--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" ADD CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK ((("organization_membership_all_project_capability"."deleted_at" IS NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NULL) OR ("organization_membership_all_project_capability"."deleted_at" IS NOT NULL AND "organization_membership_all_project_capability"."revoked_by_user_id" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_email_update_default_audit_check" CHECK (("project"."conversation_email_update_default_updated_at" IS NULL) = ("project"."conversation_email_update_default_updated_by_user_id" IS NULL));
