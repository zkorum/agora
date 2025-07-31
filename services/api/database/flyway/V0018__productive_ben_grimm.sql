ALTER TABLE "opinion" ADD COLUMN "polis_majority_type" "vote_enum_simple";--> statement-breakpoint
ALTER TABLE "opinion" ADD COLUMN "polis_majority_ps" real;--> statement-breakpoint
ALTER TABLE "opinion" ADD CONSTRAINT "check_polis_majority" CHECK ((
            ("opinion"."polis_majority_type" IS NOT NULL AND "opinion"."polis_majority_ps" IS NOT NULL)
            OR
            ("opinion"."polis_majority_type" IS NULL AND "opinion"."polis_majority_ps" IS NULL)
            ));