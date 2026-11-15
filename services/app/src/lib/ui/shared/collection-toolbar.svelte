<script lang="ts">
  import { Label, ToggleGroup } from "bits-ui";

  import Button from "./button.svelte";
  import Icon from "./icon.svelte";
  import Select from "./select.svelte";
  import type { CollectionToolbarProps } from "./view-types.js";

  let {
    label,
    query = $bindable(""),
    layout,
    onlayoutchange,
  }: CollectionToolbarProps = $props();

  function changeLayout(next: string): void {
    if (next === "grid" || next === "list") onlayoutchange(next);
  }
</script>

<div class="toolbar">
  <Label.Root class="collection-search"
    ><Icon name="search" size={16} /><input
      type="search"
      aria-label={label}
      placeholder={label}
      bind:value={query}
    /></Label.Root
  >
  <div class="controls">
    <Button
      variant="unstyled"
      class="compact-sort"
      type="button"
      aria-label="Sort by: Recent"
      disabled
      ><span class="icon-[lucide--arrow-down-up]" aria-hidden="true"
      ></span></Button
    >
    <div class="select">
      <span class="icon-[lucide--arrow-down-up]" aria-hidden="true"
      ></span><Select
        items={[{ value: "recent", label: "Recent" }]}
        placeholder="Sort by"
        value="recent"
        disabled
        triggerProps={{ "aria-label": "Sort by" }}
        triggerClass="collection-select-trigger"
      />
    </div>
    <div class="select filter">
      <span class="icon-[lucide--list-filter]" aria-hidden="true"></span><span
        class="sr-only">Filter collection</span
      ><Select
        items={[{ value: "all", label: "All projects" }]}
        placeholder="Filter collection"
        value="all"
        disabled
        triggerProps={{ "aria-label": "Filter collection" }}
        triggerClass="collection-select-trigger"
      />
    </div>
    <div class="layout">
      <ToggleGroup.Root
        type="single"
        bind:value={() => layout, changeLayout}
        aria-label="Collection layout"
        class="collection-layout"
      >
        <ToggleGroup.Item
          value="grid"
          class="collection-layout-button"
          aria-label="Grid view"
          ><Icon name="grid" size={16} /></ToggleGroup.Item
        ><ToggleGroup.Item
          value="list"
          class="collection-layout-button"
          aria-label="List view"
          ><Icon name="list" size={16} /></ToggleGroup.Item
        >
      </ToggleGroup.Root>
    </div>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-block-end: 24px;
    margin-block: 0 24px;
    border-block-end: 1px solid var(--sky-lighter);
  }
  .toolbar :global(.collection-search) {
    display: flex;
    gap: 10px;
    align-items: center;
    width: min(316px, 100%);
    height: 42px;
    min-width: 0;
    padding: 9px 12px;
    background: white;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    color: var(--sky-dark);
  }
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--ink-dark);
    font: inherit;
    font-size: 14px;
  }
  input::placeholder {
    color: var(--sky-dark);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .select {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: white;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    font-size: 14px;
    gap: 12px;
    min-height: 42px;
    min-width: 159px;
  }
  .select.filter {
    min-width: 190px;
  }
  .controls :global(.compact-sort) {
    display: none;
  }
  .select :global(.collection-select-trigger) {
    flex: 1;
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    font: inherit;
    max-width: 140px;
  }
  .layout {
    display: flex;
    gap: 4px;
  }
  .layout :global(.collection-layout) {
    display: flex;
    gap: 4px;
  }
  .layout :global(.collection-layout-button) {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 8px;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    background: white;
    color: var(--ink-dark);
    cursor: pointer;
  }
  .layout :global(.collection-layout-button:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .layout :global(.collection-layout-button[data-state="on"]) {
    background: var(--sky-lighter);
  }
  @media (max-width: 760px) {
    .toolbar {
      flex-wrap: nowrap;
      gap: 8px;
      padding-block-end: 16px;
      margin-block-end: 16px;
    }
    .toolbar :global(.collection-search) {
      flex: 1;
      width: auto;
    }
    .controls {
      width: 36px;
      flex-shrink: 0;
    }
    .layout,
    .select {
      display: none;
    }
    .controls :global(.compact-sort) {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 8px;
      background: var(--sky-lighter);
      color: var(--sky-dark);
    }
  }
</style>
