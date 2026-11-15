<script lang="ts">
  import { Button } from "bits-ui";
  import { tick } from "svelte";

  import * as m from "#lib/paraglide/messages.js";

  let {
    text,
    lines = 10,
    seeMoreLabel = m.common_see_more(),
    seeLessLabel = m.common_see_less(),
  }: {
    text: string;
    lines?: number;
    seeMoreLabel?: string;
    seeLessLabel?: string;
  } = $props();

  const contentId = $props.id();
  let overflowing = $state(false);
  let expansion = $state({ text: "", expanded: false });
  let expanded = $derived(expansion.text === text && expansion.expanded);
  let lineCount = $derived(Math.max(1, Math.floor(lines)));

  function observeOverflow(element: HTMLElement): () => void {
    function measure(): void {
      overflowing = element.scrollHeight > element.clientHeight + 1;
    }

    const resizeObserver = new ResizeObserver(measure);
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === "data-text")) {
        expansion = { text: "", expanded: false };
      }
      measure();
    });
    resizeObserver.observe(element);
    document.fonts.addEventListener("loadingdone", measure);
    mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ["data-text", "style"],
    });
    measure();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }

  async function toggle(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const button = event.currentTarget;
    const collapsing = expanded;
    expansion = { text, expanded: !expanded };
    if (collapsing && button instanceof HTMLElement) {
      await tick();
      button.scrollIntoView({ block: "nearest" });
    }
  }
</script>

<div class="expandable-text">
  <p
    id={contentId}
    class={["text", { clamped: !expanded }]}
    style:--lines={lineCount}
  >
    {text}
  </p>
  <!-- Keep measuring the collapsed layout even while the visible text is expanded. -->
  <p
    class="text clamped measurement"
    aria-hidden="true"
    data-text={text}
    style:--lines={lineCount}
    {@attach observeOverflow}
  ></p>
  {#if overflowing}
    <Button.Root
      type="button"
      aria-expanded={expanded}
      aria-controls={contentId}
      onclick={toggle}>{expanded ? seeLessLabel : seeMoreLabel}</Button.Root
    >
  {/if}
</div>

<style>
  .expandable-text {
    position: relative;
    width: 100%;
    min-width: 0;
  }
  .text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--lines);
    line-clamp: var(--lines);
    overflow: hidden;
  }
  .measurement {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .measurement::before {
    content: attr(data-text);
  }
  .expandable-text :global(button) {
    position: relative;
    z-index: 1;
    display: block;
    width: fit-content;
    margin-block-start: 8px;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--primary-base);
    font: inherit;
    font-weight: 500;
    text-align: start;
    cursor: pointer;
  }
  .expandable-text :global(button:hover) {
    text-decoration: underline;
  }
  .expandable-text :global(button:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 3px;
    border-radius: 2px;
  }
</style>
