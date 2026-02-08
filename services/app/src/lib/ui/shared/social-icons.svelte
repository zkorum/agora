<script lang="ts">
  import {
    IconLinkBluesky,
    IconLinkDiscord,
    IconLinkEmail,
    IconLinkGithub,
    IconLinkLinkedin,
    IconLinkTelegram,
    IconLinkX,
  } from "./icons";

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
