CREATE OR REPLACE FUNCTION notify_realtime_event_outbox()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'realtime_event_outbox',
        json_build_object(
            'id', NEW.id,
            'eventType', NEW.event_type,
            'payload', NEW.payload
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER realtime_event_outbox_notify_trigger
AFTER INSERT ON realtime_event_outbox
FOR EACH ROW
EXECUTE FUNCTION notify_realtime_event_outbox();
