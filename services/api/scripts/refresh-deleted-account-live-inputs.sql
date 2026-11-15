-- One-time data backfill after deploying active-voter live eligibility.
-- Run transactionally, with writers stopped. Never update frozen snapshot tables.
-- Prepare its Flyway ordering when reviewing the user-generated schema migration.

WITH affected_opinions AS (
    SELECT DISTINCT v.opinion_id
    FROM vote v
    JOIN "user" voter ON voter.id = v.author_id
    WHERE voter.is_deleted AND v.current_content_id IS NOT NULL
), tallies AS (
    SELECT affected.opinion_id,
        count(*) FILTER (WHERE NOT voter.is_deleted AND content.vote = 'agree') AS agrees,
        count(*) FILTER (WHERE NOT voter.is_deleted AND content.vote = 'disagree') AS disagrees,
        count(*) FILTER (WHERE NOT voter.is_deleted AND content.vote = 'pass') AS passes
    FROM affected_opinions affected
    LEFT JOIN vote v ON v.opinion_id = affected.opinion_id AND v.current_content_id IS NOT NULL
    LEFT JOIN "user" voter ON voter.id = v.author_id
    LEFT JOIN vote_content content ON content.id = v.current_content_id
    GROUP BY affected.opinion_id
)
UPDATE opinion statement
SET num_agrees = tallies.agrees, num_disagrees = tallies.disagrees, num_passes = tallies.passes
FROM tallies
WHERE statement.id = tallies.opinion_id;

WITH affected_conversations AS (
    SELECT statement.conversation_id
    FROM opinion statement
    JOIN "user" author ON author.id = statement.author_id
    WHERE author.is_deleted AND NOT statement.is_seed AND statement.current_content_id IS NOT NULL
    UNION
    SELECT statement.conversation_id
    FROM vote v
    JOIN opinion statement ON statement.id = v.opinion_id
    JOIN "user" voter ON voter.id = v.author_id
    WHERE voter.is_deleted AND v.current_content_id IS NOT NULL
    UNION
    SELECT response.conversation_id
    FROM survey_response response
    JOIN "user" respondent ON respondent.id = response.participant_id
    WHERE respondent.is_deleted
), refreshed AS (
    UPDATE polis_conversation_config config
    SET analysis_data_generation = config.analysis_data_generation + 1
    FROM conversation c
    WHERE c.polis_config_id = config.id
      AND c.id IN (SELECT conversation_id FROM affected_conversations)
      AND c.current_content_id IS NOT NULL AND NOT c.is_importing
      AND c.closed_finalized_at IS NULL
    RETURNING config.id, config.analysis_data_generation
), retargeted AS (
    UPDATE conversation c
    SET closing_target_revision = refreshed.analysis_data_generation
    FROM refreshed
    WHERE c.polis_config_id = refreshed.id AND c.is_closed AND c.closed_finalized_at IS NULL
    RETURNING c.id
)
INSERT INTO analysis_work_state (conversation_id, opinion_group_spec_id, dirty_since)
SELECT c.id, spec.id, now()
FROM conversation c
JOIN refreshed ON refreshed.id = c.polis_config_id
CROSS JOIN (
    SELECT DISTINCT ON (key) id FROM opinion_group_spec ORDER BY key, version DESC
) spec
ON CONFLICT (conversation_id, opinion_group_spec_id) DO UPDATE
SET dirty_since = COALESCE(analysis_work_state.dirty_since, EXCLUDED.dirty_since);

WITH refreshed AS (
    UPDATE ranking_conversation_config config
    SET scoring_input_revision = config.scoring_input_revision + 1,
        scoring_invalidation_revision = config.scoring_input_revision + 1,
        updated_at = now()
    FROM conversation scope
    WHERE scope.ranking_config_id = config.id
      AND scope.current_content_id IS NOT NULL AND scope.closed_finalized_at IS NULL
      AND (EXISTS (
          SELECT 1 FROM comparison_response result
          JOIN "user" account ON account.id = result.participant_id
          WHERE result.conversation_id = scope.id AND account.is_deleted
      ) OR EXISTS (
          SELECT 1 FROM ranking_item item
          JOIN "user" account ON account.id = item.author_id
          WHERE item.conversation_id = scope.id AND NOT item.is_seed
            AND item.current_content_id IS NOT NULL AND account.is_deleted
      ))
    RETURNING config.id, config.scoring_input_revision
)
UPDATE conversation scope
SET closing_target_revision = refreshed.scoring_input_revision
FROM refreshed
WHERE scope.ranking_config_id = refreshed.id AND scope.is_closed
  AND scope.closed_finalized_at IS NULL;
