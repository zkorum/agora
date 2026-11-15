ALTER TABLE "polis_cluster" RENAME COLUMN "numUsers" TO "num_users";--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" DROP CONSTRAINT "notification_opinion_vote_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" ADD COLUMN "num_votes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" DROP COLUMN "author_id";--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" DROP COLUMN "vote";