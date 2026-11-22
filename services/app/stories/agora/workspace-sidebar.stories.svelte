<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { navigation, projects, workspaceUser } from "#lib/mock-data.js";
  import type { WorkspaceSidebarProps } from "$ui/agora/view-types.js";
  import WorkspaceSidebar from "$ui/agora/workspace-sidebar.svelte";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";
  import WorkspaceSettingsFixture from "./workspace-settings-fixture.svelte";

  type Args = Omit<WorkspaceSidebarProps, "onsettings">;

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof WorkspaceSidebar
  >({
    title: "Agora/Workspace sidebar",
    component: WorkspaceSidebar,
    args: {
      navigation,
      active: "projects",
      account: workspaceUser,
      dir: "ltr",
      collapsed: false,
      ontoggle: () => undefined,
      onfollow: () => undefined,
      projects: projects.map((project) => ({
        projectSlug: project.id,
        label: project.title,
        href: undefined,
      })),
    },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => args.collapsed}>
    {#snippet children({ value: collapsed, set }: FixtureStateView<boolean>)}
      <div class="h-[1157px] px-6 pb-6">
        <WorkspaceSettingsFixture user={args.account} dir={args.dir}>
          {#snippet children({ account, onsettings })}
            <WorkspaceSidebar
              {...args}
              {account}
              {onsettings}
              {collapsed}
              ontoggle={() => {
                set(!collapsed);
              }}
            />
          {/snippet}
        </WorkspaceSettingsFixture>
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Default" {template} />
<Story name="Children expanded" args={{ projectsExpanded: true }} {template} />
<Story name="Children folded" args={{ projectsExpanded: false }} {template} />
<Story name="Collapsed" args={{ collapsed: true }} {template} />
<Story
  name="Logged out"
  args={{ account: undefined, projects: [] }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
<Story name="Mobile drawer content" args={{ mobile: true }} {template} />
