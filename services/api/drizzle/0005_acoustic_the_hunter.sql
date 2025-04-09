ALTER TABLE "conversation" ADD COLUMN "is_indexed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "is_login_required" boolean DEFAULT false NOT NULL;