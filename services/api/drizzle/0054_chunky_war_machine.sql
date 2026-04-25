CREATE TYPE "public"."survey_question_type" AS ENUM('mono_choice', 'multi_choice', 'select', 'free_text');--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_participant_responses';--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_public_aggregates';--> statement-breakpoint
ALTER TYPE "public"."export_file_type_enum" ADD VALUE 'survey_full_aggregates';--> statement-breakpoint
CREATE TABLE "survey_answer_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_answer_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_answer_id" integer NOT NULL,
	"survey_question_option_id" integer NOT NULL,
	CONSTRAINT "survey_answer_option_survey_answer_id_survey_question_option_id_unique" UNIQUE("survey_answer_id","survey_question_option_id")
);
--> statement-breakpoint
CREATE TABLE "survey_answer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_answer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_response_id" integer NOT NULL,
	"survey_question_id" integer NOT NULL,
	"answered_question_semantic_version" integer NOT NULL,
	"text_value_html" text,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_answer_survey_response_id_survey_question_id_unique" UNIQUE("survey_response_id","survey_question_id")
);
--> statement-breakpoint
CREATE TABLE "survey_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);
--> statement-breakpoint
CREATE TABLE "survey_question_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_id" integer NOT NULL,
	"question_text" varchar(500) NOT NULL,
	"constraints" jsonb NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_question_option_content" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_content_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_question_option_id" integer NOT NULL,
	"option_text" varchar(200) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_question_option" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_option_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"survey_question_id" integer NOT NULL,
	"current_content_id" integer,
	"display_order" smallint NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_option_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "survey_question_option_current_content_id_unique" UNIQUE("current_content_id")
);
--> statement-breakpoint
CREATE TABLE "survey_question" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"survey_config_id" integer NOT NULL,
	"question_type" "survey_question_type" NOT NULL,
	"current_content_id" integer,
	"current_semantic_version" integer DEFAULT 1 NOT NULL,
	"display_order" smallint NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_question_slug_id_unique" UNIQUE("slug_id"),
	CONSTRAINT "survey_question_current_content_id_unique" UNIQUE("current_content_id")
);
--> statement-breakpoint
CREATE TABLE "survey_response" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "survey_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" uuid NOT NULL,
	"conversation_id" integer NOT NULL,
	"completed_at" timestamp (0),
	"withdrawn_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "survey_response_participant_id_conversation_id_unique" UNIQUE("participant_id","conversation_id")
);
--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD CONSTRAINT "survey_answer_option_survey_answer_id_survey_answer_id_fk" FOREIGN KEY ("survey_answer_id") REFERENCES "public"."survey_answer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD CONSTRAINT "survey_answer_option_survey_question_option_id_survey_question_option_id_fk" FOREIGN KEY ("survey_question_option_id") REFERENCES "public"."survey_question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_survey_response_id_survey_response_id_fk" FOREIGN KEY ("survey_response_id") REFERENCES "public"."survey_response"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_survey_question_id_survey_question_id_fk" FOREIGN KEY ("survey_question_id") REFERENCES "public"."survey_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_config" ADD CONSTRAINT "survey_config_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_content" ADD CONSTRAINT "survey_question_content_survey_question_id_survey_question_id_fk" FOREIGN KEY ("survey_question_id") REFERENCES "public"."survey_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_option_content" ADD CONSTRAINT "survey_question_option_content_survey_question_option_id_survey_question_option_id_fk" FOREIGN KEY ("survey_question_option_id") REFERENCES "public"."survey_question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_option" ADD CONSTRAINT "survey_question_option_survey_question_id_survey_question_id_fk" FOREIGN KEY ("survey_question_id") REFERENCES "public"."survey_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question" ADD CONSTRAINT "survey_question_survey_config_id_survey_config_id_fk" FOREIGN KEY ("survey_config_id") REFERENCES "public"."survey_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_participant_id_user_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_answer_question_semantic_version_idx" ON "survey_answer" USING btree ("survey_question_id","answered_question_semantic_version");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_config_active_conversation_uidx" ON "survey_config" USING btree ("conversation_id") WHERE "survey_config"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "survey_config_conversation_deleted_idx" ON "survey_config" USING btree ("conversation_id","deleted_at");--> statement-breakpoint
CREATE INDEX "survey_question_option_question_content_idx" ON "survey_question_option" USING btree ("survey_question_id","current_content_id");--> statement-breakpoint
CREATE INDEX "survey_question_option_question_display_order_idx" ON "survey_question_option" USING btree ("survey_question_id","display_order");--> statement-breakpoint
CREATE INDEX "survey_question_config_content_idx" ON "survey_question" USING btree ("survey_config_id","current_content_id");--> statement-breakpoint
CREATE INDEX "survey_question_config_display_order_idx" ON "survey_question" USING btree ("survey_config_id","display_order");--> statement-breakpoint
CREATE INDEX "survey_question_config_semantic_version_idx" ON "survey_question" USING btree ("survey_config_id","current_semantic_version");--> statement-breakpoint
CREATE INDEX "survey_response_conversation_withdrawn_idx" ON "survey_response" USING btree ("conversation_id","withdrawn_at");--> statement-breakpoint
CREATE INDEX "survey_response_conversation_completed_idx" ON "survey_response" USING btree ("conversation_id","completed_at");