ALTER TABLE "conversation_topic" DROP CONSTRAINT "conversation_topic_mapping_unique";--> statement-breakpoint
ALTER TABLE "followed_topic" DROP CONSTRAINT "user_followed_topic_unique";--> statement-breakpoint
DROP INDEX "conversation_topic_mapping_index";--> statement-breakpoint
DROP INDEX "user_followed_topic_index";--> statement-breakpoint
CREATE INDEX "conversation_topic_index" ON "conversation_topic" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "followed_topic_index" ON "followed_topic" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "conversation_topic" ADD CONSTRAINT "conversation_topic_unique" UNIQUE("conversation_id","topic_id");--> statement-breakpoint
ALTER TABLE "followed_topic" ADD CONSTRAINT "followed_topic_unique" UNIQUE("user_id","topic_id");