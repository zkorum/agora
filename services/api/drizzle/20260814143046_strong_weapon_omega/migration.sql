CREATE TYPE "public"."project_document_audience" AS ENUM('participant', 'owner');--> statement-breakpoint
CREATE TYPE "public"."project_document_content_type" AS ENUM('text/html', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json');--> statement-breakpoint
CREATE TYPE "public"."project_document_file_status" AS ENUM('pending', 'available');--> statement-breakpoint
CREATE TABLE "project_document_file" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_file_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"audience" "project_document_audience" NOT NULL,
	"status" "project_document_file_status" DEFAULT 'pending' NOT NULL,
	"object_key" text NOT NULL,
	"original_file_name" text NOT NULL,
	"content_type" "project_document_content_type" NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	"object_deleted_at" timestamp (0),
	CONSTRAINT "project_document_file_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "project_document_file_byte_size_check" CHECK ("project_document_file"."byte_size" > 0 AND "project_document_file"."byte_size" <= 20971520)
);
--> statement-breakpoint
CREATE TABLE "project_document_localization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_localization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_document_id" integer NOT NULL,
	"language_code" "display_language_code" NOT NULL,
	"name" varchar(140) NOT NULL,
	"download_file_name" varchar(255) NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0)
);
--> statement-breakpoint
CREATE TABLE "project_document" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"created_by_username" varchar(20) NOT NULL,
	"default_language_code" "display_language_code" NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"published_at" timestamp (0),
	"deleted_at" timestamp (0),
	CONSTRAINT "project_document_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "project_document_file" ADD CONSTRAINT "project_document_file_project_document_id_project_document_id_fk" FOREIGN KEY ("project_document_id") REFERENCES "public"."project_document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_localization" ADD CONSTRAINT "project_document_localization_project_document_id_project_document_id_fk" FOREIGN KEY ("project_document_id") REFERENCES "public"."project_document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document" ADD CONSTRAINT "project_document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_file_audience_active_unique" ON "project_document_file" USING btree ("project_document_id","audience") WHERE "project_document_file"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_document_file_deletion_queue_idx" ON "project_document_file" USING btree ("project_document_id") WHERE "project_document_file"."deleted_at" IS NOT NULL AND "project_document_file"."object_deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_document_file_pending_created_idx" ON "project_document_file" USING btree ("created_at","project_document_id") WHERE "project_document_file"."status" = 'pending' AND "project_document_file"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_localization_active_unique" ON "project_document_localization" USING btree ("project_document_id","language_code") WHERE "project_document_localization"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_document_project_id_idx" ON "project_document" USING btree ("project_id");