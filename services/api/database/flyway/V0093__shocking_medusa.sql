CREATE TABLE "blocked_phone_number" (
	"phone_hash" text NOT NULL,
	"pepper_version" integer NOT NULL,
	"reason" text NOT NULL,
	"blocked_at" timestamp (0) DEFAULT now() NOT NULL,
	"revoked_at" timestamp (0),
	CONSTRAINT "blocked_phone_number_phone_hash_pepper_version_pk" PRIMARY KEY("phone_hash","pepper_version"),
	CONSTRAINT "blocked_phone_pepper_version_nonnegative_check" CHECK ("blocked_phone_number"."pepper_version" >= 0),
	CONSTRAINT "blocked_phone_reason_nonempty_check" CHECK (length(btrim("blocked_phone_number"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "auth_restricted_at" timestamp (0);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "auth_restriction_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_auth_restriction_reason_check" CHECK (("user"."auth_restricted_at" IS NULL) = ("user"."auth_restriction_reason" IS NULL));
