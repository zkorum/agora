-- Fix: MaxDiff GitHub sync item doubling bug.
-- Root cause: non-atomic create path + global unique index on external source.
-- Cleans up orphan items and replaces the broken global unique index.

-- Step 1: Delete orphan items (maxdiff_items with no external_source
-- in GitHub-linked MaxDiff conversations, excluding seed items).

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

-- Step 2: Drop global unique index (blocks multi-conversation sync)
DROP INDEX IF EXISTS "maxdiff_external_source_dedup_idx";

-- Step 3: Non-unique lookup index on external_id
CREATE INDEX IF NOT EXISTS "maxdiff_external_source_external_id_idx"
    ON "maxdiff_item_external_source" ("external_id");

-- Step 4: Re-reconcile participant/vote counts after cleanup
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
