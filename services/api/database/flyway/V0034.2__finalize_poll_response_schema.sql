-- Finalize poll_response schema changes after backfill
-- Make poll_id NOT NULL, drop old conversation_id column, update constraints

-- Make poll_id NOT NULL (safe now after backfill)
ALTER TABLE "poll_response" ALTER COLUMN "poll_id" SET NOT NULL;--> statement-breakpoint

-- Drop old constraint on (author_id, conversation_id)
ALTER TABLE "poll_response" DROP CONSTRAINT IF EXISTS "poll_response_author_id_conversation_id_unique";--> statement-breakpoint

-- Drop old foreign key constraint
ALTER TABLE "poll_response" DROP CONSTRAINT IF EXISTS "poll_response_conversation_id_conversation_id_fk";--> statement-breakpoint

-- Drop conversation_id column (no longer needed)
ALTER TABLE "poll_response" DROP COLUMN IF EXISTS "conversation_id";--> statement-breakpoint

-- Add new unique constraint on (author_id, poll_id)
-- Ensures one vote per user per specific poll instance
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_author_id_poll_id_unique" UNIQUE("author_id","poll_id");
