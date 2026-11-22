<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { qvAllocations, author } from "#lib/mock-data.js";
  import ContentCard from "$ui/agora/content-card.svelte";
  import type { ContentCardProps } from "$ui/agora/view-types.js";
  import Dialog from "$ui/shared/dialog.svelte";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<ContentCardProps, "onread"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof ContentCard>({
    title: "Agora/Content card",
    component: ContentCard,
    args: {
      author,
      title: qvAllocations[0].title,
      description: qvAllocations[0].description,
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => false}>
    {#snippet children({ value: open, set }: FixtureStateView<boolean>)}
      <div {dir} class="w-full max-w-160">
        <ContentCard
          {...args}
          onread={() => {
            set(true);
          }}
        />
        <Dialog
          bind:open={() => open, set}
          {dir}
          title={args.title}
          description="Full response">{args.description}</Dialog
        >
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Response" {template} />
<Story
  name="Long description"
  args={{
    description: Array.from(
      { length: 8 },
      () => `${qvAllocations[0].description} ${qvAllocations[1].description}`,
    ).join("\n\n"),
  }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
