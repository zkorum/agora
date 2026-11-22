<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import { conversations } from "#lib/mock-data.js";
  import ConversationCard from "$ui/agora/conversation-card.svelte";

  type Args = ComponentProps<typeof ConversationCard> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Agora/Conversation card",
    component: ConversationCard,
    render: template,
    args: { conversation: conversations[1], onopen: () => undefined },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} class="w-full max-w-120">
    <ConversationCard {...args} />
  </div>
{/snippet}

<Story name="Open mapping" />
<Story name="Closed gathering" args={{ conversation: conversations[0] }} />
<Story name="Draft prioritizing" args={{ conversation: conversations[2] }} />
<Story
  name="Long description"
  args={{
    conversation: {
      ...conversations[1],
      description: Array.from(
        { length: 8 },
        () =>
          "Tell us where journeys are difficult and what should change. We will consider safer crossings, accessible routes and places to pause before choosing the next improvements together.",
      ).join("\n\n"),
    },
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
