-- Expand-phase backfill: numerical history is unchanged. Legacy account FKs
-- remain until a separately reviewed purge/contract rollout.
INSERT INTO conversation_participant (conversation_id, user_id)
SELECT DISTINCT o.conversation_id, v.author_id
FROM vote v JOIN opinion o ON o.id = v.opinion_id
UNION
SELECT DISTINCT r.conversation_id, gu.user_id
FROM opinion_group_user gu
JOIN opinion_group_candidate c ON c.id = gu.candidate_id
JOIN analysis_snapshot_result r ON r.id = c.snapshot_result_id
ON CONFLICT (conversation_id, user_id) DO NOTHING;

UPDATE vote v SET participant_id = p.id
FROM opinion o, conversation_participant p
WHERE o.id = v.opinion_id AND p.conversation_id = o.conversation_id
  AND p.user_id = v.author_id AND v.participant_id IS NULL;

UPDATE opinion_group_user gu SET participant_id = p.id
FROM opinion_group_candidate c, analysis_snapshot_result r, conversation_participant p
WHERE c.id = gu.candidate_id AND r.id = c.snapshot_result_id
  AND p.conversation_id = r.conversation_id AND p.user_id = gu.user_id
  AND gu.participant_id IS NULL;

-- Older API/import/analysis writers also need to bind the new identity during
-- the expand rollout. Cross-table scope checking cannot be expressed by a
-- normal FK because votes and memberships reach conversations indirectly.
CREATE FUNCTION bind_conversation_participant() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    scoped_conversation_id integer;
    account_id uuid;
    scoped_participant_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'vote' THEN
        SELECT conversation_id INTO STRICT scoped_conversation_id
        FROM opinion WHERE id = NEW.opinion_id;
        account_id := NEW.author_id;
        IF TG_OP = 'UPDATE' AND NEW.author_id <> OLD.author_id AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id THEN
            NEW.participant_id := NULL;
        END IF;
    ELSE
        SELECT r.conversation_id INTO STRICT scoped_conversation_id
        FROM opinion_group_candidate c
        JOIN analysis_snapshot_result r ON r.id = c.snapshot_result_id
        WHERE c.id = NEW.candidate_id;
        account_id := NEW.user_id;
        IF TG_OP = 'UPDATE' AND NEW.user_id <> OLD.user_id AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id THEN
            NEW.participant_id := NULL;
        END IF;
    END IF;

    -- Existing participants are the common path. Avoid a no-op UPDATE and its
    -- row version/WAL for every vote; only concurrent first creation upserts.
    SELECT id INTO scoped_participant_id FROM conversation_participant
    WHERE conversation_id = scoped_conversation_id AND user_id = account_id;
    IF scoped_participant_id IS NULL THEN
        INSERT INTO conversation_participant (conversation_id, user_id)
        VALUES (scoped_conversation_id, account_id)
        ON CONFLICT (conversation_id, user_id) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING id INTO scoped_participant_id;
    END IF;

    IF NEW.participant_id IS NOT NULL AND NEW.participant_id <> scoped_participant_id THEN
        RAISE EXCEPTION 'participant does not match the conversation/account' USING ERRCODE = '23514';
    END IF;
    NEW.participant_id := scoped_participant_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER vote_bind_conversation_participant
BEFORE INSERT OR UPDATE OF author_id, opinion_id, participant_id ON vote
FOR EACH ROW EXECUTE FUNCTION bind_conversation_participant();

-- Preserve the last published numerical frame for conversations closed before
-- this rollout; do not retrospectively recompute them for the new state fields.
UPDATE conversation c
SET closing_target_revision = latest.data_generation,
    closed_finalized_at = latest.activated_at
FROM (
    SELECT DISTINCT ON (v.conversation_id) v.conversation_id, a.data_generation, v.activated_at
    FROM conversation_view_snapshot v JOIN analysis_snapshot a ON a.id = v.analysis_snapshot_id
    WHERE v.activated_at IS NOT NULL
    ORDER BY v.conversation_id, v.created_at DESC, v.id DESC
) latest
WHERE c.id = latest.conversation_id AND c.is_closed AND c.conversation_type = 'polis';

UPDATE conversation c
SET closing_target_revision = latest.scoring_input_revision,
    closed_finalized_at = latest.created_at
FROM (
    SELECT DISTINCT ON (conversation_id) conversation_id, scoring_input_revision, created_at
    FROM ranking_conversation_stats_snapshot WHERE deleted_at IS NULL
    ORDER BY conversation_id, created_at DESC, id DESC
) latest
WHERE c.id = latest.conversation_id AND c.is_closed AND c.conversation_type = 'ranking';

-- Source-changing ranking triggers already advance this revision. Retarget only
-- pending closing work; finalized mathematics stays locked until reopening.
CREATE FUNCTION retarget_pending_ranking_close() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE conversation SET closing_target_revision = NEW.scoring_input_revision
    WHERE ranking_config_id = NEW.id AND is_closed AND closed_finalized_at IS NULL;
    RETURN NEW;
END;
$$;

