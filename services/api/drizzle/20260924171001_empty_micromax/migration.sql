ALTER TYPE "public"."notification_type_enum" ADD VALUE 'security_add_email';--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "security_key" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "notification_user_security_key_unique" ON "notification" USING btree ("user_id","security_key");