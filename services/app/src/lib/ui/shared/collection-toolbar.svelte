<script lang="ts">
  import { ToggleGroup } from "bits-ui";

  import Button from "./button.svelte";
  import Icon from "./icon.svelte";
  import SearchField from "./search-field.svelte";
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
  const layoutButtonClass =
    "grid size-10 cursor-pointer place-items-center rounded-lg border border-sky-lighter bg-sky-white p-2 text-ink-dark data-[state=on]:bg-sky-lighter focus-visible:outline-3 focus-visible:outline-primary-light focus-visible:outline-offset-2";
</script>

<div
  class="
    mb-6 flex flex-wrap items-center justify-between gap-4 border-b
    border-sky-lighter pb-6
    max-md:mb-4 max-md:flex-nowrap max-md:gap-2 max-md:pb-4
    max-md:[--search-field-width:100%]
  "
>
  <SearchField {label} bind:value={query} />
  <div
    class="
      flex flex-wrap items-center gap-2.5
      max-md:w-9 max-md:shrink-0
    "
  >
    <Button
      variant="unstyled"
      class="
        hidden
        max-md:grid max-md:size-9 max-md:place-items-center max-md:rounded-lg
        max-md:bg-sky-lighter max-md:text-sky-dark
      "
      type="button"
      aria-label="Sort by: Recent"
      disabled
      ><span class="icon-[lucide--arrow-down-up]" aria-hidden="true"
      ></span></Button
    >
    <div
      class="
        flex items-center
        max-md:hidden
      "
    >
      <Select
        type="single"
        variant="compact"
        items={[{ value: "recent", label: "Recent" }]}
        placeholder="Sort by"
        value="recent"
        disabled
        triggerProps={{ "aria-label": "Sort by" }}
        triggerClass="min-h-10.5 min-w-[159px]"
      >
        {#snippet leading()}
          <span class="icon-[lucide--arrow-down-up] size-4" aria-hidden="true"
          ></span>
        {/snippet}
      </Select>
    </div>
    <div
      class="
        flex items-center
        max-md:hidden
      "
    >
      <Select
        type="single"
        variant="compact"
        items={[{ value: "all", label: "All projects" }]}
        placeholder="Filter collection"
        value="all"
        disabled
        triggerProps={{ "aria-label": "Filter collection" }}
        triggerClass="min-h-10.5 min-w-47.5"
      >
        {#snippet leading()}
          <span class="icon-[lucide--list-filter] size-4" aria-hidden="true"
          ></span>
        {/snippet}
      </Select>
    </div>
    <div
      class="
        flex
        max-md:hidden
      "
    >
      <ToggleGroup.Root
        type="single"
        bind:value={() => layout, changeLayout}
        aria-label="Collection layout"
        class="flex gap-1"
      >
        <ToggleGroup.Item
          value="grid"
          class={layoutButtonClass}
          aria-label="Grid view"
          ><Icon name="grid" size={16} /></ToggleGroup.Item
        ><ToggleGroup.Item
          value="list"
          class={layoutButtonClass}
          aria-label="List view"
          ><Icon name="list" size={16} /></ToggleGroup.Item
        >
      </ToggleGroup.Root>
    </div>
  </div>
</div>
