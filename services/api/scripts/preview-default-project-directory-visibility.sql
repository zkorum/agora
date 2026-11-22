-- Read-only preflight. Do not run the future backfill until its discovery
-- cutover and legacy write compatibility are ready.
WITH proposed AS (
    SELECT
        p.directory_visibility AS current_visibility,
        CASE WHEN EXISTS (
            SELECT 1
            FROM conversation AS c
            WHERE c.project_id = p.id
              AND c.is_indexed
              AND NOT c.is_importing
              AND c.deleted_at IS NULL
              AND c.current_content_id IS NOT NULL
        ) THEN 'listed' ELSE 'unlisted' END AS proposed_visibility
    FROM project AS p
    WHERE p.auto_provisioned_for_organization_id IS NOT NULL
      AND p.deleted_at IS NULL
)
SELECT current_visibility, proposed_visibility, count(*) AS project_count
FROM proposed
GROUP BY current_visibility, proposed_visibility
ORDER BY current_visibility, proposed_visibility;
