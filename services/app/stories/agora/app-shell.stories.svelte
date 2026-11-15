<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { navigation } from "#lib/mock-data.js";
  import AppShell from "$ui/agora/app-shell.svelte";
  import type { AppShellProps } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<AppShellProps, "header" | "children" | "onnavigate">;

  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof AppShell>({
    title: "Agora/App shell",
    component: AppShell,
    parameters: { layout: "fullscreen" },
    args: { navigation, active: "projects", dir: "ltr", participant: false },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => args.active}>
    {#snippet children({ value: active, set }: FixtureStateView<string>)}
      <div dir={args.dir} style="height: 100dvh">
        <AppShell
          {...args}
          {active}
          onnavigate={(next: string) => {
            set(next);
          }}
        >
          {#snippet header()}<span>Header snippet</span>{/snippet}
          <p style="padding: 24px">
            Neutral content snippet. Current navigation item: {active}.
          </p>
        </AppShell>
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Workspace" {template} />
<Story name="Participant" args={{ participant: true }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
