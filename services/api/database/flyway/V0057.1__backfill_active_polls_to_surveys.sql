-- Backfill each currently active poll into a survey question before poll tables are removed.
--
-- Approach:
-- 1. Only conversations whose current content still points at a poll become active surveys.
-- 2. Each such conversation gets exactly one optional choice survey question.
-- 3. Historical poll replacements for that conversation become older semantic versions
--    of the same survey question.
-- 4. Poll votes become survey responses + survey answers, with superseded
--    survey answers soft-deleted when a participant answered a later poll version.

CREATE OR REPLACE FUNCTION pg_temp.to_base36(value bigint)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    alphabet CONSTANT text := '0123456789abcdefghijklmnopqrstuvwxyz';
    current_value bigint := value;
    result text := '';
    remainder integer;
BEGIN
    IF current_value < 0 THEN
        RAISE EXCEPTION 'pg_temp.to_base36 only supports non-negative values';
    END IF;

    IF current_value = 0 THEN
        RETURN '0';
    END IF;

    WHILE current_value > 0 LOOP
        remainder := (current_value % 36)::integer;
        result := substr(alphabet, remainder + 1, 1) || result;
        current_value := current_value / 36;
    END LOOP;

    RETURN result;
END
$$;

CREATE TEMP TABLE poll_migration_targets AS
WITH existing_active_question_stats AS (
    SELECT
        sq.survey_config_id,
        COUNT(*) FILTER (WHERE sq.current_content_id IS NOT NULL) AS active_question_count,
        COALESCE(
            MAX(sq.display_order) FILTER (WHERE sq.current_content_id IS NOT NULL),
            -1
        ) AS max_active_display_order
    FROM survey_question sq
    GROUP BY sq.survey_config_id
)
SELECT
    c.id AS conversation_id,
    current_cc.created_at AS current_content_created_at,
    current_cc.title AS current_question_text,
    current_cc.poll_id AS current_poll_id,
    sc.id AS existing_survey_config_id,
    COALESCE(eaqs.active_question_count, 0) AS existing_active_question_count,
    COALESCE(eaqs.max_active_display_order, -1) + 1 AS poll_question_display_order
FROM conversation c
JOIN conversation_content current_cc
    ON current_cc.id = c.current_content_id
LEFT JOIN survey_config sc
    ON sc.conversation_id = c.id
   AND sc.deleted_at IS NULL
LEFT JOIN existing_active_question_stats eaqs
    ON eaqs.survey_config_id = sc.id
WHERE current_cc.poll_id IS NOT NULL;

CREATE TEMP TABLE poll_versions AS
WITH distinct_polls AS (
    SELECT
        t.conversation_id,
        t.current_poll_id,
        p.id AS poll_id,
        p.created_at AS poll_created_at
    FROM poll_migration_targets t
    JOIN conversation_content cc
        ON cc.conversation_id = t.conversation_id
       AND cc.poll_id IS NOT NULL
    JOIN poll p
        ON p.id = cc.poll_id
    GROUP BY
        t.conversation_id,
        t.current_poll_id,
        p.id,
        p.created_at
)
SELECT
    dp.conversation_id,
    dp.poll_id,
    dp.poll_created_at,
    ROW_NUMBER() OVER (
        PARTITION BY dp.conversation_id
        ORDER BY
            CASE WHEN dp.poll_id = dp.current_poll_id THEN 1 ELSE 0 END,
            dp.poll_created_at,
            dp.poll_id
    ) AS semantic_version,
    dp.poll_id = dp.current_poll_id AS is_current_version
FROM distinct_polls dp;

CREATE TEMP TABLE poll_conversation_stats AS
SELECT
    pv.conversation_id,
    MIN(pv.poll_created_at) AS first_poll_at,
    MAX(pv.poll_created_at) AS last_poll_at,
    MAX(pv.semantic_version) FILTER (WHERE pv.is_current_version) AS current_semantic_version
FROM poll_versions pv
GROUP BY pv.conversation_id;

