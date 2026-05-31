CREATE TYPE "public"."ai_description_locale_expectation_kind_enum" AS ENUM('english_description', 'translation');--> statement-breakpoint
CREATE TABLE "opinion_group_description_locale_expectation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "opinion_group_description_locale_expectation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_view_snapshot_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"opinion_group_spec_id" integer NOT NULL,
	"analysis_snapshot_result_id" integer NOT NULL,
	"locale" varchar(10) NOT NULL,
	"expectation_kind" "ai_description_locale_expectation_kind_enum" NOT NULL,
	"retry_demand_due_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "opinion_group_description_locale_expectation_unique" UNIQUE("conversation_view_snapshot_id","locale"),
	CONSTRAINT "opinion_group_description_locale_expectation_kind_check" CHECK ((("opinion_group_description_locale_expectation"."locale" = 'en' AND "opinion_group_description_locale_expectation"."expectation_kind" = 'english_description') OR ("opinion_group_description_locale_expectation"."locale" <> 'en' AND "opinion_group_description_locale_expectation"."expectation_kind" = 'translation')))
);
--> statement-breakpoint
DROP TABLE "opinion_group_description_locale_status" CASCADE;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_expectation" ADD CONSTRAINT "opinion_group_description_locale_expectation_conversation_view_snapshot_id_conversation_view_snapshot_id_fk" FOREIGN KEY ("conversation_view_snapshot_id") REFERENCES "public"."conversation_view_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_expectation" ADD CONSTRAINT "opinion_group_description_locale_expectation_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_expectation" ADD CONSTRAINT "opinion_group_description_locale_expectation_opinion_group_spec_id_opinion_group_spec_id_fk" FOREIGN KEY ("opinion_group_spec_id") REFERENCES "public"."opinion_group_spec"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_group_description_locale_expectation" ADD CONSTRAINT "opinion_group_description_locale_expectation_analysis_snapshot_result_id_analysis_snapshot_result_id_fk" FOREIGN KEY ("analysis_snapshot_result_id") REFERENCES "public"."analysis_snapshot_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opinion_group_description_locale_expectation_due_idx" ON "opinion_group_description_locale_expectation" USING btree ("retry_demand_due_at") WHERE "opinion_group_description_locale_expectation"."retry_demand_due_at" is not null;--> statement-breakpoint
CREATE INDEX "opinion_group_description_locale_expectation_lookup_idx" ON "opinion_group_description_locale_expectation" USING btree ("conversation_id","expectation_kind","locale","conversation_view_snapshot_id");--> statement-breakpoint
DROP TYPE "public"."ai_description_locale_status_enum";