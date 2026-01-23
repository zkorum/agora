-- Add poll_id column as nullable (for backfill)
-- We add it as nullable first, then backfill data, then make it NOT NULL
ALTER TABLE "poll_response" ADD COLUMN "poll_id" integer;--> statement-breakpoint
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE no action ON UPDATE no action;
