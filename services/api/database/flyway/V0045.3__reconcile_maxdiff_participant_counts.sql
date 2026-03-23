-- Reconcile stale participant_count and vote_count for MaxDiff conversations.
-- Bug: reconcileConversationCounters used voteTable (polis) instead of
-- maxdiff_result, overwriting correct counts. Also, undo-to-zero didn't
-- trigger a counter update.

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
