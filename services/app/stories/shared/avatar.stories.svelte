<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import { author } from "#lib/mock-data.js";
  import Avatar from "$ui/shared/avatar.svelte";

  type Args = ComponentProps<typeof Avatar> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Shared/Avatar",
    component: Avatar,
    render: template,
    args: { author },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} class="w-full max-w-80">
    <Avatar {...args} />
  </div>
{/snippet}

<Story name="Participant" />
<Story
  name="Organization"
  args={{
    author: {
      name: "Civic Tomorrow Collective",
      initials: "CT",
      detail: "Organizer",
    },
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
