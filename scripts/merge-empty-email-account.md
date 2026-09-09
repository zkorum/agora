# Merge an empty email account into an existing account

[`merge-empty-email-account.sql`](merge-empty-email-account.sql) is a standalone,
reusable PostgreSQL utility for attaching an empty account's primary email login
to an account you want to keep. It uses the deployed database's foreign keys to
check source-account activity, rather than calling the guest-only API merge.

## Maintenance window

This utility is **maintenance-only**. PostgreSQL cannot see votes waiting in
an API's memory or Valkey. A foreign-key lock also does not stop a delayed write
from attaching data to a soft-deleted user after the merge commits.

Before either a dry run or an apply:

1. Pause incoming application traffic and administrative writes, and let
   already-admitted requests finish. Keep the API instances running initially
   so their vote buffers can flush.
2. When using Valkey, check both vote-buffer counts with your existing Valkey
   connection. Both must reach zero; do not delete pending data to empty them.

   ```text
   ZCARD queue:votes:index
   HLEN queue:votes:data
   ```

3. Gracefully stop all API instances and other database writers. The API's
   `voteBuffer.shutdown()` waits for an in-flight flush and performs a final
   flush. Check for successful completion on every instance and resolve any
   flush errors. A forced process stop does not establish this precondition,
   particularly when the buffer is in-memory only.
4. With writers stopped, recheck that both Valkey counts are zero, if Valkey is
   used. Set `writers_paused_and_buffers_drained := true` only after these steps.
   This setting is an **operator assertion**, not an automated buffer check.
5. Keep writers paused through the dry run, apply, and commit/rollback. Resume
   services and traffic only after the database transaction is finished.

If draining reveals source-account activity, the utility aborts. That account
needs a data-aware merge rather than this empty-account operation.

## Run in a SQL editor

1. Follow the maintenance procedure and connect to the writer database in a
   fresh transaction. Open the SQL file in an unsaved editor buffer.
2. Independently verify the accounts, then set `keep_username` and `source_email`
   in the configuration block. Optionally set `expected_database`, verified
   account UUIDs, and retained-phone conditions.
3. Run the **entire statement** with `dry_run := true`. Check the editor's
   **Messages/Notices** output for `DRY RUN passed`. Utility notices do not print
   usernames, email addresses, phone metadata, or user IDs.
4. Change `dry_run := false` and rerun the entire statement. Commit if your editor
   has autocommit disabled. A failure aborts the statement atomically; if your
   editor leaves a transaction aborted, roll it back before retrying.

Keep account-specific configuration and execution output out of repository
files, commits, PRs, screenshots, and shared logs. PostgreSQL/editor diagnostics
may include submitted SQL, so handle them as private operational data.

With `psql`, configure a private copy outside the repository, then run:

```sh
psql "$CONNECTION_STRING" -v ON_ERROR_STOP=1 -f /private/path/merge-empty-email-account.sql
```

## Preconditions

- Both accounts are active and distinct; the retained username must match exactly.
- The source email is its account's sole email row and an active primary login.
- The retained account has no active email and, by default, has an active phone.
- Optional phone hash, calling code, and last-two-digit checks must match the
  **same** active phone row. The database stores a peppered hash, not the full
  phone number. Calling code and suffix are corroborating metadata, not proof
  of a full-number match.
- The source has no moderator/admin role, imported status, or content counters.
- All other foreign-key references to the source must be absent, including
  statements, votes, conversations, memberships, additional credentials, and
  email-update activity. The error lists blocking tables and counts.
- Language preferences are allowed to remain on the retired account by default.
  Set `retained_preference_tables := ARRAY[]::text[]` to require their absence too.
  These preferences are not copied over the retained account's preferences.

The emptiness check includes deleted/historical rows. If it finds activity, that
account needs an explicitly designed data merge; increasing an allowed count
would strand that data. References without database foreign keys cannot be
discovered automatically; the utility explicitly handles the non-FK OTP tables.

## Effects

- Keeps the destination UUID, username, phone, content, and existing sessions.
- Moves the email credential, preserving its ID and verification metadata.
- Moves the source devices to the destination and expires their sessions. Those
  devices must sign in again; email login now resolves to the retained account.
- Expires pending source-account OTP attempts and attempts for the moved email.
- Soft-deletes the source account and records the same `identity_changed` outbox
  event used by the API's session handling.

The dry run exercises the writes and database constraints inside a rolled-back
subtransaction, forcing deferred constraints to run before rollback. No merge
rows persist, though PostgreSQL sequence numbers may advance. Run it in a fresh
transaction and commit/rollback promptly to release the account locks. Session
and OTP expiry use UTC whole-second timestamps, matching the API regardless of
the SQL editor's timezone.

An already-linked email returns without writes only after checking the active
account, primary email, configured UUIDs, and phone conditions. The
`expected_source_user_id` assertion always refers to the **current** owner of the
email. Consequently, a rerun pinned to the original source UUID fails after a
successful merge. Independently verify the result before clearing that assertion
to check the already-linked state. The utility does not infer historical merge
provenance from an email's current owner.

## Verify the utility

From `services/api`, run:

```sh
pnpm test run tests/mergeEmptyEmailAccount.test.ts
```

The TypeScript tests reuse the generated auth fixture and the API's
`authStateChangedPayload` schema. They start and remove their own PostgreSQL 16
Docker container and exercise rollback, successful transfer, repeat execution,
maintenance/identity guards, timezone-independent expiry, activity discovery,
credential conflicts, and immediate/deferred composite email foreign keys.
