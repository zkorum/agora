<script lang="ts" generics="Section extends string">
  import Button from "$ui/shared/button.svelte";

  let {
    id,
    label,
    sections,
    active,
    onSelect,
  }: {
    id: string;
    label: string;
    sections: readonly { id: Section; label: string }[];
    active: Section;
    onSelect: (section: Section) => void;
  } = $props();
</script>

<nav
  aria-label={label}
  class="
    flex w-40 shrink-0 flex-col
    max-sm:w-full max-sm:flex-row max-sm:overflow-x-auto
  "
>
  {#each sections as section (section.id)}
    <Button
      variant="unstyled"
      class="
        rounded-xl px-4 py-3 text-start text-sm leading-[21px] font-medium
        text-ink-light
        hover:bg-sky-lighter hover:text-ink-dark
        focus-visible:outline-2 focus-visible:-outline-offset-2
        focus-visible:outline-primary-base
        aria-[current=location]:bg-sky-lighter
        aria-[current=location]:text-ink-dark
        max-sm:shrink-0 max-sm:px-3 max-sm:py-2.5
      "
      aria-controls={`${id}-${section.id}`}
      aria-current={active === section.id ? "location" : undefined}
      onclick={() => {
        onSelect(section.id);
      }}
    >
      {section.label}
    </Button>
  {/each}
</nav>
