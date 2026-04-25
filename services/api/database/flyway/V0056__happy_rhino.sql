ALTER TABLE "conversation_export" ADD COLUMN "bundle_file_name" varchar(160);--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "bundle_file_size" integer;--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "bundle_s3_key" text;