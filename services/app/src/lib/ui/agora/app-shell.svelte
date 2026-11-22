<script lang="ts">
  import { onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";

  import agoraIcon from "#lib/assets/agora-icon.svg";
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import { desktopMediaQueries } from "$ui/shared/responsive.js";

  import AccountMenu from "./account-menu.svelte";
  import type { AppShellProps } from "./view-types.js";
  import WorkspaceMobileNavigation from "./workspace-mobile-navigation.svelte";
  import WorkspaceSidebar from "./workspace-sidebar.svelte";
  let {
    navigation,
    active,
    headerStart,
    headerCenter,
    header,
    contentRef = $bindable(null),
    children,
    dir,
    participant = false,
    account,
    projects,
    oncreateproject,
    accountActions,
    onlogin,
    onsettings,
    onbacktoproject,
  }: AppShellProps = $props();
  const largeDesktop = new MediaQuery(desktopMediaQueries.lg);
  let mounted = $state(false);
  let mediumExpanded = $state(false);
  let largeExpanded = $state(true);
  const expanded = $derived(
    !mounted || largeDesktop.current ? largeExpanded : mediumExpanded,
  );
  let projectsExpanded = $state(true);
  const noDesktopTopbar = $derived(!participant && !header && !headerStart);

  // Keep the server and hydration markup consistent, including the toggle icon.
  onMount(() => {
    mounted = true;
  });

  function toggleSidebar() {
    if (largeDesktop.current) {
      largeExpanded = !largeExpanded;
    } else {
      mediumExpanded = !mediumExpanded;
    }
  }

  function attachContent(node: HTMLElement): () => void {
    contentRef = node;
    return () => {
      contentRef = null;
    };
  }
</script>

<div
  {dir}
  class="
    flex h-full min-h-0 gap-4 bg-sky-lightest px-6 pb-6 font-sans leading-normal
    tracking-[-0.01em] text-ink-dark
    max-md:gap-0 max-md:p-0
  "
>
  {#if !participant}
    <aside
      class={["shrink-0", "max-md:hidden"]}
      aria-label={m.app_nav_workspace()}
    >
      <WorkspaceSidebar
        {navigation}
        {active}
        {account}
        {projects}
        {oncreateproject}
        {accountActions}
        {onlogin}
        {onsettings}
        {dir}
        bind:projectsExpanded
        collapsed={!expanded}
        ontoggle={toggleSidebar}
        onfollow={() => undefined}
      />
    </aside>
  {/if}
  <div class={["flex min-w-0 flex-1 flex-col", noDesktopTopbar && "md:pt-4"]}>
    <header
      class={[
        headerCenter
          ? `
            grid h-[66px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
            items-center gap-3 pt-4 pb-3
            max-xl:h-auto max-xl:grid-cols-[minmax(0,1fr)_auto]
            max-xl:grid-rows-[auto_auto] max-xl:gap-y-1.5
            max-md:grid-rows-[minmax(48px,auto)_auto] max-md:gap-0 max-md:px-5
            max-md:pt-0 max-md:pb-2
          `
          : [
              `
                shrink-0 items-center justify-end
                max-md:px-5
                md:flex md:gap-3 md:pt-4 md:pb-3
              `,
              participant
                ? `
                  flex h-14 gap-3 py-2
                  md:h-[73px]
                `
                : `
                  max-md:grid
                  md:h-[66px]
                `,
              !participant &&
                (headerStart
                  ? `
                    max-md:h-14 max-md:grid-cols-[minmax(0,1fr)_auto]
                    max-md:grid-rows-[56px]
                  `
                  : header
                    ? `
                      max-md:h-[114px] max-md:grid-cols-[1fr_auto_1fr]
                      max-md:grid-rows-[52px_62px]
                    `
                    : `
                      max-md:h-14 max-md:grid-cols-[1fr_auto_1fr]
                      max-md:grid-rows-[56px]
                    `),
            ],
        noDesktopTopbar && "md:hidden",
      ]}
    >
      {#if participant}
        <div
          class="
            me-auto flex items-center
            max-md:-ms-2
            [&_button]:size-11
            max-md:[&_button]:size-10
          "
        >
          <Button
            variant="quiet"
            size="icon"
            aria-label={m.app_nav_back_project()}
            disabled={onbacktoproject === undefined}
            onclick={onbacktoproject}><Icon name="back" size={20} /></Button
          >
          <img src={agoraIcon} alt="Agora" width="26" height="29" />
        </div>
      {:else if !headerStart}
        <span class={["col-start-1 row-start-1", "md:hidden"]}
          ><WorkspaceMobileNavigation
            {navigation}
            {active}
            {account}
            {projects}
            {oncreateproject}
            {accountActions}
            {onlogin}
            {onsettings}
            {dir}
            bind:projectsExpanded
          /></span
        >
        <img
          class="
            col-start-2 row-start-1
            md:hidden
          "
          src={agoraIcon}
          alt="Agora"
          width="26"
          height="29"
        />
        <span
          class={["col-start-3 row-start-1 flex justify-self-end", "md:hidden"]}
        >
          <AccountMenu
            user={account}
            compact
            {dir}
            actions={accountActions}
            {onlogin}
          />
        </span>
      {/if}
      {#if headerStart}<div
          class={headerCenter
            ? `
              flex min-w-0 items-center gap-2
              max-xl:col-start-1 max-xl:row-start-1
            `
            : [
                `
                  me-auto flex min-w-0 items-center gap-2
                  max-md:col-start-1 max-md:row-start-1 max-md:w-full
                `,
                !header && "max-md:col-span-full",
              ]}
        >
          {@render headerStart()}
        </div>{/if}
      {#if headerCenter}<div
          class="
            min-w-0 justify-self-center
            max-xl:col-span-full max-xl:row-start-2
          "
        >
          {@render headerCenter()}
        </div>{/if}
      {#if header}<div
          class={headerCenter
            ? `
              flex items-center gap-2 justify-self-end
              max-xl:col-start-2 max-xl:row-start-1
            `
            : [
                `
                  ms-auto flex items-center gap-2
                  max-md:col-start-2 max-md:justify-end
                `,
                !participant && !headerStart && "max-md:row-start-2",
                participant &&
                  `
                    max-md:[&_button]:size-9 max-md:[&_button]:min-h-9
                    max-md:[&_button]:border-transparent
                    max-md:[&_button]:bg-sky-lighter max-md:[&_button]:p-0
                  `,
              ]}
        >
          {@render header()}
        </div>{/if}
      {#if participant}
        <AccountMenu
          user={account}
          compact
          {dir}
          actions={accountActions}
          {onlogin}
        />
      {/if}
    </header>
    <main
      class={[
        `
          min-h-0 flex-1 overflow-auto overscroll-contain rounded-2xl border
          border-sky-lighter
          bg-(--app-shell-content-background,var(--sky-off-white))
          [scrollbar-width:none]
          max-md:rounded-b-none max-md:border-b-0
        `,
        participant && "w-full max-w-[960px] self-center",
        `
          max-md:[--workspace-action-bottom:calc(15px+env(safe-area-inset-bottom,0px))]
          max-md:[--workspace-action-clearance:calc(64px+var(--workspace-action-bottom))]
          max-md:has-data-workspace-floating-action:scroll-pb-(--workspace-action-clearance)
          max-md:has-data-workspace-floating-action:pb-(--workspace-action-clearance)
          max-md:**:data-workspace-floating-action:fixed
          max-md:**:data-workspace-floating-action:inset-e-[15px]
          max-md:**:data-workspace-floating-action:bottom-(--workspace-action-bottom)
          max-md:**:data-workspace-floating-action:z-10
          max-md:**:data-workspace-floating-action:max-w-[calc(100%-30px)]
        `,
      ]}
      {@attach attachContent}
    >
      {@render children()}
    </main>
  </div>
</div>
