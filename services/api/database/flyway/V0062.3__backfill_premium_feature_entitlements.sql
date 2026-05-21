DO $$
DECLARE
    allowed_organization_names constant text[] := ARRAY[
        'Agora',
        'Tournesol',
        'Lyfe Catalyst',
        'dembrane'
    ];
    allowed_user_ids constant uuid[] := ARRAY[
        'cf0a84f2-31fc-48b2-8b11-af753441783e'::uuid,
        '35f3b1f5-f753-4e7d-b807-b690007890ff'::uuid,
        '616d39ba-436e-47b1-9541-738f2b6fb83c'::uuid,
        '32bad754-501d-4679-b751-948fafe6ea4d'::uuid,
        'bfd4fb2f-ad80-4c4d-bbd1-85ab5b632c73'::uuid
    ];
    backfill_admin_note constant text := 'Backfilled from legacy MaxDiff and Survey allowlists';
    missing_organization_names text[];
    missing_user_ids uuid[];
BEGIN
    SELECT array_agg(allowed_organization.name)
    INTO missing_organization_names
    FROM unnest(allowed_organization_names) AS allowed_organization(name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM organization
        WHERE organization.name = allowed_organization.name
    );

    IF missing_organization_names IS NOT NULL THEN
        RAISE NOTICE 'Skipping missing premium entitlement organizations: %', missing_organization_names;
    END IF;

    SELECT array_agg(allowed_user.id)
    INTO missing_user_ids
    FROM unnest(allowed_user_ids) AS allowed_user(id)
    WHERE NOT EXISTS (
        SELECT 1
        FROM "user"
        WHERE "user".id = allowed_user.id
    );

    IF missing_user_ids IS NOT NULL THEN
        RAISE NOTICE 'Skipping missing premium entitlement users: %', missing_user_ids;
    END IF;

    WITH features AS (
        SELECT unnest(ARRAY[
            'prioritization'::premium_feature,
            'survey'::premium_feature
        ]) AS feature
    ),
    subjects AS (
        SELECT
            NULL::uuid AS user_id,
            organization.id AS organization_id
        FROM unnest(allowed_organization_names) AS allowed_organization(name)
        JOIN organization ON organization.name = allowed_organization.name

        UNION ALL

        SELECT
            "user".id AS user_id,
            NULL::integer AS organization_id
        FROM unnest(allowed_user_ids) AS allowed_user(id)
        JOIN "user" ON "user".id = allowed_user.id
    ),
    desired_entitlements AS (
        SELECT
            subjects.user_id,
            subjects.organization_id,
            features.feature
        FROM subjects
        CROSS JOIN features
    )
    INSERT INTO premium_feature_entitlement (
        user_id,
        organization_id,
        feature,
        starts_at,
        admin_note
    )
    SELECT
        desired_entitlements.user_id,
        desired_entitlements.organization_id,
        desired_entitlements.feature,
        now(),
        backfill_admin_note
    FROM desired_entitlements
    WHERE NOT EXISTS (
        SELECT 1
        FROM premium_feature_entitlement existing
        WHERE existing.user_id IS NOT DISTINCT FROM desired_entitlements.user_id
          AND existing.organization_id IS NOT DISTINCT FROM desired_entitlements.organization_id
          AND existing.feature = desired_entitlements.feature
          AND existing.revoked_at IS NULL
          AND existing.starts_at <= now()
          AND (existing.expires_at IS NULL OR existing.expires_at > now())
    );
END $$;
