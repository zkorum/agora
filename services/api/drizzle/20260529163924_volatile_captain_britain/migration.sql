DROP INDEX "analysis_work_state_due_idx";--> statement-breakpoint
CREATE INDEX "notification_import_notification_idx" ON "notification_import" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_new_opinion_notification_idx" ON "notification_new_opinion" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_opinion_vote_notification_idx" ON "notification_opinion_vote" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_user_created_id_idx" ON "notification" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "opinion_author_active_created_id_idx" ON "opinion" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "opinion"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "opinion_conversation_active_created_id_idx" ON "opinion" USING btree ("conversation_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "opinion"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "vote_author_active_updated_id_idx" ON "vote" USING btree ("author_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "vote"."current_content_id" is not null;--> statement-breakpoint
CREATE INDEX "analysis_work_state_due_idx" ON "analysis_work_state" USING btree ("next_run_at","conversation_id") WHERE "analysis_work_state"."running_data_generation" is null;