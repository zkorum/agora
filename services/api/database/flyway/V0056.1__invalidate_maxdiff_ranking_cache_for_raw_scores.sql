-- Invalidate cached MaxDiff ranking scores so the scoring worker recomputes
-- them with the new raw-score canonical semantics.
--
-- This only clears the current ranking cache pointer on conversations.
-- It does not modify frozen item snapshots on completed/canceled items.

UPDATE conversation
SET current_ranking_score_id = NULL
WHERE conversation_type = 'maxdiff'
  AND current_ranking_score_id IS NOT NULL;
