CREATE TABLE "realtime_event_dispatch_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_delivery_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "realtime_event_dispatch_state_singleton_check" CHECK ("realtime_event_dispatch_state"."id" = 1),
	CONSTRAINT "realtime_event_dispatch_state_sequence_check" CHECK ("realtime_event_dispatch_state"."last_delivery_id" >= 0)
);
--> statement-breakpoint
DROP INDEX "realtime_event_outbox_conversation_replay_idx";--> statement-breakpoint
DROP INDEX "realtime_event_outbox_ranking_replay_idx";--> statement-breakpoint
ALTER TABLE "realtime_event_outbox" ADD COLUMN "delivery_id" integer;--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_pending_delivery_idx" ON "realtime_event_outbox" USING btree ("id") WHERE "realtime_event_outbox"."delivery_id" is null;--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_conversation_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" IN ('conversation_analysis_updated', 'conversation_settings_updated', 'conversation_survey_updated', 'opinion_updated', 'conversation_comment_stats_updated', 'opinion_vote_counts_updated');--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"delivery_id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';--> statement-breakpoint
ALTER TABLE "realtime_event_outbox" ADD CONSTRAINT "realtime_event_outbox_delivery_id_unique" UNIQUE("delivery_id");