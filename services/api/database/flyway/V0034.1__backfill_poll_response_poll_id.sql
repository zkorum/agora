-- Step 1: Backfill conversation_content.poll_id from existing poll records
-- The poll_id column existed since V0000 but was never populated.
-- New code joins via conversation_content.poll_id -> poll.id instead of
-- poll.conversation_content_id -> conversation_content.id, so existing
-- rows must be backfilled to avoid breaking existing poll display.
UPDATE conversation_content cc
SET poll_id = p.id
FROM poll p
WHERE p.conversation_content_id = cc.id
  AND cc.poll_id IS NULL;

-- Step 2: Backfill poll_id in poll_response table from the current conversation content
-- This populates the new poll_id column with the correct poll ID for each poll response
-- (depends on Step 1 having populated conversation_content.poll_id)
UPDATE poll_response pr
SET poll_id = cc.poll_id
FROM conversation c
JOIN conversation_content cc ON c.current_content_id = cc.id
WHERE pr.conversation_id = c.id
  AND cc.poll_id IS NOT NULL
  AND pr.poll_id IS NULL;
