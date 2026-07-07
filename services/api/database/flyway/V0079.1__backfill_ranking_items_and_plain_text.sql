INSERT INTO polis_conversation_config (
    id,
    ai_labeling_enabled,
    analysis_data_generation,
    preferred_opinion_group_count,
    created_at,
    updated_at
)
OVERRIDING SYSTEM VALUE
SELECT
    c.id,
    c.ai_labeling_enabled,
    c.analysis_data_generation,
    c.preferred_opinion_group_count,
    c.created_at,
    c.updated_at
FROM conversation c
WHERE c.conversation_type = 'polis'
  AND c.polis_config_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM polis_conversation_config pcc
      WHERE pcc.id = c.id
  );

UPDATE conversation c
SET polis_config_id = c.id
WHERE c.conversation_type = 'polis'
  AND c.polis_config_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM polis_conversation_config pcc
      WHERE pcc.id = c.id
  );

INSERT INTO ranking_conversation_config (
    id,
    ranking_mode,
    current_ranking_score_id,
    external_source_config,
    created_at,
    updated_at
)
OVERRIDING SYSTEM VALUE
-- V0079 creates ranking_mode with bws directly on this branch.
SELECT
    c.id,
    'bws',
    c.current_ranking_score_id,
    c.external_source_config,
    c.created_at,
    c.updated_at
FROM conversation c
WHERE c.conversation_type = 'ranking'
  AND c.ranking_config_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM ranking_conversation_config rcc
      WHERE rcc.id = c.id
  );

UPDATE conversation c
SET ranking_config_id = c.id
WHERE c.conversation_type = 'ranking'
  AND c.ranking_config_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM ranking_conversation_config rcc
      WHERE rcc.id = c.id
  );

INSERT INTO conversation_import_source (
    id,
    conversation_id,
    import_url,
    import_conversation_url,
    import_export_url,
    import_created_at,
    import_author,
    import_method,
    created_at,
    updated_at
)
OVERRIDING SYSTEM VALUE
SELECT
    c.id,
    c.id,
    c.import_url,
    c.import_conversation_url,
    c.import_export_url,
    c.import_created_at,
    c.import_author,
    c.import_method,
    c.created_at,
    c.updated_at
FROM conversation c
WHERE (
      c.import_url IS NOT NULL
   OR c.import_conversation_url IS NOT NULL
   OR c.import_export_url IS NOT NULL
   OR c.import_created_at IS NOT NULL
   OR c.import_author IS NOT NULL
   OR c.import_method IS NOT NULL
)
  AND NOT EXISTS (
      SELECT 1
      FROM conversation_import_source cis
      WHERE cis.conversation_id = c.id
         OR cis.id = c.id
  );

INSERT INTO ranking_item (
    id,
    slug_id,
    author_id,
    conversation_id,
    current_content_id,
    is_seed,
    lifecycle_status,
    snapshot_score,
    snapshot_rank,
    snapshot_participant_count,
    created_at,
    updated_at
)
OVERRIDING SYSTEM VALUE
SELECT
    mi.id,
    mi.slug_id,
    mi.author_id,
    mi.conversation_id,
    NULL,
    mi.is_seed,
    mi.lifecycle_status::text::ranking_item_lifecycle_status,
    mi.snapshot_score,
    mi.snapshot_rank,
    mi.snapshot_participant_count,
    mi.created_at,
    mi.updated_at
FROM maxdiff_item mi
WHERE NOT EXISTS (
    SELECT 1
    FROM ranking_item ri
    WHERE ri.id = mi.id
       OR ri.slug_id = mi.slug_id
);

INSERT INTO ranking_item_content (
    id,
    ranking_item_id,
    conversation_content_id,
    title,
    body,
    body_plain_text,
    created_at
)
OVERRIDING SYSTEM VALUE
SELECT
    mic.id,
    mic.maxdiff_item_id,
    mic.conversation_content_id,
    mic.title,
    mic.body,
    NULL,
    mic.created_at
FROM maxdiff_item_content mic
WHERE EXISTS (
    SELECT 1
    FROM ranking_item ri
    WHERE ri.id = mic.maxdiff_item_id
)
  AND NOT EXISTS (
      SELECT 1
      FROM ranking_item_content ric
      WHERE ric.id = mic.id
  );

UPDATE ranking_item ri
SET current_content_id = mi.current_content_id
FROM maxdiff_item mi
WHERE ri.id = mi.id
  AND mi.current_content_id IS NOT NULL
  AND ri.current_content_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM ranking_item_content ric
      WHERE ric.id = mi.current_content_id
        AND ric.ranking_item_id = ri.id
  );

INSERT INTO ranking_item_external_source (
    id,
    ranking_item_id,
    conversation_id,
    source_type,
    external_id,
    external_url,
    external_metadata,
    last_synced_at,
    created_at
)
OVERRIDING SYSTEM VALUE
SELECT
    mies.id,
    mies.maxdiff_item_id,
    mies.conversation_id,
    mies.source_type,
    mies.external_id,
    mies.external_url,
    mies.external_metadata,
    mies.last_synced_at,
    mies.created_at
FROM maxdiff_item_external_source mies
WHERE EXISTS (
    SELECT 1
    FROM ranking_item ri
    WHERE ri.id = mies.maxdiff_item_id
)
  AND NOT EXISTS (
      SELECT 1
      FROM ranking_item_external_source ries
      WHERE ries.id = mies.id
         OR ries.ranking_item_id = mies.maxdiff_item_id
         OR (ries.external_id = mies.external_id AND ries.conversation_id = mies.conversation_id)
  );

SELECT setval(
    pg_get_serial_sequence('polis_conversation_config', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM polis_conversation_config), 1), 1),
    (SELECT COUNT(*) > 0 FROM polis_conversation_config)
);

SELECT setval(
    pg_get_serial_sequence('ranking_conversation_config', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM ranking_conversation_config), 1), 1),
    (SELECT COUNT(*) > 0 FROM ranking_conversation_config)
);

SELECT setval(
    pg_get_serial_sequence('conversation_import_source', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM conversation_import_source), 1), 1),
    (SELECT COUNT(*) > 0 FROM conversation_import_source)
);

SELECT setval(
    pg_get_serial_sequence('ranking_item', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM ranking_item), 1), 1),
    (SELECT COUNT(*) > 0 FROM ranking_item)
);

SELECT setval(
    pg_get_serial_sequence('ranking_item_content', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM ranking_item_content), 1), 1),
    (SELECT COUNT(*) > 0 FROM ranking_item_content)
);

SELECT setval(
    pg_get_serial_sequence('ranking_item_external_source', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM ranking_item_external_source), 1), 1),
    (SELECT COUNT(*) > 0 FROM ranking_item_external_source)
);
