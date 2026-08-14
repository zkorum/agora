-- The Amplify project ran three conversations per locality, but collected the
-- same demographic survey in only one conversation for nine of the twelve
-- localities. Clone each locality's normalized survey to its sibling
-- conversations and fill missing local answers from the participant's latest
-- valid project answer.
--
-- V0085.1 must run first and normalize all nine reviewed exact-age questions.

SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE amplify_survey_copy_seed (
    target_conversation_slug_id varchar(8) PRIMARY KEY,
    source_conversation_slug_id varchar(8) NOT NULL
);

-- Keep each locality's facilitator-authored wording and options. ULAKHOL is the
-- reviewed fallback for the three localities that never had a survey.
INSERT INTO amplify_survey_copy_seed (
    target_conversation_slug_id,
    source_conversation_slug_id
)
VALUES
    -- ULAKHOL
    ('5TPUXkM', '5TPUXkM'),
    ('XpkLj30', '5TPUXkM'),
    ('eJT6ZW0', '5TPUXkM'),
    -- Bolot Mambetov
    ('QsAZeX0', 'QsAZeX0'),
    ('FRbuxIU', 'QsAZeX0'),
    ('v92tJNU', 'QsAZeX0'),
    -- Kun-Chygysh
    ('aec0Sjw', 'aec0Sjw'),
    ('PxGlkDY', 'aec0Sjw'),
    ('P1rcH2c', 'aec0Sjw'),
    -- Barskoon
    ('H6gbkhU', 'H6gbkhU'),
    ('PZMUmUk', 'H6gbkhU'),
    ('WsUk3jc', 'H6gbkhU'),
    -- Kurshab
    ('zi4uZiM', 'zi4uZiM'),
    ('JvP8Xu4', 'zi4uZiM'),
    ('FN5Fzc4', 'zi4uZiM'),
    -- Kyzyl-Oktyabr
    ('03jEIs4', '03jEIs4'),
    ('G6JveGg', '03jEIs4'),
    ('VH2D1Yw', '03jEIs4'),
    -- Yusupova
    ('-feZxwA', '-feZxwA'),
    ('i2wgdBI', '-feZxwA'),
    ('rOnE6Zs', '-feZxwA'),
    -- Kurmanzhan-Datka
    ('KsAV21g', 'KsAV21g'),
    ('uWxnRdI', 'KsAV21g'),
    ('pm95ZMQ', 'KsAV21g'),
    -- Toguz-Bulak
    ('tPyNgW8', 'tPyNgW8'),
    ('aKle2t0', 'tPyNgW8'),
    ('AhYwDYc', 'tPyNgW8'),
    -- Batken, using the reviewed ULAKHOL fallback
    ('hcAmBBo', '5TPUXkM'),
    ('P_oTU9Q', '5TPUXkM'),
    ('UId_3wQ', '5TPUXkM'),
    -- Iskhak-Polotkhan, using the reviewed ULAKHOL fallback
    ('Vd_KRyo', '5TPUXkM'),
    ('yerDVos', '5TPUXkM'),
    ('2RP_Pkk', '5TPUXkM'),
    -- Kyzyl-Kiya, using the reviewed ULAKHOL fallback
    ('Q8zRS6Y', '5TPUXkM'),
    ('6tUM3kE', '5TPUXkM'),
    ('6MA0k6I', '5TPUXkM');

CREATE TEMP TABLE amplify_source_question_seed (
    conversation_slug_id varchar(8) PRIMARY KEY,
    age_question_slug_id varchar(8) NOT NULL UNIQUE,
    gender_question_slug_id varchar(8) NOT NULL UNIQUE
);

INSERT INTO amplify_source_question_seed (
    conversation_slug_id,
    age_question_slug_id,
    gender_question_slug_id
)
VALUES
    ('5TPUXkM', 'PGa-urM', '9S8rVPE'),
    ('QsAZeX0', 'NJkXnms', 'PgyQ-sE'),
    ('aec0Sjw', '-qizfkg', 'bWFLLtE'),
    ('H6gbkhU', 'k3MnqSs', 'YPmraJk'),
    ('zi4uZiM', 'fDHRwTo', 'h9BP2y0'),
    ('03jEIs4', 'bf9kf6A', 'PyQZsDs'),
    ('-feZxwA', 'xR0httM', '1JUpz8I'),
    ('KsAV21g', 'E67oikM', 'ffXW4QQ'),
    ('tPyNgW8', 'eHcznts', 'hkzc-zA');

CREATE TEMP TABLE amplify_gender_option_seed (
    question_slug_id varchar(8) NOT NULL,
    option_slug_id varchar(8) PRIMARY KEY,
    canonical_value varchar(20) NOT NULL,
    UNIQUE (question_slug_id, canonical_value)
);

INSERT INTO amplify_gender_option_seed (
    question_slug_id,
    option_slug_id,
    canonical_value
)
VALUES
    ('9S8rVPE', 'K7IEwuI', 'female'),
    ('9S8rVPE', 'TLRB6IA', 'male'),
    ('9S8rVPE', 'ngA2AvU', 'prefer_not_to_say'),
    ('PgyQ-sE', 'JACXF04', 'female'),
    ('PgyQ-sE', '7EZgQ2E', 'male'),
    ('PgyQ-sE', '-JuFaBs', 'prefer_not_to_say'),
    ('bWFLLtE', 'cGdGTXQ', 'female'),
    ('bWFLLtE', 'VoDsSIY', 'male'),
    ('bWFLLtE', '7qy-Kog', 'prefer_not_to_say'),
    ('YPmraJk', 'UjJRn_E', 'female'),
    ('YPmraJk', '3sT1KpE', 'male'),
    ('YPmraJk', 'RgDVg3Q', 'prefer_not_to_say'),
    ('h9BP2y0', 'DG8HI1c', 'female'),
    ('h9BP2y0', 'mNllkZI', 'male'),
    ('PyQZsDs', 'xVWq24o', 'female'),
    ('PyQZsDs', 'gM0lym8', 'male'),
    ('1JUpz8I', 'lbr6xUA', 'female'),
    ('1JUpz8I', 'p2qPfIo', 'male'),
    ('ffXW4QQ', '7M_3BSA', 'female'),
    ('ffXW4QQ', 'OPSYi_0', 'male'),
    ('hkzc-zA', 'uXO6sY4', 'female'),
    ('hkzc-zA', 'rZyVL2U', 'male');

