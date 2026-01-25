<script lang="ts">
  import IconX from "~icons/simple-icons/x";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://x.com/join_agora"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="X"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #000000;"
>
  <IconX class={className} />
</a>
