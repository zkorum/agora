<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { getProjectBodyExcerpt } from "$logic/agora/project-rich-text.js";
  import { getWorkspaceProjects } from "$state/agora/workspace-projects.svelte.js";
  import OrganizationIdentity from "$ui/agora/organization-identity.svelte";
  import ProjectCard from "$ui/agora/project-card.svelte";
  import Button from "$ui/shared/button.svelte";
  import EmptyState from "$ui/shared/empty-state.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import SearchField from "$ui/shared/search-field.svelte";

  import ProjectWorkspaceStatus from "./project-workspace-status.svelte";

  const { projects: workspace, openCreateProject } = getWorkspaceProjects();
  let query = $state("");
  const normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  const filteredProjects = $derived(
    workspace.projects.filter((project) =>
      project.projectTitle.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );

  function openCreateProjectFromButton(event: MouseEvent): void {
    // Some browsers don't focus buttons on tap; give the dialog a return target.
    if (event.currentTarget instanceof HTMLButtonElement) {
      event.currentTarget.focus({ preventScroll: true });
    }
    openCreateProject();
  }
</script>

<svelte:head
  ><title>{m.project_create_projects_heading()} · Agora</title></svelte:head
>

<div
  class="
    flex min-h-full flex-col p-10 [--project-card-min-height:360px]
    max-md:px-4 max-md:py-7
  "
>
  <header
    class="
      flex items-center justify-between gap-4
      max-md:flex-wrap
    "
  >
    <h1
      class="
        m-0 flex items-center gap-3 text-[32px] leading-[1.3] font-semibold
        max-md:text-[28px]
      "
    >
      {m.project_create_projects_heading()}{#if workspace.status.kind === "ready"}<span
          class="
            rounded-sm bg-sky-lighter px-[5px] py-0.5 text-sm font-normal
            text-ink-light
          ">{workspace.projects.length}</span
        >{/if}
    </h1>
    {#if workspace.status.kind === "ready" && workspace.projects.length > 0}
      <Button
        variant="solid"
        size="control"
        class="max-w-full shrink-0 text-start wrap-anywhere whitespace-normal"
        data-workspace-floating-action
        aria-haspopup="dialog"
        onclick={openCreateProjectFromButton}
        ><Icon name="plus" size={20} />{m.project_create_title()}</Button
      >
    {/if}
  </header>
  {#if workspace.status.kind !== "ready"}
    <ProjectWorkspaceStatus {workspace} />
  {:else if workspace.projects.length > 0}
    <div class="mt-7 mb-6 max-w-full border-b border-sky-lighter pb-6">
      <SearchField label={m.project_create_search()} bind:value={query} />
    </div>
    <div
      class="
        grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4
      "
    >
      {#each filteredProjects as project (project.projectSlug)}
        <ProjectCard
          project={{
            id: project.projectSlug,
            title: project.projectTitle,
            description: getProjectBodyExcerpt(project.body),
            organization: project.ownerOrganizations
              .map((organization) => organization.name)
              .join(", "),
            cover: "gradient",
            conversationCount: "0",
          }}
          href={localizeHref(`/project/${project.projectSlug}`)}
        >
          {#snippet organization()}
            {#each project.ownerOrganizations as organization (organization.organizationSlug)}
              <OrganizationIdentity {organization} compact />
            {/each}
          {/snippet}
          {#snippet metadata()}
            <span class="flex items-center gap-1.5 text-sm">
              <Icon name="list" size={14} />0 {m.project_create_conversations()}
            </span>
          {/snippet}
        </ProjectCard>
      {/each}
    </div>
    {#if filteredProjects.length === 0}<p
        class="m-0 text-ink-light"
        role="status"
      >
        {m.project_create_search_empty()}
      </p>{/if}
  {:else}
    <div class="flex min-h-100 flex-1 items-center justify-center">
      <EmptyState
        title={m.project_create_empty()}
        description={m.project_create_empty_description()}
      >
        {#snippet actions()}
          <Button
            variant="solid"
            size="control"
            data-workspace-floating-action
            aria-haspopup="dialog"
            onclick={openCreateProjectFromButton}
            ><Icon name="plus" size={20} />{m.project_create_title()}</Button
          >
        {/snippet}
      </EmptyState>
    </div>
  {/if}
</div>
