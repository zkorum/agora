DO $$
DECLARE
    opinion_groups_analysis_spec_id integer;
    default_opinion_group_spec_id integer;
BEGIN
    SELECT id
    INTO opinion_groups_analysis_spec_id
    FROM analysis_spec
    WHERE analysis_family = 'opinion_groups'
    ORDER BY id
    LIMIT 1;

    IF opinion_groups_analysis_spec_id IS NULL THEN
        INSERT INTO analysis_spec (analysis_family)
        VALUES ('opinion_groups')
        RETURNING id INTO opinion_groups_analysis_spec_id;
    END IF;

    SELECT id
    INTO default_opinion_group_spec_id
    FROM opinion_group_spec
    WHERE key = 'default' AND version = 1
    ORDER BY id
    LIMIT 1;

    IF default_opinion_group_spec_id IS NULL THEN
        INSERT INTO opinion_group_spec (
            analysis_spec_id,
            key,
            version,
            reducer,
            clusterer,
            selection_policy,
            min_clusterable_participants,
            min_votes_per_participant,
            max_group_count
        )
        VALUES (
            opinion_groups_analysis_spec_id,
            'default',
            1,
            'pca',
            'kmeans',
            'silhouette_size_balance',
            2,
            7,
            6
        )
        RETURNING id INTO default_opinion_group_spec_id;
    END IF;

    INSERT INTO opinion_group_variant (opinion_group_spec_id, group_count)
    VALUES
        (default_opinion_group_spec_id, 2),
        (default_opinion_group_spec_id, 3),
        (default_opinion_group_spec_id, 4),
        (default_opinion_group_spec_id, 5),
        (default_opinion_group_spec_id, 6)
    ON CONFLICT (opinion_group_spec_id, group_count) DO NOTHING;

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
    SELECT
        conversation.id,
        default_opinion_group_spec_id,
        NULL,
        NULL,
        conversation.current_content_id,
        'conversation_lifecycle_updated',
        conversation.is_closed,
        conversation.opinion_count,
        conversation.vote_count,
        conversation.participant_count,
        conversation.total_opinion_count,
        conversation.total_vote_count,
        conversation.total_participant_count,
        conversation.moderated_opinion_count,
        conversation.hidden_opinion_count,
        '1970-01-01 00:00:00'::timestamp,
        '1970-01-01 00:00:00'::timestamp
    FROM conversation
    WHERE NOT EXISTS (
        SELECT 1
        FROM conversation_view_snapshot existing_snapshot
        WHERE existing_snapshot.conversation_id = conversation.id
          AND existing_snapshot.opinion_group_spec_id = default_opinion_group_spec_id
          AND existing_snapshot.analysis_snapshot_id IS NULL
    );
END $$;
