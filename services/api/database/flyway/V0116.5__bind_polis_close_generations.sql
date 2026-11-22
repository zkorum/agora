-- Requires the consolidated structural migration. A binding is provenance,
-- not a second queue and not permission to publish a replacement.
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION protect_polis_analysis_close_generation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND
        (NEW.conversation_id, NEW.data_generation, NEW.close_id)
        IS DISTINCT FROM (OLD.conversation_id, OLD.data_generation, OLD.close_id)) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_close_generation_immutable',
            MESSAGE = 'a scheduled generation cannot change its close';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        -- V0116.7 guards pinning and publication.
        RETURN NEW;
    END IF;
    IF NEW.input_snapshot_id IS NOT NULL OR NEW.published_at IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_close_generation_initial',
            MESSAGE = 'schedule before capturing and publishing the generation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER polis_analysis_close_generation_provenance
BEFORE INSERT OR UPDATE OR DELETE ON polis_analysis_close_generation
FOR EACH ROW EXECUTE FUNCTION protect_polis_analysis_close_generation();
