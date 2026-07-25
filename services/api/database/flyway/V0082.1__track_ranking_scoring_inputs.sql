CREATE FUNCTION mark_ranking_scoring_input_dirty(target_conversation_id integer)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation
    WHERE conversation.id = target_conversation_id
      AND conversation.ranking_config_id = config.id
      AND conversation.conversation_type = 'ranking';
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_direct()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    new_conversation_id integer;
    old_conversation_id integer;
BEGIN
    new_conversation_id := (to_jsonb(NEW)->>TG_ARGV[0])::integer;
    old_conversation_id := (to_jsonb(OLD)->>TG_ARGV[0])::integer;
    IF new_conversation_id IS NOT NULL THEN
        PERFORM mark_ranking_scoring_input_dirty(new_conversation_id);
    END IF;
    IF old_conversation_id IS NOT NULL
       AND old_conversation_id IS DISTINCT FROM new_conversation_id THEN
        PERFORM mark_ranking_scoring_input_dirty(old_conversation_id);
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(config.conversation_id)
    FROM survey_config config
    WHERE config.id IN (NEW.survey_config_id, OLD.survey_config_id);
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_inserted_comparisons()
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
          JOIN maxdiff_result result ON result.id = comparison.maxdiff_result_id
      );
    RETURN NULL;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_updated_comparisons()
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

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_comparisons()
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
          FROM deleted_comparisons comparison
          JOIN maxdiff_result result ON result.id = comparison.maxdiff_result_id
      );
    RETURN NULL;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_external_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(item.conversation_id)
    FROM ranking_item item
    WHERE item.id IN (NEW.ranking_item_id, OLD.ranking_item_id);
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_question_option()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(config.conversation_id)
    FROM survey_question question
    JOIN survey_config config ON config.id = question.survey_config_id
    WHERE question.id IN (NEW.survey_question_id, OLD.survey_question_id);
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_question_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(config.conversation_id)
    FROM survey_question_content content
    JOIN survey_question question ON question.current_content_id = content.id
    JOIN survey_config config ON config.id = question.survey_config_id
    WHERE content.id IN (NEW.id, OLD.id);
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_answer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(response.conversation_id)
    FROM survey_response response
    WHERE response.id IN (NEW.survey_response_id, OLD.survey_response_id);
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_answer_option()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM mark_ranking_scoring_input_dirty(response.conversation_id)
    FROM survey_answer answer
    JOIN survey_response response ON response.id = answer.survey_response_id
    WHERE answer.id IN (NEW.survey_answer_id, OLD.survey_answer_id);
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_user()
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
            updated_at = now()
        WHERE config.id = target_config_id;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ranking_scoring_input_maxdiff_result_insert_delete
AFTER INSERT OR DELETE ON maxdiff_result
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_maxdiff_result_update
AFTER UPDATE OF participant_id, conversation_id ON maxdiff_result
FOR EACH ROW
WHEN ((OLD.participant_id, OLD.conversation_id) IS DISTINCT FROM (NEW.participant_id, NEW.conversation_id))
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_maxdiff_comparison_insert
AFTER INSERT ON maxdiff_comparison
REFERENCING NEW TABLE AS inserted_comparisons
FOR EACH STATEMENT
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_inserted_comparisons();

CREATE TRIGGER ranking_scoring_input_maxdiff_comparison_update
AFTER UPDATE ON maxdiff_comparison
REFERENCING OLD TABLE AS deleted_comparisons NEW TABLE AS inserted_comparisons
FOR EACH STATEMENT
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_updated_comparisons();

CREATE TRIGGER ranking_scoring_input_maxdiff_comparison_delete
AFTER DELETE ON maxdiff_comparison
REFERENCING OLD TABLE AS deleted_comparisons
FOR EACH STATEMENT
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_comparisons();

CREATE TRIGGER ranking_scoring_input_ranking_item_insert_delete
AFTER INSERT OR DELETE ON ranking_item
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_ranking_item_update
AFTER UPDATE OF slug_id, conversation_id, current_content_id, lifecycle_status ON ranking_item
FOR EACH ROW
WHEN ((OLD.slug_id, OLD.conversation_id, OLD.current_content_id, OLD.lifecycle_status) IS DISTINCT FROM (NEW.slug_id, NEW.conversation_id, NEW.current_content_id, NEW.lifecycle_status))
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_external_source_insert_delete
AFTER INSERT OR DELETE ON ranking_item_external_source
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_external_source();

CREATE TRIGGER ranking_scoring_input_external_source_update
AFTER UPDATE OF ranking_item_id, conversation_id, external_url ON ranking_item_external_source
FOR EACH ROW
WHEN ((OLD.ranking_item_id, OLD.conversation_id, OLD.external_url) IS DISTINCT FROM (NEW.ranking_item_id, NEW.conversation_id, NEW.external_url))
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_external_source();

CREATE TRIGGER ranking_scoring_input_survey_config
AFTER INSERT OR UPDATE OR DELETE ON survey_config
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_survey_response
AFTER INSERT OR UPDATE OR DELETE ON survey_response
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('conversation_id');

CREATE TRIGGER ranking_scoring_input_survey_question
AFTER INSERT OR UPDATE OR DELETE ON survey_question
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_question();

CREATE TRIGGER ranking_scoring_input_survey_question_content
AFTER UPDATE OF constraints, survey_question_id ON survey_question_content
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_question_content();

CREATE TRIGGER ranking_scoring_input_survey_question_option
AFTER INSERT OR UPDATE OR DELETE ON survey_question_option
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_question_option();

CREATE TRIGGER ranking_scoring_input_survey_answer
AFTER INSERT OR UPDATE OR DELETE ON survey_answer
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_answer();

CREATE TRIGGER ranking_scoring_input_survey_answer_option
AFTER INSERT OR UPDATE OR DELETE ON survey_answer_option
FOR EACH ROW EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_answer_option();

CREATE TRIGGER ranking_scoring_input_deleted_user
AFTER UPDATE OF is_deleted ON "user"
FOR EACH ROW
WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_from_deleted_user();

CREATE TRIGGER ranking_scoring_input_conversation_lifecycle
AFTER UPDATE OF is_closed ON conversation
FOR EACH ROW
WHEN (OLD.is_closed IS DISTINCT FROM NEW.is_closed)
EXECUTE FUNCTION mark_ranking_scoring_input_dirty_direct('id');
