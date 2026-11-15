CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participant_account_unique" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "vote_submission" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vote_submission_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"opinion_id" integer NOT NULL,
	"opinion_content_id" integer NOT NULL,
	"action" varchar(8) NOT NULL,
	"submitted_at" timestamp (3) NOT NULL,
	"pending" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vote_submission_account_opinion_unique" UNIQUE("user_id","opinion_id"),
	CONSTRAINT "vote_submission_action_check" CHECK ("vote_submission"."action" IN ('agree', 'disagree', 'pass', 'cancel'))
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "closing_target_revision" bigint;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "closed_finalized_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "opinion_group_lineage_description_work" ADD COLUMN "sources_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_submission" ADD CONSTRAINT "vote_submission_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_submission" ADD CONSTRAINT "vote_submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_submission" ADD CONSTRAINT "vote_submission_opinion_id_opinion_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_submission" ADD CONSTRAINT "vote_submission_opinion_content_id_opinion_content_id_fk" FOREIGN KEY ("opinion_content_id") REFERENCES "public"."opinion_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_participant_user_idx" ON "conversation_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vote_submission_pending_idx" ON "vote_submission" USING btree ("submitted_at","id") WHERE "vote_submission"."pending" = true;--> statement-breakpoint
CREATE INDEX "vote_submission_conversation_pending_idx" ON "vote_submission" USING btree ("conversation_id") WHERE "vote_submission"."pending" = true;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_user_participant_id_conversation_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."conversation_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_participant_id_conversation_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."conversation_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_user" ADD CONSTRAINT "opinion_group_participant_candidate_unique" UNIQUE("candidate_id","participant_id");--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_participant_opinion_unique" UNIQUE("participant_id","opinion_id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_closing_state_check" CHECK (("conversation"."is_closed" OR ("conversation"."closing_target_revision" IS NULL AND "conversation"."closed_finalized_at" IS NULL)) AND ("conversation"."closed_finalized_at" IS NULL OR "conversation"."closing_target_revision" IS NOT NULL));