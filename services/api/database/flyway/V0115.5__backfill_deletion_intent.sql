-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET lock_timeout = '5s';
SET TIME ZONE 'UTC';
SET search_path = public, pg_temp;
--> statement-breakpoint
-- Prepared source: scripts/prepare-deletion-intent-backfill.sql

CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_1() LANGUAGE plpgsql AS $batch$
DECLARE
    mb_cursor uuid;
    mb_lower uuid;
    mb_boundary uuid;
    mb_high_water uuid;
    mb_size integer := coalesce(nullif(current_setting('agora.migration_batch_size', true), ''), '5000')::integer;
    mb_pause_ms integer := coalesce(nullif(current_setting('agora.migration_batch_pause_ms', true), ''), '0')::integer;
BEGIN
    IF mb_size < 1 OR mb_size > 5000 THEN
        RAISE EXCEPTION 'migration_batch_size must be between 1 and 5000';
    END IF;
    IF mb_pause_ms < 0 OR mb_pause_ms > 1000 THEN
        RAISE EXCEPTION 'migration_batch_pause_ms must be between 0 and 1000';
    END IF;
    SELECT id INTO mb_high_water FROM "user" ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM "user" WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM "user"
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM "user"
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE "user" SET deleted_at = clock_timestamp()
WHERE (is_deleted AND deleted_at IS NULL) AND ("user".id >= mb_lower AND "user".id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_1();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_1();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_2() LANGUAGE plpgsql AS $batch$
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
    SELECT id INTO mb_high_water FROM opinion ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM opinion WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM opinion
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM opinion
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE opinion source SET account_hidden_at = clock_timestamp()
FROM "user" account
WHERE (source.author_id = account.id AND account.is_deleted
  AND NOT source.is_seed AND source.account_hidden_at IS NULL) AND (source.id >= mb_lower AND source.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_2();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_2();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_3() LANGUAGE plpgsql AS $batch$
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
    SELECT id INTO mb_high_water FROM ranking_item ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM ranking_item WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM ranking_item
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM ranking_item
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE ranking_item source SET account_hidden_at = clock_timestamp()
FROM "user" account
WHERE (source.author_id = account.id AND account.is_deleted
  AND NOT source.is_seed AND source.account_hidden_at IS NULL) AND (source.id >= mb_lower AND source.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_3();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_3();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_4() LANGUAGE plpgsql AS $batch$
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
    SELECT id INTO mb_high_water FROM conversation ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM conversation WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM conversation
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM conversation
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE conversation child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM project parent
WHERE (child.project_id = parent.id AND parent.deleted_at IS NOT NULL
  AND parent.retired_for_account_deletion_at IS NULL
  AND child.deleted_at IS NULL) AND (child.id >= mb_lower AND child.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_4();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_4();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_5() LANGUAGE plpgsql AS $batch$
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
    SELECT id INTO mb_high_water FROM opinion ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM opinion WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM opinion
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM opinion
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE opinion child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM conversation parent
WHERE (child.conversation_id = parent.id AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL) AND (child.id >= mb_lower AND child.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_5();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_5();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_6() LANGUAGE plpgsql AS $batch$
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
    SELECT id INTO mb_high_water FROM ranking_item ORDER BY id DESC LIMIT 1;
    IF mb_high_water IS NULL THEN RETURN; END IF;
    LOOP
        IF mb_cursor IS NULL THEN
            SELECT id INTO mb_lower FROM ranking_item WHERE id <= mb_high_water ORDER BY id LIMIT 1;
        ELSE
            SELECT id INTO mb_lower FROM ranking_item
            WHERE id > mb_cursor AND id <= mb_high_water ORDER BY id LIMIT 1;
        END IF;
        EXIT WHEN mb_lower IS NULL;
        SELECT batch.id INTO mb_boundary FROM (
            SELECT id FROM ranking_item
            WHERE id >= mb_lower AND id <= mb_high_water
            ORDER BY id LIMIT mb_size
        ) batch ORDER BY batch.id DESC LIMIT 1;
        EXIT WHEN mb_boundary IS NULL;
        UPDATE ranking_item child SET current_content_id = NULL, deleted_at = clock_timestamp()
FROM conversation parent
WHERE (child.conversation_id = parent.id AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL) AND (child.id >= mb_lower AND child.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_6();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_6();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.agora_upgrade_0115_5_7() LANGUAGE plpgsql AS $batch$
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
        UPDATE vote source SET retired_at = clock_timestamp()
FROM "user" account
WHERE (source.author_id = account.id AND account.deletion_reason = 'guest_merge'
  AND source.current_content_id IS NULL AND source.retired_at IS NULL) AND (source.id >= mb_lower AND source.id <= mb_boundary);
        mb_cursor := mb_boundary;
        COMMIT;
        IF mb_pause_ms > 0 THEN PERFORM pg_sleep(mb_pause_ms / 1000.0); END IF;
    END LOOP;
END;
$batch$;
--> statement-breakpoint
CALL public.agora_upgrade_0115_5_7();
--> statement-breakpoint
DROP PROCEDURE public.agora_upgrade_0115_5_7();
--> statement-breakpoint
RESET lock_timeout;
RESET search_path;
RESET TIME ZONE;
