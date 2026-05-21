ALTER TABLE "conversation_update_queue" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polis_cluster_opinion" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polis_cluster" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polis_cluster_translation" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polis_cluster_user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polis_content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_polis_content_id_unique";--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "check_polis_majority";--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "check_polis_null";--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_polis_content_id_polis_content_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_0_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_1_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_2_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_3_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_4_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "opinion" DROP CONSTRAINT "opinion_cluster_5_id_polis_cluster_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "current_polis_content_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_ga_consensus_pa";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_ga_consensus_pd";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_priority";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_divisiveness";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_0_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_0_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_0_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_0_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_1_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_1_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_1_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_1_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_2_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_2_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_2_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_2_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_3_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_3_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_3_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_3_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_4_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_4_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_4_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_4_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_5_id";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_5_num_agrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_5_num_disagrees";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "cluster_5_num_passes";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_majority_type";--> statement-breakpoint
ALTER TABLE "opinion" DROP COLUMN "polis_majority_ps";--> statement-breakpoint
DROP TABLE "conversation_update_queue";--> statement-breakpoint
DROP TABLE "polis_cluster_opinion";--> statement-breakpoint
DROP TABLE "polis_cluster_translation";--> statement-breakpoint
DROP TABLE "polis_cluster_user";--> statement-breakpoint
DROP TABLE "polis_cluster";--> statement-breakpoint
DROP TABLE "polis_content";--> statement-breakpoint
DROP TYPE "public"."polis_key_enum";
