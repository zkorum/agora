ALTER TABLE "opinion_group_description_locale_status" ADD COLUMN "ai_generation_expected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" ADD COLUMN "translation_expected" boolean DEFAULT false NOT NULL;
