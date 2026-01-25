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

  let { class: className = "h-8 w-8" }: Props = $props();
</script>

<div class="flex items-center gap-6">
  <IconLinkDiscord class={className} />
  <IconLinkTelegram class={className} />
  <IconLinkEmail class={className} />
  <IconLinkGithub class={className} />
  <IconLinkBluesky class={className} />
  <IconLinkX class={className} />
  <IconLinkLinkedin class={className} />
</div>
