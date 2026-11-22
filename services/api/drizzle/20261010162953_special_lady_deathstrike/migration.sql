ALTER TABLE "conversation_email_update_conversation" DROP CONSTRAINT "email_update_scope_conversation_project_fk";
--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD COLUMN "text_value_plain_text" text;--> statement-breakpoint
ALTER TABLE "survey_question_option" ADD COLUMN "allows_text" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_email_update_conversation" ADD CONSTRAINT "email_update_scope_conversation_project_fk" FOREIGN KEY ("project_id","conversation_id") REFERENCES "public"."conversation_project_assignment"("project_id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer_option" ADD CONSTRAINT "survey_answer_option_text_byte_length_check" CHECK (octet_length("survey_answer_option"."text_value_plain_text") <= 16384);