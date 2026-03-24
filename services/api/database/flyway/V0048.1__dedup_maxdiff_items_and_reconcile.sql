-- Fix: Dedup MaxDiff items created by webhook race condition,
-- backfill conversation_id, set NOT NULL + unique index,
-- then reconcile conversation counters.
--
-- Depends on V0048 (Drizzle-generated) which adds the nullable column + FK.

-- ============================================================
-- Part 1: Delete duplicate items within conversations
-- Keep only the oldest item (lowest id) per (conversation_id, external_id)
-- ============================================================

-- Delete external source rows for duplicate items
DELETE FROM maxdiff_item_external_source
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    JOIN maxdiff_item_external_source es ON es.maxdiff_item_id = mi.id
    WHERE mi.id NOT IN (
        SELECT MIN(mi2.id)
        FROM maxdiff_item mi2
        JOIN maxdiff_item_external_source es2 ON es2.maxdiff_item_id = mi2.id
        GROUP BY mi2.conversation_id, es2.external_id
    )
);

-- Delete content rows for now-orphaned items (no external source,
-- non-seed, in GitHub-linked MaxDiff conversations)
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

-- Delete orphaned items
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

-- ============================================================
-- Part 2: Backfill conversation_id on external source table
-- (column added by Drizzle migration, initially nullable)
-- ============================================================

UPDATE maxdiff_item_external_source es
SET conversation_id = mi.conversation_id
FROM maxdiff_item mi
WHERE mi.id = es.maxdiff_item_id;

-- ============================================================
-- Part 3: Set NOT NULL + unique index (now that all rows are backfilled)
-- ============================================================

ALTER TABLE "maxdiff_item_external_source" ALTER COLUMN "conversation_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "maxdiff_external_source_dedup_idx" ON "maxdiff_item_external_source" USING btree ("external_id","conversation_id");

-- ============================================================
-- Part 4: Reconcile participant and vote counters
-- ============================================================

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
