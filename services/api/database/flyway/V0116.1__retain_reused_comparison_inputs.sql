-- PostgreSQL functions/triggers are not representable in the Drizzle schema.
-- Install after V0116's generated reused-input reference and before new writers.
SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

CREATE OR REPLACE FUNCTION enforce_comparison_source_binding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.participant_id IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_source_account_required';
        END IF;
        RETURN NEW;
    END IF;
    IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR (OLD.participant_id IS NULL AND NEW.participant_id IS DISTINCT FROM OLD.participant_id)
       OR (OLD.detached_at IS NOT NULL AND NEW.detached_at IS DISTINCT FROM OLD.detached_at) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_source_no_reattachment';
    END IF;
    IF OLD.participant_id IS NOT NULL AND NEW.participant_id IS NULL THEN
        IF NOT EXISTS (SELECT FROM "user" WHERE id = OLD.participant_id AND is_deleted AND purge_started_at IS NOT NULL)
           OR EXISTS (SELECT FROM conversation WHERE id = OLD.conversation_id AND is_closed AND closed_finalized_at IS NULL)
           OR EXISTS (SELECT FROM ranking_score WHERE user_weights_snapshot IS NOT NULL AND user_weights_snapshot <> 'null'::jsonb)
           OR EXISTS (
               SELECT FROM ranking_conversation_stats_snapshot snapshot
               WHERE snapshot.conversation_id = OLD.conversation_id AND snapshot.deleted_at IS NULL
                 AND NOT EXISTS (
                     SELECT FROM ranking_input_snapshot input
                     WHERE input.conversation_id = snapshot.conversation_id AND input.sealed_at IS NOT NULL
                       AND (input.stats_snapshot_id = snapshot.id OR input.id = snapshot.reused_input_snapshot_id)
                 )
           )
           OR EXISTS (
               SELECT FROM conversation scope
               JOIN ranking_conversation_config config ON config.id = scope.ranking_config_id
               WHERE scope.id = OLD.conversation_id AND config.current_ranking_score_id IS NOT NULL
                 AND NOT EXISTS (
                     SELECT FROM ranking_conversation_stats_snapshot snapshot
                     JOIN ranking_input_snapshot input ON input.conversation_id = snapshot.conversation_id
                       AND input.sealed_at IS NOT NULL
                       AND (input.stats_snapshot_id = snapshot.id OR input.id = snapshot.reused_input_snapshot_id)
                     WHERE snapshot.conversation_id = scope.id AND snapshot.deleted_at IS NULL
                       AND snapshot.ranking_score_id = config.current_ranking_score_id
                 )
           )
           OR NEW.ranking IS NOT NULL OR NEW.is_complete
           OR NEW.comparisons <> '[]'::jsonb
           OR EXISTS (SELECT FROM comparison_answer WHERE comparison_response_id = OLD.id AND deleted_at IS NULL)
           OR EXISTS (SELECT FROM comparison_user_entity_score WHERE comparison_response_id = OLD.id AND deleted_at IS NULL) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'comparison_source_unlink_not_ready';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_ranking_input_binding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' AND (NEW.sealed_at IS NOT NULL OR NEW.stats_snapshot_id IS NOT NULL) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_build_before_seal';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.id, NEW.conversation_id, NEW.comparison_method, NEW.scoring_input_revision,
            NEW.algorithm_version, NEW.solidago_version, NEW.pipeline_config, NEW.participant_count, NEW.item_count, NEW.answer_count, NEW.created_at)
           IS DISTINCT FROM
           (OLD.id, OLD.conversation_id, OLD.comparison_method, OLD.scoring_input_revision,
            OLD.algorithm_version, OLD.solidago_version, OLD.pipeline_config, OLD.participant_count, OLD.item_count, OLD.answer_count, OLD.created_at)
           OR (OLD.stats_snapshot_id IS NOT NULL AND NEW.stats_snapshot_id IS DISTINCT FROM OLD.stats_snapshot_id)
           OR (OLD.sealed_at IS NOT NULL AND NEW.sealed_at IS DISTINCT FROM OLD.sealed_at) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_immutable';
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL THEN
        IF (SELECT count(*) FROM ranking_input_participant WHERE input_snapshot_id = NEW.id) <> NEW.participant_count
           OR (SELECT count(*) FROM ranking_input_item WHERE input_snapshot_id = NEW.id) <> NEW.item_count
           OR (SELECT count(*) FROM ranking_input_answer WHERE input_snapshot_id = NEW.id) <> NEW.answer_count
           OR (SELECT count(DISTINCT participant_index) FROM ranking_input_answer WHERE input_snapshot_id = NEW.id) <> NEW.participant_count
           OR EXISTS (SELECT FROM ranking_input_participant WHERE input_snapshot_id = NEW.id AND participant_index >= NEW.participant_count)
           OR EXISTS (SELECT FROM ranking_input_item WHERE input_snapshot_id = NEW.id AND position >= NEW.item_count)
           OR EXISTS (
               SELECT FROM ranking_input_answer WHERE input_snapshot_id = NEW.id
               GROUP BY participant_index HAVING max(position) <> count(*) - 1
           )
           OR EXISTS (
               SELECT FROM ranking_input_answer answer,
                   unnest(answer.effective_candidate_set) candidate
               WHERE answer.input_snapshot_id = NEW.id AND NOT EXISTS (
                   SELECT FROM ranking_input_item item
                   WHERE item.input_snapshot_id = NEW.id AND item.item_slug_id = candidate
               )
           ) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_incomplete';
        END IF;
    END IF;
    IF NEW.stats_snapshot_id IS NOT NULL AND NOT EXISTS (
        SELECT FROM ranking_conversation_stats_snapshot snapshot
        WHERE snapshot.id = NEW.stats_snapshot_id AND snapshot.conversation_id = NEW.conversation_id
          AND snapshot.scoring_input_revision = NEW.scoring_input_revision
          AND snapshot.reused_input_snapshot_id IS NULL
          AND NEW.sealed_at IS NOT NULL
          AND snapshot.participant_count = NEW.participant_count
          AND snapshot.vote_count = NEW.answer_count AND snapshot.item_count = NEW.item_count
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_publication_mismatch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_ranking_reused_input_binding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.reused_input_snapshot_id IS DISTINCT FROM OLD.reused_input_snapshot_id THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_reused_input_immutable';
    END IF;
    IF NEW.reused_input_snapshot_id IS NOT NULL AND NOT EXISTS (
        SELECT FROM ranking_input_snapshot input
        JOIN ranking_conversation_stats_snapshot source ON source.id = input.stats_snapshot_id
          AND source.conversation_id = input.conversation_id
        WHERE input.id = NEW.reused_input_snapshot_id
          AND input.conversation_id = NEW.conversation_id AND input.sealed_at IS NOT NULL
          AND source.id <> NEW.id AND source.reused_input_snapshot_id IS NULL
          AND NEW.is_closed AND input.scoring_input_revision < NEW.scoring_input_revision
          AND source.scoring_input_revision = input.scoring_input_revision
          AND NEW.ranking_score_id IS NOT DISTINCT FROM source.ranking_score_id
          AND NEW.item_count = input.item_count AND NEW.item_count = source.item_count
          AND NEW.vote_count = input.answer_count AND NEW.vote_count = source.vote_count
          AND NEW.participant_count = input.participant_count AND NEW.participant_count = source.participant_count
          AND NEW.total_item_count = source.total_item_count
          AND NEW.total_vote_count = source.total_vote_count
          AND NEW.total_participant_count = source.total_participant_count
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_reused_input_publication_mismatch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ranking_stats_reused_input_binding
BEFORE INSERT OR UPDATE ON ranking_conversation_stats_snapshot
FOR EACH ROW EXECUTE FUNCTION enforce_ranking_reused_input_binding();

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
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_retained';
    END IF;
    RETURN OLD;
END;
$$;
