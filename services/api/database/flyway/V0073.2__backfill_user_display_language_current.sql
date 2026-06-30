INSERT INTO user_display_language_current (
    user_id,
    language_code,
    created_at,
    updated_at
)
SELECT DISTINCT ON (user_id)
    user_id,
    language_code,
    created_at,
    created_at AS updated_at
FROM user_display_language
WHERE is_deleted = false
ORDER BY user_id, created_at DESC, id DESC
ON CONFLICT (user_id) DO UPDATE
SET
    language_code = EXCLUDED.language_code,
    updated_at = EXCLUDED.updated_at;
