-- Backfill total_vote_count for all existing conversations
UPDATE conversation c
SET total_vote_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT o.conversation_id, COUNT(*) as cnt
    FROM vote v
    INNER JOIN opinion o ON v.opinion_id = o.id
    INNER JOIN "user" u ON v.author_id = u.id
    WHERE o.current_content_id IS NOT NULL
      AND v.current_content_id IS NOT NULL
      AND u.is_deleted = false
    GROUP BY o.conversation_id
) sub
WHERE c.id = sub.conversation_id;

-- Backfill total_participant_count for all existing conversations
UPDATE conversation c
SET total_participant_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT o.conversation_id, COUNT(DISTINCT v.author_id) as cnt
    FROM vote v
    INNER JOIN opinion o ON v.opinion_id = o.id
    INNER JOIN "user" u ON v.author_id = u.id
    WHERE o.current_content_id IS NOT NULL
      AND v.current_content_id IS NOT NULL
      AND u.is_deleted = false
    GROUP BY o.conversation_id
) sub
WHERE c.id = sub.conversation_id;

-- Backfill total_opinion_count, moderated_opinion_count, hidden_opinion_count (single query)
UPDATE conversation c
SET total_opinion_count = COALESCE(sub.total_cnt, 0),
    moderated_opinion_count = COALESCE(sub.mod_cnt, 0),
    hidden_opinion_count = COALESCE(sub.hid_cnt, 0)
FROM (
    SELECT o.conversation_id,
           COUNT(*) as total_cnt,
           COUNT(*) FILTER (WHERE om.moderation_action = 'move') as mod_cnt,
           COUNT(*) FILTER (WHERE om.moderation_action = 'hide') as hid_cnt
    FROM opinion o
    INNER JOIN "user" u ON o.author_id = u.id
    LEFT JOIN opinion_moderation om ON om.opinion_id = o.id
    WHERE o.current_content_id IS NOT NULL
      AND u.is_deleted = false
    GROUP BY o.conversation_id
) sub
WHERE c.id = sub.conversation_id;
