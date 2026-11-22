-- PostgreSQL functions/triggers are not representable in the Drizzle schema.
-- Requires comparison_input_baseline in the consolidated generated V0116 schema.
-- Drain incompatible writers before migration and enabling baseline capture.
SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

CREATE OR REPLACE FUNCTION enforce_comparison_input_baseline()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    effective ranking_input_snapshot%ROWTYPE;
    baseline ranking_input_snapshot%ROWTYPE;
    mismatch boolean;
BEGIN
    PERFORM id FROM ranking_input_snapshot
    WHERE id IN (NEW.input_snapshot_id, NEW.baseline_input_snapshot_id)
    ORDER BY id FOR NO KEY UPDATE;
    IF EXISTS (
        SELECT FROM comparison_input_baseline WHERE input_snapshot_id = NEW.input_snapshot_id
    ) THEN
        IF EXISTS (
            SELECT FROM comparison_input_baseline WHERE input_snapshot_id = NEW.input_snapshot_id
              AND (baseline_input_snapshot_id, conversation_id)
                  IS DISTINCT FROM (NEW.baseline_input_snapshot_id, NEW.conversation_id)
        ) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_baseline_immutable';
        END IF;
        RETURN NEW;
    END IF;
    SELECT * INTO effective FROM ranking_input_snapshot WHERE id = NEW.input_snapshot_id;
    SELECT * INTO baseline FROM ranking_input_snapshot WHERE id = NEW.baseline_input_snapshot_id;
    IF effective.id IS NULL OR baseline.id IS NULL
       OR effective.stats_snapshot_id IS NOT NULL
       OR effective.sealed_at IS NULL OR baseline.sealed_at IS NULL
       OR effective.conversation_id <> NEW.conversation_id
       OR baseline.conversation_id <> NEW.conversation_id
       OR effective.comparison_method <> baseline.comparison_method
       OR baseline.scoring_input_revision > effective.scoring_input_revision
       OR (effective.algorithm_version, effective.solidago_version, effective.pipeline_config)
          IS DISTINCT FROM
          (baseline.algorithm_version, baseline.solidago_version, baseline.pipeline_config)
       OR effective.item_count > baseline.item_count
       OR effective.answer_count > baseline.answer_count
       OR effective.participant_count > baseline.participant_count THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_baseline_publication_mismatch';
    END IF;
    -- New certificates come from a complete source read while its private links
    -- still exist. Unlinking later changes eligibility, not this numerical proof.
    IF EXISTS (
        SELECT FROM ranking_input_snapshot input
        WHERE input.id IN (effective.id, baseline.id)
          AND (
              (SELECT count(*) FROM ranking_input_participant WHERE input_snapshot_id = input.id) <> input.participant_count
              OR (SELECT count(*) FROM ranking_input_item WHERE input_snapshot_id = input.id) <> input.item_count
              OR (SELECT count(*) FROM ranking_input_answer WHERE input_snapshot_id = input.id) <> input.answer_count
          )
    ) OR (SELECT count(*) FROM ranking_input_participant_eligibility
          WHERE input_snapshot_id = baseline.id AND user_id IS NOT NULL) <> baseline.participant_count THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_baseline_incomplete';
    END IF;
    IF effective.id = baseline.id THEN
        RETURN NEW;
    END IF;
    IF NOT EXISTS (
        SELECT FROM comparison_input_baseline
        WHERE input_snapshot_id = baseline.id AND baseline_input_snapshot_id = baseline.id
    ) OR EXISTS (
        SELECT FROM ranking_input_item item
        WHERE item.input_snapshot_id = effective.id AND NOT EXISTS (
            SELECT FROM ranking_input_item source
            WHERE source.input_snapshot_id = baseline.id AND source.item_slug_id = item.item_slug_id
        )
    ) OR ARRAY(
        SELECT source.item_slug_id FROM ranking_input_item source
        WHERE source.input_snapshot_id = baseline.id AND EXISTS (
            SELECT FROM ranking_input_item item
            WHERE item.input_snapshot_id = effective.id AND item.item_slug_id = source.item_slug_id
        ) ORDER BY source.position
    ) IS DISTINCT FROM ARRAY(
        SELECT item_slug_id FROM ranking_input_item
        WHERE input_snapshot_id = effective.id ORDER BY position
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_baseline_incomplete';
    END IF;
    -- Project saved answers with the existing BWS/pairwise filtering rules.
    -- The account association is used only to check local index correspondence at
    -- capture time; no permanent account identity or synthetic preference is added.
    WITH projected AS (
        SELECT answer.participant_index,
            row_number() OVER (PARTITION BY answer.participant_index ORDER BY answer.position) - 1 AS position,
            answer.best_slug_id, answer.worst_slug_id, answer.candidate_set,
            ARRAY(
                SELECT candidate FROM unnest(answer.effective_candidate_set)
                    WITH ORDINALITY source(candidate, position)
                WHERE EXISTS (
                    SELECT FROM ranking_input_item item WHERE item.input_snapshot_id = effective.id
                      AND item.item_slug_id = candidate
                ) ORDER BY source.position
            ) AS effective_candidate_set
        FROM ranking_input_answer answer
        WHERE answer.input_snapshot_id = baseline.id
          AND EXISTS (
              SELECT FROM ranking_input_item item WHERE item.input_snapshot_id = effective.id
                AND item.item_slug_id = answer.best_slug_id
          )
          AND EXISTS (
              SELECT FROM ranking_input_item item WHERE item.input_snapshot_id = effective.id
                AND item.item_slug_id = answer.worst_slug_id
          )
    )
    SELECT (SELECT count(*) FROM projected) <> effective.answer_count
       OR (SELECT count(DISTINCT participant_index) FROM projected) <> effective.participant_count
       OR EXISTS (
           SELECT FROM ranking_input_answer answer
           WHERE answer.input_snapshot_id = effective.id AND NOT EXISTS (
               SELECT FROM projected source
               JOIN ranking_input_participant_eligibility source_participant
                 ON source_participant.input_snapshot_id = baseline.id
                AND source_participant.participant_index = source.participant_index
               JOIN ranking_input_participant_eligibility participant
                 ON participant.input_snapshot_id = effective.id
                AND participant.participant_index = answer.participant_index
                AND participant.user_id = source_participant.user_id
               WHERE source.position = answer.position
                 AND (source.best_slug_id, source.worst_slug_id,
                      source.candidate_set, source.effective_candidate_set)
                     IS NOT DISTINCT FROM
                     (answer.best_slug_id, answer.worst_slug_id,
                      answer.candidate_set, answer.effective_candidate_set)
           )
       ) INTO mismatch;
    IF mismatch THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_baseline_projection_mismatch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER comparison_input_baseline_binding
BEFORE INSERT ON comparison_input_baseline
FOR EACH ROW EXECUTE FUNCTION enforce_comparison_input_baseline();
CREATE TRIGGER comparison_input_baseline_immutable
BEFORE UPDATE ON comparison_input_baseline
FOR EACH ROW EXECUTE FUNCTION reject_ranking_input_update();

CREATE OR REPLACE FUNCTION protect_retained_ranking_input_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE capture_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'ranking_input_snapshot' THEN capture_id := OLD.id;
    ELSE capture_id := OLD.input_snapshot_id;
    END IF;
    PERFORM id FROM ranking_input_snapshot WHERE id = capture_id FOR NO KEY UPDATE;
    IF EXISTS (
        SELECT FROM ranking_input_snapshot input
        JOIN ranking_conversation_stats_snapshot snapshot ON snapshot.conversation_id = input.conversation_id
          AND (snapshot.id = input.stats_snapshot_id OR snapshot.reused_input_snapshot_id = input.id)
        WHERE input.id = capture_id AND snapshot.deleted_at IS NULL
    ) OR EXISTS (
        SELECT FROM comparison_input_baseline baseline
        JOIN ranking_input_snapshot input ON input.id = baseline.input_snapshot_id
        JOIN ranking_conversation_stats_snapshot snapshot ON snapshot.conversation_id = input.conversation_id
          AND (snapshot.id = input.stats_snapshot_id OR snapshot.reused_input_snapshot_id = input.id)
        WHERE baseline.baseline_input_snapshot_id = capture_id AND snapshot.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_retained';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER comparison_input_baseline_retained
BEFORE DELETE ON comparison_input_baseline
FOR EACH ROW EXECUTE FUNCTION protect_retained_ranking_input_delete();
