CREATE TYPE "public"."conversation_language_setting_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "conversation_language_setting" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_language_setting_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"mode" "conversation_language_setting_mode" NOT NULL,
	"language_code" varchar(35),
	"detected_language_code" varchar(35),
	"detected_raw_language_code" varchar(35),
	"detection_confidence" real,
	"detected_from_corpus_hash" varchar(64),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_language_setting_conversation_unique" UNIQUE("conversation_id"),
	CONSTRAINT "conversation_language_setting_manual_language_check" CHECK (("conversation_language_setting"."mode" <> 'manual') OR ("conversation_language_setting"."language_code" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "body_plain_text" text;--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "conversation_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "content_plain_text" text;--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_language_code" varchar(35);--> statement-breakpoint
ALTER TABLE "opinion_content" ADD COLUMN "source_language_confidence" real;--> statement-breakpoint
ALTER TABLE "conversation_language_setting" ADD CONSTRAINT "conversation_language_setting_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;
