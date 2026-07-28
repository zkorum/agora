ALTER TABLE "opinion_content" ALTER COLUMN "content" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ranking_item_content" ALTER COLUMN "body" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD CONSTRAINT "opinion_content_content_byte_length_check" CHECK (octet_length("opinion_content"."content") <= 16384);