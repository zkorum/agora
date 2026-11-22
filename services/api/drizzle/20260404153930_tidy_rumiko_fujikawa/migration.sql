CREATE TABLE "otp_email_destination_state" (
	"email" varchar(254) PRIMARY KEY NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL,
	CONSTRAINT "otp_email_destination_canonical_check" CHECK ("otp_email_destination_state"."email" = lower(btrim("otp_email_destination_state"."email")))
);
--> statement-breakpoint
CREATE TABLE "otp_phone_destination_state" (
	"phone_hash" text PRIMARY KEY NOT NULL,
	"last_otp_sent_at" timestamp NOT NULL,
	"consecutive_failed_verify_attempts" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp,
	"created_at" timestamp (0) DEFAULT now() NOT NULL,
	"updated_at" timestamp (0) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_email_destination_updated_idx" ON "otp_email_destination_state" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "otp_phone_destination_updated_idx" ON "otp_phone_destination_state" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_export_active_user_conversation_unique" ON "conversation_export" USING btree ("conversation_id","user_id") WHERE "conversation_export"."status" = 'processing' AND "conversation_export"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_import_active_user_unique" ON "conversation_import" USING btree ("user_id") WHERE "conversation_import"."status" = 'processing';--> statement-breakpoint
ALTER TABLE "auth_attempt_email" ADD CONSTRAINT "auth_attempt_email_canonical_check" CHECK ("auth_attempt_email"."email" = lower(btrim("auth_attempt_email"."email")));--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_canonical_check" CHECK ("email"."email" = lower(btrim("email"."email")));