CREATE TEMP TABLE poll_question_slug_map AS
WITH candidate_slugs AS (
    SELECT
        t.conversation_id,
        slug_candidate.attempt,
        slug_candidate.question_slug_id
    FROM poll_migration_targets t
    CROSS JOIN LATERAL (
        SELECT
            candidate_attempt.attempt,
            CASE
                WHEN candidate_attempt.attempt = 0
                 AND length(pg_temp.to_base36(t.conversation_id::bigint)) <= 7
                    THEN 'q' || pg_temp.to_base36(t.conversation_id::bigint)
                ELSE 'q' || substr(
                    md5(
                        'survey-question:' ||
                        t.conversation_id::text ||
                        ':' ||
                        candidate_attempt.attempt::text
                    ),
                    1,
                    7
                )
            END AS question_slug_id
        FROM generate_series(0, 255) AS candidate_attempt(attempt)
    ) slug_candidate
),
available_slugs AS (
    SELECT
        cs.conversation_id,
        cs.attempt,
        cs.question_slug_id,
        COUNT(*) OVER (PARTITION BY cs.question_slug_id) AS generated_collision_count
    FROM candidate_slugs cs
    LEFT JOIN survey_question sq
        ON sq.slug_id = cs.question_slug_id
    WHERE sq.id IS NULL
),
ranked_slugs AS (
    SELECT
        available_slugs.conversation_id,
        available_slugs.question_slug_id,
        ROW_NUMBER() OVER (
            PARTITION BY available_slugs.conversation_id
            ORDER BY available_slugs.attempt
        ) AS slug_rank
    FROM available_slugs
    WHERE available_slugs.generated_collision_count = 1
)
SELECT
    ranked_slugs.conversation_id,
    ranked_slugs.question_slug_id
FROM ranked_slugs
WHERE ranked_slugs.slug_rank = 1;

CREATE TEMP TABLE poll_question_map AS
SELECT
    t.conversation_id,
    pqsm.question_slug_id,
    pcs.first_poll_at AS question_created_at,
    GREATEST(pcs.last_poll_at, t.current_content_created_at) AS question_updated_at,
    t.current_content_created_at AS question_content_created_at,
    t.current_question_text,
    pcs.current_semantic_version,
    t.poll_question_display_order
FROM poll_migration_targets t
JOIN poll_conversation_stats pcs
    USING (conversation_id)
JOIN poll_question_slug_map pqsm
    USING (conversation_id);

CREATE TEMP TABLE poll_option_base AS
SELECT
    pv.conversation_id,
    pv.poll_id,
    pv.semantic_version,
    pv.poll_created_at,
    pv.is_current_version,
    option_data.option_position,
    option_data.option_text
FROM poll_versions pv
JOIN poll p
    ON p.id = pv.poll_id
CROSS JOIN LATERAL (
    VALUES
        (1, p.option1),
        (2, p.option2),
        (3, p.option3),
        (4, p.option4),
        (5, p.option5),
        (6, p.option6)
) AS option_data(option_position, option_text)
WHERE option_data.option_text IS NOT NULL;

CREATE TEMP TABLE poll_option_slug_map AS
WITH candidate_slugs AS (
    SELECT
        pob.poll_id,
        pob.option_position,
        slug_candidate.attempt,
        slug_candidate.option_slug_id
    FROM poll_option_base pob
    CROSS JOIN LATERAL (
        SELECT
            candidate_attempt.attempt,
            CASE
                WHEN candidate_attempt.attempt = 0
                 AND length(
                     pg_temp.to_base36(
                         ((pob.poll_id::bigint - 1) * 6) +
                         pob.option_position::bigint
                     )
                 ) <= 7
                    THEN 'o' || pg_temp.to_base36(
                        ((pob.poll_id::bigint - 1) * 6) +
                        pob.option_position::bigint
                    )
                ELSE 'o' || substr(
                    md5(
                        'survey-option:' ||
                        pob.poll_id::text ||
                        ':' ||
                        pob.option_position::text ||
                        ':' ||
                        candidate_attempt.attempt::text
                    ),
                    1,
                    7
                )
            END AS option_slug_id
        FROM generate_series(0, 255) AS candidate_attempt(attempt)
    ) slug_candidate
),
available_slugs AS (
    SELECT
        cs.poll_id,
        cs.option_position,
        cs.attempt,
        cs.option_slug_id,
        COUNT(*) OVER (PARTITION BY cs.option_slug_id) AS generated_collision_count
    FROM candidate_slugs cs
    LEFT JOIN survey_question_option sqo
        ON sqo.slug_id = cs.option_slug_id
    WHERE sqo.id IS NULL
),
ranked_slugs AS (
    SELECT
        available_slugs.poll_id,
        available_slugs.option_position,
        available_slugs.option_slug_id,
        ROW_NUMBER() OVER (
            PARTITION BY
                available_slugs.poll_id,
                available_slugs.option_position
            ORDER BY available_slugs.attempt
        ) AS slug_rank
    FROM available_slugs
    WHERE available_slugs.generated_collision_count = 1
)
SELECT
    ranked_slugs.poll_id,
    ranked_slugs.option_position,
    ranked_slugs.option_slug_id
