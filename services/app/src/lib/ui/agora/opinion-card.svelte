<script lang="ts">
  import Avatar from "$ui/shared/avatar.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";

  import OpinionVoteBar from "./opinion-vote-bar.svelte";
  import OpinionVoteControls from "./opinion-vote-controls.svelte";
  import type { OpinionCardProps } from "./view-types.js";

  let {
    text,
    author,
    selected,
    onvote,
    disabled = false,
    voteBreakdown,
    visibilityNotice,
    actions,
  }: OpinionCardProps = $props();
</script>

<article
  class="
    @container/opinion min-w-0 rounded-xl border border-sky-lighter bg-sky-white
    [--avatar-copy-gap:2px] [--avatar-detail-line-height:14px]
    [--avatar-gap:12px] [--avatar-name-line-height:24px]
    [--avatar-name-size:16px]
  "
>
  <div
    class="
      px-2.5 pt-4 pb-3
      @3xs/opinion:px-3
      @sm/opinion:px-6 @sm/opinion:pt-6 @sm/opinion:pb-4
    "
  >
    {#if author !== undefined || actions !== undefined}
      <header class="mb-3 flex min-h-10 items-center gap-3">
        {#if author}<Avatar {author} />{/if}
        {#if actions}<div class="ms-auto">{@render actions()}</div>{/if}
      </header>
    {/if}
    <div
      class="
        mb-4 font-sans text-lg/normal font-normal tracking-[-0.01em]
        wrap-anywhere text-ink-base
        @min-[18rem]/opinion:text-[20px]/7.5
      "
    >
      <ExpandableText {text} />
    </div>
    {#if visibilityNotice}<p
        class="rounded-lg bg-sky-lightest p-3 text-[13px] text-ink-light"
      >
        {visibilityNotice === "pending"
          ? "Awaiting review · not visible to participants"
          : "Hidden from participants"}
      </p>
    {:else if voteBreakdown}<OpinionVoteBar {voteBreakdown} />
    {:else}<OpinionVoteControls
        label={text}
        {selected}
        {onvote}
        {disabled}
      />{/if}
  </div>
</article>
