<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import SettingRow from "$ui/shared/setting-row.svelte";

  type Args = ComponentProps<typeof SettingRow> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Shared/Setting row",
    component: SettingRow,
    render: template,
    args: {
      title: "Guest participation",
      description: "People can take part without verifying their identity.",
      icon: "shield",
      checked: false,
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} style="max-width: 640px"><SettingRow {...args} /></div>
{/snippet}

<Story name="Off" />
<Story name="On" args={{ checked: true }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="On RTL" args={{ checked: true, dir: "rtl" }} />
