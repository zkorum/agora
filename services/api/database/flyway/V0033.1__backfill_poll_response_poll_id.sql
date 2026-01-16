-- Backfill poll_id for existing poll_response records
-- Links poll responses to the specific poll they were cast on
-- by joining through poll_response_content -> conversation_content -> poll
UPDATE poll_response pr
SET poll_id = (
    SELECT cc.poll_id
    FROM poll_response_content prc
    JOIN conversation_content cc ON prc.conversation_content_id = cc.id
    WHERE prc.poll_response_id = pr.id
      AND pr.current_content_id = prc.id
)
WHERE pr.poll_id IS NULL;
