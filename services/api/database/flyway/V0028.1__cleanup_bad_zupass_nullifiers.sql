-- Cleanup bad Zupass ticket records created with wrong nullifier
--
-- ISSUE: Records were created using externalNullifier (the salt) instead of
-- nullifierHashV4 (the actual unique hash) due to a bug in zupass.ts:366
--
-- SYMPTOMS:
-- - Multiple users getting "ticket_already_used" error
-- - All bad records have nullifier = 'agora-devconnect-arg-v1' (the externalNullifier)
-- - Only ONE user could verify successfully per event (first one wins)
--
-- FIX: Delete bad records so users can re-verify with correct nullifiers

-- Delete bad ticket records where nullifier is the externalNullifier format
-- instead of the nullifierHashV4 (bigint as string)
DELETE FROM event_ticket
WHERE
    nullifier = 'agora-devconnect-2025-v1'
-- Note: We intentionally do NOT delete orphaned users/devices
-- Users can re-verify their tickets after the code fix is deployed
-- If they had other credentials (phone, Rarimo, other tickets), those remain intact
