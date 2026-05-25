-- Backfill one current display-complete opinion-group snapshot per conversation
-- from the legacy polis_* tables.
--
-- Intentional scope limits:
-- - backfill only the current legacy analysis (no historical reconstruction)
-- - preserve current API-equivalent behavior for the analysis tab
-- - create only the single currently displayed candidate per conversation
-- - backfill current survey aggregate rows on the same selected-snapshot basis
-- - replace owner full survey rows via survey_aggregate_owner_current
DO $$
DECLARE
    default_opinion_group_spec_id integer;
    placeholder_input_hash constant text := '679ed49101719a0e1b7780f9a7dc5649107a4c24b245791029fcb19e15def7c4';
    placeholder_input_payload constant bytea := decode(
        '28b52ffd20863d0300f205141890296d985537d9402bf1b0d15fbaa7c0fe8f45aac8ef6ecd8b81c054c2dea44ac08e40c3a5d6a3bc6c3e6a45f634d1564184dbd4395938dc0996b81f7818150f7bdfa8023065a4e9663f3126ba578a0700550870433039cd3375faae6c6e360b15e613',
        'hex'
    );
    backfill_conversation record;
    snapshot_input_id integer;
    analysis_snapshot_id integer;
    snapshot_result_id integer;
    lineage_scope_id integer;
    candidate_id integer;
    view_snapshot_id integer;
    survey_aggregate_snapshot_id integer;
    active_survey_config_id integer;
    active_survey_current_revision integer;
    active_survey_is_optional boolean;
    owner_current_rows jsonb;
    legacy_cluster record;
    description_id integer;
    lineage_id integer;
    group_id integer;
