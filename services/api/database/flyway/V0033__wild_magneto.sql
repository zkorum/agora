ALTER TABLE "opinion_content" ALTER COLUMN "content" SET DATA TYPE varchar(840);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;