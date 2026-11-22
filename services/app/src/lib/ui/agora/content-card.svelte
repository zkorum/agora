<script lang="ts">
  import Avatar from "$ui/shared/avatar.svelte";
  import Button from "$ui/shared/button.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import type { ContentCardProps } from "./view-types.js";

  let { author, title, description, onread }: ContentCardProps = $props();
</script>

<article
  class="
    flex flex-col items-start gap-4 rounded-xl border border-sky-lighter
    bg-sky-white p-6
    max-md:px-4 max-md:py-5
  "
>
  <Avatar {author} />
  <h3 class="text-lg font-semibold">{title}</h3>
  <div class="w-full min-w-0 text-sm leading-[1.6] text-ink-light">
    <ExpandableText text={description} lines={5} />
  </div>
  <Button variant="quiet" size="control" onclick={onread}
    >Read response<Icon name="forward" size={16} /></Button
  >
</article>
