-- Approved initial role rollout: every historical membership receives Admin,
-- regardless of historical grants. Stage after adding the nullable role column
-- and before making it NOT NULL; production generation/application is separate.
-- Preserve explicitly assigned roles and never reactivate deleted memberships.
-- Later Flyway placement: V<nullable-role-schema-version>.1__backfill_org_roles.sql
-- (or the next free ordered suffix), before NOT NULL and governance triggers.
-- Do not assign a concrete version or install this in Flyway before the schema
-- rollout is reviewed. This staging source neither adds columns nor changes defaults.
UPDATE organization_membership
SET role = 'admin'
WHERE role IS NULL;
