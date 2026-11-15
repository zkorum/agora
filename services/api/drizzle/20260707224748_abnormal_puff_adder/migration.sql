ALTER TABLE "maxdiff_item_content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maxdiff_item_external_source" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maxdiff_item" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "maxdiff_item_content" CASCADE;--> statement-breakpoint
DROP TABLE "maxdiff_item_external_source" CASCADE;--> statement-breakpoint
DROP TABLE "maxdiff_item" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_ranking_score_id_unique";--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_ranking_score_id_ranking_score_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "current_ranking_score_id";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "ai_labeling_enabled";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "analysis_data_generation";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "preferred_opinion_group_count";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_url";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_conversation_url";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_export_url";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_created_at";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_author";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "import_method";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "external_source_config";--> statement-breakpoint
DROP TYPE "public"."maxdiff_lifecycle_status";