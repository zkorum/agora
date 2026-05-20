<script lang="ts">
  import agoraBgGradient from "$lib/assets/agora-bg-gradient.png";
  import resourcesHeroIllustration from "$lib/assets/resources-hero-illustration.png";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import type {
    ResourcePostMeta,
    ResourceType,
  } from "$server/landing/resources";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  type ResourceFilter = ResourceType | "all";

  interface Props {
    posts: ResourcePostMeta[];
  }

  let { posts }: Props = $props();
  let selectedType = $state<ResourceFilter>("all");

  const resourceFilters: { label: string; value: ResourceFilter }[] = [
    { label: "All", value: "all" },
    { label: "Vision", value: "vision" },
    { label: "Case Studies", value: "case-study" },
    { label: "Guides", value: "guide" },
    { label: "Tech", value: "tech" },
  ];

  function findFeaturedPost(
    postList: ResourcePostMeta[],
  ): ResourcePostMeta | undefined {
    return (
      postList.find((post) => post.slug === "facilitation-guide") ?? postList[0]
    );
  }

  const featuredPost = $derived(findFeaturedPost(posts));
  const recentPosts = $derived(
    posts.filter((post) => post.slug !== featuredPost?.slug),
  );
  const filteredPosts = $derived(
    selectedType === "all"
      ? recentPosts
      : posts.filter((post) => post.type === selectedType),
  );

  function getPostImage(post: ResourcePostMeta): string {
    return post.thumbnail || post.image;
  }

  function getCategoryLabel(type: ResourceType): string {
    switch (type) {
      case "case-study":
        return "CASE STUDY";
      case "guide":
        return "GUIDE";
      case "tech":
        return "TECH";
      case "vision":
        return "VISION";
    }
  }

  function getPostCategory(post: ResourcePostMeta): string {
    return getCategoryLabel(post.type);
  }

  function getFilterCount(type: ResourceFilter): number {
    return type === "all"
      ? posts.length
      : posts.filter((post) => post.type === type).length;
  }

  function getFeaturedLabel(post: ResourcePostMeta): string {
    return `HIGHLIGHTED ${getPostCategory(post)}`;
  }
</script>

<div class="bg-[#fefeff] px-4 pb-24 sm:px-8">
  {#if featuredPost}
    <section
      class="
        relative mx-auto min-h-[560px] max-w-[1376px] overflow-hidden
        rounded-3xl bg-cover bg-center
        lg:h-[445px] lg:min-h-0
      "
      style={`background-image: linear-gradient(270.64deg, rgba(255, 255, 255, 0) 43.6%, rgba(255, 255, 255, 0.7) 99.47%), url(${agoraBgGradient});`}
    >
      <img
        src={resourcesHeroIllustration}
        alt=""
        class="absolute inset-0 size-full rounded-3xl object-cover opacity-60"
      />

      <article
        class="
          relative z-10 m-6 flex max-w-[539px] flex-col gap-8 rounded-2xl
          bg-white/80 p-6
          sm:m-10
          lg:mt-11 lg:ml-14
        "
      >
        <div class="flex flex-col gap-2">
          <Text size="base" weight="bold" element="p">
            <GradientText>{getFeaturedLabel(featuredPost)}</GradientText>
          </Text>
          <Text size="3xl" weight="medium" leading="none" element="h1">
            <GradientText>{featuredPost.title}</GradientText>
          </Text>
        </div>

        <Text size="lg" leading="none" class="max-w-[491px] text-ink-base">
          {featuredPost.description}
        </Text>

        <div
          class="
            flex flex-col gap-4
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <GradientButton
            href={localizeHref(`/resources/${featuredPost.slug}`)}
            size="sm"
            class="w-fit"
          >
            {m.blog_read_more()}
          </GradientButton>
          <Text
            size="base"
            weight="semibold"
            element="span"
            class="text-ink-light"
          >
            {featuredPost.date}
          </Text>
        </div>
      </article>
    </section>
  {/if}

  <section
    class="
      mx-auto mt-24 max-w-[1120px]
      lg:mt-[112px]
    "
  >
    <Text size="base" weight="bold" class="mb-14 text-center">
      <GradientText>RECENT RESOURCES</GradientText>
    </Text>

    <div
      class="
        mb-14 flex flex-wrap justify-center gap-3
        sm:gap-4
      "
      role="tablist"
      aria-label="Filter resources by content type"
    >
      {#each resourceFilters as filter (filter.value)}
        <button
          type="button"
          role="tab"
          aria-selected={selectedType === filter.value}
          onclick={() => (selectedType = filter.value)}
          class="
            inline-flex h-10 items-center gap-2 rounded-full border px-4
            text-sm font-semibold transition-colors
            hover:border-primary-base hover:bg-sky-lightest
            aria-selected:border-primary-base aria-selected:bg-sky-lightest
            aria-selected:text-primary-base
          "
        >
          <span>{filter.label}</span>
          <span
            class="
              rounded-full bg-white/80 px-2 py-0.5 text-xs text-ink-light
            "
          >
            {getFilterCount(filter.value)}
          </span>
        </button>
      {/each}
    </div>

    <div class="flex flex-col gap-16">
      {#each filteredPosts as post (post.slug)}
        <article
          class="
            grid items-center gap-8
            lg:grid-cols-[minmax(0,533px)_1fr] lg:gap-[51px]
          "
        >
          <a
            href={localizeHref(`/resources/${post.slug}`)}
            class="
              group block aspect-[533/248] overflow-hidden rounded-2xl
              bg-[#f1f1f1]
            "
            aria-label={post.title}
          >
            {#if getPostImage(post)}
              <img
                src={getPostImage(post)}
                alt=""
                class="
                  size-full object-cover opacity-60 transition-transform
                  duration-300
                  group-hover:scale-105
                "
              />
            {/if}
          </a>

          <div class="flex min-h-[248px] flex-col justify-between gap-8">
            <div class="flex flex-col items-start gap-4">
              <span
                class="
                  rounded-[32px] bg-sky-lightest px-3 py-2 text-sm/[14px]
                  font-semibold text-primary-base
                "
              >
                <GradientText angle={135}>{getPostCategory(post)}</GradientText>
              </span>

              <Text size="xl" weight="medium" leading="none" element="h2">
                <a
                  href={localizeHref(`/resources/${post.slug}`)}
                  class="
                    transition-opacity
                    hover:opacity-80
                  "
                >
                  <GradientText>{post.title}</GradientText>
                </a>
              </Text>

              <Text size="lg" leading="none" class="text-ink-base">
                {post.description}
              </Text>
            </div>

            <div
              class="
                flex flex-col gap-4
                sm:flex-row sm:items-center sm:justify-between
              "
            >
              <GradientButton
                href={localizeHref(`/resources/${post.slug}`)}
                size="sm"
                class="w-fit"
              >
                {m.blog_read_more()}
              </GradientButton>
              <Text size="base" element="span" class="text-ink-base">
                {post.date}
              </Text>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
</div>
