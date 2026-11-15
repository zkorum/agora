<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";

  import ConversationBadge from "$ui/agora/conversation-badge.svelte";

  const { Story } = defineMeta({
    title: "Agora/Conversation badge",
    component: ConversationBadge,
  });
</script>

<Story name="Mapping" args={{ kind: "polis" }} />
<Story name="Gathering" args={{ kind: "gathering" }} />
<Story name="Prioritizing" args={{ kind: "prioritizing" }} />
<Story name="Open" args={{ status: "open" }} />
<Story name="Closed" args={{ status: "closed" }} />
<Story name="Draft" args={{ status: "draft" }} />
