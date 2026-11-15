-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Prepared source: scripts/prepare-comparison-retention-contract.sql

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
                 AND NOT EXISTS (SELECT FROM ranking_input_snapshot input WHERE input.stats_snapshot_id = snapshot.id)
           )
           OR EXISTS (
               SELECT FROM conversation scope
               JOIN ranking_conversation_config config ON config.id = scope.ranking_config_id
               WHERE scope.id = OLD.conversation_id AND config.current_ranking_score_id IS NOT NULL
                 AND NOT EXISTS (
                     SELECT FROM ranking_conversation_stats_snapshot snapshot
                     JOIN ranking_input_snapshot input ON input.stats_snapshot_id = snapshot.id
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

CREATE TRIGGER comparison_source_binding
BEFORE INSERT OR UPDATE OF participant_id, conversation_id, detached_at ON comparison_response
FOR EACH ROW EXECUTE FUNCTION enforce_comparison_source_binding();

-- Prepared captures commit before computation. Publication may attach a capture
-- once, but must not rewrite its numerical identity/provenance or move it later.
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
          AND NEW.sealed_at IS NOT NULL
          AND snapshot.participant_count = NEW.participant_count
          AND snapshot.vote_count = NEW.answer_count AND snapshot.item_count = NEW.item_count
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_publication_mismatch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ranking_input_binding
BEFORE INSERT OR UPDATE ON ranking_input_snapshot
FOR EACH ROW EXECUTE FUNCTION enforce_ranking_input_binding();

CREATE OR REPLACE FUNCTION reject_ranking_input_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_immutable';
END;
$$;
CREATE TRIGGER ranking_input_participant_immutable BEFORE UPDATE ON ranking_input_participant
FOR EACH ROW EXECUTE FUNCTION reject_ranking_input_update();
CREATE TRIGGER ranking_input_item_immutable BEFORE UPDATE ON ranking_input_item
FOR EACH ROW EXECUTE FUNCTION reject_ranking_input_update();
CREATE TRIGGER ranking_input_answer_immutable BEFORE UPDATE ON ranking_input_answer
FOR EACH ROW EXECUTE FUNCTION reject_ranking_input_update();

-- Serialize child insertion with sealing, including concurrent writers. A capture
-- commits whole and sealed before computation, not merely before publication.
CREATE OR REPLACE FUNCTION protect_ranking_input_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE capture_sealed_at timestamp;
BEGIN
    -- Transition tables check/lock each capture once per bulk statement, not once
    -- per task. A concurrent seal wins the lock or forces this insert to roll back.
    FOR capture_sealed_at IN
        SELECT input.sealed_at FROM ranking_input_snapshot input
        WHERE input.id IN (SELECT input_snapshot_id FROM inserted)
        ORDER BY input.id FOR NO KEY UPDATE
    LOOP
        IF capture_sealed_at IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_immutable';
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;
CREATE TRIGGER ranking_input_participant_build AFTER INSERT ON ranking_input_participant
REFERENCING NEW TABLE AS inserted FOR EACH STATEMENT EXECUTE FUNCTION protect_ranking_input_insert();
CREATE TRIGGER ranking_input_item_build AFTER INSERT ON ranking_input_item
REFERENCING NEW TABLE AS inserted FOR EACH STATEMENT EXECUTE FUNCTION protect_ranking_input_insert();
CREATE TRIGGER ranking_input_answer_build AFTER INSERT ON ranking_input_answer
REFERENCING NEW TABLE AS inserted FOR EACH STATEMENT EXECUTE FUNCTION protect_ranking_input_insert();

CREATE OR REPLACE FUNCTION require_sealed_ranking_input()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF EXISTS (SELECT FROM ranking_input_snapshot WHERE id = NEW.id AND sealed_at IS NULL) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_seal_required';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER ranking_input_seal_required
AFTER INSERT ON ranking_input_snapshot DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION require_sealed_ranking_input();

-- A future cleanup owner may remove unbound or tombstoned graphs, never evidence
-- still rooted in an active publication. This does not authorize a purge caller.
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
        JOIN ranking_conversation_stats_snapshot snapshot ON snapshot.id = input.stats_snapshot_id
        WHERE input.id = capture_id AND snapshot.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'ranking_input_retained';
    END IF;
    RETURN OLD;
END;
$$;
CREATE TRIGGER ranking_input_snapshot_retained BEFORE DELETE ON ranking_input_snapshot
FOR EACH ROW EXECUTE FUNCTION protect_retained_ranking_input_delete();
CREATE TRIGGER ranking_input_participant_retained BEFORE DELETE ON ranking_input_participant
FOR EACH ROW EXECUTE FUNCTION protect_retained_ranking_input_delete();
CREATE TRIGGER ranking_input_item_retained BEFORE DELETE ON ranking_input_item
FOR EACH ROW EXECUTE FUNCTION protect_retained_ranking_input_delete();
CREATE TRIGGER ranking_input_answer_retained BEFORE DELETE ON ranking_input_answer
FOR EACH ROW EXECUTE FUNCTION protect_retained_ranking_input_delete();

-- Legacy blobs have not been classified into an account-local scope. Do not let
-- absence of a resumable response bypass the shared provenance quarantine.
CREATE OR REPLACE FUNCTION protect_comparison_account_unlink()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL AND EXISTS (
        SELECT FROM ranking_score WHERE user_weights_snapshot IS NOT NULL
          AND user_weights_snapshot <> 'null'::jsonb
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'legacy_comparison_account_context';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER comparison_account_unlink
BEFORE UPDATE OF user_id ON conversation_participant
FOR EACH ROW EXECUTE FUNCTION protect_comparison_account_unlink();
