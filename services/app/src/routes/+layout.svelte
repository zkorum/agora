<script lang="ts">
  import "@fontsource-variable/albert-sans";
  import "../app.css";

  import { page } from "$app/state";
  import Footer from "$components/landing/footer.svelte";
  import Header from "$components/landing/header.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { locales, localizeHref } from "$lib/paraglide/runtime";

  let { children } = $props();
</script>

<svelte:head>
  <title>{m.meta_title()}</title>
  <meta name="description" content={m.meta_description()} />
  <meta name="keywords" content="civic tech, social network, peace" />
  <meta name="author" content="Agora Citizen Network" />

  <!-- Open Graph -->
  <meta property="og:title" content={m.meta_title()} />
  <meta property="og:description" content={m.meta_description()} />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Agora" />
  <meta
    property="og:image"
    content="https://www.agoracitizen.network/images/favicon/thumbnail_2_1.png"
  />
  <meta
    property="og:image:secure_url"
    content="https://www.agoracitizen.network/images/favicon/thumbnail_2_1.png"
  />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="600" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={page.url.href} />
  <meta name="twitter:site" content="@join_agora" />
  <meta name="twitter:title" content={m.meta_title()} />
  <meta name="twitter:description" content={m.meta_description()} />
  <meta
    name="twitter:image"
    content="https://www.agoracitizen.network/images/favicon/thumbnail_2_1.png"
  />

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

<div class="flex min-h-screen flex-col bg-bg font-sans text-text-primary">
  <Header />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>
