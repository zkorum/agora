-- Backfill participation_mode from is_login_required
-- is_login_required = true  → 'strong_verification' (already the default, but be explicit)
-- is_login_required = false → 'guest'
UPDATE "conversation"
SET "participation_mode" = CASE
    WHEN "is_login_required" = true THEN 'strong_verification'::"participation_mode"
    ELSE 'guest'::"participation_mode"
END;
