-- One aggregate row for an existing, non-deleted Polis conversation.
-- Share a single snapshot; see export-survey-participation-summary.md for interpretation.
-- psql -X --csv -v ON_ERROR_STOP=1 -v conversation_slug='SLUG' -d "$DATABASE_URL" -f scripts/export-survey-participation-summary.sql > participation.csv
-- In a SQL editor, replace :'conversation_slug' with the quoted slug.
-- Targets main (V0115): content history establishes a recorded action;
-- the pointer describes its current state, not why that state changed.
WITH target AS (
    SELECT c.id
    FROM conversation c JOIN project p ON p.id = c.project_id
    WHERE c.slug_id = :'conversation_slug' AND c.conversation_type = 'polis'
      AND c.current_content_id IS NOT NULL
      AND NOT c.is_importing AND p.deleted_at IS NULL
),
respondents AS (
    SELECT
        r.completed_at IS NOT NULL AS completed,
        posts.posted OR votes.voted AS participated,
        posts.has_inactive_post,
        votes.has_inactive_vote
    FROM target t
    JOIN survey_response r ON r.conversation_id = t.id
    JOIN "user" u ON u.id = r.participant_id
    CROSS JOIN LATERAL (
        SELECT count(*) > 0 AS posted,
               bool_or(o.current_content_id IS NULL) AS has_inactive_post
        FROM opinion o
        WHERE o.conversation_id = r.conversation_id
          AND o.author_id = r.participant_id AND NOT o.is_seed
          -- Without a current pointer, require a retained content version.
          AND (o.current_content_id IS NOT NULL OR
               EXISTS (SELECT 1 FROM opinion_content oc WHERE oc.opinion_id = o.id))
    ) posts
    CROSS JOIN LATERAL (
        SELECT count(*) > 0 AS voted,
               bool_or(v.current_content_id IS NULL) AS has_inactive_vote
        FROM vote v
        JOIN opinion o ON o.id = v.opinion_id
        WHERE o.conversation_id = r.conversation_id
          AND v.author_id = r.participant_id
          -- A cancel can leave a root without a recorded vote. Only a saved
          -- version establishes a cast.
          AND (v.current_content_id IS NOT NULL OR
               EXISTS (SELECT 1 FROM vote_content vc WHERE vc.vote_id = v.id))
    ) votes
    WHERE NOT u.is_deleted
      AND r.withdrawn_at IS NULL
      AND EXISTS (
          SELECT 1 FROM survey_answer a
          WHERE a.survey_response_id = r.id AND a.deleted_at IS NULL
      )
),
counts AS (
    SELECT count(*) AS started,
           count(*) FILTER (WHERE participated) AS participants,
           count(*) FILTER (WHERE completed) AS completed,
           count(*) FILTER (WHERE has_inactive_post) AS inactive_post,
           count(*) FILTER (WHERE has_inactive_vote) AS inactive_vote
    FROM respondents
),
-- Match PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD. Check the complementary
-- group too: the published denominator would otherwise disclose its size.
privacy AS (SELECT 5 AS min_count)
SELECT
    CASE WHEN started >= min_count THEN started END AS questionnaires_commences,
    CASE WHEN participants >= min_count AND started - participants >= min_count
         THEN started - participants END AS sans_commentaire_ni_vote,
    CASE WHEN completed >= min_count AND started - completed >= min_count
         THEN completed END AS questionnaires_termines,
    CASE WHEN completed >= min_count AND started - completed >= min_count
         THEN round(100.0 * completed / nullif(started, 0), 1) END AS taux_completion_pct,
    CASE WHEN inactive_post >= min_count AND participants - inactive_post >= min_count
         THEN inactive_post END AS personnes_avec_commentaire_inactif,
    CASE WHEN inactive_vote >= min_count AND participants - inactive_vote >= min_count
         THEN inactive_vote END AS personnes_avec_vote_inactif
FROM target CROSS JOIN counts CROSS JOIN privacy;
