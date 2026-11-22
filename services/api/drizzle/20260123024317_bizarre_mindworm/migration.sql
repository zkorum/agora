ALTER TABLE "poll_response" DROP CONSTRAINT "poll_response_author_id_conversation_id_unique";--> statement-breakpoint
ALTER TABLE "poll_response" DROP CONSTRAINT "poll_response_conversation_id_conversation_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_response" ADD COLUMN "poll_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_response" DROP COLUMN "conversation_id";--> statement-breakpoint
ALTER TABLE "poll_response" ADD CONSTRAINT "poll_response_author_id_poll_id_unique" UNIQUE("author_id","poll_id");