CREATE TEMP TABLE amplify_backfill_enabled AS
SELECT project.id AS project_id
FROM project
WHERE project.slug = 'sfcg-amplify-kg'
  AND project.deleted_at IS NULL;

CREATE TEMP TABLE amplify_project_conversations AS
SELECT
    conversation.id AS conversation_id,
    conversation.slug_id AS conversation_slug_id,
    conversation.conversation_type,
    conversation.polis_config_id,
    conversation.ranking_config_id
FROM project
JOIN conversation
    ON conversation.project_id = project.id
WHERE project.slug = 'sfcg-amplify-kg'
  AND project.deleted_at IS NULL
  AND conversation.current_content_id IS NOT NULL
  AND conversation.is_importing = false
ORDER BY conversation.id
FOR NO KEY UPDATE OF conversation;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled)
       AND (SELECT COUNT(*) FROM amplify_project_conversations) <> 36 THEN
        RAISE EXCEPTION 'Amplify survey backfill expected exactly 36 active conversations';
    END IF;

    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) AND (
        EXISTS (
        SELECT conversation_slug_id
        FROM amplify_project_conversations
        EXCEPT
        SELECT target_conversation_slug_id
        FROM amplify_survey_copy_seed
        ) OR EXISTS (
        SELECT target_conversation_slug_id
        FROM amplify_survey_copy_seed
        EXCEPT
        SELECT conversation_slug_id
        FROM amplify_project_conversations
        )
    ) THEN
        RAISE EXCEPTION 'Amplify survey copy plan does not exactly match the project conversations';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_project_conversations
        WHERE conversation_type NOT IN ('polis', 'ranking')
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unsupported conversation type';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_project_conversations
        JOIN conversation
            ON conversation.id = amplify_project_conversations.conversation_id
        WHERE conversation.is_closed = false
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill requires every target conversation to be closed';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) THEN
        EXECUTE 'LOCK TABLE
            survey_config,
            survey_question,
            survey_question_content,
            survey_question_content_translation,
            survey_question_option,
            survey_question_option_content,
            survey_question_option_content_translation,
            survey_response,
            survey_answer,
            survey_answer_option
        IN SHARE ROW EXCLUSIVE MODE';
    END IF;
END
$$;

CREATE TEMP TABLE amplify_source_questions AS
SELECT
    conversation.conversation_id,
    conversation.conversation_slug_id,
    config.id AS survey_config_id,
    config.current_revision AS survey_config_revision,
    config.is_optional,
    age_question.id AS age_question_id,
    age_question.current_semantic_version AS age_semantic_version,
    gender_question.id AS gender_question_id,
    gender_question.current_semantic_version AS gender_semantic_version
FROM amplify_source_question_seed seed
JOIN amplify_project_conversations conversation
    ON conversation.conversation_slug_id = seed.conversation_slug_id
JOIN survey_config config
    ON config.conversation_id = conversation.conversation_id
   AND config.deleted_at IS NULL
JOIN survey_question age_question
    ON age_question.slug_id = seed.age_question_slug_id
   AND age_question.survey_config_id = config.id
   AND age_question.current_content_id IS NOT NULL
