CREATE TABLE "phone_sms_budget_alert" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"day" varchar(10) NOT NULL,
	"next_attempt_at" timestamp (3) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_alert_day_kind_unique" UNIQUE("day","kind"),
	CONSTRAINT "phone_sms_budget_alert_kind_check" CHECK ("phone_sms_budget_alert"."kind" IN ('warning', 'hard_limit')),
	CONSTRAINT "phone_sms_budget_alert_attempts_check" CHECK ("phone_sms_budget_alert"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "phone_sms_budget_policy" (
	"id" integer PRIMARY KEY NOT NULL,
	"sending_enabled" boolean DEFAULT false NOT NULL,
	"hourly_send_limit" integer NOT NULL,
	"daily_send_limit" integer NOT NULL,
	"estimated_cents_per_send" integer NOT NULL,
	"hourly_budget_cents" integer NOT NULL,
	"daily_budget_cents" integer NOT NULL,
	"warning_percent" integer DEFAULT 75 NOT NULL,
	"registration_paused_at" timestamp (3),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "phone_sms_budget_single_policy_check" CHECK ("phone_sms_budget_policy"."id" = 1),
	CONSTRAINT "phone_sms_budget_positive_limits_check" CHECK ("phone_sms_budget_policy"."hourly_send_limit" > 0 AND "phone_sms_budget_policy"."daily_send_limit" >= "phone_sms_budget_policy"."hourly_send_limit" AND "phone_sms_budget_policy"."estimated_cents_per_send" > 0 AND "phone_sms_budget_policy"."hourly_budget_cents" > 0 AND "phone_sms_budget_policy"."daily_budget_cents" >= "phone_sms_budget_policy"."hourly_budget_cents"),
	CONSTRAINT "phone_sms_budget_warning_percent_check" CHECK ("phone_sms_budget_policy"."warning_percent" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE TABLE "phone_sms_budget_reservation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"estimated_cents" integer NOT NULL,
	"reserved_at" timestamp (3) NOT NULL,
	CONSTRAINT "phone_sms_budget_reservation_cents_check" CHECK ("phone_sms_budget_reservation"."estimated_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX "phone_sms_budget_alert_due_idx" ON "phone_sms_budget_alert" USING btree ("sent_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "phone_sms_budget_reservation_time_idx" ON "phone_sms_budget_reservation" USING btree ("reserved_at");