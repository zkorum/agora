-- Stage after the generated retired_device_key table migration. All old and new
-- device writers must honor retirement even if they bypass getDeviceStatus.
CREATE OR REPLACE FUNCTION reject_retired_device_key() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM retired_device_key WHERE did_write = NEW.did_write) THEN
        RAISE EXCEPTION 'device signing key is retired' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER reject_retired_device_key
BEFORE INSERT OR UPDATE ON device
FOR EACH ROW EXECUTE FUNCTION reject_retired_device_key();
