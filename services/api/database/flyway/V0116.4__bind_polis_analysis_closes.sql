-- Requires the consolidated structural migration. This phase seals initial
-- close records only; it does not admit post-finalization worker publication.
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION protect_conversation_analysis_close()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    parent conversation%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_close_immutable',
            MESSAGE = 'historical analysis closes remain retention roots';
    END IF;
    IF TG_OP = 'UPDATE'
       AND (NEW.id, NEW.conversation_id, NEW.close_epoch, NEW.source_revision, NEW.finalized_at)
           IS DISTINCT FROM
           (OLD.id, OLD.conversation_id, OLD.close_epoch, OLD.source_revision, OLD.finalized_at) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_close_immutable',
            MESSAGE = 'analysis close provenance cannot be rebound';
    END IF;
    -- Application callers take this parent lock before modifying a close row.
    SELECT * INTO parent FROM conversation WHERE id = NEW.conversation_id FOR NO KEY UPDATE;
    IF parent.id IS NULL OR parent.current_content_id IS NULL OR parent.deleted_at IS NOT NULL
       OR parent.is_importing OR NOT parent.is_closed OR NOT parent.vote_buffer_drained
       OR parent.closed_finalized_at IS NULL
       OR parent.vote_buffer_epoch <> NEW.close_epoch
       OR parent.closing_target_revision IS DISTINCT FROM NEW.source_revision
       OR parent.closed_finalized_at IS DISTINCT FROM NEW.finalized_at THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_close_current',
            MESSAGE = 'only the current finalized close can change analysis selection';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.selected_input_mode <> 'closing' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_close_initial_mode',
            MESSAGE = 'each finalized close starts with closing inputs';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER conversation_analysis_close_provenance
BEFORE INSERT OR UPDATE OR DELETE ON conversation_analysis_close
FOR EACH ROW EXECUTE FUNCTION protect_conversation_analysis_close();

CREATE FUNCTION bind_initial_polis_analysis_close()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    source conversation_analysis_close%ROWTYPE;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_analysis_close_immutable',
            MESSAGE = 'initial closing result references cannot be changed';
    END IF;
    PERFORM id FROM conversation WHERE id = NEW.conversation_id FOR NO KEY UPDATE;
    SELECT * INTO source FROM conversation_analysis_close WHERE id = NEW.close_id;
    IF NOT EXISTS (
        SELECT FROM conversation parent
        WHERE parent.id = NEW.conversation_id AND parent.current_content_id IS NOT NULL
          AND parent.deleted_at IS NULL AND NOT parent.is_importing
          AND parent.is_closed AND parent.vote_buffer_drained
          AND parent.closed_finalized_at = source.finalized_at
          AND parent.vote_buffer_epoch = source.close_epoch
          AND parent.closing_target_revision = source.source_revision
          AND parent.conversation_type = 'polis'
    ) OR source.conversation_id IS DISTINCT FROM NEW.conversation_id THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_analysis_close_initial_source',
            MESSAGE = 'initial result references must belong to the current Polis close';
    END IF;
    -- Serialize sealing with source updates; recheck the entire native scope
    -- after waiting, not just the view's ID.
    PERFORM id FROM conversation_view_snapshot
    WHERE id = NEW.original_view_snapshot_id FOR NO KEY UPDATE;
    IF NOT EXISTS (
        SELECT FROM conversation_view_snapshot view
        JOIN analysis_snapshot snapshot ON snapshot.id = view.analysis_snapshot_id
        JOIN analysis_snapshot_result result ON result.analysis_snapshot_id = snapshot.id
          AND result.conversation_id = view.conversation_id
          AND result.opinion_group_spec_id = view.opinion_group_spec_id
        JOIN conversation_view_snapshot_checkpoint_reason checkpoint
          ON checkpoint.conversation_view_snapshot_id = view.id
          AND checkpoint.conversation_id = view.conversation_id
          AND checkpoint.opinion_group_spec_id = view.opinion_group_spec_id
          AND checkpoint.reason = 'conversation_closed'
        WHERE view.id = NEW.original_view_snapshot_id
          AND view.conversation_id = NEW.conversation_id
          AND view.opinion_group_spec_id = NEW.opinion_group_spec_id
          AND view.is_closed AND view.activated_at IS NOT NULL
          AND snapshot.conversation_id = NEW.conversation_id
          AND snapshot.data_generation = source.source_revision
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_analysis_close_checkpoint',
            MESSAGE = 'closing evidence requires an activated native closing checkpoint';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER polis_analysis_close_initial_binding
BEFORE INSERT OR UPDATE OR DELETE ON polis_analysis_close
FOR EACH ROW EXECUTE FUNCTION bind_initial_polis_analysis_close();

CREATE FUNCTION protect_polis_closing_view()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (
        SELECT FROM polis_analysis_close
        WHERE original_view_snapshot_id = OLD.id
    ) THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_closing_view_immutable',
                MESSAGE = 'accepted closing views remain retention roots';
        END IF;
        -- Content erasure may clear its reference, but cannot replace provenance.
        IF (to_jsonb(NEW) - 'conversation_content_id')
            IS DISTINCT FROM (to_jsonb(OLD) - 'conversation_content_id')
           OR (NEW.conversation_content_id IS DISTINCT FROM OLD.conversation_content_id
               AND NEW.conversation_content_id IS NOT NULL) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_closing_view_immutable',
                MESSAGE = 'accepted closing views cannot change numerical or survey provenance';
        END IF;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER conversation_view_snapshot_closing_retention
BEFORE UPDATE OR DELETE ON conversation_view_snapshot
FOR EACH ROW EXECUTE FUNCTION protect_polis_closing_view();

CREATE FUNCTION protect_polis_closing_checkpoint()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.reason = 'conversation_closed' AND EXISTS (
        SELECT FROM polis_analysis_close WHERE original_view_snapshot_id = OLD.conversation_view_snapshot_id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_closing_checkpoint_immutable',
            MESSAGE = 'the original closing checkpoint remains historical evidence';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER conversation_view_snapshot_closing_checkpoint_retention
BEFORE UPDATE OR DELETE ON conversation_view_snapshot_checkpoint_reason
FOR EACH ROW EXECUTE FUNCTION protect_polis_closing_checkpoint();
