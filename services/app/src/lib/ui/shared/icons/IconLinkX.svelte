<script lang="ts">
  interface Props {
    class?: string;
    colorMode?: "brand" | "light";
  }

  let { class: className = "h-6 w-6", colorMode = "brand" }: Props = $props();
</script>

<a
  href="https://x.com/join_agora"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="X"
  class="{colorMode === 'light' ? 'text-inverse-foreground' : 'text-icon-x'}
    transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[simple-icons--x] inline-block
      {className}"
  ></span>
</a>
