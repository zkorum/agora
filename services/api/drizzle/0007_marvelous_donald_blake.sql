ALTER TABLE "conversation_topic_mapping" RENAME TO "conversation_topic";--> statement-breakpoint
ALTER TABLE "user_followed_topic" RENAME TO "followed_topic";--> statement-breakpoint
ALTER TABLE "conversation_topic" DROP CONSTRAINT "conversation_topic_mapping_conversation_id_conversation_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_topic" DROP CONSTRAINT "conversation_topic_mapping_topic_id_topic_id_fk";
--> statement-breakpoint
ALTER TABLE "followed_topic" DROP CONSTRAINT "user_followed_topic_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "followed_topic" DROP CONSTRAINT "user_followed_topic_topic_id_topic_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_topic" ADD CONSTRAINT "conversation_topic_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_topic" ADD CONSTRAINT "conversation_topic_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_topic" ADD CONSTRAINT "followed_topic_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_topic" ADD CONSTRAINT "followed_topic_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE no action ON UPDATE no action;