CREATE TABLE "opinion_group_candidate_description_locale_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_candidate_description_locale_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"candidate_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_candidate_description_locale_request_unique" UNIQUE("candidate_id","locale")
);
--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_status" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "opinion_group_description_locale_status" CASCADE;--> statement-breakpoint
DROP INDEX "user_idx_mute";--> statement-breakpoint
ALTER TABLE "opinion_group_candidate_description_locale_request" ADD CONSTRAINT "opinion_group_candidate_description_locale_request_candidate_id_opinion_group_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."opinion_group_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opinion_group_candidate_description_locale_request_updated_idx" ON "opinion_group_candidate_description_locale_request" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX "og_candidate_desc_locale_request_translation_updated_idx" ON "opinion_group_candidate_description_locale_request" USING btree ("updated_at","id") WHERE "opinion_group_candidate_description_locale_request"."locale" <> 'en';--> statement-breakpoint
CREATE INDEX "opinion_group_opinion_stats_representative_idx" ON "opinion_group_opinion_stats" USING btree ("group_id","representative_probability_agreement" DESC NULLS LAST,"analysis_snapshot_opinion_id") WHERE ("opinion_group_opinion_stats"."representative_agreement_type" is not null AND "opinion_group_opinion_stats"."representative_probability_agreement" is not null);--> statement-breakpoint
DROP TYPE "public"."ai_description_locale_status_enum";