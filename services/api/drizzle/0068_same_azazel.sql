CREATE TABLE "opinion_group_candidate_description_locale_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_description_locale_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_description_locale_request_unique" UNIQUE("candidate_id","locale")
);
--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "opinion_group_description_locale_status" CASCADE;--> statement-breakpoint
DROP INDEX "analysis_work_state_due_idx";--> statement-breakpoint
DROP INDEX "conversation_import_conversation_idx";--> statement-breakpoint
DROP INDEX "conversation_moderation_conversation_id_moderation_action_idx";--> statement-breakpoint
DROP INDEX "conversation_topic_index";--> statement-breakpoint
DROP INDEX "followed_topic_index";--> statement-breakpoint
DROP INDEX "maxdiff_external_source_external_id_idx";--> statement-breakpoint
DROP INDEX "maxdiff_item_slug_idx";--> statement-breakpoint
DROP INDEX "opinion_group_description_translation_work_due_idx";--> statement-breakpoint
DROP INDEX "opinion_group_lineage_description_work_due_idx";--> statement-breakpoint
DROP INDEX "opinion_createdAt_idx";--> statement-breakpoint
DROP INDEX "opinion_slugId_idx";--> statement-breakpoint
DROP INDEX "ranking_score_entity_score_idx";--> statement-breakpoint
DROP INDEX "user_display_language_user_idx";--> statement-breakpoint
DROP INDEX "user_idx_mute";--> statement-breakpoint
DROP INDEX "user_idx_organization";--> statement-breakpoint
DROP INDEX "user_spoken_languages_user_idx";--> statement-breakpoint
DROP INDEX "user_isDeleted_idx";--> statement-breakpoint
DROP INDEX "conversation_feed_idx";--> statement-breakpoint
DROP INDEX "conversation_author_timeline_idx";--> statement-breakpoint
DROP INDEX "conversation_organization_timeline_idx";--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_latest_idx";--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_latest_active_idx";--> statement-breakpoint
DROP INDEX "conversation_view_snapshot_latest_spec_active_idx";--> statement-breakpoint
DROP INDEX "notification_user_created_id_idx";--> statement-breakpoint
DROP INDEX "opinion_group_description_translation_work_claim_idx";--> statement-breakpoint
DROP INDEX "opinion_group_lineage_description_work_claim_idx";--> statement-breakpoint
DROP INDEX "opinion_author_active_created_id_idx";--> statement-breakpoint
DROP INDEX "opinion_conversation_active_created_id_idx";--> statement-breakpoint
DROP INDEX "vote_author_active_updated_id_idx";--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_description_locale_request" ADD CONSTRAINT "opinion_group_candidate_description_locale_request_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opinion_group_candidate_description_locale_request_updated_idx" ON "opinion_group_candidate_description_locale_request" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX "og_candidate_desc_locale_request_translation_updated_idx" ON "opinion_group_candidate_description_locale_request" USING btree ("updated_at","id") WHERE "opinion_group_candidate_description_locale_request"."locale" <> 'en';--> statement-breakpoint
CREATE INDEX "maxdiff_user_entity_score_result_score_idx" ON "maxdiff_user_entity_score" USING btree ("maxdiff_result_id","score" DESC);--> statement-breakpoint
CREATE INDEX "opinion_group_opinion_stats_representative_idx" ON "opinion_group_opinion_stats" USING btree ("group_id","representative_probability_agreement" DESC NULLS LAST,"analysis_snapshot_opinion_id") WHERE ("opinion_group_opinion_stats"."representative_agreement_type" is not null AND "opinion_group_opinion_stats"."representative_probability_agreement" is not null);--> statement-breakpoint
CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at" DESC,"id" DESC) WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;--> statement-breakpoint
CREATE INDEX "conversation_author_timeline_idx" ON "conversation" USING btree ("author_id","is_importing","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "conversation_organization_timeline_idx" ON "conversation" USING btree ("organization_id","is_importing","created_at" DESC,"id" DESC) WHERE "conversation"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_spec_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","opinion_group_spec_id","created_at" DESC,"id" DESC) WHERE "conversation_view_snapshot"."activated_at" is not null;--> statement-breakpoint
CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "opinion_group_description_translation_work_claim_idx" ON "opinion_group_description_translation_work" USING btree ("conversation_id","updated_at","id") WHERE "opinion_group_description_translation_work"."lease_token" is null;--> statement-breakpoint
CREATE INDEX "opinion_group_lineage_description_work_claim_idx" ON "opinion_group_lineage_description_work" USING btree ("conversation_id","updated_at","id") WHERE "opinion_group_lineage_description_work"."lease_token" is null;--> statement-breakpoint
CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "opinion"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC,"id" DESC) WHERE "vote"."current_content_id" is not null;--> statement-breakpoint
ALTER TABLE "analysis_work_state" DROP COLUMN "next_run_at";--> statement-breakpoint
ALTER TABLE "opinion_group_description_translation_work" DROP COLUMN "next_run_at";--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" DROP COLUMN "next_run_at";--> statement-breakpoint
DROP TYPE "public"."ai_description_locale_status_enum";