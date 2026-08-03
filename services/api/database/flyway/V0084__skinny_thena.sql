ALTER TABLE "auth_attempt_phone" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "session_started_at" timestamp (0) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" ADD COLUMN "wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_phone_destination_state" ADD COLUMN "wrong_guess_attempt_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "device_user_session_expiry_idx" ON "device" USING btree ("user_id","session_expiry");--> statement-breakpoint
ALTER TABLE "otp_email_destination_state" ADD CONSTRAINT "otp_email_wrong_guess_attempt_amount_nonnegative_check" CHECK ("otp_email_destination_state"."wrong_guess_attempt_amount" >= 0);--> statement-breakpoint
ALTER TABLE "otp_phone_destination_state" ADD CONSTRAINT "otp_phone_wrong_guess_attempt_amount_nonnegative_check" CHECK ("otp_phone_destination_state"."wrong_guess_attempt_amount" >= 0);