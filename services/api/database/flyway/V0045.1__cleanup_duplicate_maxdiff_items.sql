-- Cleanup: Remove MaxDiff items belonging to closed conversations.
-- These duplicates were created when two open conversations tracked the same GitHub repo
-- and the webhook handler created items in both before one was closed.

-- Step 1: Delete external source mappings
DELETE FROM maxdiff_item_external_source
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    JOIN conversation c ON c.id = mi.conversation_id
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);

-- Step 2: Delete content rows
DELETE FROM maxdiff_item_content
WHERE maxdiff_item_id IN (
    SELECT mi.id
    FROM maxdiff_item mi
    JOIN conversation c ON c.id = mi.conversation_id
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);

-- Step 3: Delete items
DELETE FROM maxdiff_item
WHERE conversation_id IN (
    SELECT c.id
    FROM conversation c
    WHERE c.is_closed = true
      AND c.conversation_type = 'maxdiff'
);
