-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Do not erase unclassified legacy numerical/account context.
DO $$
BEGIN
    IF EXISTS (SELECT FROM ranking_score WHERE group_sources_snapshot IS NOT NULL
               AND group_sources_snapshot <> 'null'::jsonb) THEN
        RAISE EXCEPTION 'Legacy group context requires classification before its column can be removed';
    END IF;
END;
$$;

ALTER TABLE organization_membership ADD CONSTRAINT organization_membership_role_required
    CHECK (role IS NOT NULL) NOT VALID;

ALTER TABLE "project_contact" DROP CONSTRAINT "project_contact_name_or_affiliation_check";
--> statement-breakpoint
ALTER TABLE "ranking_score" DROP COLUMN "group_sources_snapshot";
--> statement-breakpoint
ALTER TABLE "analysis_input_baseline" ADD CONSTRAINT "analysis_baseline_certificate_fk" FOREIGN KEY ("baseline_input_snapshot_id") REFERENCES "analysis_input_baseline"("input_snapshot_id");
--> statement-breakpoint
ALTER TABLE "analysis_input_baseline" ADD CONSTRAINT "analysis_baseline_input_scope_fk" FOREIGN KEY ("input_snapshot_id","conversation_id") REFERENCES "analysis_input_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "analysis_input_baseline" ADD CONSTRAINT "analysis_baseline_source_scope_fk" FOREIGN KEY ("baseline_input_snapshot_id","conversation_id") REFERENCES "analysis_input_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "analysis_input_participant_eligibility" ADD CONSTRAINT "analysis_input_participant_eligibility_0WTJjkIS5wfK_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "analysis_input_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "analysis_input_participant_eligibility" ADD CONSTRAINT "analysis_input_participant_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "analysis_survey_choice_capture" ADD CONSTRAINT "analysis_survey_choice_capture_ZypB8gXlRYCw_fkey" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "survey_aggregate_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "analysis_survey_choice_capture" ADD CONSTRAINT "analysis_survey_choice_capture_vrtRtYWy7o3U_fkey" FOREIGN KEY ("baseline_input_snapshot_id") REFERENCES "analysis_input_baseline"("input_snapshot_id");
--> statement-breakpoint
ALTER TABLE "analysis_survey_choice" ADD CONSTRAINT "analysis_survey_choice_SfjaQP4iMcV8_fkey" FOREIGN KEY ("survey_aggregate_snapshot_id") REFERENCES "analysis_survey_choice_capture"("survey_aggregate_snapshot_id");
--> statement-breakpoint
ALTER TABLE "comparison_analysis_close" ADD CONSTRAINT "comparison_analysis_close_scope_fk" FOREIGN KEY ("close_id","conversation_id") REFERENCES "conversation_analysis_close"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_analysis_close" ADD CONSTRAINT "comparison_analysis_close_original_stats_fk" FOREIGN KEY ("original_stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_analysis_close" ADD CONSTRAINT "comparison_close_closing_stats_snapshot_id_fk" FOREIGN KEY ("closing_stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_analysis_close" ADD CONSTRAINT "comparison_close_live_stats_snapshot_id_fk" FOREIGN KEY ("live_stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_analysis_close" ADD CONSTRAINT "comparison_close_served_stats_snapshot_id_fk" FOREIGN KEY ("served_stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_input_baseline" ADD CONSTRAINT "comparison_baseline_input_conversation_fk" FOREIGN KEY ("input_snapshot_id","conversation_id") REFERENCES "ranking_input_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_input_baseline" ADD CONSTRAINT "comparison_baseline_source_conversation_fk" FOREIGN KEY ("baseline_input_snapshot_id","conversation_id") REFERENCES "ranking_input_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "comparison_item_moderation" ADD CONSTRAINT "comparison_item_moderation_ranking_item_id_ranking_item_id_fkey" FOREIGN KEY ("ranking_item_id") REFERENCES "ranking_item"("id");
--> statement-breakpoint
ALTER TABLE "comparison_item_moderation" ADD CONSTRAINT "comparison_item_moderation_moderator_id_user_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_oRsuR9SdJa0L_fkey" FOREIGN KEY ("gathering_field_id") REFERENCES "gathering_field"("id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_bslZw5QOMGRT_fkey" FOREIGN KEY ("gathering_response_content_id") REFERENCES "gathering_response_content"("id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_analysis_close" ADD CONSTRAINT "conversation_analysis_close_l5IkJmDvOgax_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "conversation_draft" ADD CONSTRAINT "conversation_draft_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "conversation_draft" ADD CONSTRAINT "conversation_draft_created_by_user_id_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "conversation_draft" ADD CONSTRAINT "conversation_draft_gsYlWhuI3zl2_fkey" FOREIGN KEY ("published_conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "conversation_export_object" ADD CONSTRAINT "conversation_export_object_PtLlWo75via5_fkey" FOREIGN KEY ("artifact_id") REFERENCES "conversation_export_artifact"("id");
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_nju61H63Fkmf_fkey" FOREIGN KEY ("credit_voting_config_id") REFERENCES "credit_voting_config"("id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_gathering_config_id_gathering_config_id_fkey" FOREIGN KEY ("gathering_config_id") REFERENCES "gathering_config"("id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_view_snapshot" ADD CONSTRAINT "conversation_view_snapshot_close_generation_fk" FOREIGN KEY ("conversation_id","close_replacement_generation") REFERENCES "polis_analysis_close_generation"("conversation_id","data_generation") NOT VALID;
--> statement-breakpoint
ALTER TABLE "gathering_answer" ADD CONSTRAINT "gathering_answer_QC8LSTbfId42_fkey" FOREIGN KEY ("config_id","content_id") REFERENCES "gathering_response_content"("config_id","id");
--> statement-breakpoint
ALTER TABLE "gathering_answer" ADD CONSTRAINT "gathering_answer_VsQxkBy9VWIK_fkey" FOREIGN KEY ("config_id","field_id") REFERENCES "gathering_field"("config_id","id");
--> statement-breakpoint
ALTER TABLE "gathering_answer_translation" ADD CONSTRAINT "gathering_answer_translation_iTwwzyxpknjn_fkey" FOREIGN KEY ("content_id","field_id") REFERENCES "gathering_answer"("content_id","field_id");
--> statement-breakpoint
ALTER TABLE "gathering_field" ADD CONSTRAINT "gathering_field_config_id_gathering_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "gathering_config"("id");
--> statement-breakpoint
ALTER TABLE "gathering_field_translation" ADD CONSTRAINT "gathering_field_translation_field_id_gathering_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "gathering_field"("id");
--> statement-breakpoint
ALTER TABLE "gathering_moderation" ADD CONSTRAINT "gathering_moderation_response_id_gathering_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "gathering_response"("id");
--> statement-breakpoint
ALTER TABLE "gathering_moderation" ADD CONSTRAINT "gathering_moderation_moderator_id_user_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "gathering_response_content" ADD CONSTRAINT "gathering_response_content_fYnutAuIh58h_fkey" FOREIGN KEY ("config_id","response_id") REFERENCES "gathering_response"("config_id","id");
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_source_conversation_id_conversation_id_fkey" FOREIGN KEY ("source_conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_gZoEoHUqVvp3_fkey" FOREIGN KEY ("source_response_content_id") REFERENCES "gathering_response_content"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_Fm8N2oKqOQDJ_fkey" FOREIGN KEY ("conversation_id","config_id") REFERENCES "conversation"("id","gathering_config_id");
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_current_fk" FOREIGN KEY ("id","current_content_id") REFERENCES "gathering_response_content"("response_id","id");
--> statement-breakpoint
ALTER TABLE "gathering_response" ADD CONSTRAINT "gathering_response_baseline_fk" FOREIGN KEY ("id","baseline_content_id") REFERENCES "gathering_response_content"("response_id","id");
--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_participant_account_fk" FOREIGN KEY ("participant_id","user_id") REFERENCES "conversation_participant"("id","user_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "polis_analysis_close_generation" ADD CONSTRAINT "polis_analysis_close_generation_scope_fk" FOREIGN KEY ("close_id","conversation_id") REFERENCES "conversation_analysis_close"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "polis_analysis_close_generation" ADD CONSTRAINT "polis_analysis_close_generation_capture_fk" FOREIGN KEY ("input_snapshot_id","conversation_id") REFERENCES "analysis_input_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "polis_analysis_close" ADD CONSTRAINT "polis_analysis_close_scope_fk" FOREIGN KEY ("close_id","conversation_id") REFERENCES "conversation_analysis_close"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "polis_analysis_close" ADD CONSTRAINT "polis_analysis_close_original_view_fk" FOREIGN KEY ("original_view_snapshot_id","conversation_id","opinion_group_spec_id") REFERENCES "conversation_view_snapshot"("id","conversation_id","opinion_group_spec_id");
--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_version_conversation_fk" FOREIGN KEY ("version_id","conversation_id") REFERENCES "qv_response_version"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_item_conversation_fk" FOREIGN KEY ("item_id","conversation_id") REFERENCES "ranking_item"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "qv_allocation" ADD CONSTRAINT "qv_allocation_content_owner_fk" FOREIGN KEY ("content_id","item_id") REFERENCES "ranking_item_content"("id","ranking_item_id");
--> statement-breakpoint
ALTER TABLE "qv_calculation_state" ADD CONSTRAINT "qv_calculation_state_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "qv_calculation_state" ADD CONSTRAINT "qv_current_calculation_conversation_fk" FOREIGN KEY ("current_calculation_id","conversation_id") REFERENCES "qv_calculation"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "qv_calculation" ADD CONSTRAINT "qv_calculation_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "qv_calculation" ADD CONSTRAINT "qv_calculation_input_owner_fk" FOREIGN KEY ("input_snapshot_id","id") REFERENCES "qv_input_snapshot"("id","calculation_id");
--> statement-breakpoint
ALTER TABLE "qv_input_allocation" ADD CONSTRAINT "qv_input_allocation_ballot_fk" FOREIGN KEY ("snapshot_id","ballot_index") REFERENCES "qv_input_ballot"("snapshot_id","ballot_index");
--> statement-breakpoint
ALTER TABLE "qv_input_allocation" ADD CONSTRAINT "qv_input_allocation_item_fk" FOREIGN KEY ("snapshot_id","item_slug_id") REFERENCES "qv_input_item"("snapshot_id","item_slug_id");
--> statement-breakpoint
ALTER TABLE "qv_input_ballot_eligibility" ADD CONSTRAINT "qv_input_ballot_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "qv_input_ballot_eligibility" ADD CONSTRAINT "qv_input_ballot_eligibility_ballot_fk" FOREIGN KEY ("snapshot_id","ballot_index") REFERENCES "qv_input_ballot"("snapshot_id","ballot_index");
--> statement-breakpoint
ALTER TABLE "qv_input_ballot" ADD CONSTRAINT "qv_input_ballot_snapshot_id_qv_input_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "qv_input_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "qv_input_item" ADD CONSTRAINT "qv_input_item_snapshot_id_qv_input_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "qv_input_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "qv_input_snapshot" ADD CONSTRAINT "qv_input_snapshot_calculation_id_qv_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "qv_calculation"("id");
--> statement-breakpoint
ALTER TABLE "qv_live_stats" ADD CONSTRAINT "qv_live_stats_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "qv_response_command" ADD CONSTRAINT "qv_response_command_response_id_qv_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "qv_response"("id");
--> statement-breakpoint
ALTER TABLE "qv_response_command" ADD CONSTRAINT "qv_command_result_owner_fk" FOREIGN KEY ("result_version_id","response_id") REFERENCES "qv_response_version"("id","response_id");
--> statement-breakpoint
ALTER TABLE "qv_response" ADD CONSTRAINT "qv_response_participant_conversation_fk" FOREIGN KEY ("participant_id","conversation_id") REFERENCES "conversation_participant"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "qv_response" ADD CONSTRAINT "qv_response_current_version_owner_fk" FOREIGN KEY ("current_version_id","id") REFERENCES "qv_response_version"("id","response_id");
--> statement-breakpoint
ALTER TABLE "qv_response_version" ADD CONSTRAINT "qv_version_response_conversation_fk" FOREIGN KEY ("response_id","conversation_id") REFERENCES "qv_response"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "qv_result_item" ADD CONSTRAINT "qv_result_input_item_fk" FOREIGN KEY ("snapshot_id","item_slug_id") REFERENCES "qv_input_item"("snapshot_id","item_slug_id");
--> statement-breakpoint
ALTER TABLE "qv_stats_refresh" ADD CONSTRAINT "qv_stats_refresh_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_reused_input_conversation_fk" FOREIGN KEY ("reused_input_snapshot_id","conversation_id") REFERENCES "ranking_input_snapshot"("id","conversation_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_derived_close_fk" FOREIGN KEY ("derived_from_close_id","conversation_id") REFERENCES "conversation_analysis_close"("id","conversation_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_participant_fk" FOREIGN KEY ("input_snapshot_id","participant_index") REFERENCES "ranking_input_participant"("input_snapshot_id","participant_index");
--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_best_item_fk" FOREIGN KEY ("input_snapshot_id","best_slug_id") REFERENCES "ranking_input_item"("input_snapshot_id","item_slug_id");
--> statement-breakpoint
ALTER TABLE "ranking_input_answer" ADD CONSTRAINT "ranking_input_answer_worst_item_fk" FOREIGN KEY ("input_snapshot_id","worst_slug_id") REFERENCES "ranking_input_item"("input_snapshot_id","item_slug_id");
--> statement-breakpoint
ALTER TABLE "ranking_input_item" ADD CONSTRAINT "ranking_input_item_mDlic55lBiV8_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "ranking_input_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "ranking_input_participant_eligibility" ADD CONSTRAINT "ranking_input_participant_eligibility_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "ranking_input_participant_eligibility" ADD CONSTRAINT "ranking_input_participant_eligibility_participant_fk" FOREIGN KEY ("input_snapshot_id","participant_index") REFERENCES "ranking_input_participant"("input_snapshot_id","participant_index");
--> statement-breakpoint
ALTER TABLE "ranking_input_participant" ADD CONSTRAINT "ranking_input_participant_2En63jjmaTz0_fkey" FOREIGN KEY ("input_snapshot_id") REFERENCES "ranking_input_snapshot"("id");
--> statement-breakpoint
ALTER TABLE "ranking_input_snapshot" ADD CONSTRAINT "ranking_input_snapshot_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id");
--> statement-breakpoint
ALTER TABLE "ranking_input_snapshot" ADD CONSTRAINT "ranking_input_stats_conversation_fk" FOREIGN KEY ("stats_snapshot_id","conversation_id") REFERENCES "ranking_conversation_stats_snapshot"("id","conversation_id");
--> statement-breakpoint
ALTER TABLE "survey_aggregate_snapshot" ADD CONSTRAINT "survey_aggregate_snapshot_source_fk" FOREIGN KEY ("source_survey_aggregate_snapshot_id") REFERENCES "survey_aggregate_snapshot"("id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_current_content_owner_fk" FOREIGN KEY ("current_content_id","id") REFERENCES "vote_content"("id","vote_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_current_content_id_vote_content_id_fk", ADD CONSTRAINT "vote_participant_account_fk" FOREIGN KEY ("participant_id","author_id") REFERENCES "conversation_participant"("id","user_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "analysis_input_snapshot" ADD CONSTRAINT "analysis_input_snapshot_version_check" CHECK ("payload_version" in (1, 2)) NOT VALID;
--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_position_check" CHECK ("position" >= 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_distinct_choices_check" CHECK ("best_slug_id" <> "worst_slug_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "comparison_answer" ADD CONSTRAINT "comparison_answer_candidates_check" CHECK (((cardinality("candidate_set") BETWEEN 2 AND 4) and ("candidate_set" @> ARRAY["best_slug_id"::text, "worst_slug_id"::text]))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "comparison_response" ADD CONSTRAINT "comparison_response_account_binding_check" CHECK (((((("participant_id" is not null)) and (("detached_at" is null)))) or (((("participant_id" is null)) and (("detached_at" is not null)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "content_translation_work" ADD CONSTRAINT "content_translation_work_gathering_source_check" CHECK ((((("source_kind" = 'gathering_field') and (("gathering_field_id" is not null)) and (("gathering_response_content_id" is null)))) or ((("source_kind" = 'gathering_response') and (("gathering_field_id" is null)) and (("gathering_response_content_id" is not null)))) or ((("source_kind" not in ('gathering_field', 'gathering_response')) and (("gathering_field_id" is null)) and (("gathering_response_content_id" is null)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_test_attempt" ADD CONSTRAINT "email_update_test_sender_provenance_check" CHECK (((((("sender_purged_at" is null)) and (("requested_by_user_id" is not null)) and (("destination_email_credential_id" is not null)) and (("destination_email_snapshot" is not null)))) or (((("sender_purged_at" is not null)) and (("requested_by_user_id" is null)) and (("destination_email_credential_id" is null)) and (("destination_email_snapshot" is null)) and ("status" not in ('pending', 'claimed', 'attempting')))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_import" ADD CONSTRAINT "conversation_import_requester_check" CHECK (((((("user_id" is not null)) and (("requester_purged_at" is null)))) or (((("user_id" is null)) and (("requester_purged_at" is not null)) and (("conversation_id" is not null)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_participation_mode_settings_source_check" CHECK ("participation_mode_settings_source" in ('project_inherited', 'conversation_override')) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_identity_check" CHECK (((("user_id" is not null)) or (("participant_id" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "opinion_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "opinion_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_user_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "phone" ADD CONSTRAINT "phone_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "project_contact" ADD CONSTRAINT "project_contact_identity_or_email_check" CHECK (((((("email" is not null)) and ("email" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("first_name" is not null)) and ("first_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (((("last_name" is not null)) and ("last_name" ~ U&'[^\0009-\000d \00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]'))) or (("organization_id" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_account_retirement_check" CHECK (((("retired_for_account_deletion_at" is null)) or (((("auto_provisioned_for_organization_id" is not null)) and (("deleted_at" is not null)) and ("deleted_at" = "retired_for_account_deletion_at"::timestamp(0)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD CONSTRAINT "ranking_stats_item_redacted_source_check" CHECK (((("ranking_item_content_id" is not null)) or (("external_url" is null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "comparison_derived_closing_result_check" CHECK (((("derived_from_close_id" is null)) or ((("is_closed" = true) and (("reused_input_snapshot_id" is null)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_reused_input_closed_check" CHECK (((("reused_input_snapshot_id" is null)) or ("is_closed" = true))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_source_owner_check" CHECK (((("author_id" is not null)) or ("is_seed" = true) or (("deleted_at" is not null)) or (("account_hidden_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_participant_moderation_check" CHECK (((("moderation" is null)) or ((("is_seed" = false) and ("moderation" in ('move', 'hide')))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_deletion_intent_check" CHECK (((("deleted_at" is null)) or (("current_content_id" is null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_contribution_revision_check" CHECK ("contribution_revision" >= 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_recovery_lifecycle_check" CHECK (((((((("deletion_requested_at" is null)) and (("recoverable_until" is null)))) or ((("is_deleted" = true) and (("deletion_reason" is not null)) and ("deletion_reason" = 'account_deletion') and (("deletion_requested_at" is not null)) and (("recoverable_until" is not null)) and ("recoverable_until" = "deletion_requested_at" + interval '15 days'))))) and (((("purge_started_at" is null)) or ("is_deleted" = true))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_deletion_reason_check" CHECK (((("deletion_reason" is null)) or ((("is_deleted" = true) and (("deleted_at" is not null)) and ("deletion_reason" in ('account_deletion', 'guest_merge')))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_inactive_intent_check" CHECK (((((("withdrawn_at" is null)) and (("retired_at" is null)))) or (("current_content_id" is null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "zk_passport" ADD CONSTRAINT "zk_passport_recovery_reservation_check" CHECK ((("reserved_for_recovery" = false) or ("is_deleted" = true))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "content_translation_work" DROP CONSTRAINT "content_translation_work_source_check", ADD CONSTRAINT "content_translation_work_source_check" CHECK ((((("source_kind" = 'conversation') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is not null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'project') and (("conversation_id" is null)) and (("project_content_id" is not null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'opinion') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is not null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'survey_question') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is not null)) and (("survey_question_option_content_ids" is not null)) and (("ranking_item_content_id" is null)))) or ((("source_kind" = 'ranking_item') and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is not null)))) or ((("source_kind" in ('gathering_field', 'gathering_response')) and (("conversation_id" is not null)) and (("project_content_id" is null)) and (("conversation_content_id" is null)) and (("opinion_content_id" is null)) and (("survey_question_content_id" is null)) and (("survey_question_option_content_ids" is null)) and (("ranking_item_content_id" is null)))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" DROP CONSTRAINT "survey_question_option_content_translation_source_metadata_check", ADD CONSTRAINT "survey_question_option_content_translation_source_metadata_check" CHECK ((("source_language_provider" IS NULL AND "source_raw_language_code" IS NULL) OR ("source_language_provider" IS NOT NULL AND "source_raw_language_code" IS NOT NULL))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_subtype_config_check", ADD CONSTRAINT "conversation_subtype_config_check" CHECK ((((("conversation_type" = 'gathering') and (("gathering_config_id" is not null)) and (("polis_config_id" is null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or (((("gathering_config_id" is null)) and ((((("conversation_type" = 'polis') and (("polis_config_id" is not null)) and (("ranking_config_id" is null)) and (("credit_voting_config_id" is null)) and (("prioritization_type" is null)))) or ((("conversation_type" = 'prioritizing') and (("polis_config_id" is null)) and (("prioritization_type" is not null)) and ((((("prioritization_type" = 'comparisons') and (("ranking_config_id" is not null)) and (("credit_voting_config_id" is null)))) or ((("prioritization_type" = 'qv') and (("credit_voting_config_id" is not null)) and (("ranking_config_id" is null)))))))))))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_email_suppression" DROP CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check", ADD CONSTRAINT "conversation_email_update_email_suppression_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_scope_safety_block" DROP CONSTRAINT "conversation_email_update_safety_lift_audit_check", ADD CONSTRAINT "conversation_email_update_safety_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_email_update_user_complaint_suppression" DROP CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check", ADD CONSTRAINT "conversation_email_update_user_complaint_lift_audit_check" CHECK (((("lifted_by_user_id" is null)) or (("lifted_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_email_update_override_audit_check", ADD CONSTRAINT "conversation_email_update_override_audit_check" CHECK (((("conversation_email_update_override_updated_by_user_id" is null)) or (("conversation_email_update_override_updated_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "organization_membership_all_project_capability" DROP CONSTRAINT "organization_membership_all_project_capability_revocation_check", ADD CONSTRAINT "organization_membership_all_project_capability_revocation_check" CHECK (((("revoked_by_user_id" is null)) or (("deleted_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_email_update_default_audit_check", ADD CONSTRAINT "project_email_update_default_audit_check" CHECK (((("conversation_email_update_default_updated_by_user_id" is null)) or (("conversation_email_update_default_updated_at" is not null)))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_email_update" DROP CONSTRAINT "conversation_email_update_review_fields_check", ADD CONSTRAINT "conversation_email_update_review_fields_check" CHECK (((((((("review_expires_at" is null)) and (("template_version" is null)) and (("participant_preference_scope_snapshot" is null)) and (("branding_snapshot" is null)))) or (((("review_expires_at" is not null)) and (("template_version" is not null)) and (("participant_preference_scope_snapshot" is not null)) and (("branding_snapshot" is not null)))))) and (((("cancelled_at" is null)) or (("review_expires_at" is not null)))) and (((((("review_expires_at" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null)))) or (((("review_expires_at" is not null)) and (((((("created_by_user_id" is not null)) and (("review_test_email_credential_id" is not null)) and (("review_test_email_snapshot" is not null)))) or (((("created_by_user_id" is null)) and (("review_test_email_credential_id" is null)) and (("review_test_email_snapshot" is null)))))))))))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "opinion_content" DROP CONSTRAINT "opinion_content_edit_attribution_check", ADD CONSTRAINT "opinion_content_edit_attribution_check" CHECK (((("edited_by_user_id" is null)) or ("is_edited" = true))) NOT VALID;
--> statement-breakpoint
ALTER TABLE "realtime_event_dispatch_state" DROP CONSTRAINT "realtime_event_dispatch_state_sequence_check", ADD CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK ((("replay_floor_delivery_id" >= 0) and ("last_delivery_id" >= "replay_floor_delivery_id"))) NOT VALID;
