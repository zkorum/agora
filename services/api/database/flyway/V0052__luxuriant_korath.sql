CREATE TABLE "maxdiff_user_entity_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maxdiff_user_entity_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"maxdiff_result_id" integer NOT NULL,
	"entity_slug_id" varchar(8) NOT NULL,
	"score" real NOT NULL,
	"uncertainty_left" real NOT NULL,
	"uncertainty_right" real NOT NULL,
	CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_entity_slug_id_unique" UNIQUE("maxdiff_result_id","entity_slug_id")
);
--> statement-breakpoint
ALTER TABLE "maxdiff_comparison" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "maxdiff_user_entity_score" ADD CONSTRAINT "maxdiff_user_entity_score_maxdiff_result_id_maxdiff_result_id_fk" FOREIGN KEY ("maxdiff_result_id") REFERENCES "public"."maxdiff_result"("id") ON DELETE no action ON UPDATE no action;