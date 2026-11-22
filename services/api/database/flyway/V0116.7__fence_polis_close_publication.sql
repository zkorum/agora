-- Native replacement views stay out of ordinary activated-view reads.
-- Protect durable evidence here; the worker owns admission and readiness.
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION guard_polis_close_generation_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.published_at IS NOT NULL
       OR (OLD.input_snapshot_id IS NOT NULL AND NEW.input_snapshot_id IS DISTINCT FROM OLD.input_snapshot_id)
       OR NEW.input_snapshot_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_close_publication_immutable',
            MESSAGE = 'accepted publications and pinned inputs cannot be changed';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER polis_close_generation_publication_guard
BEFORE UPDATE ON polis_analysis_close_generation
FOR EACH ROW EXECUTE FUNCTION guard_polis_close_generation_publication();

CREATE FUNCTION guard_polis_close_replacement_view()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    binding polis_analysis_close_generation%ROWTYPE;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        IF OLD.close_replacement_generation IS NOT NULL AND (
            TG_OP = 'DELETE'
            OR (to_jsonb(NEW) - 'conversation_content_id') IS DISTINCT FROM
               (to_jsonb(OLD) - 'conversation_content_id')
            OR (NEW.conversation_content_id IS DISTINCT FROM OLD.conversation_content_id
                AND NEW.conversation_content_id IS NOT NULL)
        ) OR (TG_OP = 'UPDATE' AND NEW.close_replacement_generation IS DISTINCT FROM OLD.close_replacement_generation) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_close_replacement_view_immutable',
                MESSAGE = 'replacement view provenance cannot be changed';
        END IF;
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    IF NEW.close_replacement_generation IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO binding FROM polis_analysis_close_generation
    WHERE conversation_id = NEW.conversation_id AND data_generation = NEW.close_replacement_generation
    FOR SHARE;
    IF binding.published_at IS NOT NULL OR NEW.activated_at IS NOT NULL OR NOT NEW.is_closed
       OR NEW.view_reason <> 'analysis_completed' OR NOT EXISTS (
        SELECT FROM polis_analysis_close native
        JOIN analysis_snapshot snapshot ON snapshot.id = NEW.analysis_snapshot_id
           AND snapshot.conversation_id = native.conversation_id
           AND snapshot.data_generation = binding.data_generation
           AND snapshot.input_snapshot_id = binding.input_snapshot_id
        JOIN analysis_snapshot_result result ON result.analysis_snapshot_id = snapshot.id
           AND result.conversation_id = native.conversation_id
           AND result.opinion_group_spec_id = native.opinion_group_spec_id
        JOIN analysis_input_baseline cert ON cert.input_snapshot_id = snapshot.input_snapshot_id
        JOIN conversation_view_snapshot original ON original.id = native.original_view_snapshot_id
        JOIN analysis_snapshot original_analysis ON original_analysis.id = original.analysis_snapshot_id
        JOIN analysis_input_baseline original_cert ON original_cert.input_snapshot_id = original_analysis.input_snapshot_id
        WHERE native.close_id = binding.close_id AND native.opinion_group_spec_id = NEW.opinion_group_spec_id
           AND cert.baseline_input_snapshot_id = original_cert.baseline_input_snapshot_id
           AND (NEW.survey_aggregate_snapshot_id IS NULL OR EXISTS (
               SELECT FROM survey_aggregate_snapshot survey
               WHERE survey.id = NEW.survey_aggregate_snapshot_id
                   AND survey.conversation_id = NEW.conversation_id
                   AND survey.analysis_snapshot_id = snapshot.id
                    AND survey.source_survey_aggregate_snapshot_id = original.survey_aggregate_snapshot_id
                    AND EXISTS (
                        SELECT FROM analysis_survey_choice_capture capture
                        WHERE capture.survey_aggregate_snapshot_id = survey.source_survey_aggregate_snapshot_id
                          AND capture.baseline_input_snapshot_id = cert.baseline_input_snapshot_id
                    )
           ))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'polis_close_replacement_capture',
            MESSAGE = 'replacement view must use the pinned capture and a bound native spec';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER polis_close_replacement_view_guard
BEFORE INSERT OR UPDATE OR DELETE ON conversation_view_snapshot
FOR EACH ROW EXECUTE FUNCTION guard_polis_close_replacement_view();
