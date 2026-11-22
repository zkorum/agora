<script lang="ts">
  import type { Snippet } from "svelte";

  import { accountSettingsPreview } from "#lib/mock-data.js";
  import type { Locale } from "#lib/paraglide/runtime.js";
  import type { AccountSettingsPreview } from "$components/agora/view-types.js";
  import WorkspaceSettings from "$components/agora/workspace-settings.svelte";
  import type { WorkspaceUser } from "$ui/agora/view-types.js";
  import LanguageSelect from "$ui/shared/language-select.svelte";

  let {
    user,
    dir,
    children: shell,
  }: {
    user: WorkspaceUser | undefined;
    dir: "ltr" | "rtl";
    children: Snippet<
      [
        {
          account: WorkspaceUser | undefined;
          onsettings: (opener: HTMLElement) => void;
        },
      ]
    >;
  } = $props();
  let account = $derived<AccountSettingsPreview | undefined>(
    user && { ...accountSettingsPreview, username: user.name },
  );
  let locale = $derived<Locale>(dir === "rtl" ? "ar" : "en");
</script>

<WorkspaceSettings
  {dir}
  preview={account && {
    account,
    onsave: (next: AccountSettingsPreview) => {
      account = next;
    },
    ondelete: () => {
      account = undefined;
    },
  }}
>
  {#snippet language()}
    <LanguageSelect
      variant="field"
      value={locale}
      onchange={(next: Locale) => (locale = next)}
    />
  {/snippet}
  {#snippet children(onsettings: (opener: HTMLElement) => void)}
    {@render shell({
      account: account && {
        name: account.username,
        initials: account.username.slice(0, 1),
      },
      onsettings,
    })}
  {/snippet}
</WorkspaceSettings>
