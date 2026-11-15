ALTER TABLE "polis_cluster_opinion" RENAME COLUMN "percentage_agreement" TO "probability_agreement";--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" DROP CONSTRAINT "check_perc_btwn_0_and_1";--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "polis_ga_consensus_pa" real;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ADD COLUMN "polis_content_id" integer;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ADD CONSTRAINT "polis_cluster_opinion_polis_content_id_polis_content_id_fk" FOREIGN KEY ("polis_content_id") REFERENCES "public"."polis_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ADD CONSTRAINT "check_perc_btwn_0_and_1" CHECK ("polis_cluster_opinion"."probability_agreement" BETWEEN 0 and 1);