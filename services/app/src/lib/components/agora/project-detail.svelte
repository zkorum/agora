<script lang="ts">
  import { onDestroy } from "svelte";

  import {
    type ProjectConversationDraft,
    type ProjectConversationType,
    projectConversationTypeSchema,
  } from "#lib/api/agora/projects.js";
  import * as m from "#lib/paraglide/messages.js";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { navigating } from "$app/state";
  import { getProjectBodyDisplayHtml } from "$logic/agora/project-rich-text.js";
  import { getWorkspaceProjects } from "$state/agora/workspace-projects.svelte.js";
  import ConversationBadge from "$ui/agora/conversation-badge.svelte";
  import OrganizationIdentity from "$ui/agora/organization-identity.svelte";
  import Button from "$ui/shared/button.svelte";
  import EditableSummaryField from "$ui/shared/editable-summary-field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SelectionCard from "$ui/shared/selection-card.svelte";
  import Skeleton from "$ui/shared/skeleton.svelte";

  import ProjectContactSummary from "./project-contact-summary.svelte";
  import { projectConversationOptions } from "./project-conversation-options.js";
  import ProjectConversationPicker from "./project-conversation-picker.svelte";
  import { projectAuthenticationLabels } from "./project-presentation.js";
  import ProjectWorkspaceStatus from "./project-workspace-status.svelte";

  let { projectSlug }: { projectSlug: string } = $props();
  const organizationNamesId = $props.id();
  const { projects: workspace, openProjectSettings } = getWorkspaceProjects();
  const project = $derived(
    workspace.projects.find((entry) => entry.projectSlug === projectSlug),
  );
  const bodyHtml = $derived(
    project?.body ? getProjectBodyDisplayHtml(project.body) : "",
  );
  let draftsBeforeCreation = $state.raw<readonly ProjectConversationDraft[]>();
  const visibleDrafts = $derived(
    draftsBeforeCreation ?? workspace.getConversationDrafts(projectSlug),
  );
  const createdActivities = $derived(
    workspace.getCreatedConversations(projectSlug),
  );
  const activityCount = $derived(
    visibleDrafts.length + createdActivities.length,
  );
  const authenticationLabels = $derived(projectAuthenticationLabels());
  const organizations = $derived.by(() => {
    return new Map(
      [
        ...(project?.referencedOrganizations ?? []),
        ...(project?.ownerOrganizations ?? []),
      ].map((organization) => [organization.organizationSlug, organization]),
    );
  });
  const headerOrganizations = $derived.by(() => {
    if (!project) return [];
    const slugs = new Set([
      ...project.ownerOrganizations.map(
        (organization) => organization.organizationSlug,
      ),
      ...project.attributions.flatMap((attribution) =>
        attribution.source === "organization"
          ? [attribution.organizationSlug]
          : [],
      ),
    ]);
    const externalCredits = project.attributions.filter(
      (attribution) => attribution.source === "external",
    );
    return [
      ...Array.from(slugs).flatMap((slug) => {
        const identity = organizations.get(slug);
        return identity ? [{ key: slug, name: identity.name, identity }] : [];
      }),
      ...externalCredits.map((credit) => ({
        key: credit,
        name: credit.displayName,
        imagePath: credit.imagePath,
      })),
    ];
  });
  const organizationNames = $derived(
    new Intl.ListFormat(getLocale()).format(
      headerOrganizations.map((organization) => organization.name),
    ),
  );
  const direction = $derived(
    ["ar", "fa", "he"].includes(getLocale()) ? "rtl" : "ltr",
  );
  let pickerOpen = $state(false);
  let draftCreationFailed = $state(false);
  const creatingDraft = $derived(draftsBeforeCreation !== undefined);
  const draftCreationPending = $derived(
    creatingDraft || workspace.isCreatingConversationDraft,
  );
  let destroyed = false;

  onDestroy(() => {
    destroyed = true;
  });

  function openPicker(event: MouseEvent): void {
    if (draftCreationPending) return;
    // Some browsers don't focus buttons on tap; give the dialog a return target.
    if (event.currentTarget instanceof HTMLButtonElement) {
      event.currentTarget.focus({ preventScroll: true });
    }
    draftCreationFailed = false;
    pickerOpen = true;
  }

  function draftHref({
    projectSlug,
    id,
  }: Pick<ProjectConversationDraft, "projectSlug" | "id">): string {
    return localizeHref(
      resolve("/(agora)/project/[projectSlug]/draft/[draftId]", {
        projectSlug,
        draftId: id,
      }),
    );
  }

  async function createDraft(
    conversationType: ProjectConversationType,
  ): Promise<boolean> {
    if (draftCreationPending) return false;
    const slug = projectSlug;
    draftCreationFailed = false;
    // Hold the current list in place while a saved draft opens, so the cards below don't move.
    draftsBeforeCreation = visibleDrafts;
    try {
      const draft = await workspace.createConversationDraft({
        projectSlug: slug,
        conversationType,
      });
      if (draft === undefined) return false;
      // Keep the saved draft, but respect navigation away while the write was pending.
      if (!destroyed && projectSlug === slug && navigating.type === null) {
        try {
          await goto(draftHref(draft));
        } catch {
          // The saved draft remains available in the activity list if navigation fails.
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      draftsBeforeCreation = undefined;
    }
  }

  async function createDraftFromCard(
    conversationType: ProjectConversationType,
  ): Promise<void> {
    if (draftCreationPending) return;
    const slug = projectSlug;
    const created = await createDraft(conversationType);
    if (!created && !destroyed && projectSlug === slug) {
      draftCreationFailed = true;
    }
  }
</script>

<svelte:head>
  <title>{project?.projectTitle ?? m.app_nav_projects()} · Agora</title>
</svelte:head>

{#snippet typeBadge(type: ProjectConversationType)}
  {@const option = projectConversationOptions[type]}
  <ConversationBadge kind={type} label={option.label()}>
    {#snippet artwork()}<img src={option.icon} alt="" />{/snippet}
  </ConversationBadge>
{/snippet}

{#if workspace.status.kind === "idle" || workspace.status.kind === "loading"}
  <p class="sr-only" role="status">{m.project_create_loading()}</p>
  <div
    class="
      mx-auto grid max-w-[1008px] gap-6 px-[clamp(16px,3vw,24px)] pt-6 pb-12
    "
    aria-busy="true"
  >
    <Skeleton class="h-8 w-1/3" />
    <Skeleton class="h-16" />
    <Skeleton class="h-6 w-1/4" />
    <Skeleton class="h-44" />
    <Skeleton class="h-52" />
  </div>
{:else if workspace.status.kind !== "ready"}
  <div class="p-6"><ProjectWorkspaceStatus {workspace} /></div>
{:else if project}
  {@const owner = project.ownerOrganizations.at(0)}
  <div
    class="
      mx-auto grid max-w-[1008px] gap-6 px-[clamp(16px,3vw,24px)] pt-6 pb-12
    "
  >
    <header
      class="
        grid min-w-0 justify-items-start gap-1 border-b border-sky-lighter pb-4
      "
    >
      <EditableSummaryField
        variant="title"
        label={m.project_workspace_edit_name()}
        onedit={() => {
          openProjectSettings({ projectSlug, section: "name" });
        }}>{project.projectTitle}</EditableSummaryField
      >
      <EditableSummaryField
        variant={bodyHtml ? "description" : "add"}
        label={bodyHtml
          ? m.project_workspace_edit_description()
          : m.project_workspace_add_description()}
        onedit={() => {
          openProjectSettings({ projectSlug, section: "description" });
        }}
      >
        <!-- Only the sanitized and safely linkified display HTML belongs here. -->
        <div class="agora-rich-text">{@html bodyHtml}</div>
      </EditableSummaryField>
      {#if owner}
        <Button
          variant="unstyled"
          class="
            inline-flex min-h-10 max-w-full cursor-pointer items-center gap-2
            rounded-lg ps-1 pe-2 text-start text-sm text-ink-light
            hover:bg-sky-lightest
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-primary-base
          "
          aria-label={m.project_workspace_edit_organizations()}
          aria-describedby={organizationNamesId}
          aria-haspopup="dialog"
          title={organizationNames}
          onclick={() => {
            openProjectSettings({ projectSlug, section: "organizations" });
          }}
        >
          <span class="isolate inline-flex shrink-0" aria-hidden="true">
            {#each headerOrganizations.slice(0, 3) as organization (organization.key)}
              <span
                class="
                  grid size-6 place-items-center overflow-hidden rounded-md
                  border-2 border-sky-off-white bg-sky-lighter
                  not-first:-ms-1.25
                  first:z-2
                  nth-2:z-1
                  [&_img]:size-full [&_img]:object-contain
                "
              >
                {#if "identity" in organization}
                  <OrganizationIdentity
                    organization={organization.identity}
                    compact
                    markOnly
                  />
                {:else if organization.imagePath}
                  <img
                    src={organization.imagePath}
                    alt=""
                    referrerpolicy="no-referrer"
                  />
                {:else}
                  <Icon name="building" size={12} />
                {/if}
              </span>
            {/each}
          </span>
          <span class="min-w-0 wrap-anywhere">
            {headerOrganizations.length > 1
              ? m.project_workspace_organizations_summary({
                  name: owner.name,
                  count: headerOrganizations.length - 1,
                })
              : owner.name}
          </span>
          <span class="icon-[lucide--pencil] size-4 shrink-0" aria-hidden="true"
          ></span>
          <span id={organizationNamesId} class="sr-only"
            >{organizationNames}</span
          >
        </Button>
      {/if}
    </header>

    <Panel labelledby="participation-heading" appearance="project">
      <h2
        class="
          border-b border-sky-lighter pb-3 text-lg font-semibold text-ink-darker
        "
        id="participation-heading"
      >
        {m.project_detail_participation()}
      </h2>
      <p class="mt-4 mb-5 text-ink-dark">
        {m.project_detail_participation_description()}
      </p>
      <div
        class="
          grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4
        "
      >
        <Button
          variant="neutral"
          size="control"
          class="min-h-[54px] justify-start text-start whitespace-normal"
          aria-haspopup="dialog"
          onclick={() => {
            openProjectSettings({ projectSlug, section: "access" });
          }}
        >
          <Icon name="shield" size={18} />
          <span class="flex-1"
            >{authenticationLabels[project.authentication]}</span
          >
          <Icon name="chevron" size={16} />
        </Button>
        <Button
          variant="neutral"
          size="control"
          class="min-h-[54px] justify-start text-start whitespace-normal"
          disabled
        >
          <Icon name="list" size={18} />
          <span class="flex-1">{m.project_detail_demographic_add()}</span>
          <Icon name="plus" size={16} />
        </Button>
      </div>
    </Panel>

    {#if project.contact}
      <ProjectContactSummary
        contact={project.contact}
        organizationName={project.contact.organizationSlug
          ? organizations.get(project.contact.organizationSlug)?.name
          : undefined}
      />
    {/if}

    <section
      class="
        min-w-0 rounded-2xl border border-sky-lighter bg-sky-white
        p-[clamp(16px,3vw,40px)]
      "
      aria-labelledby="activities-heading"
    >
      <div
        class="
          mb-4 flex flex-wrap items-center justify-between gap-3
          [&_h2]:text-lg [&_h2]:font-semibold
        "
      >
        <h2 id="activities-heading">
          {activityCount === 0
            ? m.project_create_conversations()
            : m.project_workspace_activity_count({
                count: activityCount,
              })}
        </h2>
        <Button
          variant="solid"
          size="control"
          class="max-w-full min-w-0 text-start wrap-anywhere whitespace-normal"
          data-workspace-floating-action
          aria-haspopup="dialog"
          onclick={openPicker}
          disabled={draftCreationPending}
        >
          <Icon name="plus" size={18} />{m.project_detail_new_conversation()}
        </Button>
      </div>
      {#if activityCount > 0}
        <ul
          class="
            mb-4 grid min-w-0 gap-4
            [&_a]:grid [&_a]:gap-2.5 [&_a]:rounded-xl [&_a]:border
            [&_a]:border-sky-lighter [&_a]:p-6 [&_a]:text-ink-darker
            [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2
            [&_a:focus-visible]:outline-primary-base
            [&_a:hover]:border-sky-dark [&_a:hover]:bg-sky-off-white
          "
        >
          {#each createdActivities as activity (activity.id)}
            <li>
              <a href={draftHref(activity)}
                ><span
                  class={[
                    "flex flex-wrap",
                    "items-center justify-between gap-3",
                  ]}
                  >{@render typeBadge(
                    activity.setup.conversationType,
                  )}<ConversationBadge status={activity.status} /></span
                ><strong>{activity.setup.title}</strong></a
              >
            </li>
          {/each}
          {#each visibleDrafts as draft (draft.id)}
            <li>
              <a href={draftHref(draft)}>
                <span
                  class={[
                    "flex flex-wrap",
                    "items-center justify-between gap-3",
                  ]}
                >
                  {@render typeBadge(draft.conversationType)}
                  <span
                    class="
                      inline-flex items-center gap-1.5 rounded-lg
                      bg-sky-lightest px-2.5 py-1 text-xs font-medium
                      text-ink-dark
                      before:size-1.5 before:rounded-full before:bg-sky-dark
                    ">{m.project_workspace_activity_draft()}</span
                  >
                </span>
                <strong>{m.project_workspace_activity_untitled()}</strong>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
      <div
        class="
          rounded-xl border border-dashed border-sky-light
          p-[clamp(16px,2vw,32px)]
          [&_h3]:mb-3.5 [&_h3]:text-sm [&_h3]:text-ink-light
        "
        aria-busy={creatingDraft && !pickerOpen}
      >
        <h3>
          {activityCount === 0
            ? m.project_detail_first_conversation()
            : m.project_detail_new_conversation()}
        </h3>
        <div
          class="
            grid grid-cols-[repeat(auto-fit,minmax(min(166px,100%),1fr))] gap-3
          "
        >
          {#each projectConversationTypeSchema.options as type (type)}
            <SelectionCard
              mode="action"
              onclick={() => {
                void createDraftFromCard(type);
              }}
              disabled={draftCreationPending}
            >
              {#snippet heading()}{@render typeBadge(type)}{/snippet}
              {projectConversationOptions[type].shortDescription()}
            </SelectionCard>
          {/each}
        </div>
        {#if draftCreationFailed}
          <p class="mt-3 text-sm text-red-darkest" role="alert">
            {m.project_workspace_activity_create_error()}
          </p>
        {/if}
      </div>
    </section>
  </div>
  {#if pickerOpen}
    <ProjectConversationPicker
      bind:open={pickerOpen}
      {direction}
      pending={draftCreationPending}
      oncreate={createDraft}
    />
  {/if}
{:else}
  <p class="p-6" role="status">{m.project_create_not_found()}</p>
{/if}
