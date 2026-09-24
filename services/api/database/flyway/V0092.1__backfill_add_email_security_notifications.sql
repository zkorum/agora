-- Create one actionable security reminder for existing accounts that have
-- phone or passport verification but no email credential. The nullable
-- security_key unique index also protects against concurrent API inserts.
WITH credentialed_users AS (
    SELECT user_id FROM phone WHERE is_deleted = false
    UNION
    SELECT user_id FROM zk_passport WHERE is_deleted = false
)
INSERT INTO notification (slug_id, user_id, notification_type, security_key)
SELECT
    translate(encode(substring(uuid_send(gen_random_uuid()) from 1 for 6), 'base64'), '+/', '-_'),
    u.id,
    'security_add_email',
    'add_email'
FROM credentialed_users c
JOIN "user" u ON u.id = c.user_id
LEFT JOIN email e ON e.user_id = u.id AND e.is_deleted = false
WHERE u.is_deleted = false
  AND e.id IS NULL
ON CONFLICT (user_id, security_key) DO NOTHING;
