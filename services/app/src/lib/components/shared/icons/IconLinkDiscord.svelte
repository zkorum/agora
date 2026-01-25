<script lang="ts">
  import IconDiscord from "~icons/simple-icons/discord";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://discord.gg/cAkAJQSTEU"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Discord"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #5865F2;"
>
  <IconDiscord class={className} />
</a>
