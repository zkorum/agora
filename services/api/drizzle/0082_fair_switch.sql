CREATE TYPE "public"."ranking_stats_checkpoint_reason_enum" AS ENUM('major_participation_milestone', 'major_vote_milestone', 'conversation_closed');--> statement-breakpoint
CREATE TABLE "ranking_conversation_stats_checkpoint" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_checkpoint_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stats_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"reason" "ranking_stats_checkpoint_reason_enum" NOT NULL,
	"participant_milestone" integer,
	"vote_milestone" integer,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_stats_checkpoint_milestone_check" CHECK ((("ranking_conversation_stats_checkpoint"."reason" = 'major_participation_milestone' AND "ranking_conversation_stats_checkpoint"."participant_milestone" IS NOT NULL AND "ranking_conversation_stats_checkpoint"."vote_milestone" IS NULL AND "ranking_conversation_stats_checkpoint"."participant_milestone" > 0) OR ("ranking_conversation_stats_checkpoint"."reason" = 'major_vote_milestone' AND "ranking_conversation_stats_checkpoint"."participant_milestone" IS NULL AND "ranking_conversation_stats_checkpoint"."vote_milestone" IS NOT NULL AND "ranking_conversation_stats_checkpoint"."vote_milestone" > 0) OR ("ranking_conversation_stats_checkpoint"."reason" = 'conversation_closed' AND "ranking_conversation_stats_checkpoint"."participant_milestone" IS NULL AND "ranking_conversation_stats_checkpoint"."vote_milestone" IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "ranking_conversation_stats_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stats_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"ranking_item_id" integer NOT NULL,
	"ranking_item_content_id" integer NOT NULL,
	"lifecycle_status" "ranking_item_lifecycle_status" NOT NULL,
	"score" real,
	"rank" integer,
	"participant_count" integer NOT NULL,
	"external_url" text,
	CONSTRAINT "ranking_stats_item_score_rank_check" CHECK ((("ranking_conversation_stats_item"."score" IS NULL AND "ranking_conversation_stats_item"."rank" IS NULL) OR ("ranking_conversation_stats_item"."score" IS NOT NULL AND "ranking_conversation_stats_item"."rank" IS NOT NULL AND "ranking_conversation_stats_item"."score" >= 0 AND "ranking_conversation_stats_item"."score" <= 1 AND "ranking_conversation_stats_item"."rank" > 0))),
	CONSTRAINT "ranking_stats_item_participant_count_check" CHECK ("ranking_conversation_stats_item"."participant_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ranking_conversation_stats_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_conversation_stats_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"item_count" integer NOT NULL,
	"total_item_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"total_vote_count" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"total_participant_count" integer NOT NULL,
	"scoring_input_revision" bigint NOT NULL,
	"is_closed" boolean NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_stats_snapshot_id_conversation_unique" UNIQUE("id","conversation_id"),
	CONSTRAINT "ranking_conversation_stats_snapshot_counts_check" CHECK ("ranking_conversation_stats_snapshot"."item_count" >= 0 AND "ranking_conversation_stats_snapshot"."item_count" <= "ranking_conversation_stats_snapshot"."total_item_count" AND "ranking_conversation_stats_snapshot"."vote_count" >= 0 AND "ranking_conversation_stats_snapshot"."vote_count" <= "ranking_conversation_stats_snapshot"."total_vote_count" AND "ranking_conversation_stats_snapshot"."participant_count" >= 0 AND "ranking_conversation_stats_snapshot"."participant_count" <= "ranking_conversation_stats_snapshot"."total_participant_count" AND "ranking_conversation_stats_snapshot"."scoring_input_revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "item_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "total_item_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "total_vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "participant_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "total_participant_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "scoring_input_revision" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD COLUMN "processed_scoring_input_revision" bigint DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_checkpoint" ADD CONSTRAINT "ranking_stats_checkpoint_snapshot_conversation_fk" FOREIGN KEY ("stats_snapshot_id","conversation_id") REFERENCES "public"."ranking_conversation_stats_snapshot"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD CONSTRAINT "ranking_stats_item_snapshot_conversation_fk" FOREIGN KEY ("stats_snapshot_id","conversation_id") REFERENCES "public"."ranking_conversation_stats_snapshot"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_id_conversation_unique" UNIQUE("id","conversation_id");--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD CONSTRAINT "ranking_stats_item_item_conversation_fk" FOREIGN KEY ("ranking_item_id","conversation_id") REFERENCES "public"."ranking_item"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_item" ADD CONSTRAINT "ranking_stats_item_content_item_fk" FOREIGN KEY ("ranking_item_content_id","ranking_item_id") REFERENCES "public"."ranking_item_content"("id","ranking_item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_conversation_stats_snapshot" ADD CONSTRAINT "ranking_conversation_stats_snapshot_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ranking_stats_checkpoint_snapshot_idx" ON "ranking_conversation_stats_checkpoint" USING btree ("stats_snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_participant_unique" ON "ranking_conversation_stats_checkpoint" USING btree ("conversation_id","participant_milestone") WHERE "ranking_conversation_stats_checkpoint"."reason" = 'major_participation_milestone';--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_vote_unique" ON "ranking_conversation_stats_checkpoint" USING btree ("conversation_id","vote_milestone") WHERE "ranking_conversation_stats_checkpoint"."reason" = 'major_vote_milestone';--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_checkpoint_closed_unique" ON "ranking_conversation_stats_checkpoint" USING btree ("stats_snapshot_id") WHERE "ranking_conversation_stats_checkpoint"."reason" = 'conversation_closed';--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_stats_item_snapshot_item_unique" ON "ranking_conversation_stats_item" USING btree ("stats_snapshot_id","ranking_item_id");--> statement-breakpoint
CREATE INDEX "ranking_conversation_stats_snapshot_latest_idx" ON "ranking_conversation_stats_snapshot" USING btree ("conversation_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "realtime_event_outbox_ranking_replay_idx" ON "realtime_event_outbox" USING btree (("payload"->>'conversationSlugId'),"id") WHERE "realtime_event_outbox"."event_type" = 'conversation_ranking_stats_updated';--> statement-breakpoint
ALTER TABLE "ranking_conversation_config" ADD CONSTRAINT "ranking_conversation_config_counts_check" CHECK ("ranking_conversation_config"."item_count" >= 0 AND "ranking_conversation_config"."item_count" <= "ranking_conversation_config"."total_item_count" AND "ranking_conversation_config"."vote_count" >= 0 AND "ranking_conversation_config"."vote_count" <= "ranking_conversation_config"."total_vote_count" AND "ranking_conversation_config"."participant_count" >= 0 AND "ranking_conversation_config"."participant_count" <= "ranking_conversation_config"."total_participant_count" AND "ranking_conversation_config"."scoring_input_revision" >= 0 AND "ranking_conversation_config"."processed_scoring_input_revision" >= -1 AND "ranking_conversation_config"."processed_scoring_input_revision" <= "ranking_conversation_config"."scoring_input_revision");
