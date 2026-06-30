-- Backfill project-level language defaults and localization rows after the schema
-- migration that introduces project/organization language tables and columns.

UPDATE organization
SET default_language_code = 'en'
WHERE default_language_code IS NULL;

INSERT INTO organization_localization (
    organization_id,
    language_code,
    display_name,
    description,
    website_url,
    image_path,
    is_full_image_path,
    created_at,
    updated_at
)
SELECT
    id,
    default_language_code,
    display_name,
    COALESCE(description, ''),
    website_url,
    image_path,
    is_full_image_path,
    created_at,
    updated_at
FROM organization
ON CONFLICT (organization_id, language_code) DO NOTHING;

WITH inserted_project_content AS (
    INSERT INTO project_content (
        project_id,
        title,
        created_at
    )
    SELECT
        id,
        title,
        created_at
    FROM project
    WHERE current_content_id IS NULL
    RETURNING id, project_id
)
UPDATE project
SET current_content_id = inserted_project_content.id
FROM inserted_project_content
WHERE project.id = inserted_project_content.project_id
  AND project.current_content_id IS NULL;

UPDATE project_external_organization
SET default_language_code = 'en'
WHERE default_language_code IS NULL;

INSERT INTO project_external_organization_localization (
    external_organization_id,
    language_code,
    display_name,
    description,
    website_url,
    image_path,
    is_full_image_path,
    created_at,
    updated_at
)
SELECT
    id,
    default_language_code,
    display_name,
    COALESCE(description, ''),
    website_url,
    image_path,
    is_full_image_path,
    created_at,
    updated_at
FROM project_external_organization
ON CONFLICT (external_organization_id, language_code)
WHERE deleted_at IS NULL
DO NOTHING;

UPDATE conversation
SET dynamic_translation_enabled = conversation_translation_setting.dynamic_translation_enabled
FROM conversation_translation_setting
WHERE conversation_translation_setting.conversation_id = conversation.id;

UPDATE conversation_content
SET
    source_language_code = COALESCE(
        conversation_content.source_language_code,
        conversation_language_setting.detected_source_language_code
    ),
    source_raw_language_code = COALESCE(
        conversation_content.source_raw_language_code,
        conversation_language_setting.detected_raw_language_code
    ),
    source_language_provider = COALESCE(
        conversation_content.source_language_provider,
        conversation_language_setting.detected_raw_language_provider
    ),
    source_language_confidence = COALESCE(
        conversation_content.source_language_confidence,
        conversation_language_setting.detection_confidence
    )
FROM conversation
JOIN conversation_language_setting
  ON conversation_language_setting.conversation_id = conversation.id
WHERE conversation.current_content_id = conversation_content.id;

UPDATE conversation_translation_target_language
SET conversation_id = conversation_translation_setting.conversation_id
FROM conversation_translation_setting
WHERE conversation_translation_target_language.translation_setting_id = conversation_translation_setting.id
  AND conversation_translation_target_language.conversation_id IS NULL;

DELETE FROM conversation_translation_target_language
USING conversation
JOIN conversation_content
  ON conversation_content.id = conversation.current_content_id
WHERE conversation_translation_target_language.conversation_id = conversation.id
  AND conversation_content.source_language_code IS NOT NULL
  AND conversation_translation_target_language.language_code::text = conversation_content.source_language_code::text;
