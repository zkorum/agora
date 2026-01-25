<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<article class="mx-auto max-w-3xl px-6 py-20">
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold text-text-dark">{data.post.title}</h1>
    <div class="flex items-center gap-4 text-sm text-text-muted">
      <span>{data.post.author}</span>
      <span>{data.post.date}</span>
    </div>
  </header>

  <div class="prose prose-lg max-w-none font-sans">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Markdown content is sanitized via rehype -->
    {@html data.post.content}
  </div>
</article>
