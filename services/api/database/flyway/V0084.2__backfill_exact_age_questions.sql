CREATE TEMP TABLE age_group_migration_prompts (
    language_code varchar(10) PRIMARY KEY,
    age_group_prompt text NOT NULL
);

INSERT INTO age_group_migration_prompts (
    language_code,
    age_group_prompt
)
VALUES
    ('en', 'What is your age group?'),
    ('ar', 'ما هي فئتك العمرية؟'),
    ('es', '¿Cuál es tu grupo de edad?'),
    ('fa', 'گروه سنی شما چیست؟'),
    ('fr', 'Quelle est votre tranche d''âge ?'),
    ('he', 'מה קבוצת הגיל שלך?'),
    ('ja', 'あなたの年齢層を教えてください。'),
    ('ky', 'Сиз кайсы курак тобуна киресиз?'),
    ('ru', 'Какая у вас возрастная группа?'),
    ('zh-Hans', '您的年龄段是？'),
    ('zh-Hant', '您的年齡層是？');

CREATE TEMP TABLE age_group_migration_reviewed_questions (
    question_slug_id varchar(8) PRIMARY KEY,
    expected_question_text text NOT NULL,
    prompt_language_code varchar(10) NOT NULL,
    expected_maximum_age integer NOT NULL
);

INSERT INTO age_group_migration_reviewed_questions (
    question_slug_id,
    expected_question_text,
    prompt_language_code,
    expected_maximum_age
)
VALUES
    ('PGa-urM', 'Жаш курагыңыз:', 'ky', 120),
    ('NJkXnms', 'Жаш курагыңыз:', 'ky', 120),
    ('-qizfkg', 'Жаш курагыңыз:', 'ky', 120),
    ('k3MnqSs', 'Жаш курагыңыз:', 'ky', 120),
    ('fDHRwTo', 'Сиз канча жаштасыз?', 'ky', 100),
    ('bf9kf6A', 'Канча жаштасыз?', 'ky', 100),
    ('xR0httM', 'Сиз канча жаштасыз?', 'ky', 100),
    ('E67oikM', 'Сиз канча жаштасыз?', 'ky', 100),
    ('eHcznts', 'Сиздин жашыңыз канча?', 'ky', 120);

SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE age_group_migration_enabled AS
SELECT project.id AS project_id
FROM project
WHERE project.slug = 'sfcg-amplify-kg'
  AND project.deleted_at IS NULL;

-- Match the application lock order before excluding survey writes.
CREATE TEMP TABLE age_group_migration_conversations AS
SELECT
    conversation.id AS conversation_id,
    conversation.slug_id AS conversation_slug_id,
    conversation.conversation_type,
    conversation.polis_config_id,
    conversation.is_closed
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
    IF EXISTS (SELECT 1 FROM age_group_migration_enabled) THEN
        EXECUTE 'LOCK TABLE
            survey_config,
            survey_question,
            survey_question_content,
            survey_question_option,
            survey_question_option_content,
            survey_answer,
            survey_answer_option
        IN SHARE ROW EXCLUSIVE MODE';
    END IF;
END
$$;

CREATE TEMP TABLE age_group_migration_questions AS
SELECT
    target.conversation_id,
    target.conversation_slug_id,
    config.id AS survey_config_id,
    question.id AS question_id,
    question.current_semantic_version AS old_semantic_version,
    question_content.id AS old_question_content_id,
    output_prompt.age_group_prompt,
    (question_content.constraints ->> 'minValue')::integer AS original_minimum_age,
    (question_content.constraints ->> 'maxValue')::integer AS original_maximum_age,
    question_content.source_language_code,
    question_content.source_raw_language_code,
    question_content.source_language_provider,
    question_content.source_language_confidence
FROM age_group_migration_conversations target
JOIN survey_config config
    ON config.conversation_id = target.conversation_id
   AND config.deleted_at IS NULL
JOIN survey_question question
    ON question.survey_config_id = config.id
   AND question.current_content_id IS NOT NULL
JOIN survey_question_content question_content
    ON question_content.id = question.current_content_id
JOIN age_group_migration_reviewed_questions reviewed
    ON reviewed.question_slug_id = question.slug_id
