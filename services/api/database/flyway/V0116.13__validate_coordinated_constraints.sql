-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

ALTER TABLE organization_membership VALIDATE CONSTRAINT organization_membership_role_required;
--> statement-breakpoint
ALTER TABLE organization_membership ALTER COLUMN role SET NOT NULL;
--> statement-breakpoint
ALTER TABLE organization_membership DROP CONSTRAINT organization_membership_role_required;
--> statement-breakpoint
ALTER TABLE "content_translation_work" VALIDATE CONSTRAINT "content_translation_work_oRsuR9SdJa0L_fkey";
--> statement-breakpoint
ALTER TABLE "content_translation_work" VALIDATE CONSTRAINT "content_translation_work_bslZw5QOMGRT_fkey";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_nju61H63Fkmf_fkey";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_gathering_config_id_gathering_config_id_fkey";
--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" VALIDATE CONSTRAINT "conversation_view_snapshot_close_generation_fk";
--> statement-breakpoint
ALTER TABLE "opinion_group_user" VALIDATE CONSTRAINT "opinion_group_participant_account_fk";
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" VALIDATE CONSTRAINT "ranking_stats_reused_input_conversation_fk";
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" VALIDATE CONSTRAINT "ranking_stats_derived_close_fk";
--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" VALIDATE CONSTRAINT "survey_aggregate_snapshot_source_fk";
--> statement-breakpoint
ALTER TABLE "vote" VALIDATE CONSTRAINT "vote_current_content_owner_fk";
--> statement-breakpoint
ALTER TABLE "vote" VALIDATE CONSTRAINT "vote_participant_account_fk";
--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" VALIDATE CONSTRAINT "analysis_input_snapshot_version_check";
--> statement-breakpoint
ALTER TABLE "comparison_answer" VALIDATE CONSTRAINT "comparison_answer_position_check";
--> statement-breakpoint
ALTER TABLE "comparison_answer" VALIDATE CONSTRAINT "comparison_answer_distinct_choices_check";
--> statement-breakpoint
ALTER TABLE "comparison_answer" VALIDATE CONSTRAINT "comparison_answer_candidates_check";
--> statement-breakpoint
ALTER TABLE "comparison_response" VALIDATE CONSTRAINT "comparison_response_account_binding_check";
--> statement-breakpoint
ALTER TABLE "content_translation_work" VALIDATE CONSTRAINT "content_translation_work_gathering_source_check";
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" VALIDATE CONSTRAINT "email_update_test_sender_provenance_check";
--> statement-breakpoint
ALTER TABLE "conversation_import" VALIDATE CONSTRAINT "conversation_import_requester_check";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_participation_mode_settings_source_check";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_deletion_intent_check";
--> statement-breakpoint
ALTER TABLE "email" VALIDATE CONSTRAINT "email_recovery_reservation_check";
--> statement-breakpoint
ALTER TABLE "opinion_group_user" VALIDATE CONSTRAINT "opinion_group_user_identity_check";
--> statement-breakpoint
ALTER TABLE "opinion" VALIDATE CONSTRAINT "opinion_source_owner_check";
--> statement-breakpoint
ALTER TABLE "opinion" VALIDATE CONSTRAINT "opinion_deletion_intent_check";
--> statement-breakpoint
ALTER TABLE "organization" VALIDATE CONSTRAINT "organization_account_retirement_check";
--> statement-breakpoint
ALTER TABLE "phone" VALIDATE CONSTRAINT "phone_recovery_reservation_check";
--> statement-breakpoint
ALTER TABLE "project_contact" VALIDATE CONSTRAINT "project_contact_identity_or_email_check";
--> statement-breakpoint
ALTER TABLE "project" VALIDATE CONSTRAINT "project_account_retirement_check";
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" VALIDATE CONSTRAINT "ranking_stats_item_redacted_source_check";
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" VALIDATE CONSTRAINT "comparison_derived_closing_result_check";
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" VALIDATE CONSTRAINT "ranking_stats_reused_input_closed_check";
--> statement-breakpoint
ALTER TABLE "ranking_item" VALIDATE CONSTRAINT "ranking_item_source_owner_check";
--> statement-breakpoint
ALTER TABLE "ranking_item" VALIDATE CONSTRAINT "ranking_item_participant_moderation_check";
--> statement-breakpoint
ALTER TABLE "ranking_item" VALIDATE CONSTRAINT "ranking_item_deletion_intent_check";
--> statement-breakpoint
ALTER TABLE "user" VALIDATE CONSTRAINT "user_contribution_revision_check";
--> statement-breakpoint
ALTER TABLE "user" VALIDATE CONSTRAINT "user_recovery_lifecycle_check";
--> statement-breakpoint
ALTER TABLE "user" VALIDATE CONSTRAINT "user_deletion_reason_check";
--> statement-breakpoint
ALTER TABLE "vote" VALIDATE CONSTRAINT "vote_inactive_intent_check";
--> statement-breakpoint
ALTER TABLE "zk_passport" VALIDATE CONSTRAINT "zk_passport_recovery_reservation_check";
--> statement-breakpoint
ALTER TABLE "content_translation_work" VALIDATE CONSTRAINT "content_translation_work_source_check";
--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" VALIDATE CONSTRAINT "survey_question_option_content_translation_source_metadata_check";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_subtype_config_check";
--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" VALIDATE CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check";
--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" VALIDATE CONSTRAINT "conversation_email_update_safety_lift_audit_check";
--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" VALIDATE CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check";
--> statement-breakpoint
ALTER TABLE "conversation" VALIDATE CONSTRAINT "conversation_email_update_override_audit_check";
--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" VALIDATE CONSTRAINT "organization_membership_all_project_capability_revocation_check";
--> statement-breakpoint
ALTER TABLE "project" VALIDATE CONSTRAINT "project_email_update_default_audit_check";
--> statement-breakpoint
ALTER TABLE "conversation_email_update" VALIDATE CONSTRAINT "conversation_email_update_review_fields_check";
--> statement-breakpoint
ALTER TABLE "opinion_content" VALIDATE CONSTRAINT "opinion_content_edit_attribution_check";
--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" VALIDATE CONSTRAINT "realtime_event_dispatch_state_sequence_check";
