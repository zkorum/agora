DROP INDEX "user_idx_notification";--> statement-breakpoint
DROP INDEX "notification_createdAt_idx";--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated');