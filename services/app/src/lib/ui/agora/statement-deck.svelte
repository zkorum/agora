<script lang="ts" generics="Item extends { id: string; title: string }">
  import { type Snippet, tick } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";

  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";

  let {
    statements,
    card,
  }: {
    statements: readonly Item[];
    card: Snippet<[Item, () => void]>;
  } = $props();
  let requestedPosition = $state(0);
  const position = $derived(Math.min(requestedPosition, statements.length));
  const current = $derived(statements.at(position));
  let waiting = $state(false);
  let frame: HTMLDivElement | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let animations: Animation[] = [];

  function cancelAdvance() {
    generation++;
    clearTimeout(timeout);
    waiting = false;
    for (const animation of animations) animation.cancel();
    animations = [];
  }

  function attachFrame(element: HTMLDivElement) {
    frame = element;
    return () => {
      cancelAdvance();
      frame = undefined;
    };
  }

  function advanceAfterVote() {
    cancelAdvance();
    waiting = true;
    const statementId = current?.id;
    timeout = setTimeout(() => {
      if (current?.id === statementId) navigate(position + 1);
      else cancelAdvance();
    }, 1000);
  }

  function navigate(destination: number) {
    cancelAdvance();
    const node = frame;
    if (!node || destination < 0 || destination > statements.length) return;
    const turn = generation;
    const source = current?.id;
    async function swap(animation?: { fromHeight: number; offset: number }) {
      if (turn !== generation || !node) return;
      if (current?.id !== source || destination > statements.length) {
        cancelAdvance();
        return;
      }
      // The outgoing radio is removed. Keep keyboard focus in the deck without
      // focusing a radio (which could change a previously saved response).
      const focusCard = node.contains(document.activeElement);
      const active = document.activeElement;
      requestedPosition = destination;
      await tick();
      if (turn !== generation) return;
      for (const animation of animations) animation.cancel();
      animations = [];
      if (
        focusCard ||
        (active instanceof HTMLButtonElement &&
          active.disabled &&
          node.parentElement?.contains(active))
      )
        node.focus({ preventScroll: true });
      if (!animation || prefersReducedMotion.current) return;
      const { fromHeight, offset } = animation;
      const timing = { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" };
      const toHeight = node.getBoundingClientRect().height;
      animations.push(
        node.animate(
          [
            { opacity: 0, transform: `translateX(${offset}px)` },
            { opacity: 1, transform: "translateX(0)" },
          ],
          timing,
        ),
      );
      if (Math.abs(fromHeight - toHeight) > 1)
        animations.push(
          node.animate(
            [
              { height: `${fromHeight}px`, overflow: "clip" },
              { height: `${toHeight}px`, overflow: "clip" },
            ],
            timing,
          ),
        );
    }
    if (prefersReducedMotion.current) {
      void swap();
      return;
    }
    const fromHeight = node.getBoundingClientRect().height;
    const direction =
      (getComputedStyle(node).direction === "rtl" ? -1 : 1) *
      (destination > position ? 1 : -1);
    const offset = direction * 8;
    const exit = node.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${-offset}px)` },
      ],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
    animations.push(exit);
    exit.onfinish = () => {
      void swap({ fromHeight, offset });
    };
  }
</script>

<div class="@container/deck rounded-xl border border-sky-lighter bg-sky-white">
  <div
    class="
      grid gap-4 p-1.5
      @xs/deck:p-4
      @md/deck:gap-6 @md/deck:p-6
    "
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0 flex-[1_1_9rem]">
        <p class="text-sm text-ink-light" aria-live="polite" aria-atomic="true">
          {#if current}{m.mapping_preview_position({
              current: position + 1,
              total: statements.length,
            })}
            {#if waiting}<span class="ms-1"
                >{m.mapping_preview_next_in_second()}</span
              >{/if}
          {:else}{m.mapping_preview_complete()}{/if}
        </p>
        {#if current}<p class="font-semibold text-ink-dark">
            {m.mapping_preview_respond()}
          </p>{/if}
      </div>
      <div class="flex gap-2">
        <Button
          variant="neutral"
          size="icon"
          class="min-h-11 min-w-11"
          aria-label={m.authoring_previous()}
          disabled={position === 0}
          onclick={() => {
            navigate(position - 1);
          }}><Icon name="back" /></Button
        >
        <Button
          variant="neutral"
          size="icon"
          class="min-h-11 min-w-11"
          aria-label={m.authoring_next()}
          disabled={!current}
          onclick={() => {
            navigate(position + 1);
          }}><Icon name="forward" /></Button
        >
      </div>
    </header>
    <div
      {@attach attachFrame}
      class="
        min-w-0 rounded-xl
        focus-visible:outline-2 focus-visible:outline-primary-dark
        [&>article]:shadow-sm
      "
      role="group"
      aria-label={current?.title ?? m.mapping_preview_complete()}
      tabindex="-1"
    >
      {#if current}
        {#key current.id}{@render card(current, advanceAfterVote)}{/key}
      {:else}
        <p class="rounded-xl border border-sky-lighter p-4 text-ink-base">
          {m.mapping_preview_review()}
        </p>
      {/if}
    </div>
  </div>
</div>