JOIN age_group_migration_prompts output_prompt
    ON output_prompt.language_code = reviewed.prompt_language_code
WHERE question.question_type = 'free_text'
  AND question_content.question_text = reviewed.expected_question_text
  AND question_content.constraints = jsonb_build_object(
      'type', 'free_text',
      'inputMode', 'integer',
      'minValue', 1,
      'maxValue', reviewed.expected_maximum_age
  );

CREATE TEMP TABLE age_group_migration_affected_conversations AS
SELECT DISTINCT
    target.conversation_id,
    target.conversation_type,
    target.polis_config_id
FROM age_group_migration_conversations target
JOIN age_group_migration_questions question
    ON question.conversation_id = target.conversation_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM age_group_migration_enabled)
       AND (SELECT COUNT(*) FROM age_group_migration_conversations) <> 36 THEN
        RAISE EXCEPTION 'Age-group backfill expected exactly 36 active Amplify conversations';
    END IF;

    IF EXISTS (SELECT 1 FROM age_group_migration_enabled)
       AND (SELECT COUNT(*) FROM age_group_migration_questions) <> 9 THEN
        RAISE EXCEPTION 'Age-group backfill expected all nine reviewed exact-age questions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM age_group_migration_conversations
        WHERE is_closed = false
    ) THEN
        RAISE EXCEPTION 'Age-group backfill requires every Amplify conversation to be closed';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM survey_question_option option
        JOIN age_group_migration_questions question
            ON question.question_id = option.survey_question_id
        WHERE option.current_content_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Age-group backfill found an existing active option on an Age-template question';
    END IF;
END
$$;

CREATE TEMP TABLE age_group_migration_raw_answers AS
SELECT
    answer.id AS answer_id,
    answer.survey_question_id AS question_id,
    answer.answered_question_semantic_version AS answered_semantic_version,
    answer.text_value_html AS answer_value,
    answer.text_value_plain_text AS answer_plain_text_value,
    answer.deleted_at
FROM age_group_migration_questions question
JOIN survey_response response
    ON response.conversation_id = question.conversation_id
JOIN survey_answer answer
    ON answer.survey_response_id = response.id
   AND answer.survey_question_id = question.question_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM age_group_migration_raw_answers
        WHERE (answer_value IS NULL) <> (answer_plain_text_value IS NULL)
           OR answer_value IS DISTINCT FROM answer_plain_text_value
    ) THEN
        RAISE EXCEPTION 'Age-group backfill found mismatched HTML and plain-text exact-age values';
    END IF;

    -- Preserve reviewed under-18 answers in their own bucket rather than
    -- silently misclassifying or discarding them.
    IF EXISTS (
        SELECT 1
        FROM age_group_migration_raw_answers answer
        JOIN age_group_migration_questions question
            ON question.question_id = answer.question_id
        WHERE answer.answer_value IS NOT NULL
          AND CASE
              WHEN answer.answer_value ~ '^[0-9]+$'
                  THEN answer.answer_value::numeric BETWEEN
                      greatest(1, question.original_minimum_age)
                      AND least(120, question.original_maximum_age)
              ELSE false
          END IS NOT TRUE
    ) THEN
        RAISE EXCEPTION 'Age-group backfill found an exact-age answer outside the supported 1-120 age-group range';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM survey_answer_option answer_option
        JOIN age_group_migration_raw_answers answer
            ON answer.answer_id = answer_option.survey_answer_id
        WHERE answer.answer_value IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Age-group backfill found an existing option for an exact-age answer';
    END IF;
END
$$;

CREATE TEMP TABLE age_group_migration_answers AS
SELECT
    answer_id,
    question_id,
    answer_value::integer AS age,
    deleted_at
FROM age_group_migration_raw_answers
WHERE answer_value IS NOT NULL;

CREATE TEMP TABLE age_group_migration_option_seed AS
SELECT
    question.question_id,
    option.display_order,
    option.option_text,
    option.minimum_age,
    option.maximum_age
FROM age_group_migration_questions question
CROSS JOIN (
    VALUES
        (0, '<18', 1, 17),
        (1, '18-24', 18, 24),
        (2, '25-34', 25, 34),
        (3, '35-44', 35, 44),
        (4, '45-54', 45, 54),
        (5, '55-64', 55, 64),
        (6, '65+', 65, 120)
) AS option(display_order, option_text, minimum_age, maximum_age);

