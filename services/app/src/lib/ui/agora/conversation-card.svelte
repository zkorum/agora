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

<article
  class="
    relative min-w-0 rounded-xl border border-sky-lighter bg-sky-white p-6
    hover:shadow-[0_2px_5px_#0000000d]
    max-md:p-4
  "
>
  <header class="flex justify-between gap-3">
    <Badge kind={conversation.kind} /><Badge status={conversation.status} />
  </header>
  <h3 class="mt-4 mb-2 text-lg font-semibold">
    <Button.Root
      class="
        cursor-pointer bg-transparent p-0 text-start text-ink-dark
        after:absolute after:inset-0 after:rounded-xl
        focus-visible:after:outline-3 focus-visible:after:outline-offset-2
        focus-visible:after:outline-primary-light
      "
      type="button"
      onclick={onopen}>{conversation.title}</Button.Root
    >
  </h3>
  <div class="text-sm leading-[1.6] text-ink-light">
    <ExpandableText text={conversation.description} lines={5} />
  </div>
  <footer
    class="
      mt-5 flex flex-wrap gap-4.5 border-t border-sky-lighter pt-4 text-xs
      text-ink-light
      [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.25
    "
  >
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
