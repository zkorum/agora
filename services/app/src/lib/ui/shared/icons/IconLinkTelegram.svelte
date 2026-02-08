<script lang="ts">
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
    text-icon-telegram transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[simple-icons--telegram] inline-block
      {className}"
  ></span>
</a>