BEGIN
    SELECT id
    INTO default_opinion_group_spec_id
    FROM opinion_group_spec
    WHERE key = 'default' AND version = 1
    ORDER BY id
    LIMIT 1;

    IF default_opinion_group_spec_id IS NULL THEN
        RAISE EXCEPTION 'Missing default opinion_group_spec key=default version=1. Run V0062.1__seed_default_opinion_group_spec.sql first.';
    END IF;

    CREATE TEMP TABLE tmp_snapshot_opinion_map (
        opinion_id integer PRIMARY KEY,
        analysis_snapshot_opinion_id integer NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_group_map (
        legacy_cluster_id integer PRIMARY KEY,
        group_id integer NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_group_participant_map (
        group_id integer NOT NULL,
        participant_id uuid NOT NULL,
        PRIMARY KEY (group_id, participant_id)
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_counted_survey_participant (
        participant_id uuid PRIMARY KEY
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_counted_survey_response (
        response_id integer PRIMARY KEY,
        participant_id uuid NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_required_survey_question_meta (
        question_id integer PRIMARY KEY,
        question_type survey_question_type NOT NULL,
        question_semantic_version integer NOT NULL,
        min_selections integer NOT NULL,
        max_selections integer
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_survey_question_meta (
        question_id integer PRIMARY KEY,
        question_slug_id varchar(8) NOT NULL,
        question_order integer NOT NULL,
        question_type survey_question_type NOT NULL,
        question_text varchar(500) NOT NULL,
        is_required boolean NOT NULL,
        question_semantic_version integer NOT NULL,
        min_selections integer NOT NULL,
        max_selections integer
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_survey_option_meta (
        survey_question_option_id integer PRIMARY KEY,
        question_id integer NOT NULL,
        option_slug_id varchar(8) NOT NULL,
        option_order integer NOT NULL,
        option_text varchar(200) NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_survey_overall_option_count (
        question_id integer NOT NULL,
        survey_question_option_id integer NOT NULL,
        option_slug_id varchar(8) NOT NULL,
        option_order integer NOT NULL,
        option_text varchar(200) NOT NULL,
        option_count integer NOT NULL,
        denominator integer NOT NULL,
        is_suppressed boolean NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_survey_group_option_count (
        group_id integer NOT NULL,
        question_id integer NOT NULL,
        survey_question_option_id integer NOT NULL,
        option_slug_id varchar(8) NOT NULL,
        option_order integer NOT NULL,
        option_text varchar(200) NOT NULL,
        option_count integer NOT NULL,
        denominator integer NOT NULL,
        is_suppressed boolean NOT NULL
    ) ON COMMIT DROP;


    FOR backfill_conversation IN
        WITH current_group_stats AS (
            SELECT
                c.id AS conversation_id,
                c.current_content_id AS conversation_content_id,
                c.current_polis_content_id AS polis_content_id,
                c.is_closed,
                c.opinion_count,
                c.vote_count,
                c.participant_count,
                c.total_opinion_count,
                c.total_vote_count,
                c.total_participant_count,
                c.moderated_opinion_count,
                c.hidden_opinion_count,
                pc.raw_data,
                pc.created_at AS polis_content_created_at,
                pc.updated_at AS polis_content_updated_at,
                count(cluster.id)::integer AS group_count,
                min(cluster.num_users)::integer AS min_group_num_users
            FROM conversation c
            JOIN polis_content pc
                ON pc.id = c.current_polis_content_id
            JOIN polis_cluster cluster
                ON cluster.polis_content_id = pc.id
            WHERE c.current_content_id IS NOT NULL
              AND c.current_polis_content_id IS NOT NULL
            GROUP BY
                c.id,
                c.current_content_id,
                c.current_polis_content_id,
                c.is_closed,
                c.opinion_count,
                c.vote_count,
                c.participant_count,
                c.total_opinion_count,
                c.total_vote_count,
                c.total_participant_count,
                c.moderated_opinion_count,
                c.hidden_opinion_count,
                pc.raw_data,
                pc.created_at,
                pc.updated_at
        )
        SELECT
            stats.*,
            variant.id AS opinion_group_variant_id
        FROM current_group_stats stats
        JOIN opinion_group_variant variant
            ON variant.opinion_group_spec_id = default_opinion_group_spec_id
           AND variant.group_count = stats.group_count
        WHERE stats.group_count BETWEEN 2 AND 6
          AND NOT (
              stats.group_count = 2
              AND stats.min_group_num_users = 1
          )
          AND NOT EXISTS (
              SELECT 1
              FROM conversation_view_snapshot existing_view_snapshot
              WHERE existing_view_snapshot.conversation_id = stats.conversation_id
                AND existing_view_snapshot.opinion_group_spec_id = default_opinion_group_spec_id
                AND existing_view_snapshot.analysis_snapshot_id IS NOT NULL
          )
        ORDER BY stats.conversation_id
    LOOP
        TRUNCATE tmp_snapshot_opinion_map;
        TRUNCATE tmp_group_map;
        TRUNCATE tmp_group_participant_map;
        TRUNCATE tmp_counted_survey_participant;
        TRUNCATE tmp_counted_survey_response;
        TRUNCATE tmp_required_survey_question_meta;
        TRUNCATE tmp_survey_question_meta;
        TRUNCATE tmp_survey_option_meta;
        TRUNCATE tmp_survey_overall_option_count;
        TRUNCATE tmp_survey_group_option_count;

        survey_aggregate_snapshot_id := NULL;
        active_survey_config_id := NULL;
        active_survey_current_revision := NULL;
        active_survey_is_optional := NULL;
        owner_current_rows := '[]'::jsonb;

        INSERT INTO analysis_input_snapshot (
            conversation_id,
            data_generation,
            input_hash,
            opinion_count,
            participant_count,
            vote_count,
            compression,
            payload,
            created_at
        )
        VALUES (
            backfill_conversation.conversation_id,
            0,
            placeholder_input_hash,
            backfill_conversation.opinion_count,
            backfill_conversation.participant_count,
            backfill_conversation.vote_count,
            'zstd',
            placeholder_input_payload,
            backfill_conversation.polis_content_created_at
        )
        RETURNING id INTO snapshot_input_id;

        INSERT INTO analysis_snapshot (
            conversation_id,
            conversation_content_id,
            input_snapshot_id,
            data_generation,
            computed_at,
            created_at
        )
        VALUES (
            backfill_conversation.conversation_id,
            backfill_conversation.conversation_content_id,
            snapshot_input_id,
            0,
            backfill_conversation.polis_content_created_at,
            backfill_conversation.polis_content_created_at
        )
        RETURNING id INTO analysis_snapshot_id;

        INSERT INTO analysis_snapshot_result (
            conversation_id,
            analysis_snapshot_id,
            opinion_group_spec_id,
            outcome,
            outcome_reason,
            created_at
        )
        VALUES (
            backfill_conversation.conversation_id,
            analysis_snapshot_id,
            default_opinion_group_spec_id,
            'success',
            NULL,
            backfill_conversation.polis_content_created_at
        )
        RETURNING id INTO snapshot_result_id;

        INSERT INTO opinion_group_lineage_scope (
            conversation_id,
            opinion_group_variant_id,
            created_at
        )
        VALUES (
            backfill_conversation.conversation_id,
            backfill_conversation.opinion_group_variant_id,
            backfill_conversation.polis_content_created_at
        )
        ON CONFLICT (conversation_id, opinion_group_variant_id) DO NOTHING;

        SELECT id
        INTO lineage_scope_id
        FROM opinion_group_lineage_scope
        WHERE conversation_id = backfill_conversation.conversation_id
          AND opinion_group_variant_id = backfill_conversation.opinion_group_variant_id;

        INSERT INTO opinion_group_candidate (
            snapshot_result_id,
            opinion_group_variant_id,
            scope_id,
            outcome,
            outcome_reason,
            raw_output,
            created_at
        )
        VALUES (
            snapshot_result_id,
            backfill_conversation.opinion_group_variant_id,
            lineage_scope_id,
            'success',
            NULL,
            jsonb_build_object(
                'legacy_source',
                'polis_content.raw_data',
                'polis_content_id',
                backfill_conversation.polis_content_id,
                'raw_data',
                backfill_conversation.raw_data
            ),
            backfill_conversation.polis_content_created_at
        )
        RETURNING id INTO candidate_id;

        IF backfill_conversation.group_count = 2
           AND backfill_conversation.min_group_num_users = 1 THEN
            INSERT INTO opinion_group_candidate_assessment (
                candidate_id,
                hidden_reason,
                created_at
            )
            VALUES (
                candidate_id,
                'singleton_group',
                backfill_conversation.polis_content_created_at
            );
        END IF;

        WITH inserted_snapshot_opinions AS (
            INSERT INTO analysis_snapshot_opinion (
                analysis_snapshot_id,
                opinion_id,
                opinion_content_id,
                local_opinion_index,
                num_agrees,
                num_disagrees,
                num_passes,
                routing_priority,
                created_at
            )
            SELECT
                analysis_snapshot_id,
                opinion.id,
                opinion.current_content_id,
                row_number() OVER (ORDER BY opinion.id) - 1,
                opinion.num_agrees,
                opinion.num_disagrees,
                opinion.num_passes,
                opinion.polis_priority,
                backfill_conversation.polis_content_created_at
            FROM opinion
            WHERE opinion.conversation_id = backfill_conversation.conversation_id
              AND opinion.current_content_id IS NOT NULL
            RETURNING id, opinion_id
        )
        INSERT INTO tmp_snapshot_opinion_map (opinion_id, analysis_snapshot_opinion_id)
        SELECT opinion_id, id
        FROM inserted_snapshot_opinions;

        INSERT INTO opinion_group_candidate_opinion_metrics (
            candidate_id,
            analysis_snapshot_opinion_id,
            group_aware_consensus_agree,
            group_aware_consensus_disagree,
            divisiveness,
            majority_type,
            majority_probability_success,
            agreement_rank,
            disagreement_rank,
            divisiveness_rank,
            created_at
        )
        SELECT
            candidate_id,
            snapshot_map.analysis_snapshot_opinion_id,
            opinion.polis_ga_consensus_pa,
            opinion.polis_ga_consensus_pd,
            opinion.polis_divisiveness,
            opinion.polis_majority_type,
            opinion.polis_majority_ps,
            NULL,
            NULL,
            NULL,
            backfill_conversation.polis_content_created_at
        FROM opinion
        JOIN tmp_snapshot_opinion_map snapshot_map
            ON snapshot_map.opinion_id = opinion.id
        WHERE opinion.conversation_id = backfill_conversation.conversation_id
          AND opinion.current_content_id IS NOT NULL;

        FOR legacy_cluster IN
            SELECT
                cluster.id AS legacy_cluster_id,
                cluster.key,
                cluster.external_id,
                cluster.num_users,
                cluster.ai_label,
                cluster.ai_summary,
                cluster.created_at,
                cluster.updated_at
            FROM polis_cluster cluster
            WHERE cluster.polis_content_id = backfill_conversation.polis_content_id
            ORDER BY cluster.key
        LOOP
            description_id := NULL;

            IF legacy_cluster.ai_label IS NOT NULL
               AND legacy_cluster.ai_summary IS NOT NULL THEN
                INSERT INTO opinion_group_description (
                    locale,
                    label,
                    summary,
                    created_at
                )
                VALUES (
                    'en',
                    legacy_cluster.ai_label,
                    legacy_cluster.ai_summary,
                    legacy_cluster.updated_at
                )
                RETURNING id INTO description_id;

                INSERT INTO opinion_group_description_translation (
                    description_id,
                    locale,
                    label,
                    summary,
                    created_at
                )
                SELECT
                    description_id,
                    translation.language_code,
                    translation.ai_label,
                    translation.ai_summary,
                    translation.updated_at
                FROM polis_cluster_translation translation
                WHERE translation.polis_cluster_id = legacy_cluster.legacy_cluster_id
                  AND translation.language_code <> 'en'
                  AND translation.ai_label IS NOT NULL
                  AND translation.ai_summary IS NOT NULL;
            END IF;

            INSERT INTO opinion_group_lineage (
                scope_id,
                system_description_id,
                admin_description_id,
                created_at
            )
            VALUES (
                lineage_scope_id,
                description_id,
                NULL,
                legacy_cluster.created_at
            )
            RETURNING id INTO lineage_id;

            INSERT INTO opinion_group (
                candidate_id,
                scope_id,
                lineage_id,
                key,
                external_id,
                num_users,
                created_at
            )
            VALUES (
                candidate_id,
                lineage_scope_id,
                lineage_id,
                legacy_cluster.key::text,
                legacy_cluster.external_id,
                legacy_cluster.num_users,
                legacy_cluster.created_at
            )
            RETURNING id INTO group_id;

            INSERT INTO tmp_group_map (legacy_cluster_id, group_id)
            VALUES (legacy_cluster.legacy_cluster_id, group_id);
        END LOOP;

        INSERT INTO opinion_group_user (
            candidate_id,
            group_id,
            user_id,
            created_at
        )
        SELECT
            candidate_id,
            group_map.group_id,
            cluster_user.user_id,
            cluster_user.created_at
        FROM polis_cluster_user cluster_user
        JOIN tmp_group_map group_map
            ON group_map.legacy_cluster_id = cluster_user.polis_cluster_id
        WHERE cluster_user.polis_content_id = backfill_conversation.polis_content_id;

        INSERT INTO tmp_group_participant_map (group_id, participant_id)
        SELECT
            group_map.group_id,
            cluster_user.user_id
        FROM polis_cluster_user cluster_user
        JOIN tmp_group_map group_map
            ON group_map.legacy_cluster_id = cluster_user.polis_cluster_id
        WHERE cluster_user.polis_content_id = backfill_conversation.polis_content_id;

        WITH legacy_group_opinion_counts AS (
            SELECT
                opinion.id AS opinion_id,
                legacy_counts.legacy_cluster_id,
                legacy_counts.num_agrees,
                legacy_counts.num_disagrees,
                legacy_counts.num_passes
            FROM opinion
            CROSS JOIN LATERAL (
                VALUES
                    (opinion.cluster_0_id, opinion.cluster_0_num_agrees, opinion.cluster_0_num_disagrees, opinion.cluster_0_num_passes),
                    (opinion.cluster_1_id, opinion.cluster_1_num_agrees, opinion.cluster_1_num_disagrees, opinion.cluster_1_num_passes),
                    (opinion.cluster_2_id, opinion.cluster_2_num_agrees, opinion.cluster_2_num_disagrees, opinion.cluster_2_num_passes),
                    (opinion.cluster_3_id, opinion.cluster_3_num_agrees, opinion.cluster_3_num_disagrees, opinion.cluster_3_num_passes),
                    (opinion.cluster_4_id, opinion.cluster_4_num_agrees, opinion.cluster_4_num_disagrees, opinion.cluster_4_num_passes),
                    (opinion.cluster_5_id, opinion.cluster_5_num_agrees, opinion.cluster_5_num_disagrees, opinion.cluster_5_num_passes)
            ) AS legacy_counts(legacy_cluster_id, num_agrees, num_disagrees, num_passes)
            WHERE opinion.conversation_id = backfill_conversation.conversation_id
              AND opinion.current_content_id IS NOT NULL
              AND legacy_counts.legacy_cluster_id IS NOT NULL
        )
        INSERT INTO opinion_group_opinion_stats (
            group_id,
            analysis_snapshot_opinion_id,
            num_agrees,
            num_disagrees,
            num_passes,
            representative_agreement_type,
            representative_probability_agreement,
            representative_number_agreement,
            raw_repness,
            created_at
        )
        SELECT
            group_map.group_id,
            snapshot_map.analysis_snapshot_opinion_id,
            legacy_counts.num_agrees,
            legacy_counts.num_disagrees,
            legacy_counts.num_passes,
            cluster_opinion.agreement_type,
            cluster_opinion.probability_agreement,
            cluster_opinion.number_agreement,
            cluster_opinion.raw_repness,
            backfill_conversation.polis_content_created_at
        FROM legacy_group_opinion_counts legacy_counts
        JOIN tmp_group_map group_map
            ON group_map.legacy_cluster_id = legacy_counts.legacy_cluster_id
        JOIN tmp_snapshot_opinion_map snapshot_map
            ON snapshot_map.opinion_id = legacy_counts.opinion_id
        LEFT JOIN polis_cluster_opinion cluster_opinion
            ON cluster_opinion.polis_cluster_id = legacy_counts.legacy_cluster_id
           AND cluster_opinion.opinion_id = legacy_counts.opinion_id
           AND (
               cluster_opinion.polis_content_id = backfill_conversation.polis_content_id
               OR cluster_opinion.polis_content_id IS NULL
           );

        SELECT
            survey_config.id,
            survey_config.current_revision,
            survey_config.is_optional
        INTO
            active_survey_config_id,
            active_survey_current_revision,
            active_survey_is_optional
        FROM survey_config
        WHERE survey_config.conversation_id = backfill_conversation.conversation_id
          AND survey_config.deleted_at IS NULL
        ORDER BY survey_config.id
        LIMIT 1;

        IF active_survey_config_id IS NOT NULL THEN
            INSERT INTO tmp_survey_question_meta (
                question_id,
                question_slug_id,
                question_order,
                question_type,
                question_text,
                is_required,
                question_semantic_version,
                min_selections,
                max_selections
            )
            SELECT
                survey_question.id,
                survey_question.slug_id,
                survey_question.display_order,
                survey_question.question_type,
                survey_question_content.question_text,
                survey_question.is_required,
                survey_question.current_semantic_version,
                GREATEST(
                    COALESCE(
                        (survey_question_content.constraints ->> 'minSelections')::integer,
                        1
                    ),
                    1
                ),
                CASE
                    WHEN survey_question_content.constraints ? 'maxSelections'
                        THEN (survey_question_content.constraints ->> 'maxSelections')::integer
                    ELSE NULL
                END
            FROM survey_question
            JOIN survey_question_content
                ON survey_question.current_content_id = survey_question_content.id
            WHERE survey_question.survey_config_id = active_survey_config_id
              AND survey_question.current_content_id IS NOT NULL
              AND survey_question.question_type = 'choice'
            ORDER BY survey_question.display_order, survey_question.slug_id;

            INSERT INTO tmp_survey_option_meta (
                survey_question_option_id,
                question_id,
                option_slug_id,
                option_order,
                option_text
            )
            SELECT
                survey_question_option.id,
                survey_question_option.survey_question_id,
                survey_question_option.slug_id,
                survey_question_option.display_order,
                survey_question_option_content.option_text
            FROM survey_question_option
            JOIN tmp_survey_question_meta question_meta
                ON question_meta.question_id = survey_question_option.survey_question_id
            JOIN survey_question_option_content
                ON survey_question_option.current_content_id = survey_question_option_content.id
            WHERE survey_question_option.current_content_id IS NOT NULL
            ORDER BY question_meta.question_order, survey_question_option.display_order, survey_question_option.slug_id;

            INSERT INTO tmp_required_survey_question_meta (
                question_id,
                question_type,
                question_semantic_version,
                min_selections,
                max_selections
            )
            SELECT
                survey_question.id,
                survey_question.question_type,
                survey_question.current_semantic_version,
                GREATEST(
                    COALESCE(
                        (survey_question_content.constraints ->> 'minSelections')::integer,
                        1
                    ),
                    1
                ),
                CASE
                    WHEN survey_question_content.constraints ? 'maxSelections'
                        THEN (survey_question_content.constraints ->> 'maxSelections')::integer
                    ELSE NULL
                END
            FROM survey_question
            JOIN survey_question_content
                ON survey_question.current_content_id = survey_question_content.id
            WHERE survey_question.survey_config_id = active_survey_config_id
              AND survey_question.current_content_id IS NOT NULL
              AND survey_question.is_required = true
            ORDER BY survey_question.display_order, survey_question.slug_id;

            INSERT INTO tmp_counted_survey_participant (participant_id)
            SELECT DISTINCT vote.author_id
            FROM vote
            JOIN opinion
                ON opinion.id = vote.opinion_id
            JOIN "user"
                ON "user".id = vote.author_id
            LEFT JOIN opinion_moderation
                ON opinion_moderation.opinion_id = opinion.id
            WHERE opinion.conversation_id = backfill_conversation.conversation_id
              AND "user".is_deleted = false
              AND opinion_moderation.id IS NULL
              AND opinion.current_content_id IS NOT NULL
              AND vote.current_content_id IS NOT NULL;

            INSERT INTO tmp_counted_survey_response (response_id, participant_id)
            WITH base_responses AS (
                SELECT
                    survey_response.id AS response_id,
                    survey_response.participant_id
                FROM survey_response
                JOIN "user"
                    ON "user".id = survey_response.participant_id
                JOIN tmp_counted_survey_participant counted_participant
                    ON counted_participant.participant_id = survey_response.participant_id
                WHERE survey_response.conversation_id = backfill_conversation.conversation_id
                  AND "user".is_deleted = false
                  AND survey_response.withdrawn_at IS NULL
            )
            SELECT
                base_responses.response_id,
                base_responses.participant_id
            FROM base_responses
            WHERE active_survey_is_optional
               OR NOT EXISTS (
                   SELECT 1
                   FROM tmp_required_survey_question_meta required_question
                   WHERE NOT EXISTS (
                       SELECT 1
                       FROM survey_answer
                       WHERE survey_answer.survey_response_id = base_responses.response_id
                         AND survey_answer.survey_question_id = required_question.question_id
                         AND survey_answer.deleted_at IS NULL
                         AND survey_answer.answered_question_semantic_version = required_question.question_semantic_version
                         AND (
                             required_question.question_type <> 'choice'
                             OR (
                                 SELECT
                                     count(survey_answer_option.id) = count(option_meta.survey_question_option_id)
                                     AND count(survey_answer_option.id) = count(DISTINCT survey_answer_option.survey_question_option_id)
                                     AND count(survey_answer_option.id) >= required_question.min_selections
                                     AND (
                                         required_question.max_selections IS NULL
                                         OR count(survey_answer_option.id) <= required_question.max_selections
                                     )
                                 FROM survey_answer_option
                                 LEFT JOIN tmp_survey_option_meta option_meta
                                     ON option_meta.survey_question_option_id = survey_answer_option.survey_question_option_id
                                    AND option_meta.question_id = required_question.question_id
                                 WHERE survey_answer_option.survey_answer_id = survey_answer.id
                                   AND survey_answer_option.deleted_at IS NULL
                             )
                         )
                   )
               );

            INSERT INTO survey_aggregate_snapshot (
                conversation_id,
                analysis_snapshot_id,
                survey_config_id,
                survey_config_revision,
                suppression_threshold,
                created_at
            )
            VALUES (
                backfill_conversation.conversation_id,
                analysis_snapshot_id,
                active_survey_config_id,
                active_survey_current_revision,
                5,
                backfill_conversation.polis_content_updated_at
            )
            RETURNING id INTO survey_aggregate_snapshot_id;

            INSERT INTO survey_aggregate_question (
                survey_aggregate_snapshot_id,
                survey_question_id,
                question_slug_id,
                question_order,
                question_type,
                question_text,
                is_required,
                question_semantic_version,
                created_at
            )
            SELECT
                survey_aggregate_snapshot_id,
                question_id,
                question_slug_id,
                question_order,
                question_type,
                question_text,
                is_required,
                question_semantic_version,
                backfill_conversation.polis_content_updated_at
            FROM tmp_survey_question_meta;

            INSERT INTO survey_aggregate_option (
                survey_aggregate_question_id,
                survey_question_option_id,
                option_slug_id,
                option_order,
                option_text,
                created_at
            )
            SELECT
                aggregate_question.id,
                option_meta.survey_question_option_id,
                option_meta.option_slug_id,
                option_meta.option_order,
                option_meta.option_text,
                backfill_conversation.polis_content_updated_at
            FROM tmp_survey_option_meta option_meta
            JOIN tmp_survey_question_meta question_meta
                ON question_meta.question_id = option_meta.question_id
            JOIN survey_aggregate_question aggregate_question
                ON aggregate_question.survey_aggregate_snapshot_id = survey_aggregate_snapshot_id
               AND aggregate_question.question_slug_id = question_meta.question_slug_id;

            WITH eligible_responses AS (
                SELECT
                    response_id,
                    participant_id
                FROM tmp_counted_survey_response
            ),
            valid_choice_answers AS (
                SELECT
                    eligible_responses.response_id,
                    eligible_responses.participant_id,
                    question_meta.question_id
                FROM eligible_responses
                JOIN tmp_survey_question_meta question_meta
                    ON TRUE
                JOIN survey_answer
                    ON survey_answer.survey_response_id = eligible_responses.response_id
                   AND survey_answer.survey_question_id = question_meta.question_id
                   AND survey_answer.deleted_at IS NULL
                LEFT JOIN survey_answer_option
                    ON survey_answer_option.survey_answer_id = survey_answer.id
                   AND survey_answer_option.deleted_at IS NULL
                LEFT JOIN tmp_survey_option_meta option_meta
                    ON option_meta.survey_question_option_id = survey_answer_option.survey_question_option_id
                   AND option_meta.question_id = question_meta.question_id
                GROUP BY
                    eligible_responses.response_id,
                    eligible_responses.participant_id,
                    question_meta.question_id,
                    survey_answer.answered_question_semantic_version,
                    question_meta.question_semantic_version,
                    question_meta.min_selections,
                    question_meta.max_selections
                HAVING survey_answer.answered_question_semantic_version = question_meta.question_semantic_version
                   AND count(survey_answer_option.id) = count(option_meta.survey_question_option_id)
                   AND count(survey_answer_option.id) = count(DISTINCT survey_answer_option.survey_question_option_id)
                   AND count(survey_answer_option.id) >= question_meta.min_selections
                   AND (
                       question_meta.max_selections IS NULL
                       OR count(survey_answer_option.id) <= question_meta.max_selections
                   )
            ),
            selected_options AS (
                SELECT
                    valid_choice_answers.response_id,
                    valid_choice_answers.participant_id,
                    valid_choice_answers.question_id,
                    option_meta.survey_question_option_id
                FROM valid_choice_answers
                JOIN survey_answer
                    ON survey_answer.survey_response_id = valid_choice_answers.response_id
                   AND survey_answer.survey_question_id = valid_choice_answers.question_id
                   AND survey_answer.deleted_at IS NULL
                JOIN survey_answer_option
                    ON survey_answer_option.survey_answer_id = survey_answer.id
                   AND survey_answer_option.deleted_at IS NULL
                JOIN tmp_survey_option_meta option_meta
                    ON option_meta.survey_question_option_id = survey_answer_option.survey_question_option_id
                   AND option_meta.question_id = valid_choice_answers.question_id
            ),
            overall_option_counts AS (
                SELECT
                    question_meta.question_id,
                    option_meta.survey_question_option_id,
                    option_meta.option_slug_id,
                    option_meta.option_order,
                    option_meta.option_text,
                    count(selected_options.response_id)::integer AS option_count,
                    count(DISTINCT valid_choice_answers.response_id)::integer AS denominator
                FROM tmp_survey_question_meta question_meta
                JOIN tmp_survey_option_meta option_meta
                    ON option_meta.question_id = question_meta.question_id
                LEFT JOIN valid_choice_answers
                    ON valid_choice_answers.question_id = question_meta.question_id
                LEFT JOIN selected_options
                    ON selected_options.response_id = valid_choice_answers.response_id
                   AND selected_options.question_id = question_meta.question_id
                   AND selected_options.survey_question_option_id = option_meta.survey_question_option_id
                GROUP BY
                    question_meta.question_id,
                    option_meta.survey_question_option_id,
                    option_meta.option_slug_id,
                    option_meta.option_order,
                    option_meta.option_text
            ),
            overall_question_suppression AS (
                SELECT
                    question_id,
                    bool_or(option_count > 0 AND option_count < 5) AS is_suppressed
                FROM overall_option_counts
                GROUP BY question_id
            )
            INSERT INTO tmp_survey_overall_option_count (
                question_id,
                survey_question_option_id,
                option_slug_id,
                option_order,
                option_text,
                option_count,
                denominator,
                is_suppressed
            )
            SELECT
                overall_option_counts.question_id,
                overall_option_counts.survey_question_option_id,
                overall_option_counts.option_slug_id,
                overall_option_counts.option_order,
                overall_option_counts.option_text,
                overall_option_counts.option_count,
                overall_option_counts.denominator,
                COALESCE(overall_question_suppression.is_suppressed, false)
            FROM overall_option_counts
            LEFT JOIN overall_question_suppression
                ON overall_question_suppression.question_id = overall_option_counts.question_id;

            WITH eligible_responses AS (
                SELECT
                    response_id,
                    participant_id
                FROM tmp_counted_survey_response
            ),
            valid_choice_answers AS (
                SELECT
                    eligible_responses.response_id,
                    eligible_responses.participant_id,
                    question_meta.question_id
                FROM eligible_responses
                JOIN tmp_survey_question_meta question_meta
                    ON TRUE
                JOIN survey_answer
                    ON survey_answer.survey_response_id = eligible_responses.response_id
                   AND survey_answer.survey_question_id = question_meta.question_id
                   AND survey_answer.deleted_at IS NULL
                LEFT JOIN survey_answer_option
                    ON survey_answer_option.survey_answer_id = survey_answer.id
                   AND survey_answer_option.deleted_at IS NULL
                LEFT JOIN tmp_survey_option_meta option_meta
                    ON option_meta.survey_question_option_id = survey_answer_option.survey_question_option_id
                   AND option_meta.question_id = question_meta.question_id
                GROUP BY
                    eligible_responses.response_id,
                    eligible_responses.participant_id,
                    question_meta.question_id,
                    survey_answer.answered_question_semantic_version,
                    question_meta.question_semantic_version,
                    question_meta.min_selections,
                    question_meta.max_selections
                HAVING survey_answer.answered_question_semantic_version = question_meta.question_semantic_version
                   AND count(survey_answer_option.id) = count(option_meta.survey_question_option_id)
                   AND count(survey_answer_option.id) = count(DISTINCT survey_answer_option.survey_question_option_id)
                   AND count(survey_answer_option.id) >= question_meta.min_selections
                   AND (
                       question_meta.max_selections IS NULL
                       OR count(survey_answer_option.id) <= question_meta.max_selections
                   )
            ),
            selected_options AS (
                SELECT
                    valid_choice_answers.response_id,
                    valid_choice_answers.participant_id,
                    valid_choice_answers.question_id,
                    option_meta.survey_question_option_id
                FROM valid_choice_answers
                JOIN survey_answer
                    ON survey_answer.survey_response_id = valid_choice_answers.response_id
                   AND survey_answer.survey_question_id = valid_choice_answers.question_id
                   AND survey_answer.deleted_at IS NULL
                JOIN survey_answer_option
                    ON survey_answer_option.survey_answer_id = survey_answer.id
                   AND survey_answer_option.deleted_at IS NULL
                JOIN tmp_survey_option_meta option_meta
                    ON option_meta.survey_question_option_id = survey_answer_option.survey_question_option_id
                   AND option_meta.question_id = valid_choice_answers.question_id
            ),
            group_option_counts AS (
                SELECT
                    group_map.group_id,
                    question_meta.question_id,
                    option_meta.survey_question_option_id,
                    option_meta.option_slug_id,
                    option_meta.option_order,
                    option_meta.option_text,
                    count(selected_options.response_id)::integer AS option_count,
                    count(DISTINCT valid_choice_answers.response_id)::integer AS denominator
                FROM tmp_group_map group_map
                JOIN tmp_survey_question_meta question_meta
                    ON TRUE
                JOIN tmp_survey_option_meta option_meta
                    ON option_meta.question_id = question_meta.question_id
                LEFT JOIN tmp_group_participant_map group_participant
                    ON group_participant.group_id = group_map.group_id
                LEFT JOIN valid_choice_answers
                    ON valid_choice_answers.question_id = question_meta.question_id
                   AND valid_choice_answers.participant_id = group_participant.participant_id
                LEFT JOIN selected_options
                    ON selected_options.response_id = valid_choice_answers.response_id
                   AND selected_options.question_id = question_meta.question_id
                   AND selected_options.survey_question_option_id = option_meta.survey_question_option_id
                GROUP BY
                    group_map.group_id,
                    question_meta.question_id,
                    option_meta.survey_question_option_id,
                    option_meta.option_slug_id,
                    option_meta.option_order,
                    option_meta.option_text
            ),
            group_question_suppression AS (
                SELECT
                    group_id,
                    question_id,
                    bool_or(option_count > 0 AND option_count < 5) AS is_suppressed
                FROM group_option_counts
                GROUP BY group_id, question_id
            )
            INSERT INTO tmp_survey_group_option_count (
                group_id,
                question_id,
                survey_question_option_id,
                option_slug_id,
                option_order,
                option_text,
                option_count,
                denominator,
                is_suppressed
            )
            SELECT
                group_option_counts.group_id,
                group_option_counts.question_id,
                group_option_counts.survey_question_option_id,
                group_option_counts.option_slug_id,
                group_option_counts.option_order,
                group_option_counts.option_text,
                group_option_counts.option_count,
                group_option_counts.denominator,
                COALESCE(group_question_suppression.is_suppressed, false)
            FROM group_option_counts
            LEFT JOIN group_question_suppression
                ON group_question_suppression.group_id = group_option_counts.group_id
               AND group_question_suppression.question_id = group_option_counts.question_id;

            INSERT INTO survey_aggregate_result (
                survey_aggregate_snapshot_id,
                candidate_id,
                group_id,
                scope,
                survey_aggregate_question_id,
                survey_aggregate_option_id,
                count,
                percentage,
                is_suppressed,
                suppression_reason,
                created_at
            )
            SELECT
                survey_aggregate_snapshot_id,
                NULL,
                NULL,
                'overall',
                aggregate_question.id,
                aggregate_option.id,
                CASE
                    WHEN overall_count.is_suppressed THEN NULL
                    ELSE overall_count.option_count
                END,
                CASE
                    WHEN overall_count.is_suppressed OR overall_count.denominator = 0
                        THEN NULL
                    ELSE round(
                        (overall_count.option_count::numeric * 100.0)
                        / overall_count.denominator,
                        2
                    )::real
                END,
                overall_count.is_suppressed,
                CASE
                    WHEN overall_count.is_suppressed
                        THEN 'count_below_threshold'::survey_aggregate_suppression_reason_enum
                    ELSE NULL
                END,
                backfill_conversation.polis_content_updated_at
            FROM tmp_survey_overall_option_count overall_count
            JOIN survey_aggregate_question aggregate_question
                ON aggregate_question.survey_aggregate_snapshot_id = survey_aggregate_snapshot_id
               AND aggregate_question.survey_question_id = overall_count.question_id
            JOIN survey_aggregate_option aggregate_option
                ON aggregate_option.survey_aggregate_question_id = aggregate_question.id
               AND aggregate_option.survey_question_option_id = overall_count.survey_question_option_id;

            INSERT INTO survey_aggregate_result (
                survey_aggregate_snapshot_id,
                candidate_id,
                group_id,
                scope,
                survey_aggregate_question_id,
                survey_aggregate_option_id,
                count,
                percentage,
                is_suppressed,
                suppression_reason,
                created_at
            )
            SELECT
                survey_aggregate_snapshot_id,
                candidate_id,
                group_count.group_id,
                'opinion_group',
                aggregate_question.id,
                aggregate_option.id,
                CASE
                    WHEN group_count.is_suppressed THEN NULL
                    ELSE group_count.option_count
                END,
                CASE
                    WHEN group_count.is_suppressed OR group_count.denominator = 0
                        THEN NULL
                    ELSE round(
                        (group_count.option_count::numeric * 100.0)
                        / group_count.denominator,
                        2
                    )::real
                END,
                group_count.is_suppressed,
                CASE
                    WHEN group_count.is_suppressed
                        THEN 'cluster_deductive_disclosure'::survey_aggregate_suppression_reason_enum
                    ELSE NULL
                END,
                backfill_conversation.polis_content_updated_at
            FROM tmp_survey_group_option_count group_count
            JOIN survey_aggregate_question aggregate_question
                ON aggregate_question.survey_aggregate_snapshot_id = survey_aggregate_snapshot_id
               AND aggregate_question.survey_question_id = group_count.question_id
            JOIN survey_aggregate_option aggregate_option
                ON aggregate_option.survey_aggregate_question_id = aggregate_question.id
               AND aggregate_option.survey_question_option_id = group_count.survey_question_option_id;

            SELECT COALESCE(
                jsonb_agg(
                    row_json
                    ORDER BY
                        question_order,
                        question_slug_id,
                        scope_sort,
                        group_key,
                        option_order,
                        option_slug_id
                ),
                '[]'::jsonb
            )
            INTO owner_current_rows
            FROM (
                SELECT
                    question_meta.question_order,
                    question_meta.question_slug_id,
                    0 AS scope_sort,
                    ''::text AS group_key,
                    overall_count.option_order,
                    overall_count.option_slug_id,
                    jsonb_build_object(
                        'scope', 'overall',
                        'candidateId', NULL,
                        'groupId', NULL,
                        'questionId', question_meta.question_slug_id,
                        'questionType', question_meta.question_type::text,
                        'question', question_meta.question_text,
                        'optionId', overall_count.option_slug_id,
                        'option', overall_count.option_text,
                        'count', overall_count.option_count,
                        'percentage', CASE
                            WHEN overall_count.denominator = 0 THEN NULL
                            ELSE round(
                                (overall_count.option_count::numeric * 100.0)
                                / overall_count.denominator,
                                2
                            )::real
                        END
                    ) AS row_json
                FROM tmp_survey_overall_option_count overall_count
                JOIN tmp_survey_question_meta question_meta
                    ON question_meta.question_id = overall_count.question_id

                UNION ALL

                SELECT
                    question_meta.question_order,
                    question_meta.question_slug_id,
                    1 AS scope_sort,
                    opinion_group.key,
                    group_count.option_order,
                    group_count.option_slug_id,
                    jsonb_build_object(
                        'scope', 'cluster',
                        'candidateId', candidate_id,
                        'groupId', group_count.group_id,
                        'questionId', question_meta.question_slug_id,
                        'questionType', question_meta.question_type::text,
                        'question', question_meta.question_text,
                        'optionId', group_count.option_slug_id,
                        'option', group_count.option_text,
                        'count', group_count.option_count,
                        'percentage', CASE
                            WHEN group_count.denominator = 0 THEN NULL
                            ELSE round(
                                (group_count.option_count::numeric * 100.0)
                                / group_count.denominator,
                                2
                            )::real
                        END
                    ) AS row_json
                FROM tmp_survey_group_option_count group_count
                JOIN tmp_survey_question_meta question_meta
                    ON question_meta.question_id = group_count.question_id
                JOIN opinion_group
                    ON opinion_group.id = group_count.group_id
            ) owner_rows;

            INSERT INTO survey_aggregate_owner_current (
                conversation_id,
                survey_aggregate_snapshot_id,
                survey_config_id,
                survey_config_revision,
                rows,
                created_at,
                updated_at
            )
            VALUES (
                backfill_conversation.conversation_id,
                survey_aggregate_snapshot_id,
                active_survey_config_id,
                active_survey_current_revision,
                owner_current_rows,
                backfill_conversation.polis_content_updated_at,
                backfill_conversation.polis_content_updated_at
            )
            ON CONFLICT (conversation_id) DO UPDATE
            SET
                survey_aggregate_snapshot_id = excluded.survey_aggregate_snapshot_id,
                survey_config_id = excluded.survey_config_id,
                survey_config_revision = excluded.survey_config_revision,
                rows = excluded.rows,
                updated_at = excluded.updated_at;
        END IF;

        INSERT INTO conversation_view_snapshot (
            conversation_id,
            opinion_group_spec_id,
            analysis_snapshot_id,
            survey_aggregate_snapshot_id,
            conversation_content_id,
            view_reason,
            is_closed,
            opinion_count,
            vote_count,
            participant_count,
            total_opinion_count,
            total_vote_count,
            total_participant_count,
            moderated_opinion_count,
            hidden_opinion_count,
            activated_at,
            created_at
        )
        VALUES (
            backfill_conversation.conversation_id,
            default_opinion_group_spec_id,
            analysis_snapshot_id,
            survey_aggregate_snapshot_id,
            backfill_conversation.conversation_content_id,
            'analysis_completed',
            backfill_conversation.is_closed,
            backfill_conversation.opinion_count,
            backfill_conversation.vote_count,
            backfill_conversation.participant_count,
            backfill_conversation.total_opinion_count,
            backfill_conversation.total_vote_count,
            backfill_conversation.total_participant_count,
            backfill_conversation.moderated_opinion_count,
            backfill_conversation.hidden_opinion_count,
            backfill_conversation.polis_content_updated_at,
            backfill_conversation.polis_content_updated_at
        )
        RETURNING id INTO view_snapshot_id;

        INSERT INTO opinion_group_description_locale_status (
            conversation_view_snapshot_id,
            conversation_id,
            opinion_group_spec_id,
            analysis_snapshot_result_id,
            locale,
            status,
            created_at,
            updated_at
        )
        SELECT
            view_snapshot_id,
            backfill_conversation.conversation_id,
            default_opinion_group_spec_id,
            snapshot_result_id,
            supported_locale.locale,
            'fallback',
            backfill_conversation.polis_content_updated_at,
            backfill_conversation.polis_content_updated_at
        FROM (
            VALUES
                ('en'),
                ('es'),
                ('fr'),
                ('zh-Hant'),
                ('zh-Hans'),
                ('ja'),
                ('ar'),
                ('fa'),
                ('he'),
                ('ky'),
                ('ru')
        ) AS supported_locale(locale)
        ON CONFLICT (conversation_view_snapshot_id, locale) DO NOTHING;

        INSERT INTO conversation_view_snapshot_checkpoint_reason (
            conversation_view_snapshot_id,
            conversation_id,
            opinion_group_spec_id,
            reason,
            created_at
        )
        VALUES (
            view_snapshot_id,
            backfill_conversation.conversation_id,
            default_opinion_group_spec_id,
            'first_displayable_analysis',
            backfill_conversation.polis_content_updated_at
        );

        INSERT INTO conversation_view_snapshot_checkpoint_reason (
            conversation_view_snapshot_id,
            conversation_id,
            opinion_group_spec_id,
            reason,
            group_count,
            created_at
        )
        VALUES (
            view_snapshot_id,
            backfill_conversation.conversation_id,
            default_opinion_group_spec_id,
            'first_group_count_available',
            backfill_conversation.group_count,
            backfill_conversation.polis_content_updated_at
        );

        IF backfill_conversation.is_closed THEN
            INSERT INTO conversation_view_snapshot_checkpoint_reason (
                conversation_view_snapshot_id,
                conversation_id,
                opinion_group_spec_id,
                reason,
                created_at
            )
            VALUES (
                view_snapshot_id,
                backfill_conversation.conversation_id,
                default_opinion_group_spec_id,
                'conversation_closed',
                backfill_conversation.polis_content_updated_at
            );
        END IF;
    END LOOP;
END $$;
