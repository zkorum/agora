ALTER TABLE "conversation_view_snapshot" ADD COLUMN "activated_at" timestamp (0);--> statement-breakpoint
UPDATE "conversation_view_snapshot" SET "activated_at" = "created_at" WHERE "activated_at" IS NULL;--> statement-breakpoint
CREATE INDEX "conversation_view_snapshot_latest_active_idx" ON "conversation_view_snapshot" USING btree ("conversation_id","created_at","id") WHERE "conversation_view_snapshot"."activated_at" is not null;
