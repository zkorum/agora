-- Cross-table notification variants cannot be expressed by Drizzle CHECKs.
-- Lock the parent before detail writes; defer completeness until transaction
-- commit so parent/detail inserts remain atomic and concurrent variants serialize.
CREATE FUNCTION lock_notification_detail_parent() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM id FROM notification WHERE id = NEW.notification_id FOR UPDATE;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM id FROM notification WHERE id = OLD.notification_id FOR UPDATE;
    ELSE
        PERFORM id FROM notification
        WHERE id IN (OLD.notification_id, NEW.notification_id)
        ORDER BY id FOR UPDATE;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION check_notification_detail_integrity(notification_id_to_check integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    kind notification_type_enum;
    vote_count integer;
    opinion_count integer;
    export_count integer;
    import_count integer;
BEGIN
    SELECT notification_type INTO kind FROM notification
    WHERE id = notification_id_to_check FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT count(*) INTO vote_count FROM notification_opinion_vote WHERE notification_id = notification_id_to_check;
    SELECT count(*) INTO opinion_count FROM notification_new_opinion WHERE notification_id = notification_id_to_check;
    SELECT count(*) INTO export_count FROM notification_export WHERE notification_id = notification_id_to_check;
    SELECT count(*) INTO import_count FROM notification_import WHERE notification_id = notification_id_to_check;

    IF (kind = 'security_add_email' AND vote_count + opinion_count + export_count + import_count <> 0)
       OR (kind <> 'security_add_email' AND vote_count + opinion_count + export_count + import_count <> 1)
       OR (kind = 'opinion_vote' AND vote_count <> 1)
       OR (kind = 'new_opinion' AND opinion_count <> 1)
       OR (kind IN ('export_started', 'export_completed', 'export_failed', 'export_cancelled') AND export_count <> 1)
       OR (kind IN ('import_started', 'import_completed', 'import_failed') AND import_count <> 1)
       OR (kind = 'export_cancelled' AND EXISTS (
           SELECT 1 FROM notification_export WHERE notification_id = notification_id_to_check AND cancellation_reason IS NULL
       ))
       OR (kind <> 'export_cancelled' AND EXISTS (
           SELECT 1 FROM notification_export WHERE notification_id = notification_id_to_check AND cancellation_reason IS NOT NULL
       ))
       OR (kind <> 'export_failed' AND EXISTS (
           SELECT 1 FROM notification_export WHERE notification_id = notification_id_to_check AND failure_reason IS NOT NULL
       )) THEN
        RAISE EXCEPTION 'Notification % has inconsistent % details', notification_id_to_check, kind
            USING ERRCODE = '23514', CONSTRAINT = 'notification_detail_integrity';
    END IF;
END;
$$;

CREATE FUNCTION enforce_notification_detail_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'notification' THEN
        IF TG_OP <> 'INSERT' THEN PERFORM check_notification_detail_integrity(OLD.id); END IF;
        IF TG_OP <> 'DELETE' THEN PERFORM check_notification_detail_integrity(NEW.id); END IF;
    ELSE
        IF TG_OP <> 'INSERT' THEN PERFORM check_notification_detail_integrity(OLD.notification_id); END IF;
        IF TG_OP <> 'DELETE' THEN PERFORM check_notification_detail_integrity(NEW.notification_id); END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER notification_detail_integrity
AFTER INSERT OR UPDATE OR DELETE ON notification
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION enforce_notification_detail_integrity();

CREATE TRIGGER notification_opinion_vote_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON notification_opinion_vote
FOR EACH ROW EXECUTE FUNCTION lock_notification_detail_parent();
CREATE CONSTRAINT TRIGGER notification_opinion_vote_integrity AFTER INSERT OR UPDATE OR DELETE ON notification_opinion_vote
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_notification_detail_integrity();

CREATE TRIGGER notification_new_opinion_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON notification_new_opinion
FOR EACH ROW EXECUTE FUNCTION lock_notification_detail_parent();
CREATE CONSTRAINT TRIGGER notification_new_opinion_integrity AFTER INSERT OR UPDATE OR DELETE ON notification_new_opinion
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_notification_detail_integrity();

CREATE TRIGGER notification_export_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON notification_export
FOR EACH ROW EXECUTE FUNCTION lock_notification_detail_parent();
CREATE CONSTRAINT TRIGGER notification_export_integrity AFTER INSERT OR UPDATE OR DELETE ON notification_export
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_notification_detail_integrity();

CREATE TRIGGER notification_import_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON notification_import
FOR EACH ROW EXECUTE FUNCTION lock_notification_detail_parent();
CREATE CONSTRAINT TRIGGER notification_import_integrity AFTER INSERT OR UPDATE OR DELETE ON notification_import
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_notification_detail_integrity();
