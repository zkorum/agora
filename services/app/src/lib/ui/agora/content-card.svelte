<script lang="ts">
  import Avatar from "$ui/shared/avatar.svelte";
  import Button from "$ui/shared/button.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import type { ContentCardProps } from "./view-types.js";

  let { author, title, description, onread }: ContentCardProps = $props();
</script>

<article>
  <Avatar {author} />
  <h3>{title}</h3>
  <div class="description"><ExpandableText text={description} lines={5} /></div>
  <Button variant="quiet" size="control" onclick={onread}
    >Read response<Icon name="forward" size={16} /></Button
  >
</article>

<style>
  article {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
    background: white;
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
  }
  .description {
    width: 100%;
    min-width: 0;
    color: var(--ink-light);
    font-size: 14px;
    line-height: 1.6;
  }
  @media (max-width: 760px) {
    article {
      padding: 20px 16px;
    }
  }
</style>
