-- Reset all active sessions from 1000-year expiry to 90-day sliding window.
-- This ensures existing compromised sessions also expire.
-- Active users will have their sessions automatically refreshed on next request.
UPDATE device
SET session_expiry = NOW() + INTERVAL '90 days',
    updated_at = NOW()
WHERE session_expiry > NOW();
