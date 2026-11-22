<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import type { ProjectsApi } from "#lib/api/agora/projects.js";
  import civicTomorrowLogo from "#lib/assets/agora/project-creation/civic-tomorrow.svg";
  import ProjectCreateDialog from "$components/agora/project-create-dialog.svelte";
  import {
    createProjectInputSchema,
    type ProjectOrganization,
    type WorkspaceProject,
  } from "$logic/agora/project-creation.js";
  import Button from "$ui/shared/button.svelte";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Mode =
    | "ready"
    | "loading"
    | "options-error"
    | "create-error"
    | "empty"
    | "submitting";
  interface Args {
    mode: Mode;
    dir: "ltr" | "rtl";
  }

  function createStoryApi(
    mode: Mode,
  ): Pick<ProjectsApi, "getCreationOptions" | "create"> {
    const organizations: ProjectOrganization[] = [
      {
        organizationSlug: "civic-tomorrow",
        name: "Civic Tomorrow Collective",
        initials: "CTC",
        logo: { src: civicTomorrowLogo, tone: "coral" },
      },
      { organizationSlug: "agora", name: "Agora", initials: "A" },
    ];
    const publicOrganizations: ProjectOrganization[] = [
      ...organizations,
      {
        organizationSlug: "riverside-trust",
        name: "Riverside Trust",
        initials: "RT",
      },
    ];
    let projects: WorkspaceProject[] = [];
    return {
      async getCreationOptions() {
        if (mode === "loading")
          return await new Promise<never>(() => undefined);
        if (mode === "options-error")
          throw new Error("Story organization loading failure");
        return {
          defaultOwnerOrganizationSlug:
            mode === "empty"
              ? undefined
              : organizations.at(0)?.organizationSlug,
          organizations: mode === "empty" ? [] : organizations,
          publicOrganizations,
        };
      },
      async create(input) {
        if (mode === "create-error") throw new Error("Story creation failure");
        if (mode === "submitting")
          return await new Promise<never>(() => undefined);
        const configuration = createProjectInputSchema.parse(input);
        const project: WorkspaceProject = {
          ...configuration,
          projectId: projects.length + 1,
          createdAt: "2026-11-17T12:00:00.000Z",
          directoryVisibility: "unlisted",
          ownerOrganizations: organizations.filter((organization) =>
            configuration.ownerOrganizationSlugs.includes(
              organization.organizationSlug,
            ),
          ),
          referencedOrganizations: publicOrganizations.filter(
            (organization) =>
              configuration.ownerOrganizationSlugs.includes(
                organization.organizationSlug,
              ) ||
              configuration.contact?.organizationSlug ===
                organization.organizationSlug ||
              configuration.attributions.some(
                (attribution) =>
                  attribution.source === "organization" &&
                  attribution.organizationSlug ===
                    organization.organizationSlug,
              ),
          ),
        };
        projects = [...projects, project];
        return { success: true, project };
      },
    };
  }

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof ProjectCreateDialog
  >({
    title: "Agora/Project creation",
    component: ProjectCreateDialog,
    args: { mode: "ready", dir: "ltr" },
    argTypes: { mode: { control: false } },
  });
</script>

{#snippet template(args: Args)}
  {@const api = createStoryApi(args.mode)}
  <FixtureState initial={() => true}>
    {#snippet children({ value: open, set }: FixtureStateView<boolean>)}
      <Button
        onclick={() => {
          set(true);
        }}>Open project creation</Button
      >
      {#if open}
        <ProjectCreateDialog
          {api}
          dir={args.dir}
          oncreated={() => {
            set(false);
          }}
          bind:open={() => open, set}
        />
      {/if}
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Default" {template} />
<Story name="Loading organisations" args={{ mode: "loading" }} {template} />
<Story
  name="Organisation loading error"
  args={{ mode: "options-error" }}
  {template}
/>
<Story name="No organisations" args={{ mode: "empty" }} {template} />
<Story name="Creation error" args={{ mode: "create-error" }} {template} />
<Story name="Pending submission" args={{ mode: "submitting" }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
<Story
  name="Mobile"
  globals={{ viewport: { value: "mobile1", isRotated: false } }}
  {template}
/>
