-- A derived capture points directly to the same complete evidence as the
-- original closing view. This certificate does not grant publication authority.
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION require_analysis_input_provenance(
    effective analysis_input_snapshot, baseline analysis_input_snapshot, participant_indices integer[]
) RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    closing_generation boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM polis_analysis_close_generation work
        WHERE work.conversation_id = effective.conversation_id
          AND work.data_generation = effective.data_generation
    ) INTO closing_generation;
    IF NOT closing_generation THEN
        PERFORM require_initial_analysis_input_correspondence(effective, baseline, participant_indices);
        RETURN;
    END IF;

    IF effective.data_generation <= baseline.data_generation OR NOT EXISTS (
        SELECT FROM polis_analysis_close_generation work
        JOIN conversation_analysis_close source ON source.id = work.close_id
        JOIN polis_analysis_close native ON native.close_id = source.id
        JOIN conversation_view_snapshot view ON view.id = native.original_view_snapshot_id
        JOIN analysis_snapshot result ON result.id = view.analysis_snapshot_id
        JOIN analysis_input_baseline cert ON cert.input_snapshot_id = result.input_snapshot_id
        WHERE work.conversation_id = effective.conversation_id
          AND work.data_generation = effective.data_generation
          AND source.source_revision = baseline.data_generation
          AND cert.baseline_input_snapshot_id = baseline.id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_closing_baseline_source',
            MESSAGE = 'derived analysis input must use complete evidence from its bound original close';
    END IF;
    IF EXISTS (
        SELECT FROM analysis_input_participant_eligibility WHERE input_snapshot_id = effective.id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_closing_input_identity_free',
            MESSAGE = 'derived closing inputs cannot have account links';
    END IF;
END;
$$;

-- Check private-link writes in batches. The scheduling transaction creates the
-- immutable generation binding before any worker can write that generation.
CREATE FUNCTION reject_closing_analysis_private_links()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (
        SELECT FROM (SELECT DISTINCT input_snapshot_id FROM new_links) links
        JOIN analysis_input_snapshot input ON input.id = links.input_snapshot_id
        JOIN polis_analysis_close_generation work ON work.conversation_id = input.conversation_id
           AND work.data_generation = input.data_generation
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_closing_input_identity_free',
            MESSAGE = 'derived closing inputs cannot have account links';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER analysis_closing_input_no_private_links_insert
AFTER INSERT ON analysis_input_participant_eligibility
REFERENCING NEW TABLE AS new_links
FOR EACH STATEMENT EXECUTE FUNCTION reject_closing_analysis_private_links();

CREATE TRIGGER analysis_closing_input_no_private_links_update
AFTER UPDATE ON analysis_input_participant_eligibility
REFERENCING NEW TABLE AS new_links
FOR EACH STATEMENT EXECUTE FUNCTION reject_closing_analysis_private_links();
