<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";

  import type { OpinionVoteBreakdown } from "./view-types.js";

  const colors = {
    agree: "bg-primary-base",
    disagree: "bg-yellow-base",
    pass: "bg-sky-base",
  };
  let {
    voteBreakdown,
    compact = false,
  }: {
    voteBreakdown: readonly OpinionVoteBreakdown[];
    compact?: boolean;
  } = $props();
</script>

<div
  class={[
    "mt-4.5 mb-3 flex w-full overflow-hidden rounded-full",
    compact ? "h-3 gap-1.5" : "h-2 bg-sky-lighter",
  ]}
  role="img"
  aria-label={voteBreakdown
    .map((vote) => `${vote.label}: ${vote.percentage}%`)
    .join(", ")}
>
  {#each voteBreakdown as vote (vote.choice)}<span
      class={[
        "basis-(--vote-share)",
        colors[vote.choice],
        compact && "rounded-full",
      ]}
      style:--vote-share={`${vote.percentage}%`}
    ></span>{/each}
</div>
<ul
  aria-label={m.opinion_feed_votes()}
  class="m-0 flex list-none flex-wrap gap-5 p-0"
>
  {#each voteBreakdown as vote (vote.choice)}<li
      class={["flex gap-1 text-xs text-ink-light", !compact && "flex-col"]}
    >
      <span class="flex items-center gap-1.5"
        ><i class={["size-1.5 rounded-full", colors[vote.choice]]}
        ></i>{vote.label}</span
      ><span>{vote.count} ({vote.percentage}%)</span>
    </li>{/each}
</ul>
