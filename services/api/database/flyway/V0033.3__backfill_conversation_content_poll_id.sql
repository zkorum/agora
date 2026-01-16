-- Backfill poll_id for conversation_content records
-- Ensures conversation_content.poll_id references are consistent with poll.conversation_content_id
UPDATE conversation_content cc
SET poll_id = p.id
FROM poll p
WHERE p.conversation_content_id = cc.id
  AND cc.poll_id IS NULL;
