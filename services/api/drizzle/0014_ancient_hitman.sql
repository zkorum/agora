CREATE TYPE "public"."vote_enum_simple" AS ENUM('agree', 'disagree');--> statement-breakpoint
ALTER TYPE "public"."vote_enum" RENAME TO "vote_enum_all";--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "check_polis_null";--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ALTER COLUMN "opinion_slug_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ALTER COLUMN "agreement_type" SET DATA TYPE vote_enum_simple;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_0_num_passes" integer;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_1_num_passes" integer;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_2_num_passes" integer;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_3_num_passes" integer;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_4_num_passes" integer;--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "cluster_5_num_passes" integer;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ADD COLUMN "opinion_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "polis_participant_id" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ADD CONSTRAINT "polis_cluster_opinion_opinion_id_opinion_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polis_cluster" DROP COLUMN "math_center";--> statement-breakpoint
ALTER TABLE "polis_content" DROP COLUMN "math_tick";