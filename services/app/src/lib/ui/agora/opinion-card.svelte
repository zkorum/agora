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

<article class="opinion">
  <header>
    <Avatar {author} />{#if actions}{@render actions()}{/if}
  </header>
  <div class="opinion-body"><ExpandableText {text} /></div>
  {#if visibilityNotice}<p class="visibility-notice">
      {visibilityNotice === "pending"
        ? "Awaiting review · not visible to participants"
        : "Hidden from participants"}
    </p>
  {:else if voteBreakdown}<OpinionVoteBar {voteBreakdown} />
  {:else}<OpinionVoteControls
      label={`Response to: ${text}`}
      {selected}
      {onvote}
      {disabled}
    />{/if}
</article>

<style>
  .opinion {
    --avatar-name-size: 16px;
    --avatar-name-line-height: 24px;
    --avatar-detail-line-height: 14px;
    --avatar-copy-gap: 2px;
    padding: 24px 24px 16px;
    min-height: 220px;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
    background: white;
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 40px;
  }
  .opinion-body {
    font-size: 20px;
    font-weight: 400;
    line-height: 30px;
    margin-block: 12px 16px;
    overflow-wrap: anywhere;
  }
  .visibility-notice {
    color: var(--ink-light);
    background: var(--sky-lightest);
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .opinion {
      padding: 16px;
    }
    .opinion-body {
      font-size: 18px;
      line-height: 27px;
      margin-block: 16px;
    }
  }
</style>
