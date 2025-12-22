CREATE TYPE "public"."export_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart');--> statement-breakpoint
CREATE TYPE "public"."import_failure_reason_enum" AS ENUM('processing_error', 'timeout', 'server_restart', 'invalid_data_format');--> statement-breakpoint
ALTER TABLE "conversation_export" ADD COLUMN "failure_reason" "export_failure_reason_enum";--> statement-breakpoint
ALTER TABLE "conversation_import" ADD COLUMN "failure_reason" "import_failure_reason_enum";--> statement-breakpoint
ALTER TABLE "conversation_export" DROP COLUMN "error_message";--> statement-breakpoint
ALTER TABLE "conversation_import" DROP COLUMN "error_message";