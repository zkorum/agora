ALTER TABLE "user_organization_mapping" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_organization_mapping" CASCADE;--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_name_unique";--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" DROP CONSTRAINT "premium_feature_entitlement_single_subject_check";--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" DROP CONSTRAINT "premium_feature_entitlement_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "conversation_author_timeline_idx";--> statement-breakpoint
DROP INDEX "conversation_organization_timeline_idx";--> statement-breakpoint
DROP INDEX "premium_feature_entitlement_user_idx";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "directory_visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "author_id";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "premium_feature_entitlement" DROP COLUMN "user_id";