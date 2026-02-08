<script lang="ts">
  interface Props {
    class?: string;
    colorMode?: "brand" | "light";
  }

  let { class: className = "h-6 w-6", colorMode = "brand" }: Props = $props();
</script>

<a
  href="https://github.com/zkorum"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="GitHub"
  class="{colorMode === 'light'
    ? 'text-inverse-foreground'
    : 'text-icon-github'}
    transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[simple-icons--github] inline-block
      {className}"
  ></span>
</a>
