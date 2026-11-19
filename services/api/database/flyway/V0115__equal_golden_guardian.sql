CREATE TYPE "public"."project_document_encoding" AS ENUM('gzip', 'br');--> statement-breakpoint
CREATE TYPE "public"."project_document_representation_status" AS ENUM('pending', 'available', 'failed');--> statement-breakpoint
CREATE TABLE "project_document_representation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_document_representation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" integer NOT NULL,
	"encoding" "project_document_encoding" NOT NULL,
	"status" "project_document_representation_status" DEFAULT 'pending' NOT NULL,
	"object_key" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"deleted_at" timestamp (0),
	"object_deleted_at" timestamp (0),
	CONSTRAINT "project_document_representation_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "project_document_representation_byte_size_check" CHECK ("project_document_representation"."byte_size" > 0),
	CONSTRAINT "project_document_representation_failed_check" CHECK ("project_document_representation"."status" <> 'failed' OR "project_document_representation"."deleted_at" IS NOT NULL),
	CONSTRAINT "project_document_representation_deleted_object_check" CHECK ("project_document_representation"."object_deleted_at" IS NULL OR "project_document_representation"."deleted_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "project_document_file" ADD COLUMN "compressed_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "project_document_representation" ADD CONSTRAINT "project_document_representation_file_id_project_document_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."project_document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_representation_file_encoding_active_unique" ON "project_document_representation" USING btree ("file_id","encoding") WHERE "project_document_representation"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_document_representation_cleanup_idx" ON "project_document_representation" USING btree ("created_at") WHERE "project_document_representation"."object_deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_document_file_original_retirement_idx" ON "project_document_file" USING btree ("compressed_at") WHERE "project_document_file"."compressed_at" IS NOT NULL AND "project_document_file"."deleted_at" IS NULL AND "project_document_file"."object_deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "project_document_file" ADD CONSTRAINT "project_document_file_compressed_content_check" CHECK ("project_document_file"."compressed_at" IS NULL OR "project_document_file"."content_type" <> 'application/pdf');--> statement-breakpoint
ALTER TABLE "project_document_file" ADD CONSTRAINT "project_document_file_original_cleanup_check" CHECK ("project_document_file"."object_deleted_at" IS NULL OR "project_document_file"."deleted_at" IS NOT NULL OR "project_document_file"."compressed_at" IS NOT NULL);