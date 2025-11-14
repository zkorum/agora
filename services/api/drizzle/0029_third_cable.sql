CREATE TYPE "public"."import_method" AS ENUM('url', 'csv');--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_method" "import_method";