-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Preserve legacy discovery for eligible conversations formerly using
-- "No project". The stored conversation is_indexed flag remains their intent.
WITH proposed AS (
    SELECT
        p.id,
        CASE WHEN EXISTS (
            SELECT 1
            FROM conversation AS c
            WHERE c.project_id = p.id
              AND c.is_indexed
              AND NOT c.is_importing
              AND c.deleted_at IS NULL
              AND c.current_content_id IS NOT NULL
        ) THEN 'listed'::directory_visibility
          ELSE 'unlisted'::directory_visibility END AS directory_visibility
    FROM project AS p
    WHERE p.auto_provisioned_for_organization_id IS NOT NULL
      AND p.deleted_at IS NULL
)
UPDATE project AS p
SET directory_visibility = proposed.directory_visibility,
    updated_at = CURRENT_TIMESTAMP
FROM proposed
WHERE p.id = proposed.id
  AND p.directory_visibility IS DISTINCT FROM proposed.directory_visibility;
