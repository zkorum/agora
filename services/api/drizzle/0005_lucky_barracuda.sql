ALTER TABLE "conversation" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "index_conversation_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "is_indexed" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "is_login_required" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
