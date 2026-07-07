-- Requires the config-table backfill in V0079.1 to have populated
-- conversation.polis_config_id / conversation.ranking_config_id before adding
-- conversation_subtype_config_check. This migration does not depend on the
-- separate pnpm backfill:rich-text-plain-text script; plaintext check
-- constraints are deferred.
ALTER TABLE "maxdiff_item_content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maxdiff_item_external_source" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maxdiff_item" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "maxdiff_item_content" CASCADE;--> statement-breakpoint
DROP TABLE "maxdiff_item_external_source" CASCADE;--> statement-breakpoint
DROP TABLE "maxdiff_item" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_ranking_score_id_unique";--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_preferred_opinion_group_count_check";--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_current_ranking_score_id_ranking_score_id_fk";
--> statement-breakpoint
ALTER TABLE "ranking_item" DROP CONSTRAINT "ranking_item_current_content_id_ranking_item_content_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DEFAULT 'polis'::text;--> statement-breakpoint
-- This data rewrite belongs in the enum migration rather than V0079.1 because
-- the old conversation_type enum cannot store 'ranking'. V0079.1 must still see
-- 'maxdiff' to copy legacy rows into ranking_conversation_config first.
UPDATE "conversation" SET "conversation_type" = 'ranking' WHERE "conversation_type" = 'maxdiff';--> statement-breakpoint
DROP TYPE "public"."conversation_type";--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'ranking');--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DEFAULT 'polis'::"public"."conversation_type";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "conversation_type" SET DATA TYPE "public"."conversation_type" USING "conversation_type"::"public"."conversation_type";--> statement-breakpoint
ALTER TABLE "project_content" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_current_content_owned_by_item_fk" FOREIGN KEY ("current_content_id","id") REFERENCES "public"."ranking_item_content"("id","ranking_item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "project_content" ADD CONSTRAINT "project_content_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "conversation_content_translation" ADD CONSTRAINT "conversation_content_translation_body_plain_text_pair_check" CHECK ((("conversation_content_translation"."translated_body" IS NULL AND "conversation_content_translation"."translated_body_plain_text" IS NULL) OR ("conversation_content_translation"."translated_body" IS NOT NULL AND "conversation_content_translation"."translated_body_plain_text" IS NOT NULL))) NOT VALID;--> statement-breakpoint
ALTER TABLE "conversation_content_translation" VALIDATE CONSTRAINT "conversation_content_translation_body_plain_text_pair_check";--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL)));--> statement-breakpoint
ALTER TABLE "project_content_translation" ADD CONSTRAINT "project_content_translation_body_plain_text_pair_check" CHECK ((("project_content_translation"."translated_body" IS NULL AND "project_content_translation"."translated_body_plain_text" IS NULL) OR ("project_content_translation"."translated_body" IS NOT NULL AND "project_content_translation"."translated_body_plain_text" IS NOT NULL))) NOT VALID;--> statement-breakpoint
ALTER TABLE "project_content_translation" VALIDATE CONSTRAINT "project_content_translation_body_plain_text_pair_check";--> statement-breakpoint
ALTER TABLE "ranking_item_content" ADD CONSTRAINT "ranking_item_content_body_plain_text_pair_check" CHECK ((("ranking_item_content"."body" IS NULL AND "ranking_item_content"."body_plain_text" IS NULL) OR ("ranking_item_content"."body" IS NOT NULL AND "ranking_item_content"."body_plain_text" IS NOT NULL))) NOT VALID;--> statement-breakpoint
ALTER TABLE "ranking_item_content" VALIDATE CONSTRAINT "ranking_item_content_body_plain_text_pair_check";--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" ADD CONSTRAINT "ranking_item_content_translation_body_plain_text_pair_check" CHECK ((("ranking_item_content_translation"."translated_body_html" IS NULL AND "ranking_item_content_translation"."translated_body_plain_text" IS NULL) OR ("ranking_item_content_translation"."translated_body_html" IS NOT NULL AND "ranking_item_content_translation"."translated_body_plain_text" IS NOT NULL))) NOT VALID;--> statement-breakpoint
ALTER TABLE "ranking_item_content_translation" VALIDATE CONSTRAINT "ranking_item_content_translation_body_plain_text_pair_check";--> statement-breakpoint
ALTER TABLE "polis_conversation_config" ADD CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check" CHECK ("polis_conversation_config"."preferred_opinion_group_count" IS NULL OR "polis_conversation_config"."preferred_opinion_group_count" >= 2) NOT VALID;--> statement-breakpoint
ALTER TABLE "polis_conversation_config" VALIDATE CONSTRAINT "polis_conversation_config_preferred_opinion_group_count_check";--> statement-breakpoint
DROP TYPE "public"."maxdiff_lifecycle_status";
