CREATE TYPE "public"."conversation_type" AS ENUM('polis', 'maxdiff');--> statement-breakpoint
CREATE TABLE "maxdiff_result" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_result_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"ranking" jsonb,
	"comparisons" jsonb NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "maxdiff_result_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id")
);
--> statement-breakpoint
DROP INDEX "conversation_createdAt_idx";--> statement-breakpoint
DROP INDEX "conversation_authorId_idx";--> statement-breakpoint
DROP INDEX "opinion_conversationId_idx";--> statement-breakpoint
DROP INDEX "polis_cluster_translation_lookup_idx";--> statement-breakpoint
DROP INDEX "vote_opinionId_idx";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "conversation_type" "conversation_type" DEFAULT 'polis' NOT NULL;--> statement-breakpoint
ALTER TABLE "maxdiff_result" ADD CONSTRAINT "maxdiff_result_participant_id_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maxdiff_result" ADD CONSTRAINT "maxdiff_result_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maxdiff_result_complete_idx" ON "maxdiff_result" USING btree ("conversation_id","is_complete");--> statement-breakpoint
CREATE INDEX "conversation_feed_idx" ON "conversation" USING btree ("created_at") WHERE "conversation"."is_indexed" = true AND "conversation"."is_importing" = false;--> statement-breakpoint
CREATE INDEX "conversation_type_importing_idx" ON "conversation" USING btree ("is_importing","conversation_type");--> statement-breakpoint
CREATE INDEX "conversation_author_timeline_idx" ON "conversation" USING btree ("author_id","is_importing","created_at");--> statement-breakpoint
CREATE INDEX "opinion_conversation_active_idx" ON "opinion" USING btree ("conversation_id","current_content_id");--> statement-breakpoint
CREATE INDEX "vote_opinion_active_idx" ON "vote" USING btree ("opinion_id","current_content_id");