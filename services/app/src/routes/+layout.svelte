<script lang="ts">
  import "@fontsource-variable/albert-sans";
  import "../app.css";

  import { page } from "$app/state";
  import Footer from "$components/landing/footer.svelte";
  import Header from "$components/landing/header.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import { DEFAULT_OG_IMAGE } from "$lib/seo";

  let { children } = $props();

  const seo = $derived(page.data.seo);
  const title = $derived(seo?.title ?? m.meta_title());
  const description = $derived(seo?.description ?? m.meta_description());
  const ogType = $derived(seo?.ogType ?? "website");
  const ogImage = $derived(seo?.ogImage ?? DEFAULT_OG_IMAGE);
  const ogImageType = $derived(seo?.ogImageType ?? "image/png");
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="keywords" content="civic tech, social network, peace" />
  <meta name="author" content="Agora Citizen Network" />

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:type" content={ogType} />
  <meta property="og:site_name" content="Agora" />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:secure_url" content={ogImage} />
  <meta property="og:image:type" content={ogImageType} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="600" />
  {#if seo?.articleAuthor}
    <meta property="article:author" content={seo.articleAuthor} />
  {/if}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={page.url.href} />
  <meta name="twitter:site" content="@join_agora" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />

  <!-- Favicon -->
  <link
    rel="icon"
    type="image/png"
    href="/images/favicon/favicon-96x96.png"
    sizes="96x96"
  />
  <link rel="icon" type="image/svg+xml" href="/images/favicon/favicon.svg" />
  <link rel="shortcut icon" href="/images/favicon/favicon.ico" />
  <link
    rel="apple-touch-icon"
    sizes="180x180"
    href="/images/favicon/apple-touch-icon.png"
  />

  <!-- Language alternates -->
  {#each locales as locale (locale)}
    <link
      rel="alternate"
      hreflang={locale}
      href={localizeHref(page.url.pathname, { locale })}
    />
  {/each}
  <link rel="alternate" hreflang="x-default" href={page.url.pathname} />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background font-sans text-foreground">
  <Header hideOnScroll={true} />
  <main class="flex-1 pt-24">
    {@render children()}
  </main>
  <Footer />
</div>
