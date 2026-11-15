<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Metrics from "$ui/shared/metrics.svelte";

  type Args = ComponentProps<typeof Metrics> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Shared/Metrics",
    component: Metrics,
    render: template,
    args: {
      items: [
        { label: "Participants", value: "128" },
        { label: "Statements", value: "5" },
        { label: "Responses", value: "1,024" },
      ],
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} style="max-width: 800px"><Metrics {...args} /></div>
{/snippet}

<Story name="Participation" />
<Story
  name="Zero"
  args={{
    items: [
      { label: "Participants", value: "0" },
      { label: "Responses", value: "0" },
    ],
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
