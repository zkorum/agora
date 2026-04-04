-- Backfill canonical email storage before V0053 adds CHECK constraints.

DROP INDEX "email_active_unique";--> statement-breakpoint

-- If a user somehow has multiple active email rows that collapse to the same
-- canonical address, keep the oldest one and soft-delete the rest.
WITH duplicate_rows AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, lower(btrim(email))
            ORDER BY created_at, id
        ) AS row_number
    FROM "email"
    WHERE is_deleted = false
)
UPDATE "email"
SET is_deleted = true,
    updated_at = now()
FROM duplicate_rows
WHERE "email".id = duplicate_rows.id
  AND duplicate_rows.row_number > 1;--> statement-breakpoint

DO $$
DECLARE
    conflicting_email text;
BEGIN
    SELECT canonical_email
    INTO conflicting_email
    FROM (
        SELECT lower(btrim(email)) AS canonical_email
        FROM "email"
        WHERE is_deleted = false
        GROUP BY lower(btrim(email))
        HAVING COUNT(DISTINCT user_id) > 1
    ) AS conflicts
    LIMIT 1;

    IF conflicting_email IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = format(
                'Cannot normalize active email rows because canonical email %s belongs to multiple users',
                conflicting_email
            ),
            HINT = 'Resolve the conflicting accounts manually, then re-run migrations.';
    END IF;
END $$;--> statement-breakpoint

UPDATE "email"
SET email = lower(btrim(email)),
    updated_at = now()
WHERE email <> lower(btrim(email));--> statement-breakpoint

UPDATE "auth_attempt_email"
SET email = lower(btrim(email)),
    updated_at = now()
WHERE email <> lower(btrim(email));--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'otp_email_destination_state'
          AND column_name = 'normalized_email'
    ) THEN
        CREATE TEMP TABLE otp_email_destination_state_canonical ON COMMIT DROP AS
        SELECT
            lower(btrim(normalized_email)) AS normalized_email,
            MAX(last_otp_sent_at) AS last_otp_sent_at,
            MAX(consecutive_failed_verify_attempts) AS consecutive_failed_verify_attempts,
            MAX(backoff_until) AS backoff_until,
            MIN(created_at) AS created_at,
            MAX(updated_at) AS updated_at
        FROM "otp_email_destination_state"
        GROUP BY lower(btrim(normalized_email));

        TRUNCATE TABLE "otp_email_destination_state";

        INSERT INTO "otp_email_destination_state" (
            normalized_email,
            last_otp_sent_at,
            consecutive_failed_verify_attempts,
            backoff_until,
            created_at,
            updated_at
        )
        SELECT
            normalized_email,
            last_otp_sent_at,
            consecutive_failed_verify_attempts,
            backoff_until,
            created_at,
            updated_at
        FROM otp_email_destination_state_canonical;
    END IF;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX "email_active_unique"
ON "email" USING btree ("email")
WHERE "email"."is_deleted" = false;
