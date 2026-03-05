CREATE TYPE "public"."email_reachability" AS ENUM('safe', 'risky', 'invalid', 'unknown');--> statement-breakpoint
ALTER TABLE "auth_attempt_email" ADD COLUMN "email_reachability" "email_reachability";--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "email_reachability" "email_reachability";