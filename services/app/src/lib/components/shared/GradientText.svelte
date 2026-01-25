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
  class="
    inline-block
    {className}"
  style="
		color: var(--color-brand-purple);
		background-image: linear-gradient({angle}deg, var(--color-brand-purple), var(--color-brand-blue));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	"
>
  {@render children()}
</span>
