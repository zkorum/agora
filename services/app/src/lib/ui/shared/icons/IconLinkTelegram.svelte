<script lang="ts">
  import IconTelegram from "~icons/simple-icons/telegram";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://t.me/agorabyzkorum"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Telegram"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #26A5E4;"
>
  <IconTelegram class={className} />
</a>
