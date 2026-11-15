ALTER TABLE "survey_aggregate_owner_current" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "survey_aggregate_owner_current" CASCADE;--> statement-breakpoint
ALTER TABLE "survey_aggregate_result" ALTER COLUMN "full_count" SET NOT NULL;