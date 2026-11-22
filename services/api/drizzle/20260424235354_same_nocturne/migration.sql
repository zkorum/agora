ALTER TABLE "poll_response_content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "poll_response_proof" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "poll_response" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "poll" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "poll_response_content" CASCADE;--> statement-breakpoint
DROP TABLE "poll_response_proof" CASCADE;--> statement-breakpoint
DROP TABLE "poll_response" CASCADE;--> statement-breakpoint
DROP TABLE "poll" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_content" DROP CONSTRAINT IF EXISTS "conversation_content_poll_id_poll_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_content" DROP COLUMN IF EXISTS "poll_id";
