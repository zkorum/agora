WITH duplicate_active_comparisons AS (
    SELECT
        id,
        maxdiff_result_id,
        ROW_NUMBER() OVER (
            PARTITION BY maxdiff_result_id, position
            ORDER BY id DESC
        ) AS row_number
    FROM maxdiff_comparison
    WHERE deleted_at IS NULL
), deduped_results AS (
    UPDATE maxdiff_comparison
    SET deleted_at = NOW()::timestamp(0)
    FROM duplicate_active_comparisons
    WHERE maxdiff_comparison.id = duplicate_active_comparisons.id
      AND duplicate_active_comparisons.row_number > 1
    RETURNING maxdiff_comparison.maxdiff_result_id AS maxdiff_result_id
), touched_results AS (
    UPDATE maxdiff_result
    SET updated_at = NOW()::timestamp(0)
    WHERE id IN (
        SELECT DISTINCT maxdiff_result_id
        FROM deduped_results
    )
    RETURNING conversation_id
)
UPDATE conversation
SET current_ranking_score_id = NULL
WHERE id IN (
    SELECT DISTINCT conversation_id
    FROM touched_results
);
