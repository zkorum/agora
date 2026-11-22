# Organization roles and governance

## Policy

An active organization membership has exactly one `admin`, `manager`, or
`moderator` role. The static bundles in
`services/shared/src/organizationAccess.ts` are the only current capability
policy. Historical grant tables are provenance, not a second authorization
source. There are no custom grants, project-specific assignments, or exceptions.

| Responsibility                                 | Admin | Manager | Moderator |
| ---------------------------------------------- | ----- | ------- | --------- |
| Membership and role assignment                 | Yes   | No      | No        |
| Organization profile and deletion              | Yes   | No      | No        |
| Project creation and ordinary project settings | Yes   | Yes     | No        |
| Project ownership changes and project deletion | Yes   | No      | No        |
| Conversation creation, editing, close/reopen   | Yes   | Yes     | No        |
| Conversation deletion                          | Yes   | No      | No        |
| Statement moderation                           | Yes   | Yes     | Yes       |
| Email update configuration and authoring       | Yes   | Yes     | No        |
| Restricted project documents                   | Yes   | Yes     | No        |
| Restricted survey answers/results and exports  | Yes   | Yes     | No        |

Roles apply to all current and future projects owned by that organization.
Capabilities from any active co-owner combine. A shared project does not confer
membership-management rights inside its other owning organizations.

An admin of any owning organization can delete the entire shared project after
confirmation naming the affected owners. There is no multi-owner approval
workflow. Existing Agora-team administration and site moderation remain separate
from organization roles; an organization admin does not become a site moderator.
Conversation-level site sanctions remain site-moderator-only.

Restricted-document and restricted-survey capabilities remain distinct, even
though their current role bundles match. Neither read path derives its authority
from `project_update`.

## Authorization boundary

`services/api/src/index.ts` authenticates the request and invokes reusable access
services before calling core work. Core mutation transactions do not recheck the
requesting actor's role or acquire authorization locks. A permission change after
the controller's check can race with that request; subsequent requests resolve
access again. Database integrity is a separate obligation.

- `organizationAuthorization.ts` resolves scoped organization/project/conversation
  permissions and projects resource-specific management flags.
- `conversationEmailUpdateAuthorization.ts` resolves allowed organizations and
  owned review/test IDs before email authoring, cancellation, or status work.
  Core email queries scope resources to that supplied access snapshot; they do
  not reread the actor's membership inside transactions.
- `conversationExport/access.ts` resolves request ownership and restricted-survey
  access before export creation/status work. Each status request resolves current
  access before generating restricted download URLs. Previously issued signed
  URLs retain their ordinary bounded lifetime.
- The project-document route authenticates the caller and checks the requested
  file version's access once. There is no `facilitator` authentication marker.

Email delivery eligibility is not actor authorization. Contact availability,
feature expiry, suppression, active-delivery conflicts, immutable review bases,
idempotency, and recipient snapshots remain business checks. Required-owner-copy
snapshot locks coordinate the recipient set, not the requesting actor's right to
send. The independent email/import workers still check execution-time safety;
acceptance of an API request does not authorize unrestricted future delivery or
publication.

## Frontend contract

The backend returns navigation permissions and resource-specific action flags.
The frontend displays translated role names but contains no parallel role-policy
table. Unavailable actions/settings and empty sections are absent, rather than
disabled with permission explanations. Readable content, temporary loading/saving
states, validation failures, and actionable workflow errors remain visible.

Conversation moves clear management flags until destination permissions arrive,
including when refresh fails. Lifecycle mutations do not infer the reverse
action's permission: close/reopen flags stay unavailable until the server
refreshes them. Role/ownership changes invalidate permission-bearing resources;
restricted survey and export-download caches are discarded rather than retained
as readable stale data.

Management navigation queries pause while their KeepAlive page is inactive and
refresh stale permissions on reactivation. Organization/project settings also
refresh their locally loaded resource permissions when access data changes or the
page reactivates, without reinitializing same-resource form drafts. Account changes
clear the local selections and fence pending options/details/email-configuration
responses so a previous account cannot repopulate them. Creation-only access keeps
its navigation link and selects an available tab.

## Account deletion and historical roles

Account deletion is refused only when it would leave an active non-default
organization without an active-account Admin. Deleted memberships, deleted accounts,
Managers, and Moderators do not count as replacement Admins. Ordinary membership
does not block deletion, and another active Admin permits deletion without deleting
the shared organization or its projects. Projects inherit this governance from
their owning organizations; there is no separate project-admin assignment.

