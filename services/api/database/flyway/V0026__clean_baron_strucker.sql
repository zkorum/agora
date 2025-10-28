DROP INDEX "idx_conversation_update_queue_pending";--> statement-breakpoint
CREATE INDEX "opinion_conversationId_idx" ON "opinion" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "polis_cluster_opinion_opinionId_idx" ON "polis_cluster_opinion" USING btree ("opinion_id");--> statement-breakpoint
CREATE INDEX "polis_cluster_opinion_polisClusterId_idx" ON "polis_cluster_opinion" USING btree ("polis_cluster_id");--> statement-breakpoint
CREATE INDEX "vote_opinionId_idx" ON "vote" USING btree ("opinion_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_update_queue_pending" ON "conversation_update_queue" USING btree ("requested_at","last_math_update_at") WHERE "conversation_update_queue"."requested_at" > "conversation_update_queue"."last_math_update_at" OR "conversation_update_queue"."last_math_update_at" IS NULL;