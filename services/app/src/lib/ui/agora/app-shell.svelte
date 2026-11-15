<script lang="ts">
  import { Button as BitsButton } from "bits-ui";

  import agoraIcon from "#lib/assets/agora-icon.svg";
  import * as m from "#lib/paraglide/messages.js";
  import Avatar from "$ui/shared/avatar.svelte";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import MobileNavDrawer from "$ui/shared/mobile-nav-drawer.svelte";

  import type { AppShellProps } from "./view-types.js";
  let {
    navigation,
    active,
    onnavigate,
    header,
    children,
    dir,
    participant = false,
    account,
  }: AppShellProps = $props();
  let expanded = $state(true);
  let mobileOpen = $state(false);

  function navigate(id: string) {
    onnavigate?.(id);
    mobileOpen = false;
  }
</script>

{#snippet navigationContent(mobile: boolean)}
  <div class="brand">
    <span class="brand-name"
      ><img src={agoraIcon} alt="" width="26" height="26" /><span
        class="nav-label">Agora</span
      ></span
    >{#if !mobile}<Button
        variant="quiet"
        size="icon"
        aria-label={expanded ? m.app_nav_collapse() : m.app_nav_expand()}
        aria-expanded={expanded}
        onclick={() => (expanded = !expanded)}><Icon name="panel" /></Button
      >{/if}
  </div>
  <nav aria-label={m.app_nav_main()}>
    {#each navigation as item, index (item.id)}
      {#if index === 0 || navigation[index - 1]?.group !== item.group}
        {#if item.group === "Updates"}<div class="nav-separator"></div>{:else}<p
            class="group nav-label"
          >
            {item.group}
          </p>{/if}{/if}
      {#if item.href !== undefined}
        <BitsButton.Root
          href={item.href}
          disabled={item.disabled}
          class={["agora-nav-item", { active: active === item.id }]}
          aria-current={active === item.id ? "page" : undefined}
          aria-label={item.label}
          title={item.label}
          onclick={() => (mobileOpen = false)}
        >
          <Icon name={item.icon} /><span class="nav-label">{item.label}</span>
        </BitsButton.Root>
      {:else}
        <BitsButton.Root
          type="button"
          disabled={item.disabled === true || onnavigate === undefined}
          class={["agora-nav-item", { active: active === item.id }]}
          aria-current={active === item.id ? "page" : undefined}
          aria-label={item.label}
          title={item.label}
          onclick={() => {
            navigate(item.id);
          }}
          ><Icon name={item.icon} /><span class="nav-label">{item.label}</span
          ></BitsButton.Root
        >
      {/if}
    {/each}
  </nav>
  {#if account}
    <div class="account"><Avatar author={account} /></div>
  {/if}
{/snippet}

<div {dir} class={["shell", { collapsed: !expanded, participant }]}>
  {#if !participant}
    <aside aria-label={m.app_nav_workspace()}>
      {@render navigationContent(false)}
    </aside>
  {/if}
  <div class="main">
    <header class={["topbar", { "has-actions": header !== undefined }]}>
      {#if participant}
        <div class="participant-brand">
          <Button
            variant="quiet"
            size="icon"
            aria-label={m.app_nav_back_project()}
            disabled={onnavigate === undefined}
            onclick={() => {
              navigate("project");
            }}><Icon name="back" size={20} /></Button
          >
          <img src={agoraIcon} alt="Agora" width="26" height="29" />
        </div>
      {:else}
        <span class="mobile-menu"
          ><Button
            size="icon"
            variant="quiet"
            aria-label={m.nav_open_menu()}
            aria-expanded={mobileOpen}
            onclick={() => (mobileOpen = !mobileOpen)}
            ><Icon name="menu" /></Button
          ></span
        >
        <img
          class="mobile-logo"
          src={agoraIcon}
          alt="Agora"
          width="26"
          height="29"
        />
        {#if account}
          <span class="mobile-account" aria-label={account.name}
            >{account.initials}</span
          >
        {/if}
      {/if}
      {#if header}<div class="product-actions">{@render header()}</div>{/if}
      {#if participant && account}<span
          class="profile"
          aria-label={account.name}>{account.initials}</span
        >{/if}
    </header>
    <main class="content">{@render children()}</main>
  </div>
</div>

<MobileNavDrawer
  bind:open={mobileOpen}
  {dir}
  appearance="sidebar"
  title={m.app_nav_workspace()}
  closeLabel={m.mobile_nav_close()}
>
  {#snippet navigation()}{@render navigationContent(true)}{/snippet}
</MobileNavDrawer>

<style>
  .shell {
    display: flex;
    gap: 16px;
    padding: 0 24px 24px;
    height: 100%;
    min-height: 0;
    color: var(--ink-dark);
    background: var(--sky-lightest);
    font-family: var(--font-albert-sans);
    line-height: 1.5;
    letter-spacing: -0.01em;
  }
  aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 196px;
    flex-shrink: 0;
    padding-inline-end: 16px;
    border-inline-end: 1px solid var(--sky-lighter);
    padding-block-start: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
  }
  .brand-name {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-inline-start: 16px;
    color: var(--primary-base);
    font-weight: 500;
  }
  nav {
    flex: 1;
    overflow-y: auto;
    border-block-start: 1px solid var(--sky-lighter);
  }
  .group {
    padding: 16px 0 0;
    font-size: 12px;
    line-height: 16px;
    color: var(--ink-light);
  }
  .group:not(:first-child) {
    margin-block-start: 12px;
    border-block-start: 1px solid var(--sky-lighter);
    padding-block-start: 12px;
  }
  .nav-separator {
    margin-block: 12px;
    border-block-start: 1px solid var(--sky-lighter);
  }
  :global(.agora-nav-item) {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
    border: 0;
    border-radius: 8px;
    padding: 16px 12px;
    color: var(--ink-base);
    background: transparent;
    font: inherit;
    font-size: 14px;
    text-align: start;
    cursor: pointer;
    margin-block: 4px;
  }
  :global(.agora-nav-item:hover) {
    background: #eeedf2;
  }
  :global(.agora-nav-item:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
    background: transparent;
  }
  :global(.agora-nav-item:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  :global(.agora-nav-item.active) {
    background: var(--sky-lighter);
    color: var(--ink-dark);
  }
  .account {
    --avatar-detail-display: none;
    border-block-start: 1px solid var(--sky-lighter);
    padding-block-start: 16px;
    padding-inline: 16px;
    min-height: 73px;
  }
  .account :global(.agora-avatar) {
    border-radius: 50%;
    background: var(--primary-lightest);
    color: var(--primary-base);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    height: 66px;
    padding: 16px 0 12px;
    flex-shrink: 0;
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--sky-lighter);
    border-radius: 16px;
    background: var(--sky-off-white);
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .collapsed aside {
    width: 60px;
  }
  .collapsed .nav-label,
  .collapsed .brand-name,
  .collapsed .account {
    display: none;
  }
  .mobile-menu {
    display: none;
  }
  .mobile-logo,
  .mobile-account {
    display: none;
  }
  .product-actions,
  .participant-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .product-actions :global(button) {
    min-height: 38px;
    height: 38px;
    font-size: 16px;
    font-weight: 400;
  }
  .participant-brand {
    margin-inline-end: auto;
    gap: 0;
  }
  .participant-brand :global(button) {
    width: 44px;
    height: 44px;
  }
  .profile,
  .mobile-account {
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--primary-lightest);
    color: var(--primary-base);
    font-size: 14px;
  }
  .profile {
    display: flex;
  }
  .participant .topbar {
    height: 73px;
  }
  .participant .content {
    width: min(960px, 100%);
    align-self: center;
  }
  @media (max-width: 760px) {
    .shell {
      padding: 0;
      gap: 0;
    }
    aside,
    .collapsed aside {
      display: none;
    }
    .mobile-menu {
      display: block;
    }
    .topbar {
      height: 56px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      grid-template-rows: 56px;
      padding: 0 20px;
      gap: 0;
    }
    .mobile-logo {
      display: block;
      grid-column: 2;
    }
    .topbar.has-actions {
      height: 114px;
      grid-template-rows: 52px 62px;
    }
    .mobile-account {
      display: flex;
      width: 32px;
      height: 32px;
      justify-self: end;
    }
    .product-actions {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
    .content {
      border-radius: 16px 16px 0 0;
      border-block-end: 0;
    }
    .participant .topbar {
      height: 56px;
      display: flex;
      gap: 12px;
      padding-block: 8px;
    }
    .participant .product-actions {
      margin-inline-start: auto;
    }
    .participant .product-actions :global(button) {
      width: 36px;
      height: 36px;
      min-height: 36px;
      padding: 0;
      border-color: transparent;
      background: var(--sky-lighter);
    }
    .participant-brand {
      gap: 0;
      margin-inline-start: -8px;
    }
    .participant-brand :global(button) {
      width: 40px;
      height: 40px;
    }
    .profile {
      width: 32px;
      height: 32px;
    }
  }
</style>