CREATE TRIGGER retarget_pending_ranking_close
AFTER UPDATE OF scoring_input_revision ON ranking_conversation_config
FOR EACH ROW WHEN (OLD.scoring_input_revision IS DISTINCT FROM NEW.scoring_input_revision)
EXECUTE FUNCTION retarget_pending_ranking_close();

UPDATE polis_conversation_config config SET analysis_data_generation = analysis_data_generation + 1
FROM conversation c WHERE c.polis_config_id = config.id AND c.is_closed AND c.closed_finalized_at IS NULL;

UPDATE conversation c SET closing_target_revision = config.analysis_data_generation
FROM polis_conversation_config config
WHERE c.polis_config_id = config.id AND c.is_closed AND c.closed_finalized_at IS NULL;

UPDATE ranking_conversation_config config
SET scoring_input_revision = scoring_input_revision + 1, scoring_invalidation_revision = scoring_input_revision + 1
FROM conversation c WHERE c.ranking_config_id = config.id AND c.is_closed AND c.closed_finalized_at IS NULL;

CREATE TRIGGER opinion_group_user_bind_conversation_participant
BEFORE INSERT OR UPDATE OF user_id, candidate_id, participant_id ON opinion_group_user
FOR EACH ROW EXECUTE FUNCTION bind_conversation_participant();

-- AI providers run without DB locks. Publication and logical source mutations
-- share a short advisory fence, so a provider response cannot win after hiding
-- commits. Avoid user/opinion row-lock inversion with account/statement writes.
CREATE FUNCTION fence_opinion_ai_source_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    target_conversation_id integer;
BEGIN
    IF TG_TABLE_NAME = 'conversation' THEN
        target_conversation_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    ELSIF TG_TABLE_NAME = 'opinion' THEN
        target_conversation_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.conversation_id ELSE NEW.conversation_id END;
    ELSE
        SELECT conversation_id INTO STRICT target_conversation_id FROM opinion
        WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.opinion_id ELSE NEW.opinion_id END;
    END IF;
    PERFORM pg_advisory_xact_lock(1097617445, target_conversation_id);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER fence_opinion_ai_source_change
BEFORE INSERT OR UPDATE OF current_content_id, author_id, is_seed OR DELETE ON opinion
FOR EACH ROW EXECUTE FUNCTION fence_opinion_ai_source_change();

CREATE TRIGGER fence_conversation_ai_source_change
BEFORE UPDATE OF current_content_id OR DELETE ON conversation
FOR EACH ROW EXECUTE FUNCTION fence_opinion_ai_source_change();

CREATE TRIGGER fence_moderation_ai_source_change
BEFORE INSERT OR UPDATE OF moderation_action, deleted_at OR DELETE ON opinion_moderation
FOR EACH ROW EXECUTE FUNCTION fence_opinion_ai_source_change();

CREATE FUNCTION fence_account_ai_source_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    target_conversation_id integer;
BEGIN
    FOR target_conversation_id IN
        SELECT DISTINCT conversation_id FROM opinion WHERE author_id = NEW.id AND NOT is_seed
        ORDER BY conversation_id
    LOOP
        PERFORM pg_advisory_xact_lock(1097617445, target_conversation_id);
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER fence_account_ai_source_change
BEFORE UPDATE OF is_deleted ON "user"
FOR EACH ROW WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
EXECUTE FUNCTION fence_account_ai_source_change();

-- Refresh affected open output for the corrected row/column eligibility. Old
-- checkpoints and finalized closed frames retain their original computation.
UPDATE polis_conversation_config config SET analysis_data_generation = analysis_data_generation + 1
FROM conversation c
WHERE c.polis_config_id = config.id AND NOT c.is_closed AND NOT c.is_importing
  AND c.current_content_id IS NOT NULL AND (
      EXISTS (
          SELECT 1 FROM opinion o JOIN "user" u ON u.id = o.author_id
          WHERE o.conversation_id = c.id AND NOT o.is_seed AND u.is_deleted AND o.current_content_id IS NOT NULL
      ) OR EXISTS (
          SELECT 1 FROM vote v JOIN opinion o ON o.id = v.opinion_id JOIN "user" u ON u.id = v.author_id
          WHERE o.conversation_id = c.id AND u.is_deleted AND v.current_content_id IS NOT NULL
      ) OR EXISTS (
          SELECT 1 FROM opinion_moderation m JOIN opinion o ON o.id = m.opinion_id
          WHERE o.conversation_id = c.id AND m.deleted_at IS NOT NULL
      )
  );

INSERT INTO analysis_work_state (conversation_id, opinion_group_spec_id, dirty_since)
SELECT c.id, spec.id, now()
FROM conversation c CROSS JOIN (
    SELECT DISTINCT ON (key) id FROM opinion_group_spec ORDER BY key, version DESC
) spec
WHERE c.conversation_type = 'polis' AND c.current_content_id IS NOT NULL AND NOT c.is_importing
  AND c.closed_finalized_at IS NULL
ON CONFLICT (conversation_id, opinion_group_spec_id) DO NOTHING;
