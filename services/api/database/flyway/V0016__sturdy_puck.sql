ALTER TABLE "user" RENAME COLUMN "is_seed" TO "is_imported";--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "polis_vote_id" integer;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "is_anonymous";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "show_flagged_content";