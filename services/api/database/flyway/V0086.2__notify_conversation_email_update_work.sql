-- Notifications are commit-time, lossy wake hints. Durable work remains in the tables.
CREATE OR REPLACE FUNCTION notify_conversation_email_update_work()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('conversation_email_update_work', TG_ARGV[0]);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_email_update_delivery_work_insert_trigger
AFTER INSERT ON conversation_email_update_delivery
FOR EACH ROW
WHEN (NEW.status = 'preparing')
EXECUTE FUNCTION notify_conversation_email_update_work('delivery');

CREATE TRIGGER conversation_email_update_delivery_work_update_trigger
AFTER UPDATE OF status, materialization_last_error, updated_at
ON conversation_email_update_delivery
FOR EACH ROW
WHEN (
    (
        OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('preparing', 'queued', 'sending', 'stopping')
    )
    OR (
        NEW.status = 'preparing'
        AND (
            OLD.materialization_last_error IS DISTINCT FROM NEW.materialization_last_error
            OR (
                NEW.materialization_last_error IS NOT NULL
                AND OLD.updated_at IS DISTINCT FROM NEW.updated_at
            )
        )
    )
)
EXECUTE FUNCTION notify_conversation_email_update_work('delivery');

CREATE TRIGGER conversation_email_update_recipient_work_insert_trigger
AFTER INSERT ON conversation_email_update_recipient
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'retry_wait'))
EXECUTE FUNCTION notify_conversation_email_update_work('recipient');

CREATE TRIGGER conversation_email_update_recipient_work_update_trigger
AFTER UPDATE OF status, next_attempt_at
ON conversation_email_update_recipient
FOR EACH ROW
WHEN (
    (
        OLD.status IS DISTINCT FROM NEW.status
        AND (
            NEW.status IN ('pending', 'retry_wait')
            OR (
                NEW.kind = 'conversation_owner_copy'
                AND OLD.status IN ('pending', 'claimed', 'attempting', 'retry_wait')
                AND NEW.status NOT IN ('pending', 'claimed', 'attempting', 'retry_wait')
            )
        )
    )
    OR (
        NEW.status = 'retry_wait'
        AND OLD.next_attempt_at IS DISTINCT FROM NEW.next_attempt_at
    )
)
EXECUTE FUNCTION notify_conversation_email_update_work('recipient');

CREATE TRIGGER conversation_email_update_test_work_insert_trigger
AFTER INSERT ON conversation_email_update_test_attempt
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_conversation_email_update_work('test');

CREATE TRIGGER conversation_email_update_test_work_update_trigger
AFTER UPDATE OF status
ON conversation_email_update_test_attempt
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status = 'pending'
)
EXECUTE FUNCTION notify_conversation_email_update_work('test');

CREATE TRIGGER conversation_email_update_sns_work_insert_trigger
AFTER INSERT ON conversation_email_update_sns_event_inbox
FOR EACH ROW
WHEN (
    NEW.deleted_at IS NULL
    AND NEW.status IN ('pending', 'retry_wait')
)
EXECUTE FUNCTION notify_conversation_email_update_work('sns');

CREATE TRIGGER conversation_email_update_sns_work_update_trigger
AFTER UPDATE OF status, next_attempt_at
ON conversation_email_update_sns_event_inbox
FOR EACH ROW
WHEN (
    NEW.deleted_at IS NULL
    AND NEW.status IN ('pending', 'retry_wait')
    AND (
        OLD.status IS DISTINCT FROM NEW.status
        OR OLD.next_attempt_at IS DISTINCT FROM NEW.next_attempt_at
    )
)
EXECUTE FUNCTION notify_conversation_email_update_work('sns');
