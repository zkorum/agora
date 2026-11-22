<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { navigation, projects, workspaceUser } from "#lib/mock-data.js";
  import AppShell from "$ui/agora/app-shell.svelte";
  import type { AppShellProps, WorkspaceActive } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";
  import WorkspaceSettingsFixture from "./workspace-settings-fixture.svelte";

  type Args = Omit<AppShellProps, "header" | "children" | "onsettings">;

  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof AppShell>({
    title: "Agora/App shell",
    component: AppShell,
    parameters: { layout: "fullscreen" },
    args: {
      navigation,
      active: "projects",
      dir: "ltr",
      participant: false,
      account: workspaceUser,
      projects: projects.map((project) => ({
        projectSlug: project.id,
        label: project.title,
        href: undefined,
      })),
    },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => args.active}>
    {#snippet children({
      value: active,
      set,
    }: FixtureStateView<WorkspaceActive>)}
      <div dir={args.dir} class="h-dvh">
        <WorkspaceSettingsFixture user={args.account} dir={args.dir}>
          {#snippet children({ account, onsettings })}
            <AppShell
              {...args}
              {account}
              {onsettings}
              {active}
              navigation={args.navigation.map((item) => ({
                ...item,
                destination: {
                  kind: "action",
                  onselect: () => {
                    set(item.id);
                  },
                },
              }))}
              onbacktoproject={() => {
                set("projects");
              }}
            >
              {#snippet header()}<span>Header snippet</span>{/snippet}
              <p class="p-6">
                Neutral content snippet. Current navigation item:
                {typeof active === "object" ? active.projectSlug : active}.
              </p>
            </AppShell>
          {/snippet}
        </WorkspaceSettingsFixture>
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Workspace" {template} />
<Story name="Logged out" args={{ account: undefined }} {template} />
<Story name="Participant" args={{ participant: true }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
