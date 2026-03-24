-- No-op: these changes were already applied by V0045.4 (fix_maxdiff_github_sync_dedup).
-- Keeping guarded statements for safety in case V0045.4 was skipped in some environment.
DROP INDEX IF EXISTS "maxdiff_external_source_dedup_idx";
CREATE INDEX IF NOT EXISTS "maxdiff_external_source_external_id_idx" ON "maxdiff_item_external_source" USING btree ("external_id");