JOIN survey_question gender_question
    ON gender_question.slug_id = seed.gender_question_slug_id
   AND gender_question.survey_config_id = config.id
   AND gender_question.current_content_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled)
       AND (SELECT COUNT(*) FROM amplify_source_questions) <> 9 THEN
        RAISE EXCEPTION 'Amplify survey backfill could not resolve all nine source surveys';
    END IF;

    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) AND (
        SELECT COUNT(*)
        FROM survey_config config
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = config.conversation_id
        WHERE config.deleted_at IS NULL
    ) <> 9 THEN
        RAISE EXCEPTION 'Amplify survey backfill expected only the nine reviewed active source surveys';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_source_questions source
        JOIN survey_question gender_question
            ON gender_question.id = source.gender_question_id
        JOIN survey_question_content gender_content
            ON gender_content.id = gender_question.current_content_id
        WHERE gender_question.question_type <> 'choice'
           OR gender_question.display_order <> 1
           OR gender_content.constraints <> '{"type":"choice","minSelections":1,"maxSelections":1}'::jsonb
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unexpected gender/sex question shape';
    END IF;

    IF EXISTS (
        SELECT source.survey_config_id
        FROM amplify_source_questions source
        JOIN survey_question question
            ON question.survey_config_id = source.survey_config_id
           AND question.current_content_id IS NOT NULL
        GROUP BY
            source.survey_config_id,
            source.age_question_id,
            source.gender_question_id
        HAVING COUNT(*) <> 2
            OR COUNT(*) FILTER (
                WHERE question.id IN (source.age_question_id, source.gender_question_id)
            ) <> 2
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unreviewed source survey question';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_source_questions
        WHERE is_optional = true
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unexpectedly optional source survey';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_source_questions source
        JOIN survey_response response
            ON response.conversation_id = source.conversation_id
           AND response.withdrawn_at IS NULL
        JOIN survey_answer answer
            ON answer.survey_response_id = response.id
           AND answer.survey_question_id IN (
               source.age_question_id,
               source.gender_question_id
           )
           AND answer.deleted_at IS NULL
        JOIN survey_question question
            ON question.id = answer.survey_question_id
        WHERE answer.answered_question_semantic_version <> question.current_semantic_version
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an active stale local demographic answer';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_survey_copy_seed seed
        JOIN amplify_project_conversations target
            ON target.conversation_slug_id = seed.target_conversation_slug_id
        JOIN survey_response response
            ON response.conversation_id = target.conversation_id
        WHERE seed.target_conversation_slug_id <> seed.source_conversation_slug_id
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found a legacy response in a surveyless target';
    END IF;

    -- V0085.1 must already have converted every reviewed exact-age question.
    IF EXISTS (
        SELECT 1
        FROM amplify_source_questions source
        JOIN survey_question age_question
            ON age_question.id = source.age_question_id
        JOIN survey_question_content age_content
            ON age_content.id = age_question.current_content_id
        WHERE age_question.question_type <> 'choice'
           OR age_question.display_order <> 0
           OR age_content.constraints <> '{"type":"choice","minSelections":1,"maxSelections":1}'::jsonb
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill requires V0085.1 to run first';
    END IF;
END
$$;

-- Demographic aggregate blocks must retain small-count privacy after exact age
-- is converted from non-aggregated free text to choice buckets.
UPDATE survey_question question
SET
    is_public_aggregate_suppression_enabled = true,
    updated_at = now()
FROM amplify_source_questions source
WHERE question.id IN (source.age_question_id, source.gender_question_id)
  AND question.is_public_aggregate_suppression_enabled = false;

UPDATE survey_config config
SET
    current_revision = config.current_revision + 1,
    is_optional = true,
    updated_at = now()
FROM amplify_source_questions source
WHERE config.id = source.survey_config_id;

-- Re-resolve source questions after the exact-age conversion.
CREATE TEMP TABLE amplify_current_source_questions AS
SELECT
    source.conversation_id,
    source.conversation_slug_id,
    source.survey_config_id,
    source.is_optional,
    age_question.id AS age_question_id,
    gender_question.id AS gender_question_id
FROM amplify_source_questions source
JOIN survey_question age_question
    ON age_question.id = source.age_question_id
   AND age_question.question_type = 'choice'
   AND age_question.current_content_id IS NOT NULL
JOIN survey_question gender_question
    ON gender_question.id = source.gender_question_id
   AND gender_question.question_type = 'choice'
   AND gender_question.current_content_id IS NOT NULL;

CREATE TEMP TABLE amplify_age_option_values AS
SELECT
    question.conversation_id,
    question.age_question_id AS question_id,
    option.id AS option_id,
    option.display_order,
    content.option_text AS canonical_value
FROM amplify_current_source_questions question
JOIN survey_question_option option
    ON option.survey_question_id = question.age_question_id
   AND option.current_content_id IS NOT NULL
JOIN survey_question_option_content content
    ON content.id = option.current_content_id
WHERE content.option_text IN ('<18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+');

CREATE TEMP TABLE amplify_gender_option_values AS
SELECT
    question.conversation_id,
    question.gender_question_id AS question_id,
    option.id AS option_id,
    seed.canonical_value
FROM amplify_current_source_questions question
JOIN survey_question gender_question
    ON gender_question.id = question.gender_question_id
JOIN amplify_gender_option_seed seed
    ON seed.question_slug_id = gender_question.slug_id
JOIN survey_question_option option
    ON option.slug_id = seed.option_slug_id
   AND option.survey_question_id = gender_question.id
   AND option.current_content_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) AND EXISTS (
        SELECT question_id
        FROM amplify_age_option_values
        GROUP BY question_id
        HAVING COUNT(*) <> 7
    ) OR (
        EXISTS (SELECT 1 FROM amplify_backfill_enabled)
        AND (SELECT COUNT(DISTINCT question_id) FROM amplify_age_option_values) <> 9
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill did not resolve seven age groups for every source survey';
    END IF;

    IF EXISTS (
        SELECT source.age_question_id
        FROM amplify_current_source_questions source
        JOIN survey_question_option option
            ON option.survey_question_id = source.age_question_id
           AND option.current_content_id IS NOT NULL
        GROUP BY source.age_question_id
        HAVING COUNT(*) <> 7
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unreviewed active age-group option';
    END IF;

    IF EXISTS (
        SELECT question_id, canonical_value
        FROM amplify_age_option_values
        GROUP BY question_id, canonical_value
        HAVING COUNT(*) <> 1
    ) OR EXISTS (
        SELECT question_id
        FROM amplify_age_option_values
        GROUP BY question_id
        HAVING COUNT(DISTINCT canonical_value) <> 7
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found a duplicate or missing canonical age group';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_age_option_values
        WHERE display_order <> CASE canonical_value
            WHEN '<18' THEN 0
            WHEN '18-24' THEN 1
            WHEN '25-34' THEN 2
            WHEN '35-44' THEN 3
            WHEN '45-54' THEN 4
            WHEN '55-64' THEN 5
            WHEN '65+' THEN 6
        END
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an invalid age-group display order';
    END IF;

    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) AND EXISTS (
        SELECT question_id
        FROM amplify_gender_option_values
        GROUP BY question_id
        HAVING COUNT(*) NOT IN (2, 3)
           OR COUNT(*) FILTER (WHERE canonical_value = 'female') <> 1
           OR COUNT(*) FILTER (WHERE canonical_value = 'male') <> 1
    ) OR (
        EXISTS (SELECT 1 FROM amplify_backfill_enabled)
        AND (SELECT COUNT(DISTINCT question_id) FROM amplify_gender_option_values) <> 9
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill did not resolve every reviewed gender/sex option';
    END IF;

    IF EXISTS (
        SELECT source.gender_question_id
        FROM amplify_current_source_questions source
        JOIN survey_question_option option
            ON option.survey_question_id = source.gender_question_id
           AND option.current_content_id IS NOT NULL
        LEFT JOIN amplify_gender_option_values mapped
            ON mapped.question_id = source.gender_question_id
           AND mapped.option_id = option.id
        GROUP BY source.gender_question_id
        HAVING COUNT(*) <> COUNT(mapped.option_id)
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unreviewed active gender/sex option';
    END IF;
END
$$;

CREATE TEMP TABLE amplify_copy_targets AS
SELECT
    target.conversation_id AS target_conversation_id,
    target.conversation_slug_id AS target_conversation_slug_id,
    source.conversation_id AS source_conversation_id,
    source.survey_config_id AS source_survey_config_id
FROM amplify_survey_copy_seed seed
JOIN amplify_project_conversations target
    ON target.conversation_slug_id = seed.target_conversation_slug_id
JOIN amplify_current_source_questions source
    ON source.conversation_slug_id = seed.source_conversation_slug_id
WHERE target.conversation_id <> source.conversation_id;

CREATE TEMP TABLE amplify_inserted_configs AS
WITH inserted AS (
    INSERT INTO survey_config (
        conversation_id,
        current_revision,
        is_optional,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT
        target.target_conversation_id,
        1,
        true,
        now(),
        now(),
        NULL
    FROM amplify_copy_targets target
    RETURNING id, conversation_id
)
SELECT id AS survey_config_id, conversation_id
FROM inserted;

CREATE TEMP TABLE amplify_clone_question_base AS
SELECT
    target.target_conversation_id,
    config.survey_config_id AS target_survey_config_id,
    source_question.id AS source_question_id,
    source_question.display_order,
    CASE
        WHEN source_question.id = source.age_question_id THEN 'age_group'
        ELSE 'gender'
    END AS dimension
FROM amplify_copy_targets target
JOIN amplify_inserted_configs config
    ON config.conversation_id = target.target_conversation_id
JOIN amplify_current_source_questions source
    ON source.conversation_id = target.source_conversation_id
JOIN survey_question source_question
    ON source_question.id IN (source.age_question_id, source.gender_question_id);

CREATE TEMP TABLE amplify_clone_question_seed AS
WITH candidates AS (
    SELECT
        base.*,
        attempt.number AS attempt,
        'q' || substr(
            md5(
                'amplify-survey-question:' ||
                base.target_conversation_id::text ||
                ':' ||
                base.source_question_id::text ||
                ':' ||
                attempt.number::text
            ),
            1,
            7
        ) AS question_slug_id
    FROM amplify_clone_question_base base
    CROSS JOIN generate_series(0, 255) AS attempt(number)
),
available AS (
    SELECT
        candidate.*,
        COUNT(*) OVER (PARTITION BY candidate.question_slug_id) AS generated_collision_count
    FROM candidates candidate
    LEFT JOIN survey_question existing
        ON existing.slug_id = candidate.question_slug_id
    WHERE existing.id IS NULL
),
ranked AS (
    SELECT
        available.*,
        ROW_NUMBER() OVER (
            PARTITION BY available.target_conversation_id, available.source_question_id
            ORDER BY available.attempt
        ) AS slug_rank
    FROM available
    WHERE available.generated_collision_count = 1
)
SELECT
    target_conversation_id,
    target_survey_config_id,
    source_question_id,
    display_order,
    dimension,
    question_slug_id
FROM ranked
WHERE slug_rank = 1;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled)
       AND (SELECT COUNT(*) FROM amplify_clone_question_seed) <> 54 THEN
        RAISE EXCEPTION 'Amplify survey backfill expected 54 cloned questions';
    END IF;

    IF EXISTS (
        SELECT question_slug_id
        FROM amplify_clone_question_seed
        GROUP BY question_slug_id
        HAVING COUNT(*) > 1
    ) OR EXISTS (
        SELECT 1
        FROM amplify_clone_question_seed seed
        JOIN survey_question existing
            ON existing.slug_id = seed.question_slug_id
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill could not allocate unique question slugs';
    END IF;
END
$$;

INSERT INTO survey_question (
    slug_id,
    survey_config_id,
    conversation_id,
    question_type,
    choice_display,
    current_content_id,
    current_semantic_version,
    display_order,
    is_required,
    is_public_aggregate_suppression_enabled,
    created_at,
    updated_at
)
SELECT
    seed.question_slug_id,
    seed.target_survey_config_id,
    seed.target_conversation_id,
    source.question_type,
    source.choice_display,
    NULL,
    1,
    source.display_order,
    source.is_required,
    true,
    now(),
    now()
FROM amplify_clone_question_seed seed
JOIN survey_question source
    ON source.id = seed.source_question_id;

CREATE TEMP TABLE amplify_cloned_questions AS
SELECT
    seed.target_conversation_id,
    seed.target_survey_config_id,
    seed.source_question_id,
    target.id AS target_question_id,
    seed.dimension
FROM amplify_clone_question_seed seed
JOIN survey_question target
    ON target.slug_id = seed.question_slug_id;

CREATE TEMP TABLE amplify_cloned_question_contents AS
WITH inserted AS (
    INSERT INTO survey_question_content (
        survey_question_id,
        question_text,
        constraints,
        source_language_code,
        source_raw_language_code,
        source_language_provider,
        source_language_confidence,
        created_at
    )
    SELECT
        cloned.target_question_id,
        source_content.question_text,
        source_content.constraints,
        source_content.source_language_code,
        source_content.source_raw_language_code,
        source_content.source_language_provider,
        source_content.source_language_confidence,
        now()
    FROM amplify_cloned_questions cloned
    JOIN survey_question source_question
        ON source_question.id = cloned.source_question_id
    JOIN survey_question_content source_content
        ON source_content.id = source_question.current_content_id
    RETURNING id, survey_question_id
)
SELECT id AS content_id, survey_question_id AS target_question_id
FROM inserted;

INSERT INTO survey_question_content_translation (
    survey_question_content_id,
    display_language_code,
    translated_question_text,
    source_language_code,
    source_raw_language_code,
    source_language_provider,
    source_language_confidence,
    created_at,
    updated_at
)
SELECT
    target_content.content_id,
    source_translation.display_language_code,
    source_translation.translated_question_text,
    source_translation.source_language_code,
    source_translation.source_raw_language_code,
    source_translation.source_language_provider,
    source_translation.source_language_confidence,
    now(),
    now()
FROM amplify_cloned_questions cloned
JOIN amplify_cloned_question_contents target_content
    ON target_content.target_question_id = cloned.target_question_id
JOIN survey_question source_question
    ON source_question.id = cloned.source_question_id
JOIN survey_question_content_translation source_translation
    ON source_translation.survey_question_content_id = source_question.current_content_id;

UPDATE survey_question target
SET current_content_id = content.content_id
FROM amplify_cloned_question_contents content
WHERE target.id = content.target_question_id;

CREATE TEMP TABLE amplify_clone_option_base AS
SELECT
    cloned.target_conversation_id,
    cloned.target_question_id,
    cloned.source_question_id,
    source_option.id AS source_option_id,
    source_option.display_order
FROM amplify_cloned_questions cloned
JOIN survey_question_option source_option
    ON source_option.survey_question_id = cloned.source_question_id
   AND source_option.current_content_id IS NOT NULL;

CREATE TEMP TABLE amplify_clone_option_seed AS
WITH candidates AS (
    SELECT
        base.*,
        attempt.number AS attempt,
        'o' || substr(
            md5(
                'amplify-survey-option:' ||
                base.target_conversation_id::text ||
                ':' ||
                base.source_option_id::text ||
                ':' ||
                attempt.number::text
            ),
            1,
            7
        ) AS option_slug_id
    FROM amplify_clone_option_base base
    CROSS JOIN generate_series(0, 255) AS attempt(number)
),
available AS (
    SELECT
        candidate.*,
        COUNT(*) OVER (PARTITION BY candidate.option_slug_id) AS generated_collision_count
    FROM candidates candidate
    LEFT JOIN survey_question_option existing
        ON existing.slug_id = candidate.option_slug_id
    WHERE existing.id IS NULL
),
ranked AS (
    SELECT
        available.*,
        ROW_NUMBER() OVER (
            PARTITION BY available.target_question_id, available.source_option_id
            ORDER BY available.attempt
        ) AS slug_rank
    FROM available
    WHERE available.generated_collision_count = 1
)
SELECT
    target_conversation_id,
    target_question_id,
    source_question_id,
    source_option_id,
    display_order,
    option_slug_id
FROM ranked
WHERE slug_rank = 1;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM amplify_clone_option_seed)
        <> (SELECT COUNT(*) FROM amplify_clone_option_base) THEN
        RAISE EXCEPTION 'Amplify survey backfill could not allocate every cloned option slug';
    END IF;

    IF EXISTS (
        SELECT option_slug_id
        FROM amplify_clone_option_seed
        GROUP BY option_slug_id
        HAVING COUNT(*) > 1
    ) OR EXISTS (
        SELECT 1
        FROM amplify_clone_option_seed seed
        JOIN survey_question_option existing
            ON existing.slug_id = seed.option_slug_id
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill could not allocate unique cloned option slugs';
    END IF;
END
$$;

INSERT INTO survey_question_option (
    slug_id,
    survey_question_id,
    current_content_id,
    display_order,
    created_at,
    updated_at
)
SELECT
    seed.option_slug_id,
    seed.target_question_id,
    NULL,
    seed.display_order,
    now(),
    now()
FROM amplify_clone_option_seed seed;

CREATE TEMP TABLE amplify_cloned_options AS
SELECT
    seed.target_conversation_id,
    seed.target_question_id,
    seed.source_question_id,
    seed.source_option_id,
    target.id AS target_option_id
FROM amplify_clone_option_seed seed
JOIN survey_question_option target
    ON target.slug_id = seed.option_slug_id;

CREATE TEMP TABLE amplify_cloned_option_contents AS
WITH inserted AS (
    INSERT INTO survey_question_option_content (
        survey_question_option_id,
        option_text,
        source_language_code,
        source_raw_language_code,
        source_language_provider,
        source_language_confidence,
        created_at
    )
    SELECT
        cloned.target_option_id,
        source_content.option_text,
        source_content.source_language_code,
        source_content.source_raw_language_code,
        source_content.source_language_provider,
        source_content.source_language_confidence,
        now()
    FROM amplify_cloned_options cloned
    JOIN survey_question_option source_option
        ON source_option.id = cloned.source_option_id
    JOIN survey_question_option_content source_content
        ON source_content.id = source_option.current_content_id
    RETURNING id, survey_question_option_id
)
SELECT id AS content_id, survey_question_option_id AS target_option_id
FROM inserted;

INSERT INTO survey_question_option_content_translation (
    survey_question_option_content_id,
    display_language_code,
    translated_option_text,
    source_language_code,
    source_raw_language_code,
    source_language_provider,
    source_language_confidence,
    created_at,
    updated_at
)
SELECT
    target_content.content_id,
    source_translation.display_language_code,
    source_translation.translated_option_text,
    source_translation.source_language_code,
    source_translation.source_raw_language_code,
    source_translation.source_language_provider,
    source_translation.source_language_confidence,
    now(),
    now()
FROM amplify_cloned_options cloned
JOIN amplify_cloned_option_contents target_content
    ON target_content.target_option_id = cloned.target_option_id
JOIN survey_question_option source_option
    ON source_option.id = cloned.source_option_id
JOIN survey_question_option_content_translation source_translation
    ON source_translation.survey_question_option_content_id = source_option.current_content_id;

UPDATE survey_question_option target
SET current_content_id = content.content_id
FROM amplify_cloned_option_contents content
WHERE target.id = content.target_option_id;

CREATE TEMP TABLE amplify_all_questions AS
SELECT
    source.conversation_id,
    source.age_question_id AS question_id,
    'age_group'::text AS dimension
FROM amplify_current_source_questions source
UNION ALL
SELECT
    source.conversation_id,
    source.gender_question_id AS question_id,
    'gender'::text AS dimension
FROM amplify_current_source_questions source
UNION ALL
SELECT
    cloned.target_conversation_id,
    cloned.target_question_id,
    cloned.dimension
FROM amplify_cloned_questions cloned;

CREATE TEMP TABLE amplify_all_option_values AS
SELECT
    value.conversation_id,
    value.question_id,
    value.option_id,
    'age_group'::text AS dimension,
    value.canonical_value
FROM amplify_age_option_values value
UNION ALL
SELECT
    value.conversation_id,
    value.question_id,
    value.option_id,
    'gender'::text AS dimension,
    value.canonical_value
FROM amplify_gender_option_values value
UNION ALL
SELECT
    cloned.target_conversation_id,
    cloned.target_question_id,
    cloned.target_option_id,
    question.dimension,
    source_value.canonical_value
FROM amplify_cloned_options cloned
JOIN amplify_cloned_questions question
    ON question.target_question_id = cloned.target_question_id
JOIN (
    SELECT question_id, option_id, canonical_value
    FROM amplify_age_option_values
    UNION ALL
    SELECT question_id, option_id, canonical_value
    FROM amplify_gender_option_values
) source_value
    ON source_value.question_id = cloned.source_question_id
   AND source_value.option_id = cloned.source_option_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled)
       AND (SELECT COUNT(*) FROM amplify_all_questions) <> 72 THEN
        RAISE EXCEPTION 'Amplify survey backfill expected two questions in all 36 conversations';
    END IF;

    IF EXISTS (
        SELECT conversation_id, dimension
        FROM amplify_all_questions
        GROUP BY conversation_id, dimension
        HAVING COUNT(*) <> 1
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found duplicate demographic dimensions';
    END IF;

    IF EXISTS (
        SELECT config.id
        FROM survey_config config
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = config.conversation_id
        JOIN survey_question question
            ON question.survey_config_id = config.id
           AND question.current_content_id IS NOT NULL
        LEFT JOIN amplify_all_questions reviewed
            ON reviewed.conversation_id = conversation.conversation_id
           AND reviewed.question_id = question.id
        WHERE config.deleted_at IS NULL
        GROUP BY config.id
        HAVING COUNT(*) <> 2
            OR COUNT(reviewed.question_id) <> 2
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an unexpected final survey question';
    END IF;

    IF EXISTS (
        SELECT question.conversation_id
        FROM amplify_all_questions question
        JOIN survey_question survey_question
            ON survey_question.id = question.question_id
        WHERE survey_question.is_public_aggregate_suppression_enabled = false
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill left demographic suppression disabled';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM survey_config config
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = config.conversation_id
        WHERE config.deleted_at IS NULL
          AND config.is_optional = false
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill left a demographic survey required';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT answer.id
        FROM amplify_current_source_questions source
        JOIN amplify_all_questions question
            ON question.conversation_id = source.conversation_id
        JOIN survey_response response
            ON response.conversation_id = source.conversation_id
           AND response.withdrawn_at IS NULL
        JOIN survey_answer answer
            ON answer.survey_response_id = response.id
           AND answer.survey_question_id = question.question_id
           AND answer.deleted_at IS NULL
        JOIN survey_question current_question
            ON current_question.id = answer.survey_question_id
           AND answer.answered_question_semantic_version = current_question.current_semantic_version
        LEFT JOIN survey_answer_option answer_option
            ON answer_option.survey_answer_id = answer.id
           AND answer_option.deleted_at IS NULL
        LEFT JOIN amplify_all_option_values mapped
            ON mapped.conversation_id = source.conversation_id
           AND mapped.question_id = question.question_id
           AND mapped.option_id = answer_option.survey_question_option_id
           AND mapped.dimension = question.dimension
        GROUP BY
            answer.id,
            answer.text_value_html,
            answer.text_value_plain_text
        HAVING answer.text_value_html IS NOT NULL
            OR answer.text_value_plain_text IS NOT NULL
            OR COUNT(answer_option.id) > 1
            OR COUNT(answer_option.id) <> COUNT(mapped.option_id)
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found an invalid, textual, or unmapped active demographic answer';
    END IF;
END
$$;

-- Capture valid source values before creating target responses. Existing local
-- target answers always win; latest valid project value is used only when the
-- target dimension has no active local answer.
CREATE TEMP TABLE amplify_source_value_candidates AS
SELECT
    response.participant_id,
    question.dimension,
    option_value.canonical_value,
    response.id AS response_id,
    answer.id AS answer_id,
    response.updated_at AS response_updated_at,
    answer.updated_at AS answer_updated_at
FROM amplify_current_source_questions source
JOIN amplify_all_questions question
    ON question.conversation_id = source.conversation_id
JOIN survey_response response
    ON response.conversation_id = source.conversation_id
   AND response.withdrawn_at IS NULL
JOIN "user" participant
    ON participant.id = response.participant_id
   AND participant.is_deleted = false
JOIN survey_answer answer
    ON answer.survey_response_id = response.id
   AND answer.survey_question_id = question.question_id
   AND answer.deleted_at IS NULL
JOIN survey_question current_question
    ON current_question.id = answer.survey_question_id
   AND answer.answered_question_semantic_version = current_question.current_semantic_version
JOIN survey_answer_option answer_option
    ON answer_option.survey_answer_id = answer.id
   AND answer_option.deleted_at IS NULL
JOIN amplify_all_option_values option_value
    ON option_value.conversation_id = source.conversation_id
   AND option_value.question_id = question.question_id
   AND option_value.option_id = answer_option.survey_question_option_id
   AND option_value.dimension = question.dimension;

DO $$
BEGIN
    IF EXISTS (
        SELECT answer_id
        FROM amplify_source_value_candidates
        GROUP BY answer_id
        HAVING COUNT(*) <> 1
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill found a non-single-choice demographic answer';
    END IF;
END
$$;

CREATE TEMP TABLE amplify_latest_values AS
SELECT DISTINCT ON (participant_id, dimension)
    participant_id,
    dimension,
    canonical_value,
    response_id AS source_response_id,
    answer_id AS source_answer_id
FROM amplify_source_value_candidates
ORDER BY
    participant_id,
    dimension,
    answer_updated_at DESC,
    response_updated_at DESC,
    response_id DESC,
    answer_id DESC;

CREATE TEMP TABLE amplify_target_participants AS
SELECT DISTINCT
    conversation.conversation_id,
    vote.author_id AS participant_id
FROM amplify_project_conversations conversation
JOIN opinion
    ON opinion.conversation_id = conversation.conversation_id
   AND opinion.current_content_id IS NOT NULL
JOIN vote
    ON vote.opinion_id = opinion.id
   AND vote.current_content_id IS NOT NULL
JOIN "user" participant
    ON participant.id = vote.author_id
   AND participant.is_deleted = false
LEFT JOIN opinion_moderation moderation
    ON moderation.opinion_id = opinion.id
   AND moderation.deleted_at IS NULL
WHERE conversation.conversation_type = 'polis'
  AND moderation.id IS NULL
UNION
SELECT DISTINCT
    conversation.conversation_id,
    result.participant_id
FROM amplify_project_conversations conversation
JOIN maxdiff_result result
    ON result.conversation_id = conversation.conversation_id
JOIN maxdiff_comparison comparison
    ON comparison.maxdiff_result_id = result.id
   AND comparison.deleted_at IS NULL
JOIN "user" participant
    ON participant.id = result.participant_id
   AND participant.is_deleted = false
WHERE conversation.conversation_type = 'ranking';

CREATE TEMP TABLE amplify_merge_candidates AS
SELECT
    participant.conversation_id,
    participant.participant_id,
    question.question_id,
    latest.dimension,
    latest.canonical_value,
    target_option.option_id,
    latest.source_response_id,
    latest.source_answer_id
FROM amplify_target_participants participant
JOIN amplify_latest_values latest
    ON latest.participant_id = participant.participant_id
JOIN amplify_all_questions question
    ON question.conversation_id = participant.conversation_id
   AND question.dimension = latest.dimension
LEFT JOIN survey_response existing_response
    ON existing_response.conversation_id = participant.conversation_id
   AND existing_response.participant_id = participant.participant_id
LEFT JOIN amplify_all_option_values target_option
    ON target_option.conversation_id = participant.conversation_id
   AND target_option.question_id = question.question_id
   AND target_option.dimension = latest.dimension
   AND target_option.canonical_value = latest.canonical_value
WHERE existing_response.withdrawn_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM survey_answer existing_answer
      WHERE existing_answer.survey_response_id = existing_response.id
        AND existing_answer.survey_question_id = question.question_id
        AND existing_answer.deleted_at IS NULL
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM amplify_merge_candidates
        WHERE option_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill cannot represent a participant latest value in a preserved target survey';
    END IF;
END
$$;

CREATE TEMP TABLE amplify_planned_answers AS
SELECT
    candidate.conversation_id,
    candidate.participant_id,
    candidate.question_id,
    candidate.dimension,
    candidate.option_id,
    candidate.source_response_id,
    candidate.source_answer_id
FROM amplify_merge_candidates candidate
WHERE candidate.option_id IS NOT NULL;

CREATE TEMP TABLE amplify_planned_responses AS
SELECT DISTINCT
    planned.conversation_id,
    planned.participant_id
FROM amplify_planned_answers planned
LEFT JOIN survey_response existing
    ON existing.conversation_id = planned.conversation_id
   AND existing.participant_id = planned.participant_id
WHERE existing.id IS NULL;

INSERT INTO survey_response (
    participant_id,
    conversation_id,
    completed_at,
    withdrawn_at,
    created_at,
    updated_at
)
SELECT
    planned.participant_id,
    planned.conversation_id,
    NULL,
    NULL,
    now(),
    now()
FROM amplify_planned_responses planned;

CREATE TEMP TABLE amplify_inserted_answers AS
WITH inserted AS (
    INSERT INTO survey_answer (
        survey_response_id,
        conversation_id,
        survey_question_id,
        answered_question_semantic_version,
        text_value_html,
        text_value_plain_text,
        deleted_at,
        created_at,
        updated_at
    )
    SELECT
        response.id,
        planned.conversation_id,
        planned.question_id,
        question.current_semantic_version,
        NULL,
        NULL,
        NULL,
        now(),
        now()
    FROM amplify_planned_answers planned
    JOIN survey_response response
        ON response.conversation_id = planned.conversation_id
       AND response.participant_id = planned.participant_id
       AND response.withdrawn_at IS NULL
    JOIN survey_question question
        ON question.id = planned.question_id
    RETURNING id, survey_response_id, survey_question_id
)
SELECT
    id AS answer_id,
    survey_response_id,
    survey_question_id
FROM inserted;

INSERT INTO survey_answer_option (
    survey_answer_id,
    survey_question_id,
    survey_question_option_id,
    deleted_at
)
SELECT
    inserted.answer_id,
    inserted.survey_question_id,
    planned.option_id,
    NULL
FROM amplify_inserted_answers inserted
JOIN survey_response response
    ON response.id = inserted.survey_response_id
JOIN amplify_planned_answers planned
    ON planned.conversation_id = response.conversation_id
   AND planned.participant_id = response.participant_id
   AND planned.question_id = inserted.survey_question_id;

CREATE TEMP TABLE amplify_responses_to_recompute AS
SELECT response.id AS response_id
FROM survey_response response
JOIN amplify_project_conversations conversation
    ON conversation.conversation_id = response.conversation_id
WHERE response.withdrawn_at IS NULL
  AND response.completed_at IS NULL;

UPDATE survey_response response
SET
    completed_at = CASE
        WHEN response.completed_at IS NOT NULL THEN response.completed_at
        WHEN NOT EXISTS (
            SELECT 1
            FROM survey_question question
            JOIN survey_config config
                ON config.id = question.survey_config_id
               AND config.conversation_id = response.conversation_id
               AND config.deleted_at IS NULL
            WHERE question.current_content_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM survey_answer answer
                  WHERE answer.survey_response_id = response.id
                    AND answer.survey_question_id = question.id
                    AND answer.deleted_at IS NULL
                    AND answer.answered_question_semantic_version = question.current_semantic_version
                    AND (
                        SELECT COUNT(*)
                        FROM survey_answer_option answer_option
                        WHERE answer_option.survey_answer_id = answer.id
                          AND answer_option.deleted_at IS NULL
                    ) <= 1
              )
        ) THEN now()
        ELSE NULL
    END,
    updated_at = now()
FROM amplify_responses_to_recompute recompute
WHERE response.id = recompute.response_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM amplify_backfill_enabled) AND (
        SELECT COUNT(*)
        FROM survey_config config
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = config.conversation_id
        WHERE config.deleted_at IS NULL
    ) <> 36 THEN
        RAISE EXCEPTION 'Amplify survey backfill did not create one active survey per conversation';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM survey_config config
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = config.conversation_id
        WHERE config.deleted_at IS NULL
          AND config.is_optional = false
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill did not make every project survey optional';
    END IF;

    IF (SELECT COUNT(*) FROM amplify_inserted_answers)
        <> (SELECT COUNT(*) FROM amplify_planned_answers) THEN
        RAISE EXCEPTION 'Amplify survey backfill did not insert every planned answer';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_planned_answers planned
        JOIN survey_response response
            ON response.conversation_id = planned.conversation_id
           AND response.participant_id = planned.participant_id
        LEFT JOIN survey_answer answer
            ON answer.survey_response_id = response.id
           AND answer.survey_question_id = planned.question_id
           AND answer.deleted_at IS NULL
        LEFT JOIN survey_answer_option answer_option
            ON answer_option.survey_answer_id = answer.id
           AND answer_option.survey_question_option_id = planned.option_id
           AND answer_option.deleted_at IS NULL
        WHERE answer.id IS NULL
           OR answer_option.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill did not persist a planned answer option';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_inserted_answers inserted
        JOIN survey_answer answer
            ON answer.id = inserted.answer_id
        JOIN survey_question question
            ON question.id = answer.survey_question_id
        WHERE answer.answered_question_semantic_version <> question.current_semantic_version
           OR answer.deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill inserted a stale or deleted answer';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM amplify_planned_responses planned
        LEFT JOIN amplify_target_participants participant
            ON participant.conversation_id = planned.conversation_id
           AND participant.participant_id = planned.participant_id
        WHERE participant.participant_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill created a response for a nonparticipant';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM survey_response response
        JOIN amplify_project_conversations conversation
            ON conversation.conversation_id = response.conversation_id
        WHERE response.withdrawn_at IS NULL
          AND response.completed_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM survey_question question
              JOIN survey_config config
                  ON config.id = question.survey_config_id
                 AND config.conversation_id = response.conversation_id
                 AND config.deleted_at IS NULL
              WHERE question.current_content_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM survey_answer answer
                    WHERE answer.survey_response_id = response.id
                      AND answer.survey_question_id = question.id
                      AND answer.deleted_at IS NULL
                      AND answer.answered_question_semantic_version = question.current_semantic_version
                      AND (
                          SELECT COUNT(*)
                          FROM survey_answer_option answer_option
                          WHERE answer_option.survey_answer_id = answer.id
                            AND answer_option.deleted_at IS NULL
                      ) <= 1
                )
          )
    ) THEN
        RAISE EXCEPTION 'Amplify survey backfill left a complete response without a completion timestamp';
    END IF;
END
$$;

CREATE TEMP TABLE amplify_current_specs AS
SELECT DISTINCT ON (spec.key) spec.id
FROM opinion_group_spec spec
ORDER BY spec.key, spec.version DESC;

UPDATE polis_conversation_config polis_config
SET
    analysis_data_generation = polis_config.analysis_data_generation + 1,
    updated_at = now()
FROM amplify_project_conversations conversation
WHERE polis_config.id = conversation.polis_config_id
  AND conversation.conversation_type = 'polis';

INSERT INTO analysis_work_state (
    conversation_id,
    opinion_group_spec_id,
    dirty_since,
    created_at,
    updated_at
)
SELECT
    conversation.conversation_id,
    spec.id,
    now(),
    now(),
    now()
FROM amplify_project_conversations conversation
CROSS JOIN amplify_current_specs spec
WHERE conversation.conversation_type = 'polis'
ON CONFLICT (conversation_id, opinion_group_spec_id) DO UPDATE
SET
    dirty_since = COALESCE(analysis_work_state.dirty_since, EXCLUDED.dirty_since),
    updated_at = EXCLUDED.updated_at;

INSERT INTO realtime_event_outbox (event_type, payload)
SELECT
    'conversation_survey_updated',
    jsonb_build_object(
        'conversationSlugId', conversation.conversation_slug_id,
        'configChanged', true,
        'timestamp', floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
    )
FROM amplify_project_conversations conversation;
