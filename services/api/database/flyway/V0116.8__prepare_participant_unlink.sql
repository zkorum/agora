-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Prepared source: scripts/prepare-participant-unlink-contract.sql

CREATE OR REPLACE FUNCTION bind_conversation_participant() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    scoped_conversation_id integer;
    account_id uuid;
    scoped_participant_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'vote' THEN
        SELECT conversation_id INTO STRICT scoped_conversation_id FROM opinion WHERE id = NEW.opinion_id;
        account_id := NEW.author_id;
        IF TG_OP = 'UPDATE' AND NEW.author_id IS DISTINCT FROM OLD.author_id
           AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id THEN
            NEW.participant_id := NULL;
        END IF;
    ELSE
        IF TG_OP = 'UPDATE' AND OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
            RAISE EXCEPTION 'detached historical membership cannot be reattached' USING ERRCODE = '23514';
        END IF;
        SELECT r.conversation_id INTO STRICT scoped_conversation_id
        FROM opinion_group_candidate c JOIN analysis_snapshot_result r ON r.id = c.snapshot_result_id
        WHERE c.id = NEW.candidate_id;
        account_id := NEW.user_id;
        IF account_id IS NULL THEN
            IF NEW.participant_id IS NULL OR NOT EXISTS (
                SELECT 1 FROM conversation_participant
                WHERE id = NEW.participant_id AND conversation_id = scoped_conversation_id
            ) THEN
                RAISE EXCEPTION 'detached membership requires its original participant' USING ERRCODE = '23514';
            END IF;
            IF TG_OP = 'UPDATE' AND NEW.participant_id IS DISTINCT FROM OLD.participant_id THEN
                RAISE EXCEPTION 'detachment cannot replace historical identity' USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END IF;
        IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id
           AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id THEN
            NEW.participant_id := NULL;
        END IF;
    END IF;
    SELECT id INTO scoped_participant_id FROM conversation_participant
    WHERE conversation_id = scoped_conversation_id AND user_id = account_id;
    IF scoped_participant_id IS NULL THEN
        INSERT INTO conversation_participant (conversation_id, user_id)
        VALUES (scoped_conversation_id, account_id)
        ON CONFLICT (conversation_id, user_id) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING id INTO scoped_participant_id;
    END IF;
    IF NEW.participant_id IS NOT NULL AND NEW.participant_id <> scoped_participant_id THEN
        RAISE EXCEPTION 'participant does not match conversation/account' USING ERRCODE = '23514';
    END IF;
    NEW.participant_id := scoped_participant_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_conversation_participant_association() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR (NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
        RAISE EXCEPTION 'participant scope/account association is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_conversation_participant_association
BEFORE UPDATE OF conversation_id, user_id ON conversation_participant
FOR EACH ROW EXECUTE FUNCTION protect_conversation_participant_association();
