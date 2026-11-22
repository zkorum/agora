-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET lock_timeout = '5s';
SET TIME ZONE 'UTC';
SET search_path = public, pg_temp;
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "phone_hash_active_unique__v0116" ON "phone" ("phone_hash") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));
--> statement-breakpoint
DROP INDEX CONCURRENTLY "phone_hash_active_unique";
--> statement-breakpoint
ALTER INDEX "phone_hash_active_unique__v0116" RENAME TO "phone_hash_active_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "zk_passport_nullifier_active_unique__v0116" ON "zk_passport" ("nullifier") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));
--> statement-breakpoint
DROP INDEX CONCURRENTLY "zk_passport_nullifier_active_unique";
--> statement-breakpoint
ALTER INDEX "zk_passport_nullifier_active_unique__v0116" RENAME TO "zk_passport_nullifier_active_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "email_active_unique__v0116" ON "email" ("email") WHERE (("is_deleted" = false) or ("reserved_for_recovery" = true));
--> statement-breakpoint
DROP INDEX CONCURRENTLY "email_active_unique";
--> statement-breakpoint
ALTER INDEX "email_active_unique__v0116" RENAME TO "email_active_unique";
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "realtime_event_outbox_conversation_replay_idx__v0116" ON "realtime_event_outbox" (("payload"->>'conversationSlugId'),"delivery_id") WHERE "event_type" in ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'opinion_source_changed', 'conversation_comment_stats_updated', 'conversation_qv_stats_updated', 'conversation_qv_calculation_updated', 'opinion_vote_counts_updated');
--> statement-breakpoint
DROP INDEX CONCURRENTLY "realtime_event_outbox_conversation_replay_idx";
--> statement-breakpoint
ALTER INDEX "realtime_event_outbox_conversation_replay_idx__v0116" RENAME TO "realtime_event_outbox_conversation_replay_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "analysis_input_snapshot_scope_unique__v0116" ON "analysis_input_snapshot" ("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" ADD CONSTRAINT "analysis_input_snapshot_scope_unique" UNIQUE USING INDEX "analysis_input_snapshot_scope_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "analysis_work_state_input_spec_unique__v0116" ON "analysis_work_state" ("conversation_id","opinion_group_spec_id","uses_closing_inputs");
--> statement-breakpoint
ALTER TABLE "analysis_work_state" DROP CONSTRAINT "analysis_work_state_conversation_spec_unique", ADD CONSTRAINT "analysis_work_state_input_spec_unique" UNIQUE USING INDEX "analysis_work_state_input_spec_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_participant_id_account_unique__v0116" ON "conversation_participant" ("id","user_id");
--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_id_account_unique" UNIQUE USING INDEX "conversation_participant_id_account_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_participant_id_conversation_unique__v0116" ON "conversation_participant" ("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_id_conversation_unique" UNIQUE USING INDEX "conversation_participant_id_conversation_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_gathering_config_unique__v0116" ON "conversation" ("id","gathering_config_id");
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_unique" UNIQUE USING INDEX "conversation_gathering_config_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_credit_voting_config_id_key__v0116" ON "conversation" ("credit_voting_config_id");
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_credit_voting_config_id_key" UNIQUE USING INDEX "conversation_credit_voting_config_id_key__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_gathering_config_id_key__v0116" ON "conversation" ("gathering_config_id");
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_id_key" UNIQUE USING INDEX "conversation_gathering_config_id_key__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_view_snapshot_scope_unique__v0116" ON "conversation_view_snapshot" ("id","conversation_id","opinion_group_spec_id");
--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_scope_unique" UNIQUE USING INDEX "conversation_view_snapshot_scope_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "conversation_view_snapshot_close_generation_spec_unique__v0116" ON "conversation_view_snapshot" ("conversation_id","close_replacement_generation","opinion_group_spec_id");
--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_close_generation_spec_unique" UNIQUE USING INDEX "conversation_view_snapshot_close_generation_spec_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "vote_content_id_owner_unique__v0116" ON "vote_content" ("id","vote_id");
--> statement-breakpoint
ALTER TABLE "vote_content" ADD CONSTRAINT "vote_content_id_owner_unique" UNIQUE USING INDEX "vote_content_id_owner_unique__v0116";
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "content_translation_work_gathering_field_unique" ON "content_translation_work" ("gathering_field_id","display_language_code") WHERE "source_kind" = 'gathering_field';
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "content_translation_work_gathering_response_unique" ON "content_translation_work" ("gathering_response_content_id","display_language_code") WHERE "source_kind" = 'gathering_response';
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "conversation_deleted_idx" ON "conversation" ("deleted_at","id") WHERE ("deleted_at" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "opinion_deleted_idx" ON "opinion" ("deleted_at","id") WHERE ("deleted_at" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "organization_membership_active_admin_idx" ON "organization_membership" ("organization_id","user_id") WHERE ((("deleted_at" is null)) and ("role" = 'admin'));
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "phone_user_idx" ON "phone" ("user_id");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "project_contact_organization_idx" ON "project_contact" ("organization_id") WHERE ("organization_id" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "project_organization_attribution_organization_idx" ON "project_organization_attribution" ("organization_id") WHERE ("organization_id" is not null);
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "project_active_default_organization_unique" ON "project" ("auto_provisioned_for_organization_id") WHERE ("deleted_at" is null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "ranking_stats_reused_input_idx" ON "ranking_conversation_stats_snapshot" ("reused_input_snapshot_id") WHERE ("reused_input_snapshot_id" is not null);
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "comparison_closing_result_revision_unique" ON "ranking_conversation_stats_snapshot" ("derived_from_close_id","scoring_input_revision") WHERE ("derived_from_close_id" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "comparison_moderation_history_idx" ON "ranking_item" ("conversation_id","id") WHERE ("moderation" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "ranking_score_conversation_idx" ON "ranking_score" ("conversation_id","id");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "ranking_score_unclassified_context_idx" ON "ranking_score" ("id") WHERE ((("user_weights_snapshot" is not null)) and ("user_weights_snapshot" <> 'null'::jsonb));
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "survey_aggregate_snapshot_source_idx" ON "survey_aggregate_snapshot" ("source_survey_aggregate_snapshot_id") WHERE ("source_survey_aggregate_snapshot_id" is not null);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "survey_response_participant_idx" ON "survey_response" ("participant_id");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY "zk_passport_user_idx" ON "zk_passport" ("user_id");
--> statement-breakpoint
DROP INDEX CONCURRENTLY "maxdiff_result_complete_idx";
--> statement-breakpoint
RESET lock_timeout;
RESET search_path;
RESET TIME ZONE;
