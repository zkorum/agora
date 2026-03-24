-- Nullify snapshot scores on completed/canceled MaxDiff items so they get
-- recomputed using the new Bradley-Terry MLE algorithm on next access.
-- The API startup backfill (maxdiffBackfill.ts) will recompute them.

UPDATE maxdiff_item
SET snapshot_score = NULL,
    snapshot_rank = NULL,
    snapshot_participant_count = NULL
WHERE lifecycle_status IN ('completed', 'canceled')
  AND (snapshot_score IS NOT NULL
       OR snapshot_rank IS NOT NULL
       OR snapshot_participant_count IS NOT NULL);
