ALTER TABLE "conversation_content" ALTER COLUMN "title" SET DATA TYPE varchar(140);--> statement-breakpoint
ALTER TABLE "conversation_content" ALTER COLUMN "body" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "conversation_moderation" ALTER COLUMN "moderation_explanation" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "opinion_content" ALTER COLUMN "content" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "opinion_moderation" ALTER COLUMN "moderation_explanation" SET DATA TYPE varchar(1000);