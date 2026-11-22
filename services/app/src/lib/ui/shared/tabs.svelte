<script module lang="ts">
  export interface Tab<Value extends string> {
    value: Value;
    label: string;
    status?: { label: string; active: boolean };
  }
</script>

<script lang="ts" generics="Value extends string">
  import { Tabs } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    value,
    onValueChange,
    tabs,
    label,
    rootProps = {},
    panel,
    layout,
    appearance = "underline",
  }: {
    tabs: readonly Tab<Value>[];
    value: NoInfer<Value>;
    onValueChange: (value: NoInfer<Value>) => void;
    label: NonNullable<Tabs.ListProps["aria-label"]>;
    rootProps?: Omit<
      Tabs.RootProps,
      "child" | "children" | "value" | "onValueChange" | "ref"
    >;
    /** Invoked for the active panel only. */
    panel: Snippet<[NoInfer<Value>]>;
    appearance?: "underline" | "pills";
    layout?: Snippet<[Snippet, Snippet]>;
  } = $props();

  const id = $props.id();

  function changeValue(next: string): void {
    // Bits UI provides a string; only forward a configured tab value.
    const tab = tabs.find((item) => item.value === next);
    if (tab) onValueChange(tab.value);
  }
</script>

{#snippet list()}
  <Tabs.List
    class={appearance === "pills"
      ? "flex max-w-full rounded-full bg-sky-lighter p-0.5"
      : "flex border-b border-sky-lighter px-3"}
    aria-label={label}
  >
    {#each tabs as tab, index (tab.value)}
      {@const statusId = `${id}-status-${index}`}
      <Tabs.Trigger
        class={appearance === "pills"
          ? `
            min-w-[clamp(5rem,10cqi,7.5rem)] flex-1 cursor-pointer rounded-full
            px-3 py-1.5 wrap-anywhere text-ink-light
            focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-primary-base
            aria-selected:bg-sky-white aria-selected:text-ink-dark
            aria-selected:shadow-(--shadow-surface-subtle)
            @max-[58rem]:min-w-0
          `
          : `
            inline-flex min-h-11 cursor-pointer items-center gap-2 border-b-2
            border-transparent px-2.5 text-sm text-ink-light
            hover:text-ink-darker
            focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-primary-base
            aria-selected:border-current aria-selected:text-ink-darker
          `}
        value={tab.value}
        aria-describedby={tab.status?.active ? statusId : undefined}
      >
        {tab.label}
        {#if tab.status}
          <span
            class="
              size-1.5 flex-none rounded-full
              data-active:bg-green-darkest
            "
            data-tab-status
            data-active={tab.status.active ? "" : undefined}
            aria-hidden="true"
          ></span>
          {#if tab.status.active}
            <span id={statusId} hidden>{tab.status.label}</span>
          {/if}
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
{/snippet}

{#snippet panels()}
  {#each tabs as tab (tab.value)}
    <Tabs.Content value={tab.value}>
      {#if value === tab.value}
        {@render panel(tab.value)}
      {/if}
    </Tabs.Content>
  {/each}
{/snippet}
<Tabs.Root {...rootProps} {value} data-shared-tabs onValueChange={changeValue}>
  {#if layout}{@render layout(list, panels)}{:else}
    {@render list()}
    {@render panels()}
  {/if}
</Tabs.Root>
