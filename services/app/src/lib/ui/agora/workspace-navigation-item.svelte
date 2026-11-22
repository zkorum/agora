<script lang="ts">
  import { Collapsible } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";

  import NavigationIcon from "./navigation-icon.svelte";
  import type {
    WorkspaceActive,
    WorkspaceNavigationItem,
    WorkspaceProjectLink,
  } from "./view-types.js";

  let {
    item,
    dir,
    active,
    collapsed,
    projects,
    onfollow,
    oncreateproject,
    expanded,
    onExpandedChange,
  }: {
    item: WorkspaceNavigationItem;
    dir: "ltr" | "rtl";
    active: WorkspaceActive;
    collapsed: boolean;
    projects: readonly WorkspaceProjectLink[];
    onfollow: () => void;
    oncreateproject: (() => void) | undefined;
    expanded: boolean;
    onExpandedChange: (open: boolean) => void;
  } = $props();
  const hasProjects = $derived(item.id === "projects" && !collapsed);
  const navigationClass = $derived([
    "flex w-full min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[inherit] bg-transparent text-start text-sm leading-5.25 font-medium tracking-[-0.01em] text-inherit focus-visible:outline-2 focus-visible:outline-primary-base focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    collapsed
      ? "justify-center px-4 py-3"
      : "py-4 ps-3 md:[@media(max-height:640px)]:h-11 md:[@media(max-height:640px)]:py-0",
    !collapsed && !hasProjects && "pe-3",
  ]);
  const projectLinkClass =
    "min-h-11 truncate rounded-xl bg-transparent px-3 py-3.25 text-start text-(length:--workspace-project-font-size,12px) leading-4.5 tracking-[-0.01em] text-ink-base hover:bg-sky-lighter aria-[current=page]:bg-sky-lighter focus-visible:outline-2 focus-visible:outline-primary-base focus-visible:outline-offset-2 disabled:cursor-not-allowed";
</script>

{#snippet navigationRow()}
  <div
    class={[
      `
        flex shrink-0 items-center rounded-xl
        hover:bg-sky-lighter
      `,
      collapsed ? "min-h-10" : "min-h-[53px]",
      !collapsed && "md:[@media(max-height:640px)]:min-h-11",
      active === item.id ? "bg-sky-lighter text-ink-base" : "text-ink-light",
    ]}
  >
    {#if item.destination.kind === "link"}
      <Button
        variant="unstyled"
        class={navigationClass}
        href={item.destination.href}
        aria-current={active === item.id ? "page" : undefined}
        aria-label={item.label}
        title={collapsed ? item.label : undefined}
        onclick={onfollow}
      >
        <NavigationIcon name={item.icon} {dir} />
        <span class={collapsed ? "hidden" : "truncate"}>{item.label}</span>
      </Button>
    {:else}
      <Button
        variant="unstyled"
        class={navigationClass}
        disabled={item.destination.kind === "unavailable"}
        aria-current={active === item.id ? "page" : undefined}
        aria-label={item.label}
        title={collapsed ? item.label : undefined}
        onclick={() => {
          if (item.destination.kind === "action") {
            item.destination.onselect();
            onfollow();
          }
        }}
      >
        <NavigationIcon name={item.icon} {dir} />
        <span class={collapsed ? "hidden" : "truncate"}>{item.label}</span>
      </Button>
    {/if}
    {#if hasProjects}
      <Collapsible.Trigger
        class="
          me-1 grid size-11 shrink-0 cursor-pointer place-items-center
          rounded-lg bg-transparent
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-primary-base
        "
        aria-label={m.app_nav_toggle_projects()}
      >
        <NavigationIcon name="chevron" open={expanded} {dir} />
      </Collapsible.Trigger>
    {/if}
  </div>
{/snippet}

{#if hasProjects}
  <Collapsible.Root
    bind:open={() => expanded, onExpandedChange}
    class="flex min-h-0 shrink flex-col"
  >
    {@render navigationRow()}
    <Collapsible.Content
      class="
        ms-3 mt-2 min-h-0 flex-col
        data-[state=open]:flex
        md:[@media(max-height:640px)]:mt-1
      "
    >
      {#if projects.length > 0}
        <div
          class="min-h-0 scroll-py-1 overflow-y-auto overscroll-y-contain p-1"
          role="region"
          aria-label={m.app_nav_projects()}
        >
          <ul class="m-0 list-none p-0">
            {#each projects as project (project.projectSlug)}
              <li>
                <Button
                  variant="unstyled"
                  class={[projectLinkClass, "block w-full"]}
                  href={project.href}
                  disabled={project.href === undefined}
                  title={project.label}
                  aria-current={typeof active === "object" &&
                  active.projectSlug === project.projectSlug
                    ? "page"
                    : undefined}
                  onclick={onfollow}>{project.label}</Button
                >
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <Button
        variant="unstyled"
        class={[
          projectLinkClass,
          "mx-1 flex w-[calc(100%-8px)] shrink-0 items-center gap-2",
        ]}
        disabled={oncreateproject === undefined}
        onclick={() => {
          oncreateproject?.();
          onfollow();
        }}
      >
        <NavigationIcon name="plus" {dir} />
        {m.app_nav_new_project()}
      </Button>
    </Collapsible.Content>
  </Collapsible.Root>
{:else}
  {@render navigationRow()}
{/if}
