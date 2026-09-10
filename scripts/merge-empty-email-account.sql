-- Move the sole email credential of an empty account to an existing account.
-- Run this entire DO statement on the writer database (SQL editor or psql).
-- Edit only the configuration below. Read NOTICE output after the dry run,
-- optionally pin independently verified user IDs, then set dry_run := false.
-- With editor autocommit disabled, COMMIT is still required after a real run.
-- See merge-empty-email-account.md for conditions and session behavior.

DO $merge$
DECLARE
    -- Configuration: username is exact; email is normalized to lowercase.
    keep_username text := 'REPLACE_WITH_USERNAME';
    source_email text := 'REPLACE_WITH_EMAIL';
    dry_run boolean := true;
    -- SQL cannot inspect in-memory/Valkey work. Follow the maintenance procedure
    -- in the companion document before setting this operator assertion to true.
    writers_paused_and_buffers_drained boolean := false;
    expected_database text := NULL; -- Optional current_database() check.
    expected_keep_user_id uuid := NULL;
    expected_source_user_id uuid := NULL;
    require_keep_phone boolean := true;
    expected_phone_hash text := NULL; -- Optional full, peppered phone hash.
    expected_phone_calling_code text := NULL; -- Optional calling-code metadata.
    expected_phone_last_two_digits integer := NULL; -- Optional suffix metadata.
    -- These preferences may stay attached to the retired account. Use an empty
    -- array to require their absence too. Other user references always block.
    retained_preference_tables text[] := ARRAY[
        'user_display_language', 'user_spoken_languages'
    ];

    keep_user public."user"%ROWTYPE;
    source_user public."user"%ROWTYPE;
    source_email_id public.email.id%TYPE;
    source_user_id public."user".id%TYPE;
    reference record;
    reference_count bigint;
    blockers text[] := ARRAY[]::text[];
    moved_devices integer;
    changed_rows integer;
    -- Drizzle interprets timestamp-without-time-zone values as UTC. Match the
    -- API's nowZeroMs() precision so expired sessions are immediately invalid.
    changed_at public.device.session_expiry%TYPE :=
        date_trunc('second', clock_timestamp() AT TIME ZONE 'UTC');
