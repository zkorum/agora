CREATE TYPE "public"."export_file_type_enum" AS ENUM('comments', 'votes', 'participants', 'summary', 'stats');--> statement-breakpoint
CREATE TYPE "public"."export_status_enum" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "conversation_export_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"export_id" integer NOT NULL,
	"file_type" "export_file_type_enum" NOT NULL,
	"file_name" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"record_count" integer NOT NULL,
	"s3_key" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_export" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_export_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug_id" varchar(8) NOT NULL,
	"conversation_id" integer NOT NULL,
	"status" "export_status_enum" DEFAULT 'processing' NOT NULL,
	"total_file_size" integer,
	"total_file_count" integer,
	"error_message" text,
	"expires_at" timestamp (0) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp (0),
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_export_slug_id_unique" UNIQUE("slug_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_export_file" ADD CONSTRAINT "conversation_export_file_export_id_conversation_export_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."conversation_export"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD CONSTRAINT "conversation_export_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_export_file_export_idx" ON "conversation_export_file" USING btree ("export_id");--> statement-breakpoint
CREATE INDEX "conversation_export_file_type_idx" ON "conversation_export_file" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "conversation_export_conversation_idx" ON "conversation_export" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_export_status_idx" ON "conversation_export" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversation_export_deleted_idx" ON "conversation_export" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "conversation_export_created_idx" ON "conversation_export" USING btree ("created_at");