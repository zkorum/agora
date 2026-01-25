<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-20">
  <h1 class="mb-4 text-4xl font-bold text-text-dark">{m.blog_title()}</h1>
  <p class="mb-12 text-lg text-text-secondary">{m.blog_description()}</p>

  <div class="grid gap-8">
    {#each data.posts as post (post.slug)}
      <a
        href={localizeHref(`/blog/${post.slug}`)}
        class="
          group block rounded-2xl border border-zinc-100 p-6 transition-shadow
          hover:shadow-md
        "
      >
        <h2
          class="
            mb-2 text-xl font-semibold text-text-dark
            group-hover:text-brand-purple
          "
        >
          {post.title}
        </h2>
        <p class="mb-3 text-text-secondary">{post.description}</p>
        <div class="flex items-center gap-4 text-sm text-text-muted">
          <span>{post.author}</span>
          <span>{post.date}</span>
        </div>
      </a>
    {/each}
  </div>
</div>
