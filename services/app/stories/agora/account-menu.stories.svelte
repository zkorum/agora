<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import { workspaceUser } from "#lib/mock-data.js";
  import AccountMenu from "$ui/agora/account-menu.svelte";

  type Args = ComponentProps<typeof AccountMenu>;

  const { Story } = defineMeta({
    title: "Agora/Account menu",
    component: AccountMenu,
    render: template,
    args: {
      user: workspaceUser,
      dir: "ltr",
      actions: undefined,
      onlogin: undefined,
    },
  });
</script>

{#snippet template(args: Args)}
  <div class="m-6 w-[179px] pt-85">
    <AccountMenu {...args} />
  </div>
{/snippet}

<Story name="Personal account" />
<Story name="Collapsed" args={{ compact: true }} />
<Story name="Logged out" args={{ user: undefined }} />
<Story name="RTL" args={{ dir: "rtl" }} />
<Story
  name="Partial actions"
  args={{
    actions: {
      organizations: () => undefined,
      logout: undefined,
    },
  }}
/>
<Story
  name="Untrusted-looking name"
  args={{
    user: { name: "<img src=x onerror=alert(1)>", initials: "<J>" },
  }}
/>