FROM ranked_slugs
WHERE ranked_slugs.slug_rank = 1;

CREATE TEMP TABLE poll_option_source AS
SELECT
    pob.conversation_id,
    pob.poll_id,
    pob.semantic_version,
    pob.poll_created_at,
    pob.is_current_version,
    pob.option_position,
    pob.option_text,
    posm.option_slug_id
FROM poll_option_base pob
JOIN poll_option_slug_map posm
    USING (poll_id, option_position);

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM poll_question_slug_map) <> (SELECT COUNT(*) FROM poll_migration_targets) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every target conversation received a collision-free survey question slug';
    END IF;

    IF (SELECT COUNT(*) FROM poll_option_slug_map) <> (SELECT COUNT(*) FROM poll_option_base) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every poll option received a collision-free survey option slug';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM poll_question_slug_map pqsm
        GROUP BY pqsm.question_slug_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: generated duplicate survey question slugs';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM poll_option_slug_map posm
        GROUP BY posm.option_slug_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: generated duplicate survey option slugs';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM poll_response pr
        JOIN poll_versions pv
            ON pv.poll_id = pr.poll_id
        LEFT JOIN poll_response_content prc
            ON prc.id = pr.current_content_id
           AND prc.poll_response_id = pr.id
        WHERE prc.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: poll_response.current_content_id is missing or points to a different poll response';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM poll_response pr
        JOIN poll_versions pv
            ON pv.poll_id = pr.poll_id
        JOIN poll_response_content prc
            ON prc.id = pr.current_content_id
           AND prc.poll_response_id = pr.id
        JOIN poll p
            ON p.id = pv.poll_id
        LEFT JOIN LATERAL (
            VALUES
                (1, p.option1),
                (2, p.option2),
                (3, p.option3),
                (4, p.option4),
                (5, p.option5),
                (6, p.option6)
        ) AS option_data(option_position, option_text)
            ON option_data.option_position = prc.option_chosen
        WHERE option_data.option_text IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: poll_response_content.option_chosen points to a missing poll option';
    END IF;
END
$$;

CREATE TEMP TABLE inserted_survey_configs (
    conversation_id integer PRIMARY KEY,
    survey_config_id integer NOT NULL
);

WITH inserted AS (
    INSERT INTO survey_config (
        conversation_id,
        current_revision,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT
        t.conversation_id,
        1,
        pcs.first_poll_at,
        GREATEST(pcs.last_poll_at, t.current_content_created_at),
        NULL
    FROM poll_migration_targets t
    JOIN poll_conversation_stats pcs
        USING (conversation_id)
    WHERE t.existing_survey_config_id IS NULL
    RETURNING id, conversation_id
)
INSERT INTO inserted_survey_configs (conversation_id, survey_config_id)
SELECT
    inserted.conversation_id,
    inserted.id
FROM inserted;

CREATE TEMP TABLE survey_config_map AS
SELECT
    t.conversation_id,
    COALESCE(isc.survey_config_id, t.existing_survey_config_id) AS survey_config_id
FROM poll_migration_targets t
LEFT JOIN inserted_survey_configs isc
    USING (conversation_id);

CREATE TEMP TABLE inserted_survey_questions (
    conversation_id integer PRIMARY KEY,
    survey_question_id integer NOT NULL,
    question_slug_id varchar(8) NOT NULL
);

WITH inserted AS (
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
        created_at,
        updated_at
    )
    SELECT
        pqm.question_slug_id,
        scm.survey_config_id,
        pqm.conversation_id,
        'choice'::survey_question_type,
        'auto'::survey_choice_display,
        NULL,
        pqm.current_semantic_version,
        pqm.poll_question_display_order,
        FALSE,
        pqm.question_created_at,
        pqm.question_updated_at
    FROM poll_question_map pqm
    JOIN survey_config_map scm
        USING (conversation_id)
    RETURNING id, slug_id
)
INSERT INTO inserted_survey_questions (
    conversation_id,
    survey_question_id,
    question_slug_id
)
SELECT
    pqm.conversation_id,
    inserted.id,
    inserted.slug_id
