ALTER TABLE "conversation" ADD COLUMN "needs_math_update" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "math_update_requested_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "last_math_update_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "polis_content" DROP COLUMN "ai_summary";