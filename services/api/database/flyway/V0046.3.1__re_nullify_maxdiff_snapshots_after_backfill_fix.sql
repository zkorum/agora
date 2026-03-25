-- Re-nullify snapshot scores on completed/canceled MaxDiff items.
-- V0046.3 + backfill ran successfully but used the old BWS decomposition
-- algorithm which produced incorrect scores (tied values from contradictory
-- pairwise wins). The algorithm is now fixed (transitive closure per user).
-- This re-triggers the startup backfill to recompute with the correct algorithm.

UPDATE maxdiff_item
SET snapshot_score = NULL,
    snapshot_rank = NULL,
    snapshot_participant_count = NULL
WHERE lifecycle_status IN ('completed', 'canceled')
  AND (snapshot_score IS NOT NULL
       OR snapshot_rank IS NOT NULL
       OR snapshot_participant_count IS NOT NULL);
