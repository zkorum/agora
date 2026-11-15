<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import SegmentedControl from "$ui/shared/segmented-control.svelte";
  import type { SegmentedControlProps } from "$ui/shared/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<SegmentedControlProps, "onchange"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof SegmentedControl
  >({
    title: "Shared/Segmented control",
    component: SegmentedControl,
    args: {
      label: "Activity status",
      items: [
        { value: "open", label: "Open", count: "3" },
        { value: "closed", label: "Closed", count: "1" },
      ],
      value: "open",
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.value}>
    {#snippet children({ value: selected, set }: FixtureStateView<string>)}
      <div {dir}>
        <SegmentedControl
          {...args}
          value={selected}
          onchange={(next: string) => {
            set(next);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Pill" {template} />
<Story name="Underline" args={{ appearance: "underline" }} {template} />
<Story name="Disabled" args={{ disabled: true }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