CREATE TEMP TABLE age_group_migration_option_slugs AS
WITH candidate_slugs AS (
    SELECT
        seed.question_id,
        seed.display_order,
        attempt.number AS attempt,
        'o' || substr(
            md5(
                'exact-age-backfill:' ||
                seed.question_id::text ||
                ':' ||
                seed.display_order::text ||
                ':' ||
                attempt.number::text
            ),
            1,
            7
        ) AS option_slug_id
    FROM age_group_migration_option_seed seed
    CROSS JOIN generate_series(0, 255) AS attempt(number)
),
available_slugs AS (
    SELECT
        candidate.question_id,
        candidate.display_order,
        candidate.attempt,
        candidate.option_slug_id,
        COUNT(*) OVER (PARTITION BY candidate.option_slug_id) AS generated_collision_count
    FROM candidate_slugs candidate
    LEFT JOIN survey_question_option existing_option
        ON existing_option.slug_id = candidate.option_slug_id
    WHERE existing_option.id IS NULL
),
ranked_slugs AS (
    SELECT
        available.question_id,
        available.display_order,
        available.option_slug_id,
        ROW_NUMBER() OVER (
            PARTITION BY available.question_id, available.display_order
            ORDER BY available.attempt
        ) AS slug_rank
    FROM available_slugs available
    WHERE available.generated_collision_count = 1
)
SELECT
    question_id,
    display_order,
    option_slug_id
FROM ranked_slugs
WHERE slug_rank = 1;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM age_group_migration_option_slugs)
        <> (SELECT COUNT(*) * 7 FROM age_group_migration_questions) THEN
        RAISE EXCEPTION 'Age-group backfill could not allocate every option slug';
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
    slug.option_slug_id,
    slug.question_id,
    NULL,
    slug.display_order,
    now(),
    now()
FROM age_group_migration_option_slugs slug;

CREATE TEMP TABLE age_group_migration_options AS
SELECT
    seed.question_id,
    inserted_option.id AS option_id,
    seed.display_order,
    seed.option_text,
    seed.minimum_age,
    seed.maximum_age
FROM age_group_migration_option_seed seed
JOIN age_group_migration_option_slugs slug
    ON slug.question_id = seed.question_id
   AND slug.display_order = seed.display_order
JOIN survey_question_option inserted_option
    ON inserted_option.slug_id = slug.option_slug_id;

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
    option.option_id,
    option.option_text,
    question.source_language_code,
    question.source_raw_language_code,
    question.source_language_provider,
    question.source_language_confidence,
    now()
FROM age_group_migration_options option
JOIN age_group_migration_questions question
    ON question.question_id = option.question_id;

UPDATE survey_question_option option
SET
    current_content_id = option_content.id,
    updated_at = now()
FROM age_group_migration_options migrated_option
JOIN survey_question_option_content option_content
    ON option_content.survey_question_option_id = migrated_option.option_id
WHERE option.id = migrated_option.option_id;

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
    option.current_content_id,
    prompt.language_code::display_language_code,
    migrated_option.option_text,
    question.source_language_code,
    question.source_raw_language_code,
    question.source_language_provider,
    question.source_language_confidence,
    now(),
    now()
FROM age_group_migration_options migrated_option
JOIN survey_question_option option
    ON option.id = migrated_option.option_id
JOIN age_group_migration_questions question
    ON question.question_id = migrated_option.question_id
CROSS JOIN age_group_migration_prompts prompt;

INSERT INTO survey_answer_option (
    survey_answer_id,
    survey_question_id,
    survey_question_option_id,
    deleted_at
)
SELECT
    answer.answer_id,
    answer.question_id,
    option.option_id,
    answer.deleted_at
FROM age_group_migration_answers answer
JOIN age_group_migration_options option
    ON option.question_id = answer.question_id
   AND answer.age BETWEEN option.minimum_age AND option.maximum_age;

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM survey_answer_option answer_option
        JOIN age_group_migration_answers answer
            ON answer.answer_id = answer_option.survey_answer_id
    ) <> (SELECT COUNT(*) FROM age_group_migration_answers) THEN
        RAISE EXCEPTION 'Age-group backfill did not map every exact-age answer';
    END IF;
