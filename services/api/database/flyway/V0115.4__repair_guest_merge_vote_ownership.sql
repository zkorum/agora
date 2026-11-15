-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET lock_timeout = '5s';
SET TIME ZONE 'UTC';
SET search_path = public, pg_temp;
--> statement-breakpoint
-- Prepared source: scripts/repair-guest-merge-vote-ownership.sql

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM vote v
        JOIN vote_content content ON content.id = v.current_content_id
        JOIN opinion_content statement ON statement.id = content.opinion_content_id
        WHERE statement.opinion_id <> v.opinion_id
    ) THEN
        RAISE EXCEPTION 'Current vote content references a different statement; review before repair';
    END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_4() LANGUAGE plpgsql AS $batch$
DECLARE
    mb_cursor bigint;
    mb_lower bigint;
    mb_boundary bigint;
    mb_high_water bigint;
    mb_size integer := coalesce(nullif(current_setting('agora.migration_batch_size', true), ''), '5000')::integer;
    mb_pause_ms integer := coalesce(nullif(current_setting('agora.migration_batch_pause_ms', true), ''), '0')::integer;
BEGIN
    IF mb_size < 1 OR mb_size > 5000 THEN
        RAISE EXCEPTION 'migration_batch_size must be between 1 and 5000';
    END IF;
    IF mb_pause_ms < 0 OR mb_pause_ms > 1000 THEN
        RAISE EXCEPTION 'migration_batch_pause_ms must be between 0 and 1000';
    END IF;
    SELECT id INTO mb_high_water FROM vote ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM vote WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM vote
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM vote
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        WITH replacements AS (
    INSERT INTO vote_content (vote_id, opinion_content_id, vote, created_at)
    SELECT v.id, content.opinion_content_id, content.vote, content.created_at
    FROM vote v
    JOIN vote_content content ON content.id = v.current_content_id
    WHERE content.vote_id <> v.id AND (v.id >= mb_lower AND v.id <= mb_boundary)
    RETURNING id, vote_id
)
UPDATE vote v
SET current_content_id = replacements.id
FROM replacements
WHERE v.id = replacements.vote_id;
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_4();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_4();
--> statement-breakpoint
RESET lock_timeout;
RESET search_path;
RESET TIME ZONE;
