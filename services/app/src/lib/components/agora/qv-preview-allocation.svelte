<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import {
    canChangeAllocation,
    getRemainingCredits,
  } from "$logic/agora/qv-allocation.js";
  import Button from "$ui/shared/button.svelte";

  import { QV_CREDIT_BUDGET } from "../../../../../shared/src/utils/qv.js";

  let {
    items,
    allowOpposition,
  }: {
    items: readonly { value: string; text: string; description?: string }[];
    allowOpposition: boolean;
  } = $props();
  let allocations = $derived(items.map((item) => ({ ...item, votes: 0 })));
  const remaining = $derived(
    getRemainingCredits({ rows: allocations, totalCredits: QV_CREDIT_BUDGET }),
  );
  function canAdjust({
    votes,
    direction,
  }: {
    votes: number;
    direction: "fewer" | "more";
  }) {
    return (
      !(direction === "fewer" && votes === 0 && !allowOpposition) &&
      canChangeAllocation({
        votes,
        direction,
        remainingCredits: remaining,
        voteLimit: undefined,
      })
    );
  }
  function adjust({
    value,
    direction,
  }: {
    value: string;
    direction: "fewer" | "more";
  }) {
    allocations = allocations.map((item) =>
      item.value === value && canAdjust({ votes: item.votes, direction })
        ? { ...item, votes: item.votes + (direction === "fewer" ? -1 : 1) }
        : item,
    );
  }
</script>

<div class="mt-auto rounded-xl bg-sky-lightest p-3">
  <output class="font-semibold"
    >{m.authoring_credits({ count: remaining })}</output
  >
  {#each allocations as item (item.value)}
    <div
      class="
        mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1
      "
    >
      <span class="min-w-0 wrap-anywhere"
        >{item.text}{#if item.description}<small class="block"
            >{item.description}</small
          >{/if}<small class="block text-ink-light"
          >{m.authoring_credit_cost({ count: item.votes ** 2 })}</small
        ></span
      ><Button
        size="icon"
        variant="neutral"
        aria-label={`${item.text} −`}
        disabled={!canAdjust({ votes: item.votes, direction: "fewer" })}
        onclick={() => {
          adjust({ value: item.value, direction: "fewer" });
        }}>−</Button
      ><strong>{item.votes}</strong><Button
        size="icon"
        variant="neutral"
        aria-label={`${item.text} +`}
        disabled={!canAdjust({ votes: item.votes, direction: "more" })}
        onclick={() => {
          adjust({ value: item.value, direction: "more" });
        }}>+</Button
      >
    </div>
  {/each}
</div>
