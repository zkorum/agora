<script lang="ts">
  import { Button } from "bits-ui";

  import Avatar from "$ui/shared/avatar.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";

  import type { NotificationItemProps } from "./view-types.js";

  let {
    author,
    title,
    conversationTitle,
    excerpt,
    time,
    unread,
    onopen,
  }: NotificationItemProps = $props();
</script>

<article class={{ unread }}>
  <span class="dot" aria-hidden="true"></span><span class="sr-only"
    >{unread ? "Unread" : "Read"}</span
  ><Avatar {author} />
  <div class="copy">
    <Button.Root class="notification-open" type="button" onclick={onopen}
      >{title}</Button.Root
    >
    <span>{conversationTitle}</span>
    <div class="excerpt"><ExpandableText text={excerpt} lines={3} /></div>
  </div>
  <span class="time">{time}</span>
</article>

<style>
  article {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    width: 100%;
    padding: 20px 16px;
    border: 0;
    border-block-end: 1px solid var(--sky-lighter);
    text-align: start;
    background: white;
    color: var(--ink-dark);
    font: inherit;
  }
  article:hover {
    background: var(--sky-lightest);
  }
  .unread {
    background: #fbfaff;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: transparent;
    margin-block-start: 10px;
    flex-shrink: 0;
  }
  .unread .dot {
    background: var(--primary-base);
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }
  article :global(.notification-open) {
    border: 0;
    padding: 0;
    background: transparent;
    text-align: start;
    color: inherit;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  article :global(.notification-open::after) {
    content: "";
    position: absolute;
    inset: 0;
  }
  article :global(.notification-open:focus-visible::after) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .excerpt,
  .time {
    font-size: 12px;
    color: var(--ink-light);
  }
  @media (max-width: 760px) {
    article {
      flex-wrap: wrap;
      gap: 10px;
    }
    article > :global(.author) {
      display: none;
    }
    .time {
      width: 100%;
      padding-inline-start: 16px;
    }
  }
</style>
