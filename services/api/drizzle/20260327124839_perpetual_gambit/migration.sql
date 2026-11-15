CREATE TABLE "ranking_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"participant_counts" jsonb NOT NULL,
	"group_sources_snapshot" jsonb,
	"user_weights_snapshot" jsonb,
	"pipeline_config" jsonb NOT NULL,
	"computed_at" timestamp (0) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "current_ranking_score_id" integer;--> statement-breakpoint
ALTER TABLE "ranking_score" ADD CONSTRAINT "ranking_score_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_current_ranking_score_id_ranking_score_id_fk" FOREIGN KEY ("current_ranking_score_id") REFERENCES "public"."ranking_score"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_current_ranking_score_id_unique" UNIQUE("current_ranking_score_id");