END
$$;

CREATE TEMP TABLE age_group_migration_question_contents AS
WITH inserted_content AS (
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
        question.question_id,
        question.age_group_prompt,
        '{"type":"choice","minSelections":1,"maxSelections":1}'::jsonb,
        question.source_language_code,
        question.source_raw_language_code,
        question.source_language_provider,
        question.source_language_confidence,
        now()
    FROM age_group_migration_questions question
    RETURNING id, survey_question_id
)
SELECT
    inserted_content.id AS question_content_id,
    inserted_content.survey_question_id AS question_id
FROM inserted_content;

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
    content.question_content_id,
    prompt.language_code::display_language_code,
    prompt.age_group_prompt,
    question.source_language_code,
    question.source_raw_language_code,
    question.source_language_provider,
    question.source_language_confidence,
    now(),
    now()
FROM age_group_migration_question_contents content
JOIN age_group_migration_questions question
    ON question.question_id = content.question_id
CROSS JOIN age_group_migration_prompts prompt;

UPDATE survey_question question
SET
    question_type = 'choice',
    choice_display = 'auto',
    current_content_id = content.question_content_id,
    current_semantic_version = migrated_question.old_semantic_version + 1,
    is_public_aggregate_suppression_enabled = true,
    updated_at = now()
FROM age_group_migration_questions migrated_question
JOIN age_group_migration_question_contents content
    ON content.question_id = migrated_question.question_id
WHERE question.id = migrated_question.question_id;

-- Current answers, including explicit passes, remain current. Pre-existing
-- stale answers retain their older semantic version and stay stale.
UPDATE survey_answer answer
SET
    answered_question_semantic_version = migrated_question.old_semantic_version + 1
FROM age_group_migration_raw_answers migrated_answer
JOIN age_group_migration_questions migrated_question
    ON migrated_question.question_id = migrated_answer.question_id
WHERE answer.id = migrated_answer.answer_id
  AND migrated_answer.answered_semantic_version = migrated_question.old_semantic_version;

-- Exact ages are no longer needed after every representable answer has an
-- option row. Scrub active and soft-deleted answer values alike.
UPDATE survey_answer answer
SET
    text_value_html = NULL,
    text_value_plain_text = NULL
FROM age_group_migration_raw_answers migrated_answer
WHERE answer.id = migrated_answer.answer_id
  AND (answer.text_value_html IS NOT NULL OR answer.text_value_plain_text IS NOT NULL);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM survey_answer answer
        JOIN age_group_migration_questions question
            ON question.question_id = answer.survey_question_id
        WHERE answer.text_value_html IS NOT NULL
           OR answer.text_value_plain_text IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Age-group backfill left an exact-age value behind';
    END IF;
END
$$;

UPDATE survey_config config
SET
    current_revision = config.current_revision + 1,
    updated_at = now()
FROM age_group_migration_questions question
WHERE config.id = question.survey_config_id;

CREATE TEMP TABLE age_group_migration_current_specs AS
SELECT DISTINCT ON (spec.key) spec.id
FROM opinion_group_spec spec
ORDER BY spec.key, spec.version DESC;

-- The worker's periodic database reconciliation enqueues these generations;
-- a Flyway migration has no Valkey connection for an immediate wake-up.
UPDATE polis_conversation_config polis_config
SET
    analysis_data_generation = polis_config.analysis_data_generation + 1,
    updated_at = now()
FROM age_group_migration_affected_conversations target
WHERE polis_config.id = target.polis_config_id
  AND target.conversation_type = 'polis';

INSERT INTO analysis_work_state (
    conversation_id,
    opinion_group_spec_id,
    dirty_since,
    created_at,
    updated_at
)
SELECT
    target.conversation_id,
    spec.id,
    now(),
    now(),
    now()
FROM age_group_migration_affected_conversations target
CROSS JOIN age_group_migration_current_specs spec
WHERE target.conversation_type = 'polis'
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
FROM age_group_migration_affected_conversations affected
JOIN age_group_migration_conversations conversation
    ON conversation.conversation_id = affected.conversation_id;
