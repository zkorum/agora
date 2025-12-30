-- Backfill poll_id in poll_response table from the current conversation content
-- This populates the new poll_id column with the correct poll ID for each poll response
UPDATE poll_response pr
SET poll_id = cc.poll_id
FROM conversation c
JOIN conversation_content cc ON c.current_content_id = cc.id
WHERE pr.conversation_id = c.id
  AND cc.poll_id IS NOT NULL
  AND pr.poll_id IS NULL;
