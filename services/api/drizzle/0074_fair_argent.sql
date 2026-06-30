ALTER TABLE "conversation_language_setting" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_translation_setting" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_language_setting" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_display_language" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "conversation_language_setting" CASCADE;--> statement-breakpoint
DROP TABLE "conversation_translation_setting" CASCADE;--> statement-breakpoint
DROP TABLE "project_language_setting" CASCADE;--> statement-breakpoint
DROP TABLE "user_display_language" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" DROP CONSTRAINT "conversation_translation_target_language_translation_setting_id_conversation_translation_setting_id_fk";
--> statement-breakpoint
DROP INDEX "conversation_translation_target_language_legacy_active_unique";--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "default_language_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_translation_target_language" DROP COLUMN "translation_setting_id";--> statement-breakpoint
DROP TYPE "public"."conversation_language_setting_mode";--> statement-breakpoint
DROP TYPE "public"."project_language_setting_mode";