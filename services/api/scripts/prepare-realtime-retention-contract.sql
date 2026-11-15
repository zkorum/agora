-- Stage after the generated delivery timestamp/replay floor schema migration.
-- Legacy delivery age is unknown: discovery starts its replay retention clock.
UPDATE realtime_event_outbox SET delivered_at = clock_timestamp()
WHERE delivery_id IS NOT NULL AND delivered_at IS NULL;

-- Preserve delivery IDs/topics while removing obsolete free-text replay copies.
UPDATE realtime_event_outbox
SET event_type = 'opinion_source_changed', payload = payload - ARRAY['opinion', 'sourceLanguageCode']
WHERE event_type = 'opinion_updated';

CREATE OR REPLACE FUNCTION protect_realtime_replay_boundary() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.last_delivery_id < OLD.last_delivery_id
       OR NEW.replay_floor_delivery_id < OLD.replay_floor_delivery_id THEN
        RAISE EXCEPTION 'realtime delivery boundaries cannot move backwards' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER protect_realtime_replay_boundary
BEFORE UPDATE ON realtime_event_dispatch_state
FOR EACH ROW EXECUTE FUNCTION protect_realtime_replay_boundary();
