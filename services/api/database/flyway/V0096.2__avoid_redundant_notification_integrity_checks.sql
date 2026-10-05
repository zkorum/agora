-- Read-state updates do not change variant integrity. Keep the deferred checks
-- for type changes/detail writes, and check a shared old/new ID only once.
CREATE OR REPLACE FUNCTION enforce_notification_detail_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'notification' THEN
        IF TG_OP = 'UPDATE' THEN
            IF OLD.id = NEW.id AND OLD.notification_type = NEW.notification_type THEN
                RETURN NULL;
            END IF;
            PERFORM check_notification_detail_integrity(OLD.id);
            IF OLD.id <> NEW.id THEN
                PERFORM check_notification_detail_integrity(NEW.id);
            END IF;
        ELSIF TG_OP = 'INSERT' THEN
            PERFORM check_notification_detail_integrity(NEW.id);
        ELSE
            PERFORM check_notification_detail_integrity(OLD.id);
        END IF;
    ELSE
        IF TG_OP = 'UPDATE' THEN
            PERFORM check_notification_detail_integrity(OLD.notification_id);
            IF OLD.notification_id <> NEW.notification_id THEN
                PERFORM check_notification_detail_integrity(NEW.notification_id);
            END IF;
        ELSIF TG_OP = 'INSERT' THEN
            PERFORM check_notification_detail_integrity(NEW.notification_id);
        ELSE
            PERFORM check_notification_detail_integrity(OLD.notification_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;
