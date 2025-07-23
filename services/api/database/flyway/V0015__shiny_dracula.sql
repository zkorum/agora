ALTER TABLE "polis_cluster_opinion" DROP CONSTRAINT "polis_cluster_opinion_opinion_slug_id_opinion_slug_id_fk";
--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" ALTER COLUMN "opinion_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" DROP COLUMN "opinion_slug_id";--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "check_polis_null" CHECK ((("opinion"."cluster_0_id" IS NOT NULL AND "opinion"."cluster_0_num_agrees" IS NOT NULL AND "opinion"."cluster_0_num_disagrees" IS NOT NULL AND "opinion"."cluster_0_num_passes" IS NOT NULL) OR ("opinion"."cluster_0_id" IS NULL AND "opinion"."cluster_0_num_agrees" IS NULL AND "opinion"."cluster_0_num_disagrees" IS NULL AND "opinion"."cluster_0_num_passes" IS NULL))
                AND
                (("opinion"."cluster_1_id" IS NOT NULL AND "opinion"."cluster_1_num_agrees" IS NOT NULL AND "opinion"."cluster_1_num_disagrees" IS NOT NULL AND "opinion"."cluster_1_num_passes" IS NOT NULL) OR ("opinion"."cluster_1_id" IS NULL AND "opinion"."cluster_1_num_agrees" IS NULL AND "opinion"."cluster_1_num_disagrees" IS NULL AND "opinion"."cluster_1_num_passes" IS NULL))
                AND
                (("opinion"."cluster_2_id" IS NOT NULL AND "opinion"."cluster_2_num_agrees" IS NOT NULL AND "opinion"."cluster_2_num_disagrees" IS NOT NULL AND "opinion"."cluster_2_num_passes" IS NOT NULL) OR ("opinion"."cluster_2_id" IS NULL AND "opinion"."cluster_2_num_agrees" IS NULL AND "opinion"."cluster_2_num_disagrees" IS NULL AND "opinion"."cluster_2_num_passes" IS NULL))
                AND
                (("opinion"."cluster_3_id" IS NOT NULL AND "opinion"."cluster_3_num_agrees" IS NOT NULL AND "opinion"."cluster_3_num_disagrees" IS NOT NULL AND "opinion"."cluster_3_num_passes" IS NOT NULL) OR ("opinion"."cluster_3_id" IS NULL AND "opinion"."cluster_3_num_agrees" IS NULL AND "opinion"."cluster_3_num_disagrees" IS NULL AND "opinion"."cluster_3_num_passes" IS NULL))
                AND
                (("opinion"."cluster_4_id" IS NOT NULL AND "opinion"."cluster_4_num_agrees" IS NOT NULL AND "opinion"."cluster_4_num_disagrees" IS NOT NULL AND "opinion"."cluster_4_num_passes" IS NOT NULL) OR ("opinion"."cluster_4_id" IS NULL AND "opinion"."cluster_4_num_agrees" IS NULL AND "opinion"."cluster_4_num_disagrees" IS NULL AND "opinion"."cluster_4_num_passes" IS NULL))
                AND
                (("opinion"."cluster_5_id" IS NOT NULL AND "opinion"."cluster_5_num_agrees" IS NOT NULL AND "opinion"."cluster_5_num_disagrees" IS NOT NULL AND "opinion"."cluster_5_num_passes" IS NOT NULL) OR ("opinion"."cluster_5_id" IS NULL AND "opinion"."cluster_5_num_agrees" IS NULL AND "opinion"."cluster_5_num_disagrees" IS NULL AND "opinion"."cluster_5_num_passes" IS NULL)));