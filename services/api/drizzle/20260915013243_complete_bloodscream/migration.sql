ALTER TABLE "maxdiff_user_entity_score" ADD COLUMN "display_score" real;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD COLUMN "ranking_score_id" integer;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD COLUMN "snapshot_ranking_score_id" integer;--> statement-breakpoint
ALTER TABLE "ranking_score_entity" ADD COLUMN "display_score" real;--> statement-breakpoint
ALTER TABLE "ranking_score" ADD CONSTRAINT "ranking_score_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_stats_snapshot_score_conversation_fk" FOREIGN KEY ("ranking_score_id","conversation_id") REFERENCES "public"."ranking_score"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_snapshot_score_conversation_fk" FOREIGN KEY ("snapshot_ranking_score_id","conversation_id") REFERENCES "public"."ranking_score"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_user_entity_score" ADD CONSTRAINT "maxdiff_user_entity_score_display_score_check" CHECK ("maxdiff_user_entity_score"."display_score" IS NULL OR ("maxdiff_user_entity_score"."display_score" >= 0 AND "maxdiff_user_entity_score"."display_score" <= 1));--> statement-breakpoint
ALTER TABLE "ranking_score_entity" ADD CONSTRAINT "ranking_score_entity_display_score_check" CHECK ("ranking_score_entity"."display_score" IS NULL OR ("ranking_score_entity"."display_score" >= 0 AND "ranking_score_entity"."display_score" <= 1));
