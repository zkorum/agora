-- Requires the config-table backfill in V0079.1 to have populated
-- conversation.polis_config_id / conversation.ranking_config_id before adding
-- conversation_subtype_config_check. This migration does not depend on the
-- separate pnpm backfill:rich-text-plain-text script; plaintext check
-- constraints are deferred.
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
ALTER TABLE "project_content" ADD CONSTRAINT "project_content_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_subtype_config_check" CHECK ((("conversation"."conversation_type" = 'polis' AND "conversation"."polis_config_id" IS NOT NULL AND "conversation"."ranking_config_id" IS NULL) OR ("conversation"."conversation_type" = 'ranking' AND "conversation"."ranking_config_id" IS NOT NULL AND "conversation"."polis_config_id" IS NULL)));
