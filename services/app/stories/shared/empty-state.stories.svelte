<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import EmptyState from "$ui/shared/empty-state.svelte";

  type Args = Omit<ComponentProps<typeof EmptyState>, "actions"> & {
    withAction?: boolean;
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta({
    title: "Shared/Empty state",
    component: EmptyState,
    render: template,
    args: {
      title: "No projects found",
      description: "Try another search, or create a new project.",
    },
  });
</script>

{#snippet template({ withAction = false, dir = "ltr", ...args }: Args)}
  <div {dir} style="max-width: 640px">
    {#snippet action()}<Button variant="neutral" size="control" disabled
        >Create project</Button
      >{/snippet}
    <EmptyState {...args} actions={withAction ? action : undefined} />
  </div>
{/snippet}

<Story name="No results" />
<Story name="With action" args={{ withAction: true }} />
<Story
  name="No activities"
  args={{
    title: "No activities yet",
    description: "Invite people to share ideas and decide what comes next.",
    icon: "message",
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
