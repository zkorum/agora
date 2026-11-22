<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    angle?: number;
    class?: string;
    children: Snippet;
  }

  let { angle = 180, class: className = "", children }: Props = $props();
</script>

<span
  class={[
    `
      inline-block
      bg-[linear-gradient(var(--text-angle),var(--brand-purple),var(--brand-blue))]
      bg-clip-text text-transparent
    `,
    className,
  ]}
  style:--text-angle={`${angle}deg`}
>
  {@render children()}
</span>
