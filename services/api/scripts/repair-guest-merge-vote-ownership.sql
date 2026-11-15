-- Data-only prerequisite for vote_current_content_owner_fk. Run transactionally
-- with vote writers stopped, before applying that constraint's generated migration.
-- Preserve the destination's exact current value and original content timestamp.
-- Do not infer merge provenance, reactivate withdrawals, or change snapshot data.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM vote v
        JOIN vote_content content ON content.id = v.current_content_id
        JOIN opinion_content statement ON statement.id = content.opinion_content_id
        WHERE statement.opinion_id <> v.opinion_id
    ) THEN
        RAISE EXCEPTION 'Current vote content references a different statement; review before repair';
    END IF;
END;
$$;

WITH replacements AS (
    INSERT INTO vote_content (vote_id, opinion_content_id, vote, created_at)
    SELECT v.id, content.opinion_content_id, content.vote, content.created_at
    FROM vote v
    JOIN vote_content content ON content.id = v.current_content_id
    WHERE content.vote_id <> v.id
    RETURNING id, vote_id
)
UPDATE vote v
SET current_content_id = replacements.id
FROM replacements
WHERE v.id = replacements.vote_id;
