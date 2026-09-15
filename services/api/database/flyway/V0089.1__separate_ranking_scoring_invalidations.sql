-- Appended votes can follow a coherent snapshot; edits, removals, and changes
-- to item/participant eligibility must invalidate computations already in flight.
UPDATE ranking_conversation_config
SET scoring_invalidation_revision = scoring_input_revision;

CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_dirty(target_conversation_id integer)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        scoring_invalidation_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation
    WHERE conversation.id = target_conversation_id
      AND conversation.ranking_config_id = config.id
      AND conversation.conversation_type = 'ranking';
$$;

CREATE FUNCTION mark_ranking_scoring_input_from_result()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ranking_conversation_config config
        SET scoring_input_revision = config.scoring_input_revision + 1,
            updated_at = now()
        FROM conversation
        WHERE conversation.id = NEW.conversation_id
          AND conversation.ranking_config_id = config.id;
        RETURN NEW;
    END IF;
    PERFORM mark_ranking_scoring_input_dirty(OLD.conversation_id);
    RETURN OLD;
END;
$$;

DROP TRIGGER ranking_scoring_input_maxdiff_result_insert_delete ON maxdiff_result;
CREATE TRIGGER ranking_scoring_input_maxdiff_result_insert_delete
AFTER INSERT OR DELETE ON maxdiff_result
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_from_result();

CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_dirty_from_updated_comparisons()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        scoring_invalidation_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation
    WHERE conversation.ranking_config_id = config.id
      AND conversation.id IN (
          SELECT DISTINCT result.conversation_id
          FROM (
              SELECT maxdiff_result_id FROM inserted_comparisons
              UNION
              SELECT maxdiff_result_id FROM deleted_comparisons
          ) comparison
          JOIN maxdiff_result result ON result.id = comparison.maxdiff_result_id
      );
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_comparisons()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        scoring_invalidation_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation
    WHERE conversation.ranking_config_id = config.id
      AND conversation.id IN (
          SELECT DISTINCT result.conversation_id
          FROM deleted_comparisons comparison
          JOIN maxdiff_result result ON result.id = comparison.maxdiff_result_id
      );
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    target_config_id integer;
BEGIN
    FOR target_config_id IN
        SELECT config.id
        FROM ranking_conversation_config config
        JOIN conversation ON conversation.ranking_config_id = config.id
        WHERE conversation.conversation_type = 'ranking'
          AND EXISTS (
              SELECT 1
              FROM maxdiff_result result
              WHERE result.conversation_id = conversation.id
                AND result.participant_id = NEW.id
          )
        ORDER BY conversation.id
    LOOP
        UPDATE ranking_conversation_config config
        SET scoring_input_revision = config.scoring_input_revision + 1,
            scoring_invalidation_revision = config.scoring_input_revision + 1,
            updated_at = now()
        WHERE config.id = target_config_id;
    END LOOP;
    RETURN NEW;
END;
$$;
