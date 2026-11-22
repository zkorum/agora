DROP INDEX "realtime_event_outbox_conversation_replay_idx";--> statement-breakpoint
ALTER TABLE "opinion_content" ALTER COLUMN "content" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ALTER COLUMN "body" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated');--> statement-breakpoint
ALTER TABLE "opinion_content" ADD CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("opinion_content"."content") <= 16384);