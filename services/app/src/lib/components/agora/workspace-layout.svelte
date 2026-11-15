<script lang="ts">
  import type { Snippet } from "svelte";

  import * as m from "#lib/paraglide/messages.js";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";
  import AppShell from "$ui/agora/app-shell.svelte";
  import type { AppShellProps } from "$ui/agora/view-types.js";

  let { children }: { children: Snippet } = $props();

  const dir = $derived(
    ["ar", "fa", "he"].includes(getLocale()) ? "rtl" : "ltr",
  );
  const navigation = $derived([
    {
      id: "home",
      label: m.nav_home(),
      icon: "grid",
      group: m.app_workspace(),
      href: localizeHref("/home"),
    },
    {
      id: "projects",
      label: m.app_nav_projects(),
      icon: "folder",
      group: m.app_workspace(),
      disabled: true,
    },
    {
      id: "history",
      label: m.app_nav_history(),
      icon: "history",
      group: m.app_workspace(),
      disabled: true,
    },
    {
      id: "explore",
      label: m.app_nav_explore(),
      icon: "explore",
      group: m.app_workspace(),
      disabled: true,
    },
    {
      id: "notifications",
      label: m.app_nav_notifications(),
      icon: "bell",
      group: m.app_workspace(),
      disabled: true,
    },
    {
      id: "about",
      label: m.app_nav_about(),
      icon: "globe",
      group: "Agora",
      href: localizeHref("/"),
    },
  ] satisfies AppShellProps["navigation"]);
</script>

<div class="workspace">
  <AppShell {navigation} {dir} active="home">
    {@render children()}
  </AppShell>
</div>

<style>
  .workspace {
    height: 100dvh;
    min-height: 320px;
  }
</style>
