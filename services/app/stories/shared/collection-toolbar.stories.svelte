<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import CollectionToolbar from "$ui/shared/collection-toolbar.svelte";
  import type { CollectionToolbarProps } from "$ui/shared/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<CollectionToolbarProps, "onlayoutchange"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof CollectionToolbar
  >({
    title: "Shared/Collection toolbar",
    component: CollectionToolbar,
    args: { label: "Search projects", query: "", layout: "grid" },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.layout}>
    {#snippet children({
      value: layout,
      set,
    }: FixtureStateView<"grid" | "list">)}
      <div {dir}>
        <CollectionToolbar
          {...args}
          {layout}
          onlayoutchange={(next: "grid" | "list") => {
            set(next);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Grid" {template} />
<Story
  name="List with search"
  args={{ layout: "list", query: "Riverside" }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
