<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Icon from "$ui/shared/icon.svelte";

  type Args = ComponentProps<typeof Icon> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Shared/Icon",
    component: Icon,
    render: template,
    args: { name: "folder", size: 24 },
    argTypes: {
      name: {
        control: "select",
        options: [
          "folder",
          "polis",
          "gathering",
          "prioritizing",
          "back",
          "forward",
          "panel",
          "settings",
          "search",
          "bell",
          "check",
          "close",
        ],
      },
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} style="display: flex; align-items: center; gap: 12px">
    <Icon {...args} /><span>{args.name}</span>
  </div>
{/snippet}

<Story name="Folder" />
<Story name="Large" args={{ size: 40 }} />
<Story name="Directional" args={{ name: "back" }} />
<Story name="Directional RTL" args={{ name: "back", dir: "rtl" }} />
