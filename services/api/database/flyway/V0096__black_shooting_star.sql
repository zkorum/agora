DROP INDEX "notification_export_notification_idx";--> statement-breakpoint
DROP INDEX "notification_import_notification_idx";--> statement-breakpoint
DROP INDEX "notification_new_opinion_notification_idx";--> statement-breakpoint
DROP INDEX "notification_opinion_vote_notification_idx";--> statement-breakpoint
ALTER TABLE "notification_export" ADD CONSTRAINT "notification_export_notification_unique" UNIQUE("notification_id");--> statement-breakpoint
ALTER TABLE "notification_import" ADD CONSTRAINT "notification_import_notification_unique" UNIQUE("notification_id");--> statement-breakpoint
ALTER TABLE "notification_new_opinion" ADD CONSTRAINT "notification_new_opinion_notification_unique" UNIQUE("notification_id");--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" ADD CONSTRAINT "notification_opinion_vote_notification_unique" UNIQUE("notification_id");--> statement-breakpoint
ALTER TABLE "notification_opinion_vote" ADD CONSTRAINT "notification_opinion_vote_positive_count" CHECK ("notification_opinion_vote"."num_votes" >= 1);