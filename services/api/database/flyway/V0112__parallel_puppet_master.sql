ALTER TABLE "vote_submission" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "vote_submission" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "vote_buffer_epoch" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "vote_buffer_drained" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "buffer_epoch" uuid;--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "buffer_sequence" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_vote_buffer_drain_idx" ON "conversation" USING btree ("id") WHERE "conversation"."conversation_type" = 'polis' AND "conversation"."is_closed" = true AND "conversation"."vote_buffer_drained" = false AND "conversation"."closed_finalized_at" IS NULL;