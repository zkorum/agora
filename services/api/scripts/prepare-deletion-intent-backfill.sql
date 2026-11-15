-- Staging source for an ordered data-only Flyway migration after the generated
-- Stage 3 columns, with legacy writers drained. Flyway owns the transaction.
-- Unknown historical times are discovery time, never a new recovery request.
UPDATE "user" SET deleted_at = clock_timestamp()
WHERE is_deleted AND deleted_at IS NULL;

UPDATE opinion source SET account_hidden_at = clock_timestamp()
FROM "user" account
WHERE source.author_id = account.id AND account.is_deleted
  AND NOT source.is_seed AND source.account_hidden_at IS NULL;

UPDATE ranking_item source SET account_hidden_at = clock_timestamp()
FROM "user" account
WHERE source.author_id = account.id AND account.is_deleted
  AND NOT source.is_seed AND source.account_hidden_at IS NULL;

-- An explicitly deleted parent establishes ownership-scope intent even for a
-- child left incomplete by a legacy writer. Do not infer other null pointers.
UPDATE conversation child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM project parent
WHERE child.project_id = parent.id AND parent.deleted_at IS NOT NULL
  AND parent.retired_for_account_deletion_at IS NULL
  AND child.deleted_at IS NULL;

UPDATE opinion child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM conversation parent
WHERE child.conversation_id = parent.id AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL;

UPDATE ranking_item child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM conversation parent
WHERE child.conversation_id = parent.id AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL;

UPDATE vote source SET retired_at = clock_timestamp()
FROM "user" account
WHERE source.author_id = account.id AND account.deletion_reason = 'guest_merge'
  AND source.current_content_id IS NULL AND source.retired_at IS NULL;

-- Active-parent rows with unexplained null content, and legacy inactive votes
-- without merge provenance, remain unclassified and blocked from routine purge.
-- No recovery deadlines, checkpoint values, matrices or AI descriptions change.
