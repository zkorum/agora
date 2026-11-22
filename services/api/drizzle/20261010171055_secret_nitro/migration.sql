DROP INDEX "maxdiff_user_entity_score_result_score_idx";--> statement-breakpoint
DROP INDEX "ranking_conversation_stats_snapshot_latest_idx";--> statement-breakpoint
ALTER TABLE "maxdiff_user_entity_score" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
CREATE INDEX "maxdiff_user_entity_score_deleted_idx" ON "maxdiff_user_entity_score" USING btree ("deleted_at","id") WHERE "maxdiff_user_entity_score"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ranking_stats_item_deleted_idx" ON "ranking_conversation_stats_item" USING btree ("deleted_at","id") WHERE "ranking_conversation_stats_item"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ranking_stats_snapshot_deleted_idx" ON "ranking_conversation_stats_snapshot" USING btree ("deleted_at","id") WHERE "ranking_conversation_stats_snapshot"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "maxdiff_user_entity_score_result_score_idx" ON "maxdiff_user_entity_score" USING btree ("maxdiff_result_id","score" DESC) WHERE "maxdiff_user_entity_score"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC) WHERE "ranking_conversation_stats_snapshot"."deleted_at" IS NULL;