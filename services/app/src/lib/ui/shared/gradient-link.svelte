<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    href: string;
    underline?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    href,
    underline = false,
    class: className = "",
    children,
  }: Props = $props();

  const isExternal = $derived(href.startsWith("http"));
</script>

<a
  {href}
  target={isExternal ? "_blank" : undefined}
  rel={isExternal ? "noopener noreferrer" : undefined}
  class="
    transition-opacity
    hover:opacity-80
    {className}"
>
  <span
    class={[
      `
        bg-linear-to-b from-brand-purple to-brand-blue bg-clip-text
        text-transparent
      `,
      underline && "underline decoration-brand-purple",
    ]}
  >
    {@render children()}
  </span>
</a>
