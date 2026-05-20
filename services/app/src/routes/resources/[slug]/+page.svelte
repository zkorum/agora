<script lang="ts">
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<article class="mx-auto max-w-3xl px-6 pb-20">
  <header class="mb-12">
    <Text size="2xl" weight="bold" element="h1" class="mb-4">
      <GradientText>{data.post.title}</GradientText>
    </Text>
    <Text
      size="sm"
      element="div"
      class="flex items-center gap-4 text-muted-foreground"
    >
      <span>{data.post.author}</span>
      <span>{data.post.date}</span>
    </Text>
  </header>

  <div class="prose prose-lg max-w-none font-sans">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Markdown content is sanitized via rehype -->
    {@html data.post.content}
  </div>
</article>
