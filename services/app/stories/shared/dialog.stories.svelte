<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import type { DialogProps } from "$ui/shared/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<DialogProps, "children" | "footer">;

  const { Story } = defineMeta<Snippet<[Args]>, typeof Dialog>({
    title: "Shared/Dialog",
    component: Dialog,
    args: {
      title: "Project details",
      description: "Presentation only. Nothing is saved or submitted.",
      open: false,
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
        }}>Open dialog</Button
      >
      <Dialog {...args} bind:open={() => opened, set}>
        <Field label="Project name" value="A Greener Riverside" />
        {#snippet footer()}
          <Button
            variant="solid"
            size="control"
            onclick={() => {
              set(false);
            }}>Done</Button
          >
        {/snippet}
      </Dialog>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Closed" {template} />
<Story name="Open" args={{ open: true }} {template} />
<Story name="Wide" args={{ open: true, wide: true }} {template} />
<Story name="RTL" args={{ open: true, dir: "rtl" }} {template} />
