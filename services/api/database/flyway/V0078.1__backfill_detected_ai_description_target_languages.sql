-- AI group descriptions are generated in English and then translated into the
-- conversation's effective display languages. V0073.1 removed target-language
-- rows matching the content source language, which is correct for content
-- translation but prevents eager AI-description translation back into the
-- conversation's detected language for existing conversations.
WITH supported_display_language AS (
    SELECT unnest(enum_range(NULL::display_language_code)) AS language_code
)
INSERT INTO conversation_translation_target_language (
    conversation_id,
    language_code,
    created_at
)
SELECT
    conversation.id,
    supported_display_language.language_code,
    now()
FROM conversation
JOIN conversation_content
  ON conversation_content.id = conversation.current_content_id
JOIN supported_display_language
  ON supported_display_language.language_code::text = conversation_content.source_language_code::text
WHERE conversation_content.source_language_code IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM conversation_translation_target_language existing_target_language
      WHERE existing_target_language.conversation_id = conversation.id
        AND existing_target_language.language_code = supported_display_language.language_code
        AND existing_target_language.deleted_at IS NULL
  )
ON CONFLICT DO NOTHING;
