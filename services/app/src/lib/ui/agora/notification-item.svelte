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

<article
  class={[
    `
      relative flex w-full items-start gap-4 border-b border-sky-lighter px-4
      py-5 text-start text-ink-dark
      hover:bg-sky-lightest
      max-md:flex-wrap max-md:gap-2.5
    `,
    unread ? "bg-surface-unread" : "bg-sky-white",
  ]}
>
  <span
    class={[
      "mt-2.5 size-1.5 shrink-0 rounded-full",
      unread && "bg-primary-base",
    ]}
    aria-hidden="true"
  ></span><span class="sr-only">{unread ? "Unread" : "Read"}</span><Avatar
    {author}
    class="max-md:hidden"
  />
  <div class="flex min-w-0 flex-1 flex-col gap-1 text-sm">
    <Button.Root
      class="
        cursor-pointer bg-transparent p-0 text-start font-medium text-ink-dark
        after:absolute after:inset-0
        focus-visible:after:outline-3 focus-visible:after:outline-offset-2
        focus-visible:after:outline-primary-light
      "
      type="button"
      onclick={onopen}>{title}</Button.Root
    >
    <span>{conversationTitle}</span>
    <div class="text-xs text-ink-light">
      <ExpandableText text={excerpt} lines={3} />
    </div>
  </div>
  <span
    class="
      text-xs text-ink-light
      max-md:w-full max-md:ps-4
    ">{time}</span
  >
</article>
