-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

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

-- Initial close and checkpoint binding.

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

-- Replacement generation binding.

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

-- Derived closing evidence.

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

-- Generation publication fencing.

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
