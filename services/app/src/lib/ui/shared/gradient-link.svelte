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
    style="
      color: var(--color-brand-purple);
      background-image: linear-gradient(180deg, var(--color-brand-purple), var(--color-brand-blue));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      {underline
      ? 'text-decoration: underline; text-decoration-color: var(--color-brand-purple);'
      : ''}
    "
  >
    {@render children()}
  </span>
</a>
