<script lang="ts">
  import { Button } from "bits-ui";

  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import Badge from "./conversation-badge.svelte";
  import type { ConversationView } from "./view-types.js";

  let {
    conversation,
    onopen,
  }: { conversation: ConversationView; onopen: () => void } = $props();
</script>

<article class="conversation-card">
  <header>
    <Badge kind={conversation.kind} /><Badge status={conversation.status} />
  </header>
  <h3>
    <Button.Root class="conversation-open" type="button" onclick={onopen}
      >{conversation.title}</Button.Root
    >
  </h3>
  <div class="description">
    <ExpandableText text={conversation.description} lines={5} />
  </div>
  <footer>
    <span>
      <Icon name="message" size={14} />
      {conversation.contentCount}
      <span class="sr-only">statements or responses</span>
    </span>
    <span>
      <Icon name="list" size={14} />
      {conversation.voteCount}
      <span class="sr-only">votes</span>
    </span>
    <span>
      <Icon name="people" size={14} />
      {conversation.participantCount}
      <span class="sr-only">participants</span>
    </span>
  </footer>
</article>

<style>
  .conversation-card {
    position: relative;
    min-width: 0;
    padding: 24px;
    background: white;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
  }
  .conversation-card:hover {
    box-shadow: 0 2px 5px #0000000d;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-block: 16px 8px;
  }
  .conversation-card :global(.conversation-open) {
    border: 0;
    padding: 0;
    background: transparent;
    font: inherit;
    text-align: start;
    color: var(--ink-dark);
    cursor: pointer;
  }
  .conversation-card :global(.conversation-open::after) {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 12px;
  }
  .conversation-card :global(.conversation-open:focus-visible::after) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .description {
    color: var(--ink-light);
    font-size: 14px;
    line-height: 1.6;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    border-block-start: 1px solid var(--sky-lighter);
    padding-block-start: 16px;
    margin-block-start: 20px;
    font-size: 12px;
    color: var(--ink-light);
  }
  footer span {
    display: inline-flex;
    gap: 5px;
    align-items: center;
  }
  @media (max-width: 760px) {
    .conversation-card {
      padding: 16px;
    }
  }
</style>