The API returns a typed HTTP 409 refusal, so older clients cannot mistake it for
successful deletion. The refusal keeps the user signed in. The UI says only:
“You’re the last organization Admin. Contact the administrator.” It does not direct
users to perform unavailable self-service changes.

If the only otherwise orphaned organization is the user's unlisted personal
default, deletion soft-retires that organization and its otherwise ownerless,
unlisted default project in the same transaction. A promoted/listed organization
or project, or a custom project attached to that personal organization, requires
administrator intervention instead. Shared default projects retain their other
active owners and remain active. No conversation/content/participation records
are cascade-deleted by this operation.

Nullable retirement-cycle markers distinguish this account-deletion
operation from independent deletions. Verified account recovery restores only
defaults marked by that exact deletion cycle. There is no historical personal-
resource cleanup or retirement-marker backfill. Existing provisioning markers and
visibility identify defaults; provisioning provenance alone does not make a
promoted organization a default.

Account-only retirement is not independent project-deletion intent: even after
the recovery deadline, it must not cascade into conversation or retained numerical
evidence deletion. The project marker preserves that distinction after account
unlinking; the historical parent-cleanup staging script excludes marked projects.
Future purge scheduling must also honor the account's recovery deadline. The
existing purge-gated identity unlink clears the organization's
cycle marker when removing its account-provisioning link; this does not restore or
hard-delete the organization.

The approved initial role backfill assigns **Admin to every historical membership
whose new role is not yet assigned**, regardless of legacy partial grants. This is
an intentional initial privilege expansion. It never reactivates a deleted
membership and preserves explicitly assigned roles. The data-only staging source
is `services/api/scripts/prepare-organization-role-backfill.sql`, to run after the
generated nullable role-column addition and before the generated NOT NULL step.
When the schema rollout is reviewed, this data-only source can become
`V<nullable-role-schema-version>.1__backfill_org_roles.sql` (or the next free
ordered suffix), before the NOT NULL and governance-trigger steps. A suffix alone
cannot fix a schema migration that already adds a required column without a
backfill: the nullable/add, backfill and constraint ordering must be reviewed
together. No concrete Flyway version is reserved now. This approval does not
authorize `pnpm db:generate` or migration application.

## PostgreSQL integrity and deployment gates

The canonical schema is `services/shared-backend/src/schema.ts`. Membership roles
are required, without a privilege-granting default. The active-admin index supports
the governance checks.

`services/api/scripts/prepare-organization-governance.sql` is a preparation and
disposable-test contract, **not an installed Flyway migration**. Its deferred
constraint triggers and parent-row write fences enforce:

1. An active organization must retain an admin whose account and membership are
   active.
2. An active project must retain an active owning organization.

The contract permits atomic handovers, rejects invalid restoration, and prevents
concurrent write skew under READ COMMITTED and REPEATABLE READ. Named constraint
failures map to conflict responses rather than exposing database messages.
Service membership mutations lock the target account, then the organization, then
the membership in final write-compatible modes. Organization deletion prelocks its
member accounts in ID order before organization/project work. These are integrity
locks, not actor-authorization rechecks; SHARE-to-write upgrades are not used.
Project ownership changes similarly lock the union of existing and requested
organization parents in ID order before project/ownership rows, including parents
being removed rather than only the organizations in the new request.

Before deployment:

1. Stage the approved historical-membership Admin backfill in the generated
   role-column rollout. New memberships still require explicit roles; do not add
   a permanent Admin default.
2. Repair organizations/projects that already violate the intended invariants.
3. Include the nullable personal-default retirement markers and their constraints
   in the schema rollout. No historical marker backfill or automatic conversation/
   content deletion is part of this policy.
4. Obtain approval to generate, review, and apply the schema/backfill/trigger
   migrations. No production migration is authorized merely by this document.
5. Deploy the API, Agora frontend, import worker, and email-update worker together
   with the approved database changes. The live OpenAPI specification and both
   generated clients have been regenerated through API startup and `make generate`;
   repeat generation if their contracts change. Do not hand-edit generated clients.

Verification includes the consolidated governance/access/email/export/
statement API selection, plus focused frontend permission-refresh,
navigation, cache, action, and statement-editing tests. The OpenAPI startup used
only a fresh disposable PostgreSQL schema, not development or production data.

QV result freezing/tallying is documented separately in
`doc/quadratic-voting-implementation.md`. Permanent participation unlinking,
a hard-deletion worker, and final legal approval remain separate gates.
