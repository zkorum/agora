<script lang="ts">
  import IconLinkBluesky from "./icons/icon-link-bluesky.svelte";
  import IconLinkDiscord from "./icons/icon-link-discord.svelte";
  import IconLinkEmail from "./icons/icon-link-email.svelte";
  import IconLinkGithub from "./icons/icon-link-github.svelte";
  import IconLinkLinkedin from "./icons/icon-link-linkedin.svelte";
  import IconLinkTelegram from "./icons/icon-link-telegram.svelte";
  import IconLinkX from "./icons/icon-link-x.svelte";

  interface Props {
    class?: string;
    colorMode?: "brand" | "light";
  }

  let {
    class: className = "h-5 w-5 sm:h-6 sm:w-6",
    colorMode = "brand",
  }: Props = $props();
</script>

<div
  class="
    flex flex-wrap items-center gap-5
    sm:gap-6
  "
>
  <IconLinkDiscord class={className} />
  <IconLinkTelegram class={className} />
  <IconLinkEmail class={className} {colorMode} />
  <IconLinkGithub class={className} {colorMode} />
  <IconLinkBluesky class={className} />
  <IconLinkX class={className} {colorMode} />
  <IconLinkLinkedin class={className} />
</div>
