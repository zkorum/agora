CREATE TABLE "maxdiff_comparison" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_comparison_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"maxdiff_result_id" integer NOT NULL,
	"position" integer NOT NULL,
	"best_slug_id" varchar(8) NOT NULL,
	"worst_slug_id" varchar(8) NOT NULL,
	"candidate_set" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_score_entity" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ranking_score_entity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ranking_score_id" integer NOT NULL,
	"entity_slug_id" varchar(8) NOT NULL,
	"score" real NOT NULL,
	"uncertainty_left" real NOT NULL,
	"uncertainty_right" real NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ranking_score" ADD COLUMN "preference_learning" varchar(100);--> statement-breakpoint
ALTER TABLE "ranking_score" ADD COLUMN "voting_rights" varchar(100);--> statement-breakpoint
ALTER TABLE "ranking_score" ADD COLUMN "aggregation_config" varchar(200);--> statement-breakpoint
ALTER TABLE "maxdiff_comparison" ADD CONSTRAINT "maxdiff_comparison_maxdiff_result_id_maxdiff_result_id_fk" FOREIGN KEY ("maxdiff_result_id") REFERENCES "public"."maxdiff_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_score_entity" ADD CONSTRAINT "ranking_score_entity_ranking_score_id_ranking_score_id_fk" FOREIGN KEY ("ranking_score_id") REFERENCES "public"."ranking_score"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maxdiff_comparison_result_idx" ON "maxdiff_comparison" USING btree ("maxdiff_result_id");--> statement-breakpoint
CREATE INDEX "ranking_score_entity_score_idx" ON "ranking_score_entity" USING btree ("ranking_score_id");--> statement-breakpoint
CREATE INDEX "ranking_score_entity_slug_idx" ON "ranking_score_entity" USING btree ("ranking_score_id","entity_slug_id");