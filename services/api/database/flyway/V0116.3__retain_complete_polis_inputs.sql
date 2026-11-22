-- Requires the consolidated generated structural migration, including
-- analysis_input_baseline and analysis_input_snapshot.payload_version.
-- No legacy evidence is certified or reconstructed from current participation.
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION require_initial_analysis_input_correspondence(
    effective analysis_input_snapshot, baseline analysis_input_snapshot, participant_indices integer[]
) RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF effective.data_generation <> baseline.data_generation THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_scope',
            MESSAGE = 'initial analysis evidence requires a same-generation baseline';
    END IF;
    IF (SELECT count(*) FROM analysis_input_participant_eligibility
        WHERE input_snapshot_id = baseline.id AND user_id IS NOT NULL) <> baseline.participant_count
       OR (SELECT count(*) FROM analysis_input_participant_eligibility
            WHERE input_snapshot_id = effective.id AND user_id IS NOT NULL) <> effective.participant_count
       OR EXISTS (
            SELECT FROM unnest(participant_indices) WITH ORDINALITY mapping(source_index, position)
            LEFT JOIN analysis_input_participant_eligibility source
                ON source.input_snapshot_id = baseline.id AND source.participant_index = mapping.source_index
            LEFT JOIN analysis_input_participant_eligibility target
                ON target.input_snapshot_id = effective.id AND target.participant_index = mapping.position - 1
            WHERE source.user_id IS NULL OR target.user_id IS NULL
               OR source.user_id IS DISTINCT FROM target.user_id
        ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_private_sources',
            MESSAGE = 'analysis baseline requires original participant correspondence';
    END IF;
END;
$$;

CREATE FUNCTION require_analysis_input_provenance(
    effective analysis_input_snapshot, baseline analysis_input_snapshot, participant_indices integer[]
) RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    PERFORM require_initial_analysis_input_correspondence(effective, baseline, participant_indices);
END;
$$;

CREATE OR REPLACE FUNCTION enforce_analysis_input_baseline()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    effective analysis_input_snapshot%ROWTYPE;
    baseline analysis_input_snapshot%ROWTYPE;
    baseline_certificate analysis_input_baseline%ROWTYPE;
BEGIN
    PERFORM id FROM analysis_input_snapshot
    WHERE id IN (NEW.input_snapshot_id, NEW.baseline_input_snapshot_id)
    ORDER BY id FOR NO KEY UPDATE;
    SELECT * INTO effective FROM analysis_input_snapshot WHERE id = NEW.input_snapshot_id;
    SELECT * INTO baseline FROM analysis_input_snapshot WHERE id = NEW.baseline_input_snapshot_id;
    IF effective.id IS NULL OR baseline.id IS NULL
       OR effective.conversation_id <> NEW.conversation_id
       OR baseline.conversation_id <> NEW.conversation_id
       OR effective.payload_version <> 2 OR baseline.payload_version <> 2
       OR NOT EXISTS (
           SELECT FROM conversation WHERE id = NEW.conversation_id AND conversation_type = 'polis'
       ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_scope',
            MESSAGE = 'analysis baseline scope/provenance mismatch';
    END IF;
    IF NEW.source_vote_count < baseline.vote_count
       OR NEW.source_participant_count < baseline.participant_count
       OR NEW.source_participant_count > NEW.source_vote_count THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_source_counts',
            MESSAGE = 'analysis source totals must cover the eligible numerical population';
    END IF;
    IF cardinality(NEW.participant_indices) <> effective.participant_count
       OR cardinality(NEW.opinion_indices) <> effective.opinion_count
       OR EXISTS (
           SELECT FROM unnest(NEW.participant_indices) value
           WHERE value IS NULL OR value < 0 OR value >= baseline.participant_count
       )
       OR EXISTS (
           SELECT FROM unnest(NEW.opinion_indices) value
           WHERE value IS NULL OR value < 0 OR value >= baseline.opinion_count
       )
       OR (SELECT count(DISTINCT value) FROM unnest(NEW.participant_indices) value)
           <> effective.participant_count
       OR (SELECT count(DISTINCT value) FROM unnest(NEW.opinion_indices) value)
           <> effective.opinion_count
       OR effective.vote_count > baseline.vote_count THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_projection',
            MESSAGE = 'analysis baseline local index projection mismatch';
    END IF;
    IF effective.id = baseline.id THEN
        IF NEW.participant_indices IS DISTINCT FROM ARRAY(
               SELECT generate_series(0, baseline.participant_count - 1)
           ) OR NEW.opinion_indices IS DISTINCT FROM ARRAY(
               SELECT generate_series(0, baseline.opinion_count - 1)
           ) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_projection',
                MESSAGE = 'complete analysis baseline must use identity projection';
        END IF;
    ELSE
        SELECT * INTO baseline_certificate FROM analysis_input_baseline
        WHERE input_snapshot_id = baseline.id AND baseline_input_snapshot_id = baseline.id;
        IF baseline_certificate.input_snapshot_id IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_direct',
                MESSAGE = 'analysis baseline must reference certified complete evidence directly';
        END IF;
        IF NEW.source_vote_count <> baseline_certificate.source_vote_count
           OR NEW.source_participant_count <> baseline_certificate.source_participant_count THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_baseline_source_counts',
                MESSAGE = 'analysis projection must retain its certified source totals';
        END IF;
    END IF;
    -- PostgreSQL cannot decode zstd: the writer parses the V2 catalogue/hash and
    -- verifies every numerical cell before inserting this certificate.
    PERFORM require_analysis_input_provenance(effective, baseline, NEW.participant_indices);
    RETURN NEW;
END;
$$;

CREATE TRIGGER analysis_input_baseline_binding
BEFORE INSERT ON analysis_input_baseline
FOR EACH ROW EXECUTE FUNCTION enforce_analysis_input_baseline();

CREATE OR REPLACE FUNCTION protect_analysis_input_baseline()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_input_immutable',
            MESSAGE = 'certified analysis evidence is immutable';
    END IF;
    PERFORM id FROM analysis_input_snapshot
    WHERE id IN (OLD.input_snapshot_id, OLD.baseline_input_snapshot_id)
    ORDER BY id FOR NO KEY UPDATE;
    IF EXISTS (
        SELECT FROM analysis_snapshot publication
        JOIN analysis_input_baseline certificate
            ON certificate.input_snapshot_id = publication.input_snapshot_id
        WHERE certificate.input_snapshot_id = OLD.input_snapshot_id
           OR certificate.baseline_input_snapshot_id = OLD.input_snapshot_id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_input_retained',
            MESSAGE = 'published analysis retains its complete numerical evidence';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER analysis_input_baseline_immutable_retained
BEFORE UPDATE OR DELETE ON analysis_input_baseline
FOR EACH ROW EXECUTE FUNCTION protect_analysis_input_baseline();

CREATE OR REPLACE FUNCTION protect_certified_analysis_input()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (
        SELECT FROM analysis_input_baseline
        WHERE input_snapshot_id = OLD.id OR baseline_input_snapshot_id = OLD.id
    ) OR EXISTS (
        SELECT FROM analysis_snapshot WHERE input_snapshot_id = OLD.id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_input_immutable',
            MESSAGE = 'certified or published analysis evidence cannot be changed';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER analysis_input_snapshot_immutable_retained
BEFORE UPDATE OR DELETE ON analysis_input_snapshot
FOR EACH ROW EXECUTE FUNCTION protect_certified_analysis_input();

CREATE OR REPLACE FUNCTION bind_analysis_publication_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    evidence analysis_input_snapshot%ROWTYPE;
    complete_id integer;
BEGIN
    IF TG_OP = 'UPDATE'
       AND (NEW.input_snapshot_id, NEW.conversation_id, NEW.data_generation)
           IS DISTINCT FROM (OLD.input_snapshot_id, OLD.conversation_id, OLD.data_generation) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_input_immutable',
            MESSAGE = 'published analysis evidence cannot be rebound';
    END IF;
    SELECT baseline_input_snapshot_id INTO complete_id
    FROM analysis_input_baseline WHERE input_snapshot_id = NEW.input_snapshot_id;
    -- Share the certificate-deletion lock boundary. Recheck certification after
    -- locking so a concurrent retirement cannot strand a newly published result.
    PERFORM id FROM analysis_input_snapshot
    WHERE id IN (NEW.input_snapshot_id, complete_id)
    ORDER BY id FOR NO KEY UPDATE;
    SELECT * INTO evidence FROM analysis_input_snapshot WHERE id = NEW.input_snapshot_id;
    IF evidence.payload_version = 2 AND (
        evidence.conversation_id <> NEW.conversation_id
        OR evidence.data_generation <> NEW.data_generation
        OR NOT EXISTS (
            SELECT FROM analysis_input_baseline target
            JOIN analysis_input_baseline baseline
                ON baseline.input_snapshot_id = target.baseline_input_snapshot_id
               AND baseline.baseline_input_snapshot_id = baseline.input_snapshot_id
            WHERE target.input_snapshot_id = NEW.input_snapshot_id
              AND target.conversation_id = NEW.conversation_id
        )
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'analysis_publication_evidence',
            MESSAGE = 'new analysis publication requires certified complete numerical evidence';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER analysis_snapshot_retained_input_binding
BEFORE INSERT OR UPDATE OF input_snapshot_id, conversation_id, data_generation ON analysis_snapshot
FOR EACH ROW EXECUTE FUNCTION bind_analysis_publication_evidence();