FROM inserted
JOIN poll_question_map pqm
    ON pqm.question_slug_id = inserted.slug_id;

CREATE TEMP TABLE inserted_question_contents (
    conversation_id integer PRIMARY KEY,
    survey_question_content_id integer NOT NULL
);

WITH inserted AS (
    INSERT INTO survey_question_content (
        survey_question_id,
        question_text,
        constraints,
        created_at
    )
    SELECT
        isq.survey_question_id,
        pqm.current_question_text,
        '{"type":"choice","minSelections":1,"maxSelections":1}'::jsonb,
        pqm.question_content_created_at
    FROM inserted_survey_questions isq
    JOIN poll_question_map pqm
        USING (conversation_id)
    RETURNING id, survey_question_id
)
INSERT INTO inserted_question_contents (
    conversation_id,
    survey_question_content_id
)
SELECT
    isq.conversation_id,
    inserted.id
FROM inserted
JOIN inserted_survey_questions isq
    ON isq.survey_question_id = inserted.survey_question_id;

UPDATE survey_question sq
SET current_content_id = iqc.survey_question_content_id
FROM inserted_survey_questions isq
JOIN inserted_question_contents iqc
    USING (conversation_id)
WHERE sq.id = isq.survey_question_id;

CREATE TEMP TABLE inserted_survey_options (
    conversation_id integer NOT NULL,
    poll_id integer NOT NULL,
    semantic_version integer NOT NULL,
    option_position integer NOT NULL,
    survey_question_option_id integer NOT NULL,
    option_slug_id varchar(8) NOT NULL,
    option_text varchar(200) NOT NULL,
    poll_created_at timestamp(0) NOT NULL,
    is_current_version boolean NOT NULL,
    PRIMARY KEY (poll_id, option_position)
);

WITH inserted AS (
    INSERT INTO survey_question_option (
        slug_id,
        survey_question_id,
        current_content_id,
        display_order,
        created_at,
        updated_at
    )
    SELECT
        pos.option_slug_id,
        isq.survey_question_id,
        NULL,
        pos.option_position - 1,
        pos.poll_created_at,
        pos.poll_created_at
    FROM poll_option_source pos
    JOIN inserted_survey_questions isq
        USING (conversation_id)
    RETURNING id, slug_id
)
INSERT INTO inserted_survey_options (
    conversation_id,
    poll_id,
    semantic_version,
    option_position,
    survey_question_option_id,
    option_slug_id,
    option_text,
    poll_created_at,
    is_current_version
)
SELECT
    pos.conversation_id,
    pos.poll_id,
    pos.semantic_version,
    pos.option_position,
    inserted.id,
    pos.option_slug_id,
    pos.option_text,
    pos.poll_created_at,
    pos.is_current_version
FROM inserted
JOIN poll_option_source pos
    ON pos.option_slug_id = inserted.slug_id;

CREATE TEMP TABLE inserted_option_contents (
    survey_question_option_id integer PRIMARY KEY,
    survey_question_option_content_id integer NOT NULL
);

WITH inserted AS (
    INSERT INTO survey_question_option_content (
        survey_question_option_id,
        option_text,
        created_at
    )
    SELECT
        iso.survey_question_option_id,
        iso.option_text,
        iso.poll_created_at
    FROM inserted_survey_options iso
    WHERE iso.is_current_version
    RETURNING id, survey_question_option_id
)
INSERT INTO inserted_option_contents (
    survey_question_option_id,
    survey_question_option_content_id
)
SELECT
    inserted.survey_question_option_id,
    inserted.id
FROM inserted;

UPDATE survey_question_option sqo
SET current_content_id = ioc.survey_question_option_content_id
FROM inserted_option_contents ioc
WHERE sqo.id = ioc.survey_question_option_id;

UPDATE survey_config sc
SET
    current_revision = sc.current_revision + 1,
    updated_at = GREATEST(sc.updated_at, pqm.question_updated_at)
FROM poll_migration_targets t
JOIN poll_question_map pqm
    USING (conversation_id)
WHERE sc.id = t.existing_survey_config_id;

CREATE TEMP TABLE poll_response_source AS
SELECT
    pv.conversation_id,
    pr.author_id AS participant_id,
    pv.semantic_version,
    pr.id AS poll_response_id,
    prc.id AS poll_response_content_id,
    prc.created_at AS poll_response_at,
    iso.survey_question_option_id,
    LEAD(prc.created_at) OVER (
        PARTITION BY pv.conversation_id, pr.author_id
        ORDER BY pv.semantic_version, prc.created_at, prc.id, pr.id
    ) AS next_poll_response_at,
    pv.is_current_version
