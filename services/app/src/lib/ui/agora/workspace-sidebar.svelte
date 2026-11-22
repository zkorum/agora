<script lang="ts">
  import agoraIcon from "#lib/assets/agora-icon.svg";
  import * as m from "#lib/paraglide/messages.js";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import Button from "$ui/shared/button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";

  import AccountMenu from "./account-menu.svelte";
  import NavigationIcon from "./navigation-icon.svelte";
  import type { WorkspaceSidebarProps } from "./view-types.js";
  import WorkspaceNavigationItem from "./workspace-navigation-item.svelte";

  let {
    navigation,
    active,
    account,
    projects = [],
    oncreateproject,
    accountActions,
    onlogin,
    onsettings,
    dir,
    collapsed,
    projectsExpanded = $bindable(true),
    mobile = false,
    ontoggle,
    onfollow,
  }: WorkspaceSidebarProps = $props();

  const groups = $derived([
    {
      id: "facilitate",
      label: m.app_nav_facilitate(),
      items: navigation.filter((item) => item.group === "facilitate"),
    },
    {
      id: "participate",
      label: m.app_nav_participate(),
      items: navigation.filter((item) => item.group === "participate"),
    },
    {
      id: "updates",
      label: undefined,
      items: navigation.filter((item) => item.group === "updates"),
    },
  ]);
</script>

<div
  data-workspace-sidebar
  class={[
    `
      flex h-full min-h-0 shrink-0 flex-col gap-4 font-sans leading-normal
      tracking-[-0.01em] text-ink-light
      [@media(max-height:700px)]:gap-2
    `,
    mobile
      ? "w-full [--workspace-project-font-size:14px]"
      : `
        border-e border-sky-lighter pe-4 pt-4
        [@media(max-height:700px)]:pt-2
      `,
    !mobile && (collapsed ? "w-[69px]" : "w-49"),
  ]}
  {dir}
>
  <div class={["flex h-11 shrink-0 items-center", !collapsed && "ps-4"]}>
    {#if !collapsed}
      <Button
        variant="unstyled"
        class="
          flex min-w-0 flex-1 items-center gap-3 text-base/6 font-medium
          text-primary-base
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-primary-base
        "
        href={localizeHref("/home")}
        aria-label={m.nav_home()}
        aria-current={active === "home" ? "page" : undefined}
        onclick={onfollow}
      >
        <img src={agoraIcon} alt="" width="26.328" height="28.915" />
        <GradientText angle={146}>Agora</GradientText>
      </Button>
    {/if}
    {#if !mobile}
      <Button
        variant="unstyled"
        class={[
          `
            grid shrink-0 cursor-pointer place-items-center rounded-lg
            bg-transparent
            hover:bg-sky-lighter
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-primary-base
          `,
          collapsed ? "h-8 w-13" : "size-9",
        ]}
        aria-label={collapsed ? m.app_nav_expand() : m.app_nav_collapse()}
        aria-expanded={!collapsed}
        onclick={ontoggle}
      >
        <NavigationIcon name={collapsed ? "expand" : "collapse"} {dir} />
      </Button>
    {/if}
  </div>
  <div class="h-px shrink-0 bg-sky-lighter"></div>
  <nav
    class={[
      `
        flex min-h-0 flex-1 flex-col
        [@media(max-height:480px)]:-m-1
        [@media(max-height:480px)]:overflow-y-auto
        [@media(max-height:480px)]:p-1
      `,
      !collapsed &&
        `
          gap-3
          [@media(max-height:700px)]:gap-2
        `,
    ]}
    aria-label={m.app_nav_main()}
  >
    {#each groups as group (group.id)}
      {#if group.items.length > 0}
        <section
          class={[
            "flex min-h-0 flex-col",
            group.id === "facilitate" && !collapsed
              ? `
                shrink
                [@media(max-height:480px)]:shrink-0
              `
              : "shrink-0",
            !collapsed &&
              `
                not-first:border-t not-first:border-sky-lighter not-first:pt-3
                [@media(max-height:700px)]:not-first:pt-2
              `,
          ]}
          aria-label={group.label}
        >
          {#if group.label && !collapsed}<h2
              class="
                mb-1 shrink-0 text-xs/none-base font-medium tracking-[-0.01em]
                text-sky-dark
              "
            >
              {group.label}
            </h2>{/if}
          {#each group.items as item (item.id)}
            <WorkspaceNavigationItem
              {item}
              {dir}
              {active}
              {collapsed}
              {projects}
              {onfollow}
              {oncreateproject}
              expanded={projectsExpanded}
              onExpandedChange={(open: boolean) => {
                projectsExpanded = open;
              }}
            />
          {/each}
        </section>
      {/if}
    {/each}
  </nav>
  <div class="h-px shrink-0 bg-sky-lighter"></div>
  <div class="shrink-0">
    <Button
      variant="unstyled"
      class={[
        `
          flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4
          py-2 text-start text-sm font-medium
          hover:bg-sky-lighter
          focus-visible:outline-2 focus-visible:outline-primary-base
        `,
        collapsed && "justify-center",
      ]}
      aria-label={m.app_account_settings()}
      aria-haspopup="dialog"
      title={collapsed ? m.app_account_settings() : undefined}
      onclick={(event: MouseEvent & { currentTarget: HTMLButtonElement }) => {
        onsettings(event.currentTarget);
      }}
    >
      <NavigationIcon name="settings" {dir} />
      {#if !collapsed}<span>{m.app_account_settings()}</span>{/if}
    </Button>
    <AccountMenu
      user={account}
      compact={collapsed}
      {dir}
      actions={accountActions}
      {onlogin}
    />
  </div>
</div>
