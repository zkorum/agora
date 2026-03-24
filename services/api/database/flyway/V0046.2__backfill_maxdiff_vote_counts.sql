-- Backfill stale vote_count for MaxDiff conversations.
-- Bug: updateMaxdiffCounters was only called when a participant first joined
-- or completed, not on every comparison round. This left vote_count equal to
-- participant_count (each participant had exactly 1 comparison at refresh time).

UPDATE conversation c
SET vote_count = sub.votes,
    total_vote_count = sub.votes
FROM (
    SELECT conversation_id,
           COALESCE(SUM(jsonb_array_length(comparisons)), 0)::int AS votes
    FROM maxdiff_result
    GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.conversation_type = 'maxdiff';
