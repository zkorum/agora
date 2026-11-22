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

<div class="relative w-full min-w-0">
  <p
    id={contentId}
    class={[
      "m-0 wrap-anywhere whitespace-pre-wrap",
      !expanded && "line-clamp-(--lines)",
    ]}
    style:--lines={lineCount}
  >
    {text}
  </p>
  <!-- Keep measuring the collapsed layout even while the visible text is expanded. -->
  <p
    class="
      pointer-events-none invisible absolute inset-x-0 top-0 m-0
      line-clamp-(--lines) wrap-anywhere whitespace-pre-wrap
      before:content-[attr(data-text)]
    "
    aria-hidden="true"
    data-text={text}
    style:--lines={lineCount}
    {@attach observeOverflow}
  ></p>
  {#if overflowing}
    <Button.Root
      class="
        relative z-1 mt-2 block w-fit cursor-pointer rounded-xs bg-transparent
        p-0 text-start font-medium text-primary-base
        hover:underline
        focus-visible:outline-3 focus-visible:outline-offset-3
        focus-visible:outline-primary-light
      "
      type="button"
      aria-expanded={expanded}
      aria-controls={contentId}
      onclick={toggle}>{expanded ? seeLessLabel : seeMoreLabel}</Button.Root
    >
  {/if}
</div>
