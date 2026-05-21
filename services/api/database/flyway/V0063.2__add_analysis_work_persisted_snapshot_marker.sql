ALTER TABLE "analysis_work_state" ADD COLUMN "persisted_analysis_snapshot_id" integer;--> statement-breakpoint
ALTER TABLE "analysis_work_state" ADD CONSTRAINT "analysis_work_state_persisted_analysis_snapshot_id_analysis_snapshot_id_fk" FOREIGN KEY ("persisted_analysis_snapshot_id") REFERENCES "public"."analysis_snapshot"("id") ON DELETE no action ON UPDATE no action;
