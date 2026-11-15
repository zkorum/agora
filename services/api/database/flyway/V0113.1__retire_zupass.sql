-- Feature retirement approved on 2026-10-29: permanently purge only the retired
-- event-ticket premium entitlements. Ticket/nullifier records remain soft-retired.
-- Deploy with old API/import writers stopped; do not roll back to ticket gating.

UPDATE conversation
SET requires_event_ticket = NULL
WHERE requires_event_ticket IS NOT NULL;

UPDATE event_ticket
SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
WHERE is_deleted = false;

-- No CASCADE: an unexpected reference must stop the migration rather than erase
-- a dependent email update or change its entitlement provenance.
DELETE FROM premium_feature_entitlement
WHERE feature = 'event_ticket';

-- Preserve delivery IDs and all other settings for Last-Event-ID replay.
UPDATE realtime_event_outbox
SET payload = jsonb_set(payload, '{settings}', (payload -> 'settings') - 'requiresEventTicket')
WHERE event_type = 'conversation_settings_updated'
  AND jsonb_typeof(payload -> 'settings') = 'object'
  AND (payload -> 'settings') ? 'requiresEventTicket';
