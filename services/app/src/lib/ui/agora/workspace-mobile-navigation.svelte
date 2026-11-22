<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import MobileNavDrawer from "$ui/shared/mobile-nav-drawer.svelte";

  import type { WorkspaceNavigationProps } from "./view-types.js";
  import WorkspaceSidebar from "./workspace-sidebar.svelte";

  let {
    projectsExpanded = $bindable(true),
    onsettings,
    ...sidebarProps
  }: WorkspaceNavigationProps & { projectsExpanded?: boolean } = $props();
  let open = $state(false);
  let trigger = $state.raw<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let settingsRequested = false;
</script>

<Button
  size="icon"
  variant="quiet"
  aria-label={m.nav_open_menu()}
  aria-expanded={open}
  bind:ref={trigger}
  onclick={() => (open = !open)}
>
  <Icon name="menu" />
</Button>

<MobileNavDrawer
  bind:open
  dir={sidebarProps.dir}
  appearance="sidebar"
  title={m.app_nav_workspace()}
  closeLabel={m.mobile_nav_close()}
  contentProps={{
    onCloseAutoFocus(event: Event) {
      if (trigger) {
        event.preventDefault();
        if (settingsRequested) {
          settingsRequested = false;
          onsettings(trigger);
        } else {
          trigger.focus({ preventScroll: true });
        }
      }
    },
  }}
>
  {#snippet navigation()}
    <WorkspaceSidebar
      {...sidebarProps}
      bind:projectsExpanded
      mobile
      onsettings={() => {
        settingsRequested = true;
        open = false;
      }}
      collapsed={false}
      ontoggle={() => undefined}
      onfollow={() => (open = false)}
    />
  {/snippet}
</MobileNavDrawer>
