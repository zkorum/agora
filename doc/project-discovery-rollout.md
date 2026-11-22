# Project discovery rollout

The backend changes and data migration are ready to verify locally. Do not
deploy the discovery changes before applying the data migration to that
environment. Neither frontend is wired to the project listing endpoint,
and sign-in provisioning is unchanged.

## Preflight and one-time backfill

Optionally run the read-only
[`preview-default-project-directory-visibility.sql`](../services/api/scripts/preview-default-project-directory-visibility.sql)
against an approved environment before scheduling the backfill. It reports
aggregate transitions only and is not a Flyway prerequisite. A non-deleted
auto-provisioned project should become listed if it has an indexed conversation
with current content that is not still importing. A closed conversation can
still qualify. Empty projects and projects
with only unindexed conversations remain unlisted. The scope is identified by
`autoProvisionedForOrganizationId`, not by a slug pattern.

The corresponding [Flyway backfill](../services/api/database/flyway/V0118.1__backfill_default_project_directory_visibility.sql)
changes only project rows and leaves each conversation's indexing intent intact.
Do not recompute project listing from activities after the backfill. Audit named
projects with indexed conversations under unlisted parents separately; this
backfill does not authorize listing named projects.

Before deployment, review account deletion for promoted default projects. The
current governance check treats listed projects differently when deciding whether
it may automatically retire a personal workspace. Listing existing default
projects can therefore require a transfer or explicit retirement first; this
change does not bypass that check.

## Shared rule and compatibility

Effective conversation indexing requires a listed project and no conversation
opt-out. The feed, crawler policy and project activity cards use that result.
Setting project directory visibility is a separate authorized API operation.
Create requests may supply a directory visibility; if omitted, the legacy
create endpoint still defaults to listed.

Deploy the API and legacy nginx config together. Project and conversation HTML
remain reachable when unlisted or the indexing lookup fails, but are served
with `X-Robots-Tag: noindex, nofollow`. The internal indexing lookup reads
the primary database and cannot grant participant access.

Project and activity page lookups by link do not require directory listing.
That does not relax existing publication or authorization checks for project
documents: they remain unavailable on unlisted projects, including by signed
document link. Existing Conversation Email Updates requirements are also
unchanged; review that separate `listed_project` contract before exposing
unlisting for projects with active email updates.

Legacy Vue can continue showing **No project** for the auto-provisioned project.
The edit endpoint still round-trips stored intent, not effective discovery;
otherwise an unrelated legacy save would turn every activity in an unlisted
project into a permanent opt-out. A newly provisioned default project is
unlisted until explicitly listed, even when Vue presents it as **No project**.

Verify a mixed project, an empty default project, an all-unindexed project, and
an unlist/relist cycle. Verify that old saves preserve intent, listing does not
publish drafts, and direct links and participation rules are unchanged. Real
sign-in provisioning belongs to a separate rollout.
