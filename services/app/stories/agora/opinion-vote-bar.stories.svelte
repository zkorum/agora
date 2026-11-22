<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import { opinionVoteBreakdown } from "#lib/mock-data.js";
  import OpinionVoteBar from "$ui/agora/opinion-vote-bar.svelte";

  type Args = ComponentProps<typeof OpinionVoteBar> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Agora/Opinion vote bar",
    component: OpinionVoteBar,
    render: template,
    args: { voteBreakdown: opinionVoteBreakdown },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} class="max-w-[640px]"><OpinionVoteBar {...args} /></div>
{/snippet}

<Story name="Mixed responses" />
<Story
  name="No responses"
  args={{
    voteBreakdown: opinionVoteBreakdown.map((vote) => ({
      ...vote,
      count: "0",
      percentage: 0,
    })),
  }}
/>
<Story
  name="Unanimous"
  args={{
    voteBreakdown: [
      { choice: "agree", label: "Agree", count: "128", percentage: 100 },
    ],
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
