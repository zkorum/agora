<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import MobileNavDrawer from "$ui/shared/mobile-nav-drawer.svelte";
  import type { MobileNavDrawerProps } from "$ui/shared/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<
    MobileNavDrawerProps,
    "action" | "children" | "navigation" | "onNavigate"
  >;

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof MobileNavDrawer
  >({
    title: "Shared/Mobile navigation drawer",
    component: MobileNavDrawer,
    args: {
      open: false,
      title: "Navigation",
      closeLabel: "Close navigation",
      links: [
        { label: "Overview", href: "#overview" },
        { label: "About", href: "#about" },
      ],
      dir: "ltr",
    },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => args.open === true}>
    {#snippet children({ value: opened, set }: FixtureStateView<boolean>)}
      <Button
        variant="neutral"
        size="control"
        onclick={() => {
          set(true);
        }}>Open navigation</Button
      >
      <MobileNavDrawer {...args} bind:open={() => opened, set}>
        {#snippet action()}<Button
            variant="solid"
            size="control"
            onclick={() => {
              set(false);
            }}>Done</Button
          >{/snippet}
        <span>Navigation footer</span>
      </MobileNavDrawer>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Closed" {template} />
<Story name="Open" args={{ open: true }} {template} />
<Story name="Sidebar" args={{ open: true, appearance: "sidebar" }} {template} />
<Story name="RTL" args={{ open: true, dir: "rtl" }} {template} />
