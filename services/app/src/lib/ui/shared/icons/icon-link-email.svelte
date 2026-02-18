<script lang="ts">
  interface Props {
    class?: string;
    colorMode?: "brand" | "light";
  }

  let { class: className = "h-6 w-6", colorMode = "brand" }: Props = $props();
</script>

<a
  href="mailto:hello@zkorum.com"
  aria-label="Email"
  class="{colorMode === 'light' ? 'text-inverse-foreground' : 'text-icon-email'}
    transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[lucide--mail] inline-block
      {className}"
  ></span>
</a>
