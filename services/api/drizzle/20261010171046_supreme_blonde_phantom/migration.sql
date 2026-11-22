DROP INDEX "realtime_event_outbox_conversation_replay_idx";--> statement-breakpoint
ALTER TABLE "conversation_content" ALTER COLUMN "title" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "conversation_email_update_conversation" ALTER COLUMN "conversation_title_snapshot" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "project_title_snapshot" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "conversation_email_update" ALTER COLUMN "reply_to_name_snapshot" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "project_contact" ALTER COLUMN "role_label" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "project_content" ALTER COLUMN "title" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "project_content" ALTER COLUMN "subtitle" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "project_document_localization" ALTER COLUMN "name" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "title" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "is_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "edited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD CONSTRAINT "opinion_content_edited_by_user_id_user_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated');--> statement-breakpoint
ALTER TABLE "opinion_content" ADD CONSTRAINT "opinion_content_edit_attribution_check" CHECK ("opinion_content"."is_edited" = ("opinion_content"."edited_by_user_id" IS NOT NULL));