ALTER TABLE "conversation" ADD COLUMN "import_url" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_conversation_url" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_export_url" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_created_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "import_author" text;