FROM poll_response pr
JOIN poll_response_content prc
    ON prc.id = pr.current_content_id
   AND prc.poll_response_id = pr.id
JOIN poll_versions pv
    ON pv.poll_id = pr.poll_id
JOIN inserted_survey_options iso
    ON iso.poll_id = pv.poll_id
   AND iso.option_position = prc.option_chosen;

CREATE TEMP TABLE poll_participant_stats AS
SELECT
    prs.conversation_id,
    prs.participant_id,
    MIN(prs.poll_response_at) AS first_poll_response_at,
    MAX(prs.poll_response_at) AS last_poll_response_at,
    MAX(prs.poll_response_at) FILTER (
        WHERE prs.next_poll_response_at IS NULL
    ) AS latest_answer_at,
    BOOL_OR(
        prs.is_current_version
        AND prs.next_poll_response_at IS NULL
    ) AS latest_answer_is_current
FROM poll_response_source prs
GROUP BY prs.conversation_id, prs.participant_id;

CREATE TEMP TABLE existing_survey_response_map AS
SELECT
    pps.conversation_id,
    pps.participant_id,
    sr.id AS survey_response_id
FROM poll_participant_stats pps
JOIN survey_response sr
    ON sr.conversation_id = pps.conversation_id
   AND sr.participant_id = pps.participant_id;

CREATE TEMP TABLE inserted_survey_responses (
    conversation_id integer NOT NULL,
    participant_id uuid NOT NULL,
    survey_response_id integer NOT NULL,
    PRIMARY KEY (conversation_id, participant_id)
);

WITH inserted AS (
    INSERT INTO survey_response (
        participant_id,
        conversation_id,
        completed_at,
        withdrawn_at,
        created_at,
        updated_at
    )
    SELECT
        pps.participant_id,
        pps.conversation_id,
        CASE
            WHEN t.existing_active_question_count = 0
             AND pps.latest_answer_is_current
                THEN pps.latest_answer_at
            ELSE NULL
        END,
        NULL,
        pps.first_poll_response_at,
        pps.last_poll_response_at
    FROM poll_participant_stats pps
    JOIN poll_migration_targets t
        USING (conversation_id)
    LEFT JOIN existing_survey_response_map esrm
        ON esrm.conversation_id = pps.conversation_id
       AND esrm.participant_id = pps.participant_id
    WHERE esrm.survey_response_id IS NULL
    RETURNING id, conversation_id, participant_id
)
INSERT INTO inserted_survey_responses (
    conversation_id,
    participant_id,
    survey_response_id
)
SELECT
    inserted.conversation_id,
    inserted.participant_id,
    inserted.id
FROM inserted;

UPDATE survey_response sr
SET updated_at = GREATEST(sr.updated_at, pps.last_poll_response_at)
FROM existing_survey_response_map esrm
JOIN poll_participant_stats pps
    ON pps.conversation_id = esrm.conversation_id
   AND pps.participant_id = esrm.participant_id
WHERE sr.id = esrm.survey_response_id;

UPDATE survey_response sr
SET
    completed_at = pps.latest_answer_at,
    updated_at = GREATEST(sr.updated_at, pps.last_poll_response_at)
FROM existing_survey_response_map esrm
JOIN poll_participant_stats pps
    ON pps.conversation_id = esrm.conversation_id
   AND pps.participant_id = esrm.participant_id
JOIN poll_migration_targets t
    ON t.conversation_id = esrm.conversation_id
WHERE sr.id = esrm.survey_response_id
  AND sr.completed_at IS NULL
  AND sr.withdrawn_at IS NULL
  AND t.existing_active_question_count = 0
  AND pps.latest_answer_is_current;

CREATE TEMP TABLE survey_response_map AS
SELECT
    esrm.conversation_id,
    esrm.participant_id,
    esrm.survey_response_id
FROM existing_survey_response_map esrm
UNION ALL
SELECT
    isr.conversation_id,
    isr.participant_id,
    isr.survey_response_id
FROM inserted_survey_responses isr;

CREATE TEMP TABLE inserted_survey_answers (
    conversation_id integer NOT NULL,
    participant_id uuid NOT NULL,
    semantic_version integer NOT NULL,
    survey_answer_id integer NOT NULL,
    deleted_at timestamp(0),
    PRIMARY KEY (conversation_id, participant_id, semantic_version)
);

