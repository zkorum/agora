-- Stage after the generated eligibility tables, before enabling their producers.
-- Eligibility lives outside sealed input bytes/hashes. No legacy mapping is inferred.
CREATE OR REPLACE FUNCTION protect_retained_participant_eligibility() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_TABLE_NAME = 'analysis_input_participant_eligibility' THEN
        IF NOT EXISTS (
            SELECT 1 FROM analysis_input_snapshot
            WHERE id = NEW.input_snapshot_id
              AND NEW.participant_index >= 0
              AND NEW.participant_index < participant_count
        ) THEN
            RAISE EXCEPTION 'participant index is outside retained numerical input' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'qv_input_ballot_eligibility' THEN
        IF NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
           OR NEW.ballot_index IS DISTINCT FROM OLD.ballot_index THEN
            RAISE EXCEPTION 'retained ballot identity is immutable' USING ERRCODE = '23514';
        END IF;
    ELSE
        IF NEW.input_snapshot_id IS DISTINCT FROM OLD.input_snapshot_id
           OR NEW.participant_index IS DISTINCT FROM OLD.participant_index THEN
            RAISE EXCEPTION 'retained participant identity is immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'retained participant account cannot be replaced or reattached' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_analysis_input_participant_eligibility
BEFORE INSERT OR UPDATE ON analysis_input_participant_eligibility
FOR EACH ROW EXECUTE FUNCTION protect_retained_participant_eligibility();
CREATE TRIGGER protect_ranking_input_participant_eligibility
BEFORE UPDATE ON ranking_input_participant_eligibility
FOR EACH ROW EXECUTE FUNCTION protect_retained_participant_eligibility();
CREATE TRIGGER protect_qv_input_ballot_eligibility
BEFORE UPDATE ON qv_input_ballot_eligibility
FOR EACH ROW EXECUTE FUNCTION protect_retained_participant_eligibility();
