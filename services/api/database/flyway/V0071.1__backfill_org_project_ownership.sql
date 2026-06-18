UPDATE "user"
SET first_name = username
WHERE first_name IS NULL;

WITH normalized AS (
    SELECT
        organization.id,
        organization.name AS display_name,
        lower(
            trim(
                both '-' from regexp_replace(
                    regexp_replace(organization.name, '[^[:alnum:]]+', '-', 'g'),
                    '-+',
                    '-',
                    'g'
                )
            )
        ) AS raw_slug
    FROM organization
    WHERE organization.auto_provisioned_for_user_id IS NULL
), slug_candidates AS (
    SELECT
        normalized.id,
        normalized.display_name,
        CASE
            WHEN normalized.raw_slug = '' THEN 'org-' || normalized.id::text
            ELSE left(normalized.raw_slug, 65)
        END AS base_slug
    FROM normalized
), slugged AS (
    SELECT
        slug_candidates.id,
        slug_candidates.display_name,
        CASE
            WHEN row_number() OVER (
                PARTITION BY slug_candidates.base_slug
                ORDER BY slug_candidates.id
            ) = 1 THEN slug_candidates.base_slug
            ELSE left(slug_candidates.base_slug, 58) || '-' || row_number() OVER (
                PARTITION BY slug_candidates.base_slug
                ORDER BY slug_candidates.id
            )::text
        END AS slug
    FROM slug_candidates
)
UPDATE organization
SET
    slug = slugged.slug,
    display_name = slugged.display_name,
    directory_visibility = 'listed'::directory_visibility
FROM slugged
WHERE organization.id = slugged.id;

INSERT INTO organization (
    name,
    slug,
    display_name,
    directory_visibility,
    auto_provisioned_for_user_id,
    image_path,
    is_full_image_path,
    created_at,
    updated_at
)
SELECT
    'user-' || replace("user".id::text, '-', '') AS name,
    'user-' || replace("user".id::text, '-', '') AS slug,
    "user".first_name AS display_name,
    'unlisted'::directory_visibility AS directory_visibility,
    "user".id AS auto_provisioned_for_user_id,
    NULL AS image_path,
    false AS is_full_image_path,
    now() AS created_at,
    now() AS updated_at
FROM "user"
WHERE NOT EXISTS (
    SELECT 1
    FROM organization existing
    WHERE existing.auto_provisioned_for_user_id = "user".id
);

INSERT INTO organization_membership (
    user_id,
    organization_id,
    created_at,
    updated_at
)
SELECT
    user_organization_mapping.user_id,
    user_organization_mapping.organization_id,
    user_organization_mapping.created_at,
    user_organization_mapping.created_at AS updated_at
FROM user_organization_mapping
ON CONFLICT (user_id, organization_id) DO NOTHING;

INSERT INTO organization_membership (
    user_id,
    organization_id,
    created_at,
    updated_at
)
SELECT
    organization.auto_provisioned_for_user_id,
    organization.id,
    now(),
    now()
FROM organization
WHERE organization.auto_provisioned_for_user_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

INSERT INTO project (
    slug,
    display_name,
    directory_visibility,
    auto_provisioned_for_organization_id,
    created_at,
    updated_at
)
SELECT
    'org-' || organization.id::text || '-default' AS slug,
    organization.display_name,
    'unlisted'::directory_visibility AS directory_visibility,
    organization.id AS auto_provisioned_for_organization_id,
    now() AS created_at,
    now() AS updated_at
FROM organization
WHERE NOT EXISTS (
    SELECT 1
    FROM project existing
    WHERE existing.auto_provisioned_for_organization_id = organization.id
);

INSERT INTO project_organization_ownership (
    project_id,
    organization_id,
    created_at
)
SELECT
    project.id,
    project.auto_provisioned_for_organization_id,
    now()
FROM project
WHERE project.auto_provisioned_for_organization_id IS NOT NULL
ON CONFLICT (project_id, organization_id) DO NOTHING;

UPDATE conversation
SET project_id = project.id
FROM project
WHERE conversation.organization_id IS NOT NULL
  AND project.auto_provisioned_for_organization_id = conversation.organization_id
  AND conversation.project_id IS NULL;

UPDATE conversation
SET project_id = project.id
FROM organization
JOIN project
    ON project.auto_provisioned_for_organization_id = organization.id