WITH inserted AS (
    INSERT INTO survey_answer (
        survey_response_id,
        conversation_id,
        survey_question_id,
        answered_question_semantic_version,
        text_value_html,
        deleted_at,
        created_at,
        updated_at
    )
    SELECT
        srm.survey_response_id,
        prs.conversation_id,
        isq.survey_question_id,
        prs.semantic_version,
        NULL,
        prs.next_poll_response_at,
        prs.poll_response_at,
        COALESCE(prs.next_poll_response_at, prs.poll_response_at)
    FROM poll_response_source prs
    JOIN survey_response_map srm
        ON srm.conversation_id = prs.conversation_id
       AND srm.participant_id = prs.participant_id
    JOIN inserted_survey_questions isq
        ON isq.conversation_id = prs.conversation_id
    RETURNING
        id,
        survey_response_id,
        survey_question_id,
        answered_question_semantic_version,
        deleted_at
)
INSERT INTO inserted_survey_answers (
    conversation_id,
    participant_id,
    semantic_version,
    survey_answer_id,
    deleted_at
)
SELECT
    prs.conversation_id,
    prs.participant_id,
    inserted.answered_question_semantic_version,
    inserted.id,
    inserted.deleted_at
FROM inserted
JOIN inserted_survey_questions isq
    ON isq.survey_question_id = inserted.survey_question_id
JOIN survey_response_map srm
    ON srm.survey_response_id = inserted.survey_response_id
JOIN poll_response_source prs
    ON prs.conversation_id = isq.conversation_id
   AND prs.participant_id = srm.participant_id
   AND prs.semantic_version = inserted.answered_question_semantic_version;

CREATE TEMP TABLE inserted_survey_answer_options (
    survey_answer_option_id integer PRIMARY KEY
);

WITH inserted AS (
    INSERT INTO survey_answer_option (
        survey_answer_id,
        survey_question_id,
        survey_question_option_id,
        deleted_at
    )
    SELECT
        isa.survey_answer_id,
        isq.survey_question_id,
        prs.survey_question_option_id,
        isa.deleted_at
    FROM poll_response_source prs
    JOIN inserted_survey_answers isa
        ON isa.conversation_id = prs.conversation_id
       AND isa.participant_id = prs.participant_id
       AND isa.semantic_version = prs.semantic_version
    JOIN inserted_survey_questions isq
        ON isq.conversation_id = prs.conversation_id
    RETURNING id
)
INSERT INTO inserted_survey_answer_options (survey_answer_option_id)
SELECT inserted.id
FROM inserted;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM inserted_survey_questions) <> (SELECT COUNT(*) FROM poll_migration_targets) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every target conversation received a survey question';
    END IF;

    IF (SELECT COUNT(*) FROM inserted_question_contents) <> (SELECT COUNT(*) FROM poll_migration_targets) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every target conversation received survey question content';
    END IF;

    IF (SELECT COUNT(*) FROM inserted_survey_options) <> (SELECT COUNT(*) FROM poll_option_source) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every poll option was migrated into a survey option';
    END IF;

    IF (SELECT COUNT(*) FROM inserted_option_contents) <> (SELECT COUNT(*) FROM inserted_survey_options WHERE is_current_version) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every current poll option received survey option content';
    END IF;

    IF (SELECT COUNT(*) FROM inserted_survey_answers) <> (SELECT COUNT(*) FROM poll_response_source) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every poll response was migrated into a survey answer';
    END IF;

    IF (SELECT COUNT(*) FROM inserted_survey_answer_options) <> (SELECT COUNT(*) FROM poll_response_source) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: not every poll response was migrated into a survey answer option';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM inserted_survey_options iso
        WHERE iso.is_current_version
          AND NOT EXISTS (
              SELECT 1
              FROM inserted_option_contents ioc
              WHERE ioc.survey_question_option_id = iso.survey_question_option_id
          )
    ) THEN
        RAISE EXCEPTION 'Migration V0057.1 cannot continue: current survey option without current content detected';
    END IF;
END
$$;

UPDATE conversation_content cc
SET poll_id = NULL
FROM conversation c
JOIN poll_migration_targets pmt
    ON pmt.conversation_id = c.id
WHERE cc.id = c.current_content_id
  AND cc.poll_id = pmt.current_poll_id;
