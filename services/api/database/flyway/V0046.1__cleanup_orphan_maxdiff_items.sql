-- Re-run orphan cleanup after deploy ordering issue.
-- V0045.4 cleaned orphans, but old (non-atomic) code created new ones
-- during a sync before the code fix was deployed.
-- Idempotent: safe to run even if no orphans exist.

-- Step 1: Delete content rows for orphan items
DELETE FROM maxdiff_item_content
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    LEFT JOIN maxdiff_item_external_source es ON es.maxdiff_item_id = mi.id
    WHERE es.maxdiff_item_id IS NULL
      AND mi.is_seed = false
      AND EXISTS (
          SELECT 1 FROM conversation c
          WHERE c.id = mi.conversation_id
            AND c.conversation_type = 'maxdiff'
            AND c.external_source_config IS NOT NULL
      )
);

-- Step 2: Delete orphan items
DELETE FROM maxdiff_item
WHERE id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    LEFT JOIN maxdiff_item_external_source es ON es.maxdiff_item_id = mi.id
    WHERE es.maxdiff_item_id IS NULL
      AND mi.is_seed = false
      AND EXISTS (
          SELECT 1 FROM conversation c
          WHERE c.id = mi.conversation_id
            AND c.conversation_type = 'maxdiff'
            AND c.external_source_config IS NOT NULL
      )
);

-- Step 3: Re-reconcile participant/vote counts
UPDATE conversation c
SET participant_count = sub.cnt,
    total_participant_count = sub.cnt,
    vote_count = sub.votes,
    total_vote_count = sub.votes
FROM (
    SELECT conversation_id,
           count(*) FILTER (WHERE jsonb_array_length(comparisons) > 0) AS cnt,
           COALESCE(SUM(jsonb_array_length(comparisons)), 0)::int AS votes
    FROM maxdiff_result
    GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.conversation_type = 'maxdiff';
