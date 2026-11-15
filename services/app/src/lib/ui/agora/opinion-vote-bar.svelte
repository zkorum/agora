<script lang="ts">
  import type { OpinionVoteBreakdown } from "./view-types.js";

  let { voteBreakdown }: { voteBreakdown: readonly OpinionVoteBreakdown[] } =
    $props();
</script>

<div
  class="bar"
  role="img"
  aria-label={voteBreakdown
    .map((vote) => `${vote.label}: ${vote.percentage}%`)
    .join(", ")}
>
  {#each voteBreakdown as vote (vote.choice)}<span
      class={vote.choice}
      style:flex-basis={`${vote.percentage}%`}
    ></span>{/each}
</div>
<ul aria-label="Response breakdown">
  {#each voteBreakdown as vote (vote.choice)}<li>
      <span class="key"><i class={vote.choice}></i>{vote.label}</span><span
        >{vote.count} ({vote.percentage}%)</span
      >
    </li>{/each}
</ul>

<style>
  .bar {
    display: flex;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--sky-lighter);
    margin-block: 18px 12px;
  }
  .bar span {
    flex-grow: 0;
  }
  .disagree {
    background: var(--yellow-base);
  }
  .pass {
    background: var(--sky-base);
  }
  .agree {
    background: var(--primary-base);
  }
  ul {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--ink-light);
    font-size: 12px;
  }
  .key {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
</style>
