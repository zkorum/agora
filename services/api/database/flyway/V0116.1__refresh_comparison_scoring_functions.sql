-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

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
      AND conversation.conversation_type = 'prioritizing';
$$;

CREATE OR REPLACE FUNCTION mark_ranking_scoring_input_dirty_from_inserted_comparisons()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation
    WHERE conversation.ranking_config_id = config.id
      AND conversation.id IN (
          SELECT DISTINCT result.conversation_id
          FROM inserted_comparisons comparison
          JOIN comparison_response result ON result.id = comparison.comparison_response_id
      );
    RETURN NULL;
END;
$$;

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
              SELECT comparison_response_id FROM inserted_comparisons
              UNION
              SELECT comparison_response_id FROM deleted_comparisons
          ) comparison
          JOIN comparison_response result ON result.id = comparison.comparison_response_id
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
          JOIN comparison_response result ON result.id = comparison.comparison_response_id
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
    target_revision bigint;
BEGIN
    FOR target_config_id IN
        SELECT config.id
        FROM ranking_conversation_config config
        JOIN conversation scope ON scope.ranking_config_id = config.id
        WHERE EXISTS (
            SELECT 1 FROM comparison_response result
            WHERE result.conversation_id = scope.id
              AND result.participant_id = NEW.id
        ) OR EXISTS (
            SELECT 1 FROM ranking_item item
            WHERE item.conversation_id = scope.id AND item.author_id = NEW.id
              AND NOT item.is_seed AND item.current_content_id IS NOT NULL
        )
        ORDER BY scope.id
    LOOP
        UPDATE ranking_conversation_config config
        SET scoring_input_revision = config.scoring_input_revision + 1,
            scoring_invalidation_revision = config.scoring_input_revision + 1,
            updated_at = now()
        WHERE config.id = target_config_id
        RETURNING scoring_input_revision INTO target_revision;
        UPDATE conversation
        SET closing_target_revision = target_revision
        WHERE ranking_config_id = target_config_id AND is_closed
          AND closed_finalized_at IS NULL;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ranking_scoring_input_deleted_user ON "user";
CREATE TRIGGER ranking_scoring_input_deleted_user
AFTER UPDATE OF is_deleted ON "user"
FOR EACH ROW
WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_user();
