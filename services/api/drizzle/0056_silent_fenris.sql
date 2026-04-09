ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_questions' BEFORE 'survey_participant_responses';--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_question_options' BEFORE 'survey_participant_responses';--> statement-breakpoint
CREATE TABLE "survey_question_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_content_id" integer NOT NULL,
	"display_language_code" varchar(10) NOT NULL,
	"translated_question_text" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_content_translation_unique" UNIQUE("survey_question_content_id","display_language_code")
);
--> statement-breakpoint
CREATE TABLE "survey_question_option_content_translation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_content_translation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_option_content_id" integer NOT NULL,
	"display_language_code" varchar(10) NOT NULL,
	"translated_option_text" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_content_translation_unique" UNIQUE("survey_question_option_content_id","display_language_code")
);
--> statement-breakpoint
ALTER TABLE "survey_answer_option" DROP CONSTRAINT "survey_answer_option_survey_answer_id_survey_question_option_id_unique";--> statement-breakpoint
ALTER TABLE "survey_answer" DROP CONSTRAINT "survey_answer_survey_response_id_survey_question_id_unique";--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "owner_bundle_file_name" varchar(160);--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "owner_bundle_file_size" integer;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "owner_bundle_s3_key" text;--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "survey_answer" ADD COLUMN "deleted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "survey_question_content_translation" ADD CONSTRAINT "survey_question_content_translation_survey_question_content_id_survey_question_content_id_fk" FOREIGN KEY ("survey_question_content_id") REFERENCES "public"."survey_question_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_option_content_translation" ADD CONSTRAINT "survey_question_option_content_translation_survey_question_option_content_id_survey_question_option_content_id_fk" FOREIGN KEY ("survey_question_option_content_id") REFERENCES "public"."survey_question_option_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_option_answer_option_active_uidx" ON "survey_answer_option" USING btree ("survey_answer_id","survey_question_option_id") WHERE "survey_answer_option"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_response_question_active_uidx" ON "survey_answer" USING btree ("survey_response_id","survey_question_id") WHERE "survey_answer"."deleted_at" IS NULL;