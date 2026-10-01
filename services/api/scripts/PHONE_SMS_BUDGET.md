# Global phone SMS budget

The API reserves capacity on the primary PostgreSQL database before every Twilio Verify SMS request, including resends. Reservations count conservatively even if the provider later times out or rejects a request. The limits are shared across API instances and use rolling 1-hour and 24-hour windows. Queries use the `reserved_at` index to count only recent rows. Reservation history is retained; there is no automatic deletion or retention job, so table and index storage grow with usage. Existing local phone validation, denylist, and destination cooldowns run first.

Apply the generated `V0095__rare_punisher.sql` migration **after V0094** before deploying this API. No policy row is seeded: until you insert and enable one, the API sends no phone SMS. Never configure unlimited or zero-cost sending by omitting the row.

## Choose the limits before deployment

1. Estimate the **highest legitimate SMS sends** in any rolling hour and rolling day, including normal traffic, returning phone-only users, expected event attendees and retries. Use actual Twilio Verify **send attempts** and billed usage to distinguish sends from API requests, blocked requests, verification checks and incident traffic. Exclude the July 28 attack and other known abuse from the legitimate baseline. The local incident logs alone cannot establish the legitimate or billed peak. If an event expects 80 phone users in one hour and up to two sends each, that event alone needs capacity for 160 sends in that hour, plus concurrent normal traffic. Count all sends, not unique users or IPs.
2. From the currently enabled Verify destinations, obtain actual route prices, Verify fees and possible segment costs. Set `estimated_cents_per_send` to an **integer rounded up** to a conservative cost for a permitted attempt, rather than using the cheapest country. If an expensive route makes the budget unusable, narrow the supported destinations or add separately enforced country budgets before lowering this estimate. Past reservations retain the estimate that applied when each was made.
3. Decide the maximum **estimated** cents you will accept in a rolling hour and day, including the risk that hitting the cap interrupts legitimate SMS login. Enter those as `max-hour-cents` and `max-day-cents`. An hourly $10 ceiling is `1000` cents. These are operator loss decisions, not values inferred from the incident request count. Provider charges can exceed these estimates, so keep Twilio billing/usage alerts and reconcile them separately.
4. Run the read-only calculator below. It sizes integer send-count limits so a reviewed peak stays **below** the chosen warning percentage (75% by default), and refuses a monetary allowance that would hit the warning sooner. It prints a proposed **disabled** policy insert for review; it does not connect to Twilio or PostgreSQL or execute the SQL. The example numbers are illustrative only and are **not approved production limits**.

```bash
cd services/api
node scripts/plan-phone-sms-budget.mjs \
  --peak-hour-sends 40 --peak-day-sends 100 \
  --estimated-cents-per-send 12 \
  --max-hour-cents 1000 --max-day-cents 3000
```

Use a peak that includes background sends already occupying the rolling windows and reasonable event/retry headroom. If the calculator rejects a plan, do not simply inflate the loss allowance: revisit traffic assumptions, available login/recovery options, provider prices and destination eligibility together. In `login_only`, reaching the warning records an alert but does not stop existing-phone login; the hard limit does. A stored registration pause must still be cleared explicitly before any future reopening. The cent ceilings bound **estimates**, not Twilio's entire invoice.

Change the policy in the **production writer** database using your normal operator SQL tool; changes take effect without redeploying.

```sql
-- Substitute reviewed positive integer values before executing. Start with
-- sending_enabled = false, verify the saved limits, then turn it on separately.
INSERT INTO phone_sms_budget_policy (
    id, sending_enabled, hourly_send_limit, daily_send_limit,
    estimated_cents_per_send, hourly_budget_cents, daily_budget_cents,
    warning_percent
) VALUES (1, false, :hourly_sends, :daily_sends, :estimated_cents_per_send,
          :hourly_cents, :daily_cents, 75);

SELECT * FROM phone_sms_budget_policy WHERE id = 1;
UPDATE phone_sms_budget_policy SET sending_enabled = true, updated_at = now() WHERE id = 1;
```

To change a ceiling, `UPDATE phone_sms_budget_policy SET hourly_send_limit = ..., daily_send_limit = ..., hourly_budget_cents = ..., daily_budget_cents = ..., updated_at = now() WHERE id = 1`. The database checks require positive values and daily ceilings at least as large as hourly ceilings.

At the warning percentage, the API persists `registration_paused_at`, effectively tightening `enabled` mode to `login_only`; existing phone login remains available under the hard ceiling. This also applies when lowered policy limits put existing usage above the warning threshold. An operator must explicitly clear this field after reviewing the event and ensuring usage is below the warning threshold. The final hard ceiling stops _all_ new SMS sends until rolling capacity returns. Previously sent login OTPs can still complete, but a registration OTP cannot finish registration after the warning pause or an operator disabling sends. The API checks policy changes against live usage each minute, even without an alert email recipient, so lowering a ceiling also records any resulting warning or hard-limit alert. Alert records are deduplicated per UTC day and warning/hard-limit kind and persisted. When `PHONE_SMS_BUDGET_ALERT_EMAIL` is set, the API delivers them via SES and retries failed deliveries; a delivery interrupted after SES acceptance can result in a duplicate email. Check `phone_sms_budget_alert` if mail is delayed.

When `PHONE_AUTH_MODE=login_only` is already set, existing-account SMS login remains possible until the hard limit. The warning still records a persistent registration pause and an alert, but does not change the already-closed registration mode. When rolling capacity returns after the hard limit, the API remains in `login_only` until the static mode is changed, and the persisted pause must also be cleared before registration can resume.

The frontend's `VITE_PHONE_AUTH_MODE` is a build-time presentation setting. A database-triggered registration pause takes effect immediately on the API, but a frontend built with phone registration enabled does not yet learn the new mode automatically. Keep the frontend in login-only mode until a public runtime policy endpoint is added before reopening registration.

```sql
-- Emergency pause for all SMS without changing PHONE_AUTH_MODE:
UPDATE phone_sms_budget_policy SET sending_enabled = false, updated_at = now() WHERE id = 1;

-- Reopen registration only after investigating the alert and checking the
-- remaining rolling allowance. This cannot override PHONE_AUTH_MODE=login_only.
UPDATE phone_sms_budget_policy SET registration_paused_at = NULL, updated_at = now() WHERE id = 1;
```

Email delivery is optional. Configure `PHONE_SMS_BUDGET_ALERT_EMAIL` in the API environment and ensure SES can send from `EMAIL_FROM_ADDRESS`; restart the API to enable delivery or update the recipient. Without this setting, alerts remain in the database for review and can be emailed later if a recipient is configured. A missing policy, missing database, or failed reservation prevents new Twilio sends. Keep an alternative login/recovery path for phone-only users when the absolute cap stops SMS.
