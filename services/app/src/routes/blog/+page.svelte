<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-4xl px-6 pb-20">
  <Text size="2xl" weight="bold" element="h1" class="mb-4">
    <GradientText>{m.blog_title()}</GradientText>
  </Text>
  <Text size="lg" class="mb-12 text-secondary-foreground"
    >{m.blog_description()}</Text
  >

  <div class="grid gap-8">
    {#each data.posts as post (post.slug)}
      <a
        href={localizeHref(`/blog/${post.slug}`)}
        class="
          group block rounded-2xl border border-border p-6 transition-shadow
          hover:shadow-md
        "
      >
        <Text size="xl" weight="semibold" element="h2" class="mb-2">
          {post.title}
        </Text>
        <Text size="base" class="mb-3 text-secondary-foreground"
          >{post.description}</Text
        >
        <Text
          size="sm"
          element="div"
          class="flex items-center gap-4 text-muted-foreground"
        >
          <span>{post.author}</span>
          <span>{post.date}</span>
        </Text>
      </a>
    {/each}
  </div>
</div>
