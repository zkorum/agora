# July 28 Twilio incident: reviewed phone blocks

The incident logs and generated manifest contain pseudonymous phone hashes and account IDs. Keep them in private storage; do not commit the evidence or a populated manifest. No production database changes occur during manifest generation or the importer's default preview.

## Prepare the evidence

Run from `services/api` after obtaining the unmodified incident `api.log`:

```bash
pnpm exec tsx scripts/twilio-incident-manifest.ts \
  ../../agora-twilio-incident-2026-07-28/api.log \
  /path/to/private/twilio-incident-candidates.json
```

The extractor uses only logged `auth_attempt_phone` inserts and `phone` inserts matching both the destination hash/version **and registering user ID**. For the provided capture it yields 453 distinct candidate hashes, including 34 exact account-registration matches. It does **not** use the provisional wider request correlation, nor infer the three early Ukrainian registrations from Nginx timestamps. `errortwilio.log` overlaps the API log and must not be added to the count. This is a candidate set, not a proven list of fraudulent recipients or billed messages.

The output is created with private permissions and `approved: false` for **every** entry. `attempt_candidate` identifies a number used in an auth request; `registered_during_incident` additionally has an exact phone-credential insert and account ID. Neither class is automatically approved for a ban. Review Twilio Verify and billing exports, project participation, registration history and account activity before marking an entry. In particular, preserve the verified May Ukrainian credential; it predates this capture and does not appear in the generated candidates.

## Review and stage

In a private copy of the manifest, set `reviewedBy` to the reviewer and explicitly set `approved: true` only for reviewed entries. Replace the placeholder reason for each approved entry. Set `restrictAccount: true` **only** for a reviewed `registered_during_incident` entry whose associated account should also be restricted and have all active sessions revoked. That restriction blocks every login method on that account. A phone block by itself does not revoke a session, so do not omit account review for confirmed attack-created accounts.

Preview the validated manifest without connecting to any database:

```bash
pnpm exec tsx scripts/import-blocked-phones.ts /path/to/private/reviewed.json
```

The reviewed manifest can be imported after applying the generated `V0093__shocking_medusa.sql` migration and deploying the API. Arrange a maintenance window with phone sending disabled during the import so an in-flight send cannot race the block insertion. Supply the production writer connection through the service's normal `CONNECTION_STRING` or AWS secret configuration, then **explicitly** opt into the import:

```bash
NODE_ENV=production pnpm exec tsx scripts/import-blocked-phones.ts \
  /path/to/private/reviewed.json --apply
```

The importer validates the manifest and writes all reviewed blocks/account restrictions in one transaction. It invalidates matching live phone OTP challenges, checks a restricted account still owns the exact active credential, revokes that account's active sessions, and emits the existing `auth_state_changed` event. Repeating the same import is idempotent for active blocks; a previously revoked block must be reviewed separately before it is reintroduced. It reports counts but does not print hashes. **Do not run `--apply` against production without reviewing the exact manifest and migration.**

Blocked hashes remain blocked if a phone credential is removed or a new account is created. Account restrictions preserve account data; they do not soft-delete users. Revocation/correction procedures must review both the phone block and any associated account restriction. Pepper rotation requires version-aware rehashing or a staged transition so existing blocks do not silently disappear.
