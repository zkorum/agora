<script lang="ts">
  import { DropdownMenu } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";
  import Avatar from "$ui/shared/avatar.svelte";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import NavigationIcon from "./navigation-icon.svelte";
  import type {
    AccountAction,
    AccountActions,
    WorkspaceUser,
  } from "./view-types.js";

  let {
    user,
    compact = false,
    dir,
    actions,
    onlogin,
  }: {
    user: WorkspaceUser | undefined;
    compact?: boolean;
    dir: "ltr" | "rtl";
    actions: AccountActions | undefined;
    onlogin: (() => void) | undefined;
  } = $props();
  let open = $state(false);
  const items = $derived([
    { id: "organizations", label: m.app_account_organizations() },
    { id: "logout", label: m.app_account_logout() },
  ] satisfies { id: AccountAction; label: string }[]);
  const triggerClass = $derived([
    "flex w-full cursor-pointer items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-start text-base leading-6 font-medium tracking-[-0.01em] text-ink-light hover:bg-sky-lighter focus-visible:outline-2 focus-visible:outline-primary-base focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    compact ? "min-h-11 justify-center" : "min-h-12",
  ]);
</script>

<!-- Resize events can be coalesced across a breakpoint, so dismissal must not rely on unmounting. -->
<svelte:window onresize={() => (open = false)} />

<div>
  {#if user}
    <DropdownMenu.Root bind:open>
      <DropdownMenu.Trigger
        class={[triggerClass, !compact && "justify-between"]}
        aria-label={`${m.app_account_menu()}: ${user.name}`}
      >
        <span
          class={[
            `
              min-w-0 [--avatar-background:var(--primary-lightest)]
              [--avatar-color:var(--primary-base)] [--avatar-copy-gap:0]
              [--avatar-detail-display:none] [--avatar-gap:12px]
              [--avatar-initials-size:9px]
              [--avatar-name-color:var(--ink-light)]
              [--avatar-name-overflow:hidden] [--avatar-name-size:16px]
              [--avatar-name-text-overflow:ellipsis]
              [--avatar-name-white-space:nowrap] [--avatar-radius:50%]
            `,
            compact
              ? "[--avatar-copy-display:none] [--avatar-size:20px]"
              : "[--avatar-size:16px]",
          ]}
        >
          <Avatar author={{ ...user, detail: "" }} />
        </span>
        {#if !compact}<NavigationIcon name="account" {dir} />{/if}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="
            z-90 w-[263px] max-w-[calc(100vw-16px)] rounded-xl bg-sky-white p-2
            font-sans tracking-[-0.01em] text-ink-base
            shadow-[0_2px_5px_#0000000d]
          "
          {dir}
          side={compact ? (dir === "rtl" ? "left" : "right") : "top"}
          align="start"
          sideOffset={8}
          aria-label={m.app_account_menu()}
        >
          <DropdownMenu.Group>
            <DropdownMenu.GroupHeading
              class="px-2 py-2.5 text-xs/none-base font-medium text-sky-dark"
            >
              {m.app_account_menu()}
            </DropdownMenu.GroupHeading>
            <div
              class="
                px-2 py-3 [--avatar-background:var(--primary-lightest)]
                [--avatar-color:var(--primary-base)]
                [--avatar-detail-line-height:16px] [--avatar-detail-size:14px]
                [--avatar-gap:12px] [--avatar-initials-size:14px]
                [--avatar-name-size:14px] [--avatar-radius:50%]
                [--avatar-size:32px]
              "
            >
              <Avatar author={{ ...user, detail: m.app_account_personal() }} />
            </div>
            <DropdownMenu.Separator class="mx-3 my-1 h-px bg-sky-lighter" />
            {#each items as action (action.id)}
              <DropdownMenu.Item
                class="
                  flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5
                  text-sm/5.25 font-medium
                  data-disabled:cursor-not-allowed data-disabled:opacity-50
                  data-highlighted:bg-sky-lightest data-highlighted:outline-none
                "
                disabled={actions?.[action.id] === undefined}
                onSelect={() => actions?.[action.id]?.()}
              >
                <NavigationIcon name={action.id} {dir} />
                {action.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {:else}
    <Button
      variant="unstyled"
      class={triggerClass}
      aria-label={m.app_account_login()}
      title={compact ? m.app_account_login() : undefined}
      disabled={onlogin === undefined}
      onclick={onlogin}
    >
      <Icon name="user" size={compact ? 20 : 16} />
      {#if !compact}<span>{m.app_account_login()}</span>{/if}
    </Button>
  {/if}
</div>
