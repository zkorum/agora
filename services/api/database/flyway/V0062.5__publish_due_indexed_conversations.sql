-- Publish conversations whose scheduled public date has already passed.
-- This preserves the intended state transition before the delayed-publication
-- columns are removed in the following generated migration.
UPDATE conversation
SET
    is_indexed = true,
    index_conversation_at = NULL
WHERE is_indexed = false
  AND index_conversation_at IS NOT NULL
  AND index_conversation_at <= now()::timestamp(0);
