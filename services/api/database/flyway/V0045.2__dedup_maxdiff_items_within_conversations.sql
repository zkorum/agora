-- Cleanup: Remove all duplicate and orphaned MaxDiff items.
-- Also re-runs the V0045.1 logic (closed conversations) in case it wasn't applied yet.

-- ============================================================
-- Part 1: Delete items from closed conversations (same as V0045.1)
-- ============================================================

DELETE FROM maxdiff_item_external_source
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    JOIN conversation c ON c.id = mi.conversation_id
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);

DELETE FROM maxdiff_item_content
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    JOIN conversation c ON c.id = mi.conversation_id
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);

DELETE FROM maxdiff_item
WHERE conversation_id IN (
    SELECT c.id
    FROM conversation c
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);

-- ============================================================
-- Part 2: Dedup items within open conversations
-- Keep only the oldest item (lowest id) per (conversation_id, external_id)
-- ============================================================

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

-- Delete content rows for orphaned items (items with no external source
-- in GitHub-linked MaxDiff conversations)
DELETE FROM maxdiff_item_content
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    LEFT JOIN maxdiff_item_external_source es ON es.maxdiff_item_id = mi.id
    WHERE es.maxdiff_item_id IS NULL
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
      AND EXISTS (
          SELECT 1 FROM conversation c
          WHERE c.id = mi.conversation_id
            AND c.conversation_type = 'maxdiff'
            AND c.external_source_config IS NOT NULL
      )
);