BEGIN
    PERFORM set_config('lock_timeout', '5s', true);
    IF writers_paused_and_buffers_drained IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Maintenance required: pause writers and drain buffers before running this utility';
    END IF;
    IF expected_database IS NOT NULL AND current_database() <> expected_database THEN
        RAISE EXCEPTION 'Connected database does not match expected_database';
    END IF;
    IF pg_is_in_recovery() THEN
        RAISE EXCEPTION 'Run this utility on the writer database';
    END IF;
    IF keep_username = 'REPLACE_WITH_USERNAME' OR btrim(keep_username) = ''
        OR source_email = 'REPLACE_WITH_EMAIL' OR btrim(source_email) = ''
        OR keep_username IS NULL OR source_email IS NULL OR dry_run IS NULL
        OR require_keep_phone IS NULL THEN
        RAISE EXCEPTION 'Set keep_username, source_email, and non-null boolean options';
    END IF;
    source_email := lower(btrim(source_email));
    IF expected_phone_last_two_digits NOT BETWEEN 0 AND 99 THEN
        RAISE EXCEPTION 'expected_phone_last_two_digits must be between 0 and 99';
    END IF;
    IF retained_preference_tables IS NULL OR NOT retained_preference_tables <@
        ARRAY['user_display_language', 'user_spoken_languages']::text[] THEN
        RAISE EXCEPTION 'Only language preference tables may be retained';
    END IF;

    SELECT * INTO STRICT keep_user FROM public."user" WHERE username = keep_username;
    SELECT id, user_id INTO STRICT source_email_id, source_user_id
    FROM public.email WHERE email = source_email AND NOT is_deleted;
    -- Match the API's user-lock ordering and prevent new FK references while
    -- checking whether the source is empty. Recheck credentials after locking.
    PERFORM id FROM public."user"
    WHERE id IN (keep_user.id, source_user_id) ORDER BY id FOR UPDATE;
    SELECT * INTO STRICT keep_user FROM public."user" WHERE id = keep_user.id;
    SELECT * INTO STRICT source_user FROM public."user" WHERE id = source_user_id;
    IF keep_user.username <> keep_username OR keep_user.is_deleted OR source_user.is_deleted THEN
        RAISE EXCEPTION 'Both accounts must be active and the retained username must still match';
    END IF;
    IF (expected_keep_user_id IS NOT NULL AND keep_user.id <> expected_keep_user_id)
        OR (expected_source_user_id IS NOT NULL AND source_user.id <> expected_source_user_id) THEN
        RAISE EXCEPTION 'Resolved account IDs do not match the configured IDs';
    END IF;
    PERFORM id FROM public.email
    WHERE user_id IN (keep_user.id, source_user.id) ORDER BY id FOR UPDATE;
    IF NOT EXISTS (
        SELECT 1 FROM public.email
        WHERE id = source_email_id AND user_id = source_user.id
            AND email = source_email AND NOT is_deleted AND type = 'primary'
    ) THEN
        RAISE EXCEPTION 'Source email must still be an active primary credential on the source account';
    END IF;
    PERFORM id FROM public.phone WHERE user_id = keep_user.id ORDER BY id FOR UPDATE;
    IF (require_keep_phone OR expected_phone_hash IS NOT NULL
        OR expected_phone_calling_code IS NOT NULL OR expected_phone_last_two_digits IS NOT NULL)
        AND NOT EXISTS (
            SELECT 1 FROM public.phone
            WHERE user_id = keep_user.id AND NOT is_deleted
                AND (expected_phone_hash IS NULL OR phone_hash = expected_phone_hash)
                AND (expected_phone_calling_code IS NULL OR "countryCallingCode" = expected_phone_calling_code)
                AND (expected_phone_last_two_digits IS NULL OR last_two_digits = expected_phone_last_two_digits)
        ) THEN
        RAISE EXCEPTION 'Retained account has no active phone matching the configured conditions';
    END IF;
    IF keep_user.id = source_user.id THEN
        RAISE NOTICE 'Already linked: configured email belongs to the active retained account; identity and phone checks passed';
        RETURN;
    END IF;
    IF (SELECT count(*) FROM public.email WHERE user_id = source_user.id) <> 1 THEN
        RAISE EXCEPTION 'Source must have exactly one email row, including deleted credentials';
    END IF;
    IF EXISTS (SELECT 1 FROM public.email WHERE user_id = keep_user.id AND NOT is_deleted) THEN
        RAISE EXCEPTION 'Retained account already has an active email; resolve that conflict separately';
    END IF;
    IF source_user.is_site_moderator OR source_user.is_site_org_admin OR source_user.is_imported
        OR source_user.active_conversation_count <> 0 OR source_user.total_conversation_count <> 0
        OR source_user.total_opinion_count <> 0 THEN
        RAISE EXCEPTION 'Source has elevated roles, imported status, or nonzero content counters';
    END IF;

    -- Discover actual deployed FKs rather than assuming a fixed list of activity
    -- tables. This also catches additional credentials and new feature tables.
    FOR reference IN
        SELECT DISTINCT ns.nspname AS schema_name, tbl.relname AS table_name,
            col.attname AS column_name
        FROM pg_constraint fk
        JOIN pg_class tbl ON tbl.oid = fk.conrelid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        CROSS JOIN LATERAL generate_subscripts(fk.conkey, 1) AS key(position)
        JOIN pg_attribute col ON col.attrelid = fk.conrelid AND col.attnum = fk.conkey[key.position]
        JOIN pg_attribute target ON target.attrelid = fk.confrelid AND target.attnum = fk.confkey[key.position]
        WHERE fk.contype = 'f' AND fk.confrelid = 'public."user"'::regclass AND target.attname = 'id'
        ORDER BY schema_name, table_name, column_name
    LOOP
        IF reference.schema_name = 'public' AND reference.column_name = 'user_id'
            AND (reference.table_name IN ('email', 'device')
                OR reference.table_name = ANY(retained_preference_tables)) THEN
            CONTINUE;
        END IF;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = $1',
            reference.schema_name, reference.table_name, reference.column_name)
        INTO reference_count USING source_user.id;
        IF reference_count > 0 THEN
            blockers := array_append(blockers, format('%I.%I.%I: %s row(s)',
                reference.schema_name, reference.table_name, reference.column_name, reference_count));
        END IF;
    END LOOP;
    IF cardinality(blockers) > 0 THEN
        RAISE EXCEPTION 'Source account is not empty: %', array_to_string(blockers, '; ');
    END IF;

    RAISE NOTICE 'Account identity, credential, and empty-source checks passed';

    -- The nested block rolls back the actual writes in dry-run mode, exercising
    -- deployed constraints/triggers as well as the preconditions above.
    BEGIN
        UPDATE public.email SET user_id = keep_user.id, updated_at = changed_at
        WHERE id = source_email_id AND user_id = source_user.id AND NOT is_deleted;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows <> 1 THEN
            RAISE EXCEPTION 'Expected to transfer exactly one email, transferred %', changed_rows;
        END IF;

        UPDATE public.device
        SET user_id = keep_user.id, session_expiry = changed_at, updated_at = changed_at
        WHERE user_id = source_user.id;
        GET DIAGNOSTICS moved_devices = ROW_COUNT;

        -- OTP attempts are intentionally not FK-linked to users. Invalidate
        -- pending attempts that could otherwise finish against the old identity.
        UPDATE public.auth_attempt_email SET code_expiry = changed_at, updated_at = changed_at
        WHERE user_id = source_user.id OR email = source_email;
        UPDATE public.auth_attempt_phone SET code_expiry = changed_at, updated_at = changed_at
        WHERE user_id = source_user.id;

        UPDATE public."user"
        SET is_deleted = true, deleted_at = changed_at, updated_at = changed_at
        WHERE id = source_user.id;
        INSERT INTO public.realtime_event_outbox (event_type, payload, created_at)
        VALUES ('auth_state_changed', jsonb_build_object(
            'userIds', jsonb_build_array(source_user.id, keep_user.id),
            'reason', 'identity_changed'
        ), changed_at);

        -- Force deferred FK/constraint triggers before a dry-run rollback;
        -- otherwise dry run could pass while the real transaction cannot commit.
        SET CONSTRAINTS ALL IMMEDIATE;

        IF dry_run THEN
            RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'dry run rollback';
        END IF;
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN
        RAISE NOTICE 'DRY RUN passed; all merge writes rolled back. Would move and expire % device(s).', moved_devices;
    END;
    IF NOT dry_run THEN
        RAISE NOTICE 'MERGED. Moved and expired % device(s). Commit if editor autocommit is disabled.', moved_devices;
    END IF;
END
$merge$;
