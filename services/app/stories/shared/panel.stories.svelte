<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import Panel from "$ui/shared/panel.svelte";

  type Args = Omit<ComponentProps<typeof Panel>, "children" | "actions"> & {
    body: string;
    withAction?: boolean;
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta({
    title: "Shared/Panel",
    component: Panel,
    render: template,
    args: {
      title: "Panel heading",
      description: "Optional supporting description.",
      body: "Content supplied through the shared panel snippet.",
    },
  });
</script>

{#snippet template({ body, withAction = false, dir = "ltr", ...args }: Args)}
  <div {dir} class="w-full max-w-200">
    {#snippet action()}<Button variant="neutral" size="control" disabled
        >Action</Button
      >{/snippet}
    <Panel {...args} actions={withAction ? action : undefined}>
      <p>{body}</p>
    </Panel>
  </div>
{/snippet}

<Story name="With heading" />
<Story name="With action" args={{ withAction: true }} />
<Story
  name="Content only"
  args={{ title: undefined, description: undefined }}
/>
<Story name="Description only" args={{ title: undefined }} />
<Story name="RTL" args={{ dir: "rtl" }} />