WHERE conversation.organization_id IS NULL
  AND conversation.author_id = organization.auto_provisioned_for_user_id
  AND conversation.project_id IS NULL;

INSERT INTO organization_membership_capability (
    organization_membership_id,
    capability,
    created_at
)
SELECT
    organization_membership.id,
    capability.capability,
    now()
FROM organization_membership
CROSS JOIN unnest(ARRAY[
    'organization_manage_members'::organization_membership_capability_enum,
    'organization_manage_profile'::organization_membership_capability_enum,
    'project_create'::organization_membership_capability_enum
]) AS capability(capability)
ON CONFLICT (organization_membership_id, capability) DO NOTHING;

INSERT INTO organization_membership_all_project_capability (
    organization_membership_id,
    capability,
    created_at
)
SELECT
    organization_membership.id,
    capability.capability,
    now()
FROM organization_membership
CROSS JOIN unnest(ARRAY[
    'project_update'::organization_membership_all_project_capability_enum,
    'project_delete'::organization_membership_all_project_capability_enum,
    'project_manage_owner_organizations'::organization_membership_all_project_capability_enum,
    'conversation_create'::organization_membership_all_project_capability_enum,
    'conversation_update'::organization_membership_all_project_capability_enum,
    'conversation_delete'::organization_membership_all_project_capability_enum,
    'conversation_view_private_results'::organization_membership_all_project_capability_enum,
    'conversation_export_owner_data'::organization_membership_all_project_capability_enum,
    'conversation_moderate'::organization_membership_all_project_capability_enum,
    'conversation_manage_integrations'::organization_membership_all_project_capability_enum
]) AS capability(capability)
ON CONFLICT (organization_membership_id, capability) DO NOTHING;

UPDATE premium_feature_entitlement
SET
    organization_id = organization.id,
    user_id = NULL,
    updated_at = now()
FROM organization
WHERE premium_feature_entitlement.user_id = organization.auto_provisioned_for_user_id
  AND premium_feature_entitlement.organization_id IS NULL;

DO $$
DECLARE
    missing_first_names integer;
    missing_organization_fields integer;
    missing_personal_memberships integer;
    missing_project_ownerships integer;
    missing_conversation_projects integer;
    missing_entitlement_organizations integer;
BEGIN
    SELECT count(*) INTO missing_first_names
    FROM "user"
    WHERE first_name IS NULL;

    IF missing_first_names > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % users still have null first_name', missing_first_names;
    END IF;

    SELECT count(*) INTO missing_organization_fields
    FROM organization
    WHERE slug IS NULL
       OR display_name IS NULL
       OR directory_visibility IS NULL;

    IF missing_organization_fields > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % organizations still have missing identity fields', missing_organization_fields;
    END IF;

    SELECT count(*) INTO missing_personal_memberships
    FROM organization
    LEFT JOIN organization_membership
      ON organization_membership.organization_id = organization.id
     AND organization_membership.user_id = organization.auto_provisioned_for_user_id
    WHERE organization.auto_provisioned_for_user_id IS NOT NULL
      AND organization_membership.id IS NULL;

    IF missing_personal_memberships > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % personal organizations lack owner membership', missing_personal_memberships;
    END IF;

    SELECT count(*) INTO missing_project_ownerships
    FROM project
    LEFT JOIN project_organization_ownership
      ON project_organization_ownership.project_id = project.id
     AND project_organization_ownership.organization_id = project.auto_provisioned_for_organization_id
    WHERE project.auto_provisioned_for_organization_id IS NOT NULL
      AND project_organization_ownership.id IS NULL;

    IF missing_project_ownerships > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % auto-provisioned projects lack ownership rows', missing_project_ownerships;
    END IF;

    SELECT count(*) INTO missing_conversation_projects
    FROM conversation
    WHERE project_id IS NULL;

    IF missing_conversation_projects > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % conversations still have null project_id', missing_conversation_projects;
    END IF;

    SELECT count(*) INTO missing_entitlement_organizations
    FROM premium_feature_entitlement
    WHERE organization_id IS NULL;

    IF missing_entitlement_organizations > 0 THEN
        RAISE EXCEPTION 'org/project backfill failed: % premium entitlements still have null organization_id', missing_entitlement_organizations;
    END IF;
END $$;
