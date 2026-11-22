-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET lock_timeout = '5s';
SET TIME ZONE 'UTC';
SET search_path = public, pg_temp;
--> statement-breakpoint
-- Prepared source: scripts/prepare-realtime-retention-contract.sql

CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_6_1() LANGUAGE plpgsql AS $batch$
DECLARE
    mb_cursor bigint;
    mb_lower bigint;
    mb_boundary bigint;
    mb_high_water bigint;
    mb_size integer := coalesce(nullif(current_setting('agora.migration_batch_size', true), ''), '5000')::integer;
    mb_pause_ms integer := coalesce(nullif(current_setting('agora.migration_batch_pause_ms', true), ''), '0')::integer;
BEGIN
    IF mb_size < 1 OR mb_size > 5000 THEN
        RAISE EXCEPTION 'migration_batch_size must be between 1 and 5000';
    END IF;
    IF mb_pause_ms < 0 OR mb_pause_ms > 1000 THEN
        RAISE EXCEPTION 'migration_batch_pause_ms must be between 0 and 1000';
    END IF;
    SELECT id INTO mb_high_water FROM realtime_event_outbox ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM realtime_event_outbox WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM realtime_event_outbox
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM realtime_event_outbox
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE realtime_event_outbox SET delivered_at = clock_timestamp()
WHERE (delivery_id IS NOT NULL AND delivered_at IS NULL) AND (realtime_event_outbox.id >= mb_lower AND realtime_event_outbox.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_6_1();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_6_1();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_6_2() LANGUAGE plpgsql AS $batch$
DECLARE
    mb_cursor bigint;
    mb_lower bigint;
    mb_boundary bigint;
    mb_high_water bigint;
    mb_size integer := coalesce(nullif(current_setting('agora.migration_batch_size', true), ''), '5000')::integer;
    mb_pause_ms integer := coalesce(nullif(current_setting('agora.migration_batch_pause_ms', true), ''), '0')::integer;
BEGIN
    IF mb_size < 1 OR mb_size > 5000 THEN
        RAISE EXCEPTION 'migration_batch_size must be between 1 and 5000';
    END IF;
    IF mb_pause_ms < 0 OR mb_pause_ms > 1000 THEN
        RAISE EXCEPTION 'migration_batch_pause_ms must be between 0 and 1000';
    END IF;
    SELECT id INTO mb_high_water FROM realtime_event_outbox ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM realtime_event_outbox WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM realtime_event_outbox
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM realtime_event_outbox
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE realtime_event_outbox SET event_type = 'opinion_source_changed', payload = payload - ARRAY['opinion', 'sourceLanguageCode']
WHERE (event_type = 'opinion_updated') AND (realtime_event_outbox.id >= mb_lower AND realtime_event_outbox.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_6_2();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_6_2();
--> statement-breakpoint
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
--> statement-breakpoint
RESET lock_timeout;
RESET search_path;
RESET TIME ZONE;
