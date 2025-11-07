CREATE TYPE "public"."export_status_enum" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "conversation_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"status" "export_status_enum" DEFAULT 'processing' NOT NULL,
	"s3_key" text,
	"s3_url" text,
	"s3_url_expires_at" timestamp (0),
	"file_size" integer,
	"opinion_count" integer,
	"error_message" text,
	"expires_at" timestamp (0) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_export" ADD CONSTRAINT "conversation_export_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_export_conversation_idx" ON "conversation_export" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_status_idx" ON "conversation_export" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversation_export_deleted_idx" ON "conversation_export" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "conversation_export_created_idx" ON "conversation_export" USING btree ("created_at");