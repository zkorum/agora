-- Coordinated upgrade: drain incompatible services and keep affected writers stopped.
-- Do not resume affected writers between these versioned phases.
-- Staged from the generated draft/prepared contracts; no database is changed by staging.

SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

-- Deferred triggers protect new mutations, not preexisting orphan rows.
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM organization o WHERE o.deleted_at IS NULL AND NOT EXISTS (
            SELECT FROM organization_membership m JOIN "user" u ON u.id = m.user_id
            WHERE m.organization_id = o.id AND m.deleted_at IS NULL
              AND m.role = 'admin' AND NOT u.is_deleted
        )
    ) THEN RAISE EXCEPTION 'Reconcile active organizations without an active Admin before governance rollout'; END IF;
    IF EXISTS (
        SELECT FROM project p WHERE p.deleted_at IS NULL AND NOT EXISTS (
            SELECT FROM project_organization_ownership po JOIN organization o ON o.id = po.organization_id
            WHERE po.project_id = p.id AND po.deleted_at IS NULL AND o.deleted_at IS NULL
        )
    ) THEN RAISE EXCEPTION 'Reconcile active projects without an active owner before governance rollout'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_organization_admin()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT FROM organization o
        WHERE o.id = NEW.id AND o.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT FROM organization_membership m
              JOIN "user" u ON u.id = m.user_id
              WHERE m.organization_id = o.id AND m.deleted_at IS NULL
                AND m.role = 'admin' AND NOT u.is_deleted
          )
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
            CONSTRAINT = 'organization_active_admin_required',
            MESSAGE = 'organization_active_admin_required';
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_project_owner()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT FROM project p
        WHERE p.id = NEW.id AND p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT FROM project_organization_ownership po
              JOIN organization o ON o.id = po.organization_id
              WHERE po.project_id = p.id AND po.deleted_at IS NULL
                AND o.deleted_at IS NULL
          )
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
            CONSTRAINT = 'project_active_owner_required',
            MESSAGE = 'project_active_owner_required';
    END IF;
    RETURN NULL;
END;
$$;

-- Actual parent-row writes serialize changes and also fence stale REPEATABLE READ
-- snapshots. A count-only trigger or advisory lock alone would allow write skew.
-- The no-op assignment intentionally changes no business field or timestamp.
-- Application membership mutations prelock account -> organization -> membership
-- in these final write modes; SHARE prelocks would deadlock on trigger upgrades.
CREATE OR REPLACE FUNCTION fence_organization_membership()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_user_id uuid;
    new_user_id uuid;
    old_org_id integer;
    new_org_id integer;
    parent_id integer;
    account_id uuid;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        old_user_id := OLD.user_id;
        old_org_id := OLD.organization_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        new_user_id := NEW.user_id;
        new_org_id := NEW.organization_id;
    END IF;
    FOR account_id IN
        SELECT DISTINCT id FROM "user"
        WHERE id IN (old_user_id, new_user_id) ORDER BY id
    LOOP
        UPDATE "user" SET id = id WHERE id = account_id;
    END LOOP;
    FOR parent_id IN
        SELECT DISTINCT id FROM organization
        WHERE id IN (old_org_id, new_org_id) ORDER BY id
    LOOP
        UPDATE organization SET slug = slug WHERE id = parent_id;
    END LOOP;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fence_account_organizations()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id integer;
BEGIN
    IF NEW.is_deleted IS NOT DISTINCT FROM OLD.is_deleted THEN RETURN NEW; END IF;
    FOR parent_id IN
        SELECT DISTINCT organization_id FROM organization_membership
        WHERE user_id = NEW.id AND role = 'admin' AND deleted_at IS NULL
        ORDER BY organization_id
    LOOP
        UPDATE organization SET slug = slug WHERE id = parent_id;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fence_project_ownership()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_org_id integer;
    new_org_id integer;
    old_project_id integer;
    new_project_id integer;
    parent_id integer;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        old_org_id := OLD.organization_id;
        old_project_id := OLD.project_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        new_org_id := NEW.organization_id;
        new_project_id := NEW.project_id;
    END IF;
    FOR parent_id IN
        SELECT DISTINCT id FROM organization
        WHERE id IN (old_org_id, new_org_id) ORDER BY id
    LOOP
        UPDATE organization SET slug = slug WHERE id = parent_id;
    END LOOP;
    FOR parent_id IN
        SELECT DISTINCT id FROM project
        WHERE id IN (old_project_id, new_project_id) ORDER BY id
    LOOP
        UPDATE project SET slug = slug WHERE id = parent_id;
    END LOOP;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fence_organization_projects()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id integer;
BEGIN
    IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN RETURN NEW; END IF;
    FOR parent_id IN
        SELECT DISTINCT project_id FROM project_organization_ownership
        WHERE organization_id = NEW.id AND deleted_at IS NULL ORDER BY project_id
    LOOP
        UPDATE project SET slug = slug WHERE id = parent_id;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER organization_active_admin_required
AFTER INSERT OR UPDATE OF slug, deleted_at ON organization
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION enforce_organization_admin();

CREATE CONSTRAINT TRIGGER project_active_owner_required
AFTER INSERT OR UPDATE OF slug, deleted_at ON project
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION enforce_project_owner();

CREATE TRIGGER organization_membership_governance_fence
BEFORE INSERT OR DELETE OR UPDATE OF role, user_id, organization_id, deleted_at
ON organization_membership FOR EACH ROW
EXECUTE FUNCTION fence_organization_membership();

CREATE TRIGGER account_organization_governance_fence
BEFORE UPDATE OF is_deleted ON "user" FOR EACH ROW
EXECUTE FUNCTION fence_account_organizations();

CREATE TRIGGER project_ownership_governance_fence
BEFORE INSERT OR DELETE OR UPDATE OF project_id, organization_id, deleted_at
ON project_organization_ownership FOR EACH ROW
EXECUTE FUNCTION fence_project_ownership();

CREATE TRIGGER organization_project_governance_fence
BEFORE UPDATE OF deleted_at ON organization FOR EACH ROW
EXECUTE FUNCTION fence_organization_projects();
