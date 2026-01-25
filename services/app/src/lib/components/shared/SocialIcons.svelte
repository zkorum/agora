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
  }

  let { class: className = "h-6 w-6 sm:h-8 sm:w-8" }: Props = $props();
</script>

<div
  class="
    flex flex-wrap items-center gap-5
    sm:gap-6
  "
>
  <IconLinkDiscord class={className} />
  <IconLinkTelegram class={className} />
  <IconLinkEmail class={className} />
  <IconLinkGithub class={className} />
  <IconLinkBluesky class={className} />
  <IconLinkX class={className} />
  <IconLinkLinkedin class={className} />